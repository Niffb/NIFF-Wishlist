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
//  Admin Auth Endpoint (Password protected)
// ==========================================
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Karamalis1310!';

app.post('/api/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    res.json({ success: true, token: 'admin-authenticated' });
  } else {
    res.status(401).json({ success: false, error: 'Incorrect password' });
  }
});

// ==========================================
//  Helper: browser-like fetch with headers
// ==========================================
const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
  'Cache-Control': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Sec-Fetch-User': '?1',
  'Upgrade-Insecure-Requests': '1',
};

/**
 * Extract ALL product image URLs from Amazon HTML.
 * Amazon embeds images in multiple JS data structures — we brute-force extract them all.
 */
function extractAmazonImages(html, targetUrl) {
  const images = new Set();

  // 1. hiRes images (highest quality — from the image gallery JSON)
  const hiResPattern = /"hiRes"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|png|webp)[^"]*)"/gi;
  let m;
  while ((m = hiResPattern.exec(html)) !== null) images.add(m[1]);

  // 2. "large" images from colorImages / imageGalleryData
  const largePattern = /"large"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|png|webp)[^"]*)"/gi;
  while ((m = largePattern.exec(html)) !== null) images.add(m[1]);

  // 3. landingImage src
  const landingPattern = /id="landingImage"[^>]*src="(https?:\/\/[^"]+)"/i;
  m = html.match(landingPattern);
  if (m) images.add(m[1]);

  // 4. data-old-hires attribute (Amazon puts hi-res URLs here)
  const oldHiresPattern = /data-old-hires="(https?:\/\/[^"]+)"/gi;
  while ((m = oldHiresPattern.exec(html)) !== null) images.add(m[1]);

  // 5. Broad sweep: any m.media-amazon.com product image
  const mediaPattern = /https?:\/\/m\.media-amazon\.com\/images\/I\/[A-Za-z0-9._%-]+\.(?:jpg|png|webp)/gi;
  while ((m = mediaPattern.exec(html)) !== null) images.add(m[0]);

  // 6. images-na.ssl-images-amazon.com pattern
  const sslPattern = /https?:\/\/images-na\.ssl-images-amazon\.com\/images\/I\/[A-Za-z0-9._%-]+\.(?:jpg|png|webp)/gi;
  while ((m = sslPattern.exec(html)) !== null) images.add(m[0]);

  // Filter: keep only product-sized images (exclude tiny icons, badges, sprites)
  const filtered = [...images].filter(url => {
    // Skip tiny images (badges, icons)
    if (/\._(?:SS|SX|SY)\d{1,2}[_.]/.test(url)) return false;
    // Skip sprite sheets
    if (url.includes('sprite') || url.includes('icon')) return false;
    // Prefer larger variants — upgrade to SL1500 if possible
    return true;
  });

  // Upgrade to high-res variant if URL has a size suffix
  const upgraded = filtered.map(url => {
    // Replace size suffixes like ._AC_SX679_ with ._AC_SL1500_
    return url.replace(/\._[A-Z]{2}_[A-Z]{2}\d+_/, '._AC_SL1500_');
  });

  return [...new Set(upgraded)];
}

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
    const timeout = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(targetUrl, {
      headers: { ...BROWSER_HEADERS, 'Accept-Encoding': 'gzip, deflate, br' },
      redirect: 'follow',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.error(`Upstream ${response.status} for ${targetUrl}`);
      return res.status(response.status).json({ error: `Upstream returned ${response.status}` });
    }

    let html = await response.text();
    console.log(`[Proxy] Fetched ${targetUrl} — ${html.length} chars`);

    // --- Amazon Specific: extract images from JS data structures ---
    if (targetUrl.includes('amazon.')) {
      const amazonImages = extractAmazonImages(html, targetUrl);
      if (amazonImages.length > 0) {
        console.log(`[Proxy] Found ${amazonImages.length} Amazon images, best: ${amazonImages[0].substring(0, 80)}...`);
        // Inject as og:image so front-end parser picks it up
        html = html.replace('</head>', `<meta property="og:image" content="${amazonImages[0]}"></head>`);
      }
    }

    res.json({ html, finalUrl: response.url });
  } catch (err) {
    console.error('Fetch page error:', err.message, 'for', targetUrl);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
//  Image Search Fallback
//  Searches Bing Images + Google Shopping for product photos
//  Returns the best image URL found
// ==========================================
app.get('/api/search-image', async (req, res) => {
  const productName = req.query.q || '';
  const productUrl = req.query.url || '';

  if (!productName && !productUrl) {
    return res.status(400).json({ error: 'Missing q or url parameter' });
  }

  let searchQuery = productName;
  let domain = '';
  if (productUrl) {
    try {
      const u = new URL(productUrl);
      domain = u.hostname.replace('www.', '');
    } catch (e) {}
  }

  // Build a product-focused search query
  if (!searchQuery && productUrl) {
    try {
      const u = new URL(productUrl);
      const slug = u.pathname.split('/').filter(p => p && p.length > 3 && !/^\d+$/.test(p)).pop() || '';
      searchQuery = slug.replace(/[-_]/g, ' ').replace(/\d{4,}/g, '').trim();
    } catch (e) {}
  }

  const fullQuery = `${searchQuery} ${domain} product`.trim();
  console.log(`[ImageSearch] Searching for: "${fullQuery}"`);

  const results = [];

  // --- Source 1: Bing Images ---
  try {
    const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(fullQuery)}&qft=+filterui:photo-photo&first=1`;
    const response = await fetch(bingUrl, {
      headers: { ...BROWSER_HEADERS, 'Accept': 'text/html' },
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      const html = await response.text();

      // Extract image URLs from Bing's murl parameter (original image URLs)
      const murlPattern = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
      let match;
      while ((match = murlPattern.exec(html)) !== null && results.length < 5) {
        const imgUrl = match[1].replace(/&amp;/g, '&');
        if (imgUrl.match(/\.(jpg|jpeg|png|webp)/i) && !imgUrl.includes('bing.com')) {
          results.push(imgUrl);
        }
      }

      // Also try data-src patterns
      const dataSrcPattern = /data-src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi;
      while ((match = dataSrcPattern.exec(html)) !== null && results.length < 8) {
        const imgUrl = match[1].replace(/&amp;/g, '&');
        if (!imgUrl.includes('bing.com') && !imgUrl.includes('microsoft.com')) {
          results.push(imgUrl);
        }
      }

      console.log(`[ImageSearch] Bing found ${results.length} images`);
    }
  } catch (e) {
    console.warn('[ImageSearch] Bing Images failed:', e.message);
  }

  // --- Source 2: DuckDuckGo instant answer (often has direct image) ---
  if (results.length === 0) {
    try {
      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(searchQuery)}&format=json&no_html=1`;
      const response = await fetch(ddgUrl, {
        headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.Image) results.push(data.Image);
        if (data.Results) {
          for (const r of data.Results) {
            if (r.Icon && r.Icon.URL && r.Icon.URL.startsWith('http')) {
              results.push(r.Icon.URL);
            }
          }
        }
        console.log(`[ImageSearch] DDG instant found ${results.length} images`);
      }
    } catch (e) {
      console.warn('[ImageSearch] DDG instant failed:', e.message);
    }
  }

  // --- Source 3: Page screenshot via thum.io (absolute last resort — always works) ---
  const screenshotUrl = productUrl
    ? `https://image.thum.io/get/width/600/crop/400/noanimate/${productUrl}`
    : '';

  res.json({
    images: results,
    best: results[0] || '',
    screenshot: screenshotUrl,
  });
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

