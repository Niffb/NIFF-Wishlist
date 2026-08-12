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
    // Parse domain for Referer header
    let referer = '';
    try { referer = new URL(targetUrl).origin; } catch (e) {}

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(targetUrl, {
      headers: {
        ...BROWSER_HEADERS,
        'Accept-Encoding': 'gzip, deflate, br',
        'Referer': referer,
        'DNT': '1',
      },
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

    // --- Detect anti-bot/challenge pages ---
    const lowerHtml = html.substring(0, 5000).toLowerCase();
    const isAntiBot = [
      'checking your browser', 'just a moment', 'ray id', 'cloudflare',
      'challenge-platform', 'pardon our interruption', 'access denied',
      'enable javascript', 'please wait', 'bot protection', 'captcha',
      'security check', 'perimeterx', 'imperva', 'incapsula', 'distil',
    ].some(p => lowerHtml.includes(p));

    if (isAntiBot) {
      console.warn(`[Proxy] Anti-bot page detected for ${targetUrl}`);
      return res.json({ html: '', finalUrl: response.url, antiBot: true });
    }

    // --- Amazon Specific: extract images from JS data structures ---
    if (targetUrl.includes('amazon.')) {
      const amazonImages = extractAmazonImages(html, targetUrl);
      if (amazonImages.length > 0) {
        console.log(`[Proxy] Found ${amazonImages.length} Amazon images, best: ${amazonImages[0].substring(0, 80)}...`);
        // Inject as og:image so front-end parser picks it up
        html = html.replace('</head>', `<meta property="og:image" content="${amazonImages[0]}"></head>`);
      }
    }

    // --- ASOS Specific: extract images from JS config or construct CDN URL ---
    if (targetUrl.includes('asos.com')) {
      let asosImage = '';
      // Try to extract from window.asos.pdp.config or inline JSON
      const asosImgMatch = html.match(/images\.asos-media\.com\/products\/[^"'\s]+/i);
      if (asosImgMatch) {
        asosImage = 'https://' + asosImgMatch[0];
      }
      // Fallback: construct from URL product ID
      if (!asosImage) {
        const prdMatch = targetUrl.match(/\/([^/]+)\/prd\/(\d+)/);
        if (prdMatch) {
          asosImage = `https://images.asos-media.com/products/${prdMatch[1]}/${prdMatch[2]}-1?$n_640w$`;
        }
      }
      if (asosImage) {
        console.log(`[Proxy] ASOS image: ${asosImage.substring(0, 80)}`);
        html = html.replace('</head>', `<meta property="og:image" content="${asosImage}"></head>`);
      }
    }

    res.json({ html, finalUrl: response.url, antiBot: false });
  } catch (err) {
    console.error('Fetch page error:', err.message, 'for', targetUrl);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
//  Image Search Fallback
//  Searches Bing Images + Google Images + DuckDuckGo in parallel
//  Returns the best actual product image URL found
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

  // Build a product-focused search query from URL slug if no name
  if (!searchQuery && productUrl) {
    try {
      const u = new URL(productUrl);
      const slug = u.pathname.split('/').filter(p => p && p.length > 3 && !/^\d+$/.test(p)).pop() || '';
      searchQuery = slug.replace(/[-_]/g, ' ').replace(/\d{4,}/g, '').trim();
    } catch (e) {}
  }

  // Remove domain from query if it already contains the brand
  const cleanQuery = searchQuery.replace(new RegExp(domain.split('.')[0], 'gi'), '').trim();
  const productQuery = cleanQuery || searchQuery;

  console.log(`[ImageSearch] Searching for product image: "${productQuery}"`);

  // Helper: check if URL looks like an actual product image (not a logo/icon/banner)
  function isProductImage(imgUrl) {
    if (!imgUrl || typeof imgUrl !== 'string') return false;
    const lower = imgUrl.toLowerCase();
    // Reject common non-product patterns
    if (lower.includes('logo') || lower.includes('favicon') || lower.includes('icon')
        || lower.includes('sprite') || lower.includes('badge') || lower.includes('banner')
        || lower.includes('avatar') || lower.includes('profile') || lower.includes('pixel')
        || lower.includes('tracking') || lower.includes('spacer') || lower.includes('1x1')
        || lower.includes('blank.gif') || lower.includes('ad_') || lower.includes('/ads/')
        || lower.includes('microsoft.com')
        || lower.includes('google.com/images') || lower.includes('gstatic.com/images/branding')) return false;
    return true;
  }

  // --- Run all 3 image sources in PARALLEL ---
  const [bingResult, googleResult, ddgResult] = await Promise.allSettled([

    // Source 1: Bing Images (extract murl AND turl thumbnails)
    (async () => {
      const images = [];
      try {
        const bingUrl = `https://www.bing.com/images/search?q=${encodeURIComponent(productQuery + ' product photo')}&qft=+filterui:photo-photo&first=1`;
        const response = await fetch(bingUrl, {
          headers: { ...BROWSER_HEADERS, 'Accept': 'text/html' },
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
          const html = await response.text();
          // Extract murl (original full-size image URLs)
          const murlPattern = /murl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
          let match;
          while ((match = murlPattern.exec(html)) !== null && images.length < 6) {
            const imgUrl = match[1].replace(/&amp;/g, '&');
            if (isProductImage(imgUrl)) images.push(imgUrl);
          }
          // Extract turl (high-reliability Bing CDN thumbnails)
          const turlPattern = /turl&quot;:&quot;(https?:\/\/[^&]+?)&quot;/gi;
          while ((match = turlPattern.exec(html)) !== null && images.length < 12) {
            const imgUrl = match[1].replace(/&amp;/g, '&');
            if (isProductImage(imgUrl)) images.push(imgUrl);
          }
          console.log(`[ImageSearch] Bing found ${images.length} images`);
        }
      } catch (e) {
        console.warn('[ImageSearch] Bing failed:', e.message);
      }
      return images;
    })(),

    // Source 2: Google Images (scrape thumbnails)
    (async () => {
      const images = [];
      try {
        const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(productQuery + ' product')}&tbm=isch&hl=en`;
        const response = await fetch(googleUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml',
            'Accept-Language': 'en-GB,en;q=0.9',
          },
          signal: AbortSignal.timeout(3000),
        });
        if (response.ok) {
          const html = await response.text();
          const imgPatterns = [
            /\["(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)",\d{3,},\d{3,}\]/gi,
            /\\"ou\\":\\"(https?:\/\/[^"\\]+)\\"/gi,
            /src="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/gi,
          ];
          for (const pattern of imgPatterns) {
            let match;
            while ((match = pattern.exec(html)) !== null && images.length < 6) {
              const imgUrl = match[1].replace(/\\u003d/g, '=').replace(/\\u0026/g, '&');
              if (isProductImage(imgUrl) && imgUrl.length > 30) images.push(imgUrl);
            }
          }
          console.log(`[ImageSearch] Google found ${images.length} images`);
        }
      } catch (e) {
        console.warn('[ImageSearch] Google Images failed:', e.message);
      }
      return images;
    })(),

    // Source 3: DuckDuckGo Image API
    (async () => {
      const images = [];
      try {
        // First get vqd token from DuckDuckGo
        const tokenRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(productQuery)}`, {
          headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
          signal: AbortSignal.timeout(2000)
        });
        if (tokenRes.ok) {
          const tokenText = await tokenRes.text();
          const vqdMatch = tokenText.match(/vqd=["']([^"']+)["']/);
          if (vqdMatch && vqdMatch[1]) {
            const ddgImgUrl = `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(productQuery)}&vqd=${vqdMatch[1]}`;
            const ddgRes = await fetch(ddgImgUrl, {
              headers: { 'User-Agent': BROWSER_HEADERS['User-Agent'] },
              signal: AbortSignal.timeout(2000)
            });
            if (ddgRes.ok) {
              const ddgData = await ddgRes.json();
              if (ddgData.results && Array.isArray(ddgData.results)) {
                for (const r of ddgData.results) {
                  if (r.image && isProductImage(r.image)) images.push(r.image);
                  if (r.thumbnail && isProductImage(r.thumbnail)) images.push(r.thumbnail);
                  if (images.length >= 8) break;
                }
              }
            }
          }
        }
      } catch (e) {
        console.warn('[ImageSearch] DDG image API failed:', e.message);
      }
      return images;
    })(),
  ]);

  // Merge all results, prioritizing Bing > Google > DDG
  const allImages = [
    ...(bingResult.status === 'fulfilled' ? bingResult.value : []),
    ...(googleResult.status === 'fulfilled' ? googleResult.value : []),
    ...(ddgResult.status === 'fulfilled' ? ddgResult.value : []),
  ];

  // Deduplicate
  const uniqueImages = [...new Set(allImages)];

  // Screenshot fallback (thum.io) — only if zero images found
  const screenshotUrl = productUrl
    ? `https://image.thum.io/get/width/600/crop/400/noanimate/${productUrl}`
    : '';

  console.log(`[ImageSearch] Total unique images: ${uniqueImages.length}, best: ${uniqueImages[0]?.substring(0, 80) || 'none'}`);

  res.json({
    images: uniqueImages.slice(0, 10),
    best: uniqueImages[0] || '',
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

// ==========================================
//  Daily Automated Price & Details Scraper
// ==========================================
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://teqefehtuesydtwimwqq.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcWVmZWh0dWVzeWR0d2ltd3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDY2MTMsImV4cCI6MjEwMDkyMjYxM30.JyAVIxqougf8pTfU3RQg2fMx3xgV7qP4V2FGnymDNW0';

function extractPriceFromHtml(html) {
  if (!html) return '';

  // 1. JSON-LD search for price
  const jsonLdMatches = [...html.matchAll(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
  for (const m of jsonLdMatches) {
    try {
      const data = JSON.parse(m[1]);
      const findPrice = (obj) => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj.price !== undefined && obj.price !== '') return obj;
        if (Array.isArray(obj)) {
          for (const item of obj) {
            const p = findPrice(item);
            if (p) return p;
          }
        }
        if (obj.offers) return findPrice(obj.offers);
        return null;
      };
      const found = findPrice(data);
      if (found) {
        const val = String(found.price);
        const curr = found.priceCurrency === 'GBP' ? '£' : found.priceCurrency === 'EUR' ? '€' : found.priceCurrency === 'USD' ? '$' : '£';
        const num = parseFloat(val.replace(/[^\d.]/g, ''));
        if (!isNaN(num)) return `${curr}${num.toFixed(2)}`;
      }
    } catch (e) {}
  }

  // 2. Meta tag search for price
  const metaPrice = html.match(/meta[^>]+property=["'](?:product|og):price:amount["'][^>]+content=["']([^"']+)["']/i) ||
                    html.match(/meta[^>]+content=["']([^"']+)["'][^>]+property=["'](?:product|og):price:amount["']/i);
  if (metaPrice && metaPrice[1]) {
    const num = parseFloat(metaPrice[1]);
    if (!isNaN(num)) return `£${num.toFixed(2)}`;
  }

  // 3. Fallback regex search
  const priceMatches = html.match(/£\s?[\d,]+(?:\.\d{2})?/g);
  if (priceMatches && priceMatches.length > 0) {
    const cleanNum = parseFloat(priceMatches[0].replace(/[^\d.]/g, ''));
    if (!isNaN(cleanNum)) return `£${cleanNum.toFixed(2)}`;
  }

  return '';
}

async function runDailyPriceCheck() {
  console.log('[Daily Scraper] Starting daily price & details verification...');
  try {
    const headers = {
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json'
    };

    let items = [];
    const response = await fetch(`${SUPABASE_URL}/rest/v1/wishlist?select=*`, { headers });
    if (response.ok) {
      items = await response.json();
    } else {
      const fs = require('fs');
      if (fs.existsSync('./wishlist.json')) {
        items = JSON.parse(fs.readFileSync('./wishlist.json', 'utf8'));
      }
    }

    if (!items || items.length === 0) {
      console.log('[Daily Scraper] No items found to check.');
      return { total: 0, updated: 0, verified: 0 };
    }

    let updatedCount = 0;
    let verifiedCount = 0;
    const now = Date.now();

    for (const item of items) {
      if (!item.url) continue;

      try {
        let referer = '';
        try { referer = new URL(item.url).origin; } catch (e) {}

        const pageRes = await fetch(item.url, {
          headers: {
            ...BROWSER_HEADERS,
            'Referer': referer,
          },
          signal: AbortSignal.timeout(6000),
        });

        if (pageRes.ok) {
          const html = await pageRes.text();
          const scrapedPrice = extractPriceFromHtml(html);

          const updates = {
            last_verified: now
          };

          if (scrapedPrice && scrapedPrice !== item.price) {
            console.log(`[Daily Scraper] Price change for "${item.name}": ${item.price || 'N/A'} -> ${scrapedPrice}`);
            
            let cleanNote = item.note || '';
            let orig = item.price || scrapedPrice;
            let hist = [];
            
            // Use balanced-bracket matching for nested JSON
            const phIdx = cleanNote.indexOf('[PH:');
            if (phIdx !== -1) {
              const afterPH = cleanNote.substring(phIdx + 4);
              let depth = 0;
              let endPos = -1;
              for (let i = 0; i < afterPH.length; i++) {
                if (afterPH[i] === '{') depth++;
                else if (afterPH[i] === '}') {
                  depth--;
                  if (depth === 0 && i + 1 < afterPH.length && afterPH[i + 1] === ']') {
                    endPos = i + 2;
                    break;
                  }
                }
              }
              if (endPos !== -1) {
                const jsonStr = afterPH.substring(0, endPos - 1);
                try {
                  const meta = JSON.parse(jsonStr);
                  orig = meta.orig || item.price || scrapedPrice;
                  hist = Array.isArray(meta.hist) ? meta.hist : [];
                } catch (e) {}
                cleanNote = (cleanNote.substring(0, phIdx) + cleanNote.substring(phIdx + 4 + endPos)).trim();
              }
            }

            if (hist.length === 0 && item.price) {
              hist.push({ price: item.price, date: item.created_at || now });
            }
            hist.push({ price: scrapedPrice, date: now });

            const phMeta = { orig, prev: item.price || '', hist };
            updates.note = `${cleanNote} [PH:${JSON.stringify(phMeta)}]`.trim();
            updates.price = scrapedPrice;
            updatedCount++;
          } else {
            verifiedCount++;
          }

          // Update Supabase item
          await fetch(`${SUPABASE_URL}/rest/v1/wishlist?id=eq.${item.id}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updates)
          });
        }
      } catch (err) {
        console.warn(`[Daily Scraper] Failed to re-scrape "${item.name}":`, err.message);
      }
    }

    console.log(`[Daily Scraper] Completed price check. Verified: ${verifiedCount}, Price Updates: ${updatedCount}`);
    return { total: items.length, updated: updatedCount, verified: verifiedCount };
  } catch (err) {
    console.error('[Daily Scraper] Error running daily price check:', err.message);
    return { error: err.message };
  }
}

// Endpoint to trigger manual or scheduled price refresh
app.all('/api/refresh-prices', async (req, res) => {
  const result = await runDailyPriceCheck();
  res.json({ success: true, ...result });
});

// Schedule daily check (every 24 hours)
setInterval(runDailyPriceCheck, 24 * 60 * 60 * 1000);

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  // Run initial check shortly after startup
  setTimeout(runDailyPriceCheck, 5000);
});

