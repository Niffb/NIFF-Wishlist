const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// ==========================================
//  Server-side page fetcher (bypasses CORS)
// ==========================================
app.get('/api/fetch-page', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        'Sec-CH-UA': '"Chromium";v="131", "Not_A Brand";v="24"',
        'Sec-CH-UA-Mobile': '?0',
        'Sec-CH-UA-Platform': '"macOS"',
      },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Upstream ${response.status} for ${targetUrl}`);
      return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
    }

    const html = await response.text();
    console.log(`[Proxy] Fetched ${targetUrl} — ${html.length} chars`);
    res.json({ html, finalUrl: response.url });
  } catch (err) {
    console.error('Fetch page error:', err.message, 'for', targetUrl);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
//  Product search fallback (DuckDuckGo + Bing)
//  Extracts price from search engine results
// ==========================================
app.get('/api/search-product', async (req, res) => {
  const query = req.query.q;
  const url = req.query.url;
  if (!query && !url) {
    return res.status(400).json({ error: 'Missing q or url parameter' });
  }

  // Build search query from product name + site domain
  let searchQuery = query || '';
  let domain = '';
  if (url) {
    try {
      const u = new URL(url);
      domain = u.hostname.replace('www.', '');
      if (!searchQuery) {
        // Extract name from URL path
        const slug = u.pathname.split('/').filter(p => p && p.length > 3 && !/^\d+$/.test(p)).pop() || '';
        searchQuery = slug.replace(/[-_]/g, ' ').replace(/\d{4,}/g, '').trim();
      }
    } catch (e) {}
  }

  const fullQuery = `${searchQuery} ${domain} price GBP`.trim();
  console.log(`[Search] Searching: "${fullQuery}"`);

  const result = { price: '', image: '', title: '' };

  // Try DuckDuckGo HTML (lightweight, less bot protection)
  try {
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(fullQuery)}`;
    const response = await fetch(ddgUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const html = await response.text();
      
      // Extract prices from search results
      const priceMatches = html.match(/£[\d,.]+(?:\.\d{2})?/g);
      if (priceMatches && priceMatches.length > 0) {
        // Get most common price (likely the correct one)
        const priceCounts = {};
        for (const p of priceMatches) {
          const normalized = p.replace(/,/g, '');
          priceCounts[normalized] = (priceCounts[normalized] || 0) + 1;
        }
        result.price = Object.entries(priceCounts)
          .sort((a, b) => b[1] - a[1])[0][0];
        console.log(`[Search] Found price: ${result.price}`);
      }
    }
  } catch (e) {
    console.warn('[Search] DuckDuckGo failed:', e.message);
  }

  // Try Bing as secondary
  if (!result.price) {
    try {
      const bingUrl = `https://www.bing.com/search?q=${encodeURIComponent(fullQuery)}`;
      const response = await fetch(bingUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        },
        signal: AbortSignal.timeout(10000),
      });

      if (response.ok) {
        const html = await response.text();
        const priceMatches = html.match(/£[\d,.]+(?:\.\d{2})?/g);
        if (priceMatches && priceMatches.length > 0) {
          const priceCounts = {};
          for (const p of priceMatches) {
            const normalized = p.replace(/,/g, '');
            priceCounts[normalized] = (priceCounts[normalized] || 0) + 1;
          }
          result.price = Object.entries(priceCounts)
            .sort((a, b) => b[1] - a[1])[0][0];
          console.log(`[Search] Found price via Bing: ${result.price}`);
        }
      }
    } catch (e) {
      console.warn('[Search] Bing failed:', e.message);
    }
  }

  res.json(result);
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

