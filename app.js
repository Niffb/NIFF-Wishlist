// ============================================
//  WISHLIST — App Logic
// ============================================

(function () {
    'use strict';

    // --- Constants ---
    const STORAGE_KEY = 'wishlist_items';
    const MICROLINK_API = 'https://api.microlink.io';
    const CATEGORIES = ['clothes', 'jewellery', 'shoes', 'bags', 'cosmetics', 'stationery', 'home', 'books', 'misc'];
    const CATEGORY_LABELS = {
        clothes: 'Clothes',
        jewellery: 'Jewellery',
        shoes: 'Shoes',
        bags: 'Bags',
        cosmetics: 'Cosmetics',
        stationery: 'Stationery',
        home: 'Home',
        books: 'Books',
        misc: 'Miscellaneous',
    };

    const SUBCATEGORY_LABELS = {
        tops: 'Tops',
        't-shirts': 'T-Shirts',
        jumpers: 'Jumpers & Knitwear',
        hoodies: 'Hoodies & Sweatshirts',
        jackets: 'Jackets & Coats',
        dresses: 'Dresses',
        skirts: 'Skirts',
        trousers: 'Trousers & Jeans',
        shorts: 'Shorts',
        activewear: 'Activewear',
        swimwear: 'Swimwear',
        underwear: 'Underwear & Loungewear',
        accessories: 'Accessories',
        other: 'Other',
    };

    // ==========================================
    //  AUTO-CATEGORISATION
    // ==========================================

    // Keyword maps for category detection
    const CATEGORY_KEYWORDS = {
        shoes: ['shoe', 'shoes', 'sneaker', 'sneakers', 'trainer', 'trainers', 'boot', 'boots', 'heel', 'heels', 'sandal', 'sandals', 'loafer', 'loafers', 'slipper', 'slippers', 'mule', 'mules', 'clog', 'clogs', 'espadrille', 'footwear', 'pump', 'pumps', 'flat', 'flats', 'oxford', 'derby', 'brogue'],
        bags: ['bag', 'bags', 'handbag', 'handbags', 'tote', 'backpack', 'rucksack', 'clutch', 'purse', 'crossbody', 'shoulder-bag', 'satchel', 'duffel', 'holdall', 'wallet', 'wallets', 'card-holder', 'cardholder'],
        jewellery: ['jewellery', 'jewelry', 'necklace', 'bracelet', 'ring', 'rings', 'earring', 'earrings', 'pendant', 'charm', 'bangle', 'anklet', 'brooch', 'cufflink', 'cufflinks', 'chain', 'choker'],
        cosmetics: ['cosmetic', 'cosmetics', 'makeup', 'make-up', 'lipstick', 'mascara', 'foundation', 'concealer', 'blush', 'bronzer', 'highlighter', 'eyeshadow', 'eyeliner', 'skincare', 'skin-care', 'moisturiser', 'moisturizer', 'serum', 'cleanser', 'toner', 'perfume', 'fragrance', 'cologne', 'beauty', 'nail-polish', 'nail polish'],
        books: ['book', 'books', 'novel', 'hardback', 'paperback', 'hardcover', 'ebook', 'e-book', 'audiobook', 'manga', 'comic'],
        stationery: ['stationery', 'stationary', 'notebook', 'planner', 'journal', 'pen', 'pens', 'pencil', 'pencils', 'marker', 'markers', 'washi', 'sticker', 'stickers', 'stamp', 'stamps', 'envelope'],
        home: ['home', 'homeware', 'homewares', 'furniture', 'candle', 'candles', 'cushion', 'throw', 'blanket', 'rug', 'lamp', 'vase', 'decor', 'decoration', 'kitchenware', 'bedding', 'towel', 'mirror', 'storage', 'organiser', 'organizer', 'mug', 'plant', 'planter'],
        clothes: ['dress', 'dresses', 'shirt', 'shirts', 'blouse', 'top', 'tops', 'jumper', 'jumpers', 'sweater', 'sweaters', 'hoodie', 'hoodies', 'sweatshirt', 'jacket', 'jackets', 'coat', 'coats', 'blazer', 'trousers', 'pants', 'jeans', 'leggings', 'shorts', 'skirt', 'skirts', 'cardigan', 'knitwear', 'knit', 'bodysuit', 'lingerie', 'bra', 'underwear', 'swimsuit', 'bikini', 'swimwear', 'activewear', 'sportswear', 'tracksuit', 'polo', 't-shirt', 'tshirt', 'tee', 'vest', 'tank', 'crop', 'dungaree', 'dungarees', 'romper', 'jumpsuit', 'playsuit', 'crew', 'pullover', 'parka', 'gilet', 'anorak', 'windbreaker'],
    };

    // Subcategory keyword detection (for clothes only)
    const SUBCATEGORY_KEYWORDS = {
        tops: ['top', 'tops', 'blouse', 'shirt', 'shirts', 'polo', 'cami', 'bodysuit', 'crop-top', 'crop top', 'vest', 'tank'],
        't-shirts': ['t-shirt', 'tshirt', 'tee', 't shirt', 'graphic tee'],
        jumpers: ['jumper', 'jumpers', 'sweater', 'sweaters', 'knitwear', 'knit', 'cardigan', 'pullover', 'crew neck', 'crew sweater', 'v-neck sweater'],
        hoodies: ['hoodie', 'hoodies', 'sweatshirt', 'sweatshirts', 'zip-up', 'zip up', 'tracksuit'],
        jackets: ['jacket', 'jackets', 'coat', 'coats', 'blazer', 'parka', 'gilet', 'anorak', 'windbreaker', 'bomber', 'denim jacket', 'leather jacket', 'puffer', 'trench', 'overcoat', 'mac'],
        dresses: ['dress', 'dresses', 'gown', 'maxi dress', 'midi dress', 'mini dress'],
        skirts: ['skirt', 'skirts', 'mini skirt', 'midi skirt', 'maxi skirt'],
        trousers: ['trousers', 'pants', 'jeans', 'chinos', 'cargo', 'wide-leg', 'straight-leg', 'leggings', 'joggers', 'dungaree', 'dungarees'],
        shorts: ['shorts', 'short'],
        activewear: ['activewear', 'sportswear', 'gym', 'running', 'yoga', 'sports bra', 'legging'],
        swimwear: ['swimwear', 'swimsuit', 'bikini', 'swimming', 'swim', 'trunks', 'one-piece'],
        underwear: ['underwear', 'lingerie', 'bra', 'briefs', 'boxers', 'pyjamas', 'pajamas', 'loungewear', 'nightwear', 'sleepwear', 'robe', 'dressing gown', 'socks'],
        accessories: ['scarf', 'scarves', 'hat', 'hats', 'cap', 'beanie', 'gloves', 'belt', 'belts', 'tie', 'ties', 'sunglasses'],
    };

    // Fashion-focused domain patterns
    const FASHION_DOMAINS = ['asos', 'zara', 'hm', 'uniqlo', 'mango', 'boohoo', 'prettylittlething', 'plt', 'missguided', 'topshop', 'next', 'primark', 'shein', 'abercrombie', 'hollister', 'gap', 'pull&bear', 'bershka', 'stradivarius', 'massimo', 'cos', 'arket', 'weekday', 'monki', 'superdry', 'levi', 'nike', 'adidas', 'puma', 'reebok', 'newbalance', 'converse', 'vans', 'northface', 'patagonia', 'gymshark', 'river-island', 'riverisland', 'urbanoutfitters', 'freepeople', 'anthropologie', 'self-portrait', 'reiss', 'whistles', 'allsaints', 'ted-baker', 'tedbaker', 'karen-millen', 'karenmillen', 'oasis', 'warehouse', 'dorothyperkins', 'wallis', 'burton', 'jacquemus', 'reformation', 'nastygal', 'depop', 'vinted', 'grailed'];
    const SHOE_DOMAINS = ['nike', 'adidas', 'puma', 'reebok', 'newbalance', 'converse', 'vans', 'drmartenss', 'drmartens', 'clarks', 'timberland', 'ugg', 'crocs', 'birkenstock', 'schuh', 'office', 'jdsports', 'footlocker', 'footasylum', 'size'];
    const BEAUTY_DOMAINS = ['sephora', 'boots', 'superdrug', 'cultbeauty', 'lookfantastic', 'beautybay', 'spacenk', 'theordinary', 'glossier', 'charlotte-tilbury', 'charlottetilbury', 'mac', 'nars', 'fenty', 'rare-beauty', 'rarebeauty', 'benefit', 'clinique', 'estee', 'lancome', 'kiehls', 'lush', 'thebodyshop'];
    const BOOK_DOMAINS = ['waterstones', 'bookdepository', 'penguin', 'harpercollins', 'panmacmillan', 'blackwells', 'foyles', 'wob', 'abebooks', 'wordery'];
    const HOME_DOMAINS = ['ikea', 'wayfair', 'dunelm', 'johnlewis', 'next', 'habitat', 'madecom', 'made', 'westelm', 'anthropologie', 'oliverbonas', 'hm-home', 'zarahome', 'tkmaxx', 'homesense'];

    /**
     * Detect category and subcategory from URL + product metadata.
     * Returns { category: string, subcategory: string }
     */
    function detectCategory(url, title = '', description = '') {
        const result = { category: '', subcategory: '' };
        try {
            const u = new URL(url);
            const hostname = u.hostname.toLowerCase();
            const path = u.pathname.toLowerCase();
            const combined = `${path} ${title} ${description}`.toLowerCase();

            // --- Step 1: Domain-level hints ---
            const domainHint = getDomainCategoryHint(hostname);

            // --- Step 2: Keyword matching on combined text ---
            // Score each category by keyword matches
            const scores = {};
            for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
                let score = 0;
                for (const kw of keywords) {
                    // Word-boundary-style matching (supports hyphenated keywords)
                    const regex = new RegExp(`(?:^|[\\s/\\-_.,])${kw.replace(/[-/]/g, '[\\-/]?')}(?:$|[\\s/\\-_.,])`, 'i');
                    if (regex.test(combined)) {
                        score += 1;
                        // Boost score if keyword appears in the title (more reliable signal)
                        if (title && regex.test(title.toLowerCase())) score += 1;
                    }
                }
                if (score > 0) scores[cat] = score;
            }

            // Pick highest scoring category
            let bestCat = '';
            let bestScore = 0;
            for (const [cat, score] of Object.entries(scores)) {
                if (score > bestScore) {
                    bestScore = score;
                    bestCat = cat;
                }
            }

            // --- Step 3: Combine domain hint with keyword result ---
            if (bestCat) {
                result.category = bestCat;
            } else if (domainHint) {
                result.category = domainHint;
            }

            // --- Step 4: Detect subcategory if clothes ---
            if (result.category === 'clothes') {
                let bestSub = '';
                let bestSubScore = 0;
                for (const [sub, keywords] of Object.entries(SUBCATEGORY_KEYWORDS)) {
                    let subScore = 0;
                    for (const kw of keywords) {
                        const regex = new RegExp(`(?:^|[\\s/\\-_.,])${kw.replace(/[-/]/g, '[\\-/]?')}(?:$|[\\s/\\-_.,])`, 'i');
                        if (regex.test(combined)) {
                            subScore += 1;
                            if (title && regex.test(title.toLowerCase())) subScore += 1;
                        }
                    }
                    if (subScore > bestSubScore) {
                        bestSubScore = subScore;
                        bestSub = sub;
                    }
                }
                result.subcategory = bestSub || 'other';
            }

        } catch (e) {
            console.warn('Category detection error:', e);
        }
        return result;
    }

    function getDomainCategoryHint(hostname) {
        for (const d of BEAUTY_DOMAINS) {
            if (hostname.includes(d)) return 'cosmetics';
        }
        for (const d of BOOK_DOMAINS) {
            if (hostname.includes(d)) return 'books';
        }
        for (const d of HOME_DOMAINS) {
            if (hostname.includes(d)) return 'home';
        }
        // Shoe domains overlap with fashion — only hint shoes if URL path also suggests shoes
        for (const d of SHOE_DOMAINS) {
            if (hostname.includes(d)) return ''; // Don't assume; let keywords decide
        }
        for (const d of FASHION_DOMAINS) {
            if (hostname.includes(d)) return 'clothes'; // Default fashion hint
        }
        // Amazon / general retailers — let keywords decide
        return '';
    }

    /**
     * Apply detected category to form dropdowns and trigger UI updates.
     */
    function applyCategoryToForm(detected) {
        if (detected.category && CATEGORIES.includes(detected.category)) {
            categorySelect.value = detected.category;
            // Trigger the change handler to show/hide subcategory
            categorySelect.dispatchEvent(new Event('change'));
        }
        if (detected.category === 'clothes' && detected.subcategory) {
            subcategorySelect.value = detected.subcategory;
        }
    }


    // ==========================================
    //  API CONFIGURATION
    // ==========================================
    const SUPABASE_URL = 'https://teqefehtuesydtwimwqq.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlcWVmZWh0dWVzeWR0d2ltd3FxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNDY2MTMsImV4cCI6MjEwMDkyMjYxM30.JyAVIxqougf8pTfU3RQg2fMx3xgV7qP4V2FGnymDNW0';
    const ADMIN_PASSWORD = 'Karamalis1310!'; // Change this to your preferred password

    // --- DOM References ---
    const grid = document.getElementById('wishlistGrid');
    const emptyState = document.getElementById('emptyState');
    const addBtn = document.getElementById('addBtn');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalClose = document.getElementById('modalClose');
    const itemForm = document.getElementById('itemForm');
    const toast = document.getElementById('toast');
    const toastUndo = document.getElementById('toastUndo');
    const tabs = document.querySelectorAll('.cat-tab');
    const fetchBtn = document.getElementById('fetchBtn');
    const fetchSpinner = document.getElementById('fetchSpinner');
    const fetchPreview = document.getElementById('fetchPreview');
    const fetchPreviewImg = document.getElementById('fetchPreviewImg');
    const fetchPreviewTitle = document.getElementById('fetchPreviewTitle');
    const fetchPreviewDesc = document.getElementById('fetchPreviewDesc');
    
    // QOL Features DOM
    const wishlistSummary = document.getElementById('wishlistSummary');
    const summaryText = document.getElementById('summaryText');
    const searchInput = document.getElementById('searchInput');
    const priceFilterSelect = document.getElementById('priceFilterSelect');
    const itemPriorityCheckbox = document.getElementById('itemPriority');

    // Auth DOM
    const authBtn = document.getElementById('authBtn');
    const authModalOverlay = document.getElementById('authModalOverlay');
    const authModalClose = document.getElementById('authModalClose');
    const authForm = document.getElementById('authForm');
    const authPasswordInput = document.getElementById('authPassword');
    const authMessage = document.getElementById('authMessage');
    const authSubmitBtn = document.getElementById('authSubmitBtn');
    const userDisplay = document.getElementById('userDisplay');
    const userEmailSpan = document.getElementById('userEmail');
    const logoutBtn = document.getElementById('logoutBtn');

    // --- State ---
    let items = [];
    let activeCategory = 'all';
    let activeSort = 'newest';
    let lastDeleted = null;
    let toastTimeout = null;
    let currentUser = null;
    let currentSearch = '';
    let currentPriceFilter = 'all';
    let editingItemId = null;

    const sortSelect = document.getElementById('sortSelect');
    const formSubmitBtn = document.getElementById('formSubmitBtn');
    const subcategoryGroup = document.getElementById('subcategoryGroup');
    const subcategorySelect = document.getElementById('itemSubcategory');
    const categorySelect = document.getElementById('itemCategory');

    // Show/hide subcategory when category changes
    categorySelect.addEventListener('change', () => {
        subcategoryGroup.style.display = categorySelect.value === 'clothes' ? 'block' : 'none';
        if (categorySelect.value !== 'clothes') subcategorySelect.value = '';
    });

    // --- API Data Sync (Supabase) ---
    function getHeaders() {
        return {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        };
    }

    async function loadItems() {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/wishlist?select=*&order=created_at.desc`, {
                headers: getHeaders()
            });
            if (!response.ok) throw new Error('Failed to load items from Supabase');
            const data = await response.json();
            
            // Map created_at to createdAt for app logic
            return data.map(item => ({
                ...item,
                createdAt: item.created_at
            }));
        } catch (error) {
            console.error('Error loading items from Supabase:', error);
            return [];
        }
    }

    async function saveItem(item) {
        const dbItem = { ...item, created_at: item.createdAt || Date.now() };
        delete dbItem.createdAt;

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/wishlist`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify(dbItem)
            });
            if (!response.ok) throw new Error('Failed to save item to Supabase');
            showToast('Item saved', false);
        } catch (error) {
            console.error('Error saving item to Supabase:', error);
            showToast('Failed to save', false);
            throw error;
        }
    }

    async function removeItem(id) {
        try {
            // Find for undo functionality before deleting
            const index = items.findIndex(i => i.id === id);
            if (index > -1) {
                lastDeleted = { item: items[index], index };
            }

            const response = await fetch(`${SUPABASE_URL}/rest/v1/wishlist?id=eq.${id}`, { 
                method: 'DELETE',
                headers: getHeaders()
            });
            if (!response.ok) throw new Error('Failed to delete item from Supabase');
            
            showToast('Item removed', true);
        } catch (error) {
            console.error('Error removing item from Supabase:', error);
            showToast('Failed to remove', false);
            throw error;
        }
    }

    async function updateItem(id, updates) {
        const dbUpdates = { ...updates };
        if (dbUpdates.createdAt) {
            dbUpdates.created_at = dbUpdates.createdAt;
            delete dbUpdates.createdAt;
        }

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/wishlist?id=eq.${id}`, {
                method: 'PATCH',
                headers: getHeaders(),
                body: JSON.stringify(dbUpdates)
            });
            if (!response.ok) throw new Error('Failed to update item on Supabase');
            showToast('Item updated', false);
        } catch (error) {
            console.error('Error updating item on Supabase:', error);
            showToast('Failed to update', false);
            throw error;
        }
    }

    function subscribeToChanges() {
        // Not used
    }

    // --- Generate unique ID ---
    function uid() {
        return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    }

    // --- Extract display URL ---
    function displayUrl(url) {
        try {
            const u = new URL(url);
            return u.hostname.replace('www.', '');
        } catch {
            return url;
        }
    }

    // --- Escape HTML ---
    function escapeHtml(str) {
        if (!str) return '';
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // --- Clean Title Helper ---
    function cleanTitle(title, url) {
        if (!title) return '';

        let cleaned = title;

        // 0. Strip anything after ? (query params leaking into titles)
        cleaned = cleaned.split('?')[0];

        // 1. Remove separators and what follows them if they look like site names
        const separators = [' | ', ' - ', ' – ', ' — ', ' : '];
        for (const sep of separators) {
            if (cleaned.includes(sep)) {
                const parts = cleaned.split(sep);
                const lastPart = parts[parts.length - 1].toLowerCase().trim();
                const firstPart = parts[0].toLowerCase().trim();
                // Common generic site words
                const genericWords = ['store', 'official', 'website', 'online', 'shop', 'amazon', 'etsy', 'ebay', 'asos', 'zara', 'h&m', 'abercrombie', 'hollister', 'men\'s', 'women\'s', 'clearance', 'sale', 'new arrivals'];
                
                if (genericWords.some(word => lastPart.includes(word)) || 
                    (url && url.toLowerCase().includes(lastPart.replace(/\s/g, '')))) {
                    cleaned = parts.slice(0, -1).join(sep);
                }
                // Also strip generic prefixes like "Men's Clearance |"
                if (genericWords.some(word => firstPart.includes(word)) && parts.length > 2) {
                    cleaned = parts.slice(1).join(sep);
                }
            }
        }

        cleaned = cleaned.trim();

        // 1b. Strip trailing product IDs (numeric strings like "1005", "617432")
        cleaned = cleaned.replace(/\s+\d{3,}$/, '').trim();

        // 2. If it's a long hyphenated string (slug) or contains path segments
        if (cleaned.includes('/') || (cleaned.includes('-') && !cleaned.includes(' '))) {
            const segments = cleaned.split('/');
            cleaned = segments[segments.length - 1] || segments[segments.length - 2] || cleaned;

            cleaned = cleaned
                .split('-')
                .filter((part) => {
                    return !/^\d+$/.test(part) && part.length > 1;
                })
                .join(' ');
        }

        // 3. Capitalize and cleanup
        if (cleaned) {
            cleaned = cleaned
                .toLowerCase()
                .split(' ')
                .filter(w => w.length > 0)
                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                .join(' ')
                .trim();
            
            // Limit length
            if (cleaned.length > 100) cleaned = cleaned.substring(0, 97) + '...';
        }

        return cleaned;
    }

    // ==========================================
    //  SMART FETCH — Enhanced Scraper
    // ==========================================

    // Parse product name from URL slug (last resort fallback)
    function parseNameFromUrl(url) {
        try {
            const u = new URL(url);
            const pathParts = u.pathname.split('/').filter(Boolean);
            // Find the most descriptive part (longest, non-numeric segment)
            let best = '';
            for (let part of pathParts) {
                // Strip query params that may have leaked
                part = part.split('?')[0];
                // Skip purely numeric parts (IDs)
                if (/^\d+$/.test(part)) continue;
                // Skip short numeric-heavy parts (product codes like "617432109")
                if (/^\d{4,}/.test(part)) continue;
                // Skip common path segments
                if (['uk', 'us', 'en', 'gb', 'eu', 'listing', 'product', 'products', 'item', 'items', 'shop', 'dp', 'p', 'prd', 'category', 'collections', 'c', 'men', 'women', 'mens', 'womens', 'kids', 'sale', 'clearance', 'new'].includes(part.toLowerCase())) continue;
                if (part.length > best.length) best = part;
            }
            if (best) {
                // Strip trailing numeric product IDs from slug
                best = best.replace(/-\d{4,}$/, '');
                return best
                    .replace(/[-_]+/g, ' ')
                    .replace(/\b\w/g, c => c.toUpperCase())
                    .trim();
            }
        } catch (e) { }
        return '';
    }

    // Domain-specific extraction (Creative Fallback)
    function parseDomainSpecifics(url) {
        const result = {
            name: '',
            image: '',
            price: '',
            source: 'URL Parser'
        };

        try {
            const u = new URL(url);
            const hostname = u.hostname.toLowerCase();
            const path = u.pathname;

            // --- AMAZON ---
            if (hostname.includes('amazon.')) {
                const asinMatch = path.match(/(?:dp|gp\/product|exec\/obidos\/asin)\/(B[0-9A-Z]{9})/i);
                if (asinMatch && asinMatch[1]) {
                    const asin = asinMatch[1];
                    result.image = `https://images-na.ssl-images-amazon.com/images/I/${asin}.jpg`;
                }
                const parts = path.split('/');
                const dpIndex = parts.findIndex(p => p === 'dp' || p === 'gp');
                if (dpIndex > 0) {
                    result.name = parts[dpIndex - 1].replace(/-/g, ' ');
                } else {
                    const nameParts = path.split('/').filter(p => p && !/^(dp|gp|product|ref|exec|obidos)$/.test(p) && !/B[0-9A-Z]{9}/i.test(p));
                    if (nameParts.length > 0) result.name = nameParts[0].replace(/-/g, ' ');
                }
            }
            // --- ETSY ---
            else if (hostname.includes('etsy.com')) {
                const slugMatch = path.match(/listing\/\d+\/([^/?#]+)/);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ');
            }
            // --- ASOS ---
            else if (hostname.includes('asos.com')) {
                const parts = path.split('/').filter(p => p && p.includes('-'));
                if (parts.length > 0) {
                    result.name = parts[0].replace(/-/g, ' ');
                } else {
                    result.name = parseNameFromUrl(url);
                }
            }
            // --- ABERCROMBIE / HOLLISTER ---
            else if (hostname.includes('abercrombie.') || hostname.includes('hollister.')) {
                // URL pattern: /shop/uk/p/product-name-slug-12345
                const slugMatch = path.match(/\/p\/([^/?#]+)/);
                if (slugMatch) {
                    let slug = slugMatch[1];
                    // Strip trailing product ID
                    slug = slug.replace(/-\d{4,}$/, '');
                    result.name = slug.replace(/-/g, ' ');
                }
            }
            // --- ZARA ---
            else if (hostname.includes('zara.com')) {
                const slugMatch = path.match(/\/([^/]+)-p\d+\.html/i);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ');
            }
            // --- H&M ---
            else if (hostname.includes('hm.com')) {
                const slugMatch = path.match(/productpage\.([^.]+)\.html/i) || path.match(/\/([^/]+)\.html/i);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ');
            }
            // --- Generic: try URL slug ---
            else {
                result.name = parseNameFromUrl(url);
            }

            // Clean up name if found
            if (result.name) {
                result.name = result.name
                    .split(' ')
                    .filter(w => w.length > 0)
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' ')
                    .trim();
                if (result.name.length > 100) result.name = result.name.substring(0, 97) + '...';
            }
        } catch (e) { }

        return result;
    }

    // High-res Favicon Fallback
    function getFaviconFallback(url) {
        try {
            const u = new URL(url);
            return `https://www.google.com/s2/favicons?sz=256&domain=${u.hostname}`;
        } catch (e) {
            return '';
        }
    }

    /**
     * Extract structured product data from HTML string.
     * Looks for JSON-LD (including priceSpecification), meta tags, and price patterns.
     */
    function extractProductDataFromHtml(htmlString, sourceUrl) {
        const result = {
            title: '',
            image: { url: '' },
            description: '',
            price: '',
        };

        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlString, 'text/html');

            // Helper to get meta tag content
            const getMeta = (query) => {
                const el = doc.querySelector(query);
                return el ? (el.getAttribute('content') || '').trim() : '';
            };

            // Recursively find a Product object in JSON-LD data
            function findProduct(obj) {
                if (!obj || typeof obj !== 'object') return null;
                if (obj['@type'] === 'Product') return obj;
                if (Array.isArray(obj)) {
                    for (const item of obj) {
                        const found = findProduct(item);
                        if (found) return found;
                    }
                }
                if (obj['@graph']) return findProduct(obj['@graph']);
                // Check nested properties
                for (const key of Object.keys(obj)) {
                    if (typeof obj[key] === 'object') {
                        const found = findProduct(obj[key]);
                        if (found) return found;
                    }
                }
                return null;
            }

            // Extract price from an offers object (handles all common formats)
            function extractPriceFromOffers(offers) {
                if (!offers) return '';

                const offerList = Array.isArray(offers) ? offers : [offers];
                for (const offer of offerList) {
                    let priceVal = '';
                    let currency = '';

                    // Direct price
                    if (offer.price !== undefined && offer.price !== '') {
                        priceVal = String(offer.price);
                        currency = offer.priceCurrency || '';
                    }
                    // lowPrice (aggregate offers)
                    else if (offer.lowPrice !== undefined) {
                        priceVal = String(offer.lowPrice);
                        currency = offer.priceCurrency || '';
                    }

                    // priceSpecification (Abercrombie, etc.)
                    if (!priceVal && offer.priceSpecification) {
                        const specs = Array.isArray(offer.priceSpecification) ? offer.priceSpecification : [offer.priceSpecification];
                        // Prefer the sale/current price (non-ListPrice)
                        const saleSpec = specs.find(s => s.priceType !== 'ListPrice' && s.price !== undefined);
                        const anySpec = specs.find(s => s.price !== undefined);
                        const spec = saleSpec || anySpec;
                        if (spec) {
                            priceVal = String(spec.price);
                            currency = spec.priceCurrency || currency;
                        }
                    }

                    if (priceVal) {
                        const sym = currency === 'GBP' ? '£' : currency === 'EUR' ? '€' : currency === 'USD' ? '$' : (currency ? currency + ' ' : '£');
                        return `${sym}${priceVal}`;
                    }
                }
                return '';
            }

            // --- 1. Extract from JSON-LD (most reliable for modern retail sites) ---
            const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
            for (const script of jsonLdScripts) {
                try {
                    const jsonData = JSON.parse(script.textContent);
                    const product = findProduct(jsonData);

                    if (product) {
                        if (product.name && !result.title) result.title = product.name;
                        if (product.description && !result.description) {
                            // Strip HTML tags from description
                            result.description = product.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                        }

                        // Image
                        const img = product.image;
                        if (img && !result.image.url) {
                            if (typeof img === 'string') result.image.url = img;
                            else if (Array.isArray(img)) result.image.url = typeof img[0] === 'string' ? img[0] : img[0]?.url || '';
                            else if (img.url) result.image.url = img.url;
                        }

                        // Price from offers
                        if (!result.price) {
                            result.price = extractPriceFromOffers(product.offers);
                        }
                    }
                } catch (e) { /* skip invalid JSON-LD */ }
            }

            // --- 2. Fill gaps from Open Graph / meta tags ---
            if (!result.title) {
                result.title = getMeta('meta[property="og:title"]') ||
                               getMeta('meta[name="twitter:title"]') ||
                               doc.title || '';
            }
            if (!result.image.url) {
                result.image.url = getMeta('meta[property="og:image"]') ||
                                   getMeta('meta[property="og:image:secure_url"]') ||
                                   getMeta('meta[name="twitter:image"]') ||
                                   getMeta('meta[name="twitter:image:src"]') || '';
            }
            if (!result.description) {
                result.description = getMeta('meta[property="og:description"]') ||
                                     getMeta('meta[name="description"]') ||
                                     getMeta('meta[name="twitter:description"]') || '';
            }

            // --- 3. Price from meta tags ---
            if (!result.price) {
                const metaPrice = getMeta('meta[property="product:price:amount"]') ||
                                  getMeta('meta[property="og:price:amount"]') ||
                                  getMeta('meta[name="twitter:data1"]') || '';
                const metaCurrency = getMeta('meta[property="product:price:currency"]') ||
                                     getMeta('meta[property="og:price:currency"]') || '';
                if (metaPrice) {
                    const sym = metaCurrency === 'GBP' ? '£' : metaCurrency === 'EUR' ? '€' : metaCurrency === 'USD' ? '$' : (metaCurrency ? metaCurrency + ' ' : '£');
                    result.price = `${sym}${metaPrice}`;
                }
            }

            // --- 4. Price from page text (regex fallback) ---
            if (!result.price) {
                const searchStr = [result.description, result.title, getMeta('meta[name="description"]')].join(' ');
                const priceRegex = /(?:£|€|\$)\s?[\d,.]+(?:\.\d{2})?/;
                const match = searchStr.match(priceRegex);
                if (match) result.price = match[0];
            }

        } catch (e) {
            console.warn('HTML extraction error:', e);
        }

        return result;
    }

    // Try fetching product data from multiple sources
    async function fetchProductData(url) {
        // --- Source 1: Our own server-side proxy (best — bypasses CORS entirely) ---
        try {
            const response = await fetch(`/api/fetch-page?url=${encodeURIComponent(url)}`);
            if (response.ok) {
                const json = await response.json();
                if (json.html && json.html.length > 200) {
                    const extracted = extractProductDataFromHtml(json.html, url);
                    if (extracted.title || extracted.price || extracted.image.url) {
                        console.log('[Scraper] Used server-side proxy — got:', extracted.title, extracted.price);
                        return { source: 'server-proxy', data: extracted };
                    }
                }
            }
        } catch (e) {
            console.warn('Server proxy failed:', e);
        }

        // --- Source 2: Microlink API ---
        try {
            const response = await fetch(
                `${MICROLINK_API}?url=${encodeURIComponent(url)}&meta=true`
            );
            const json = await response.json();
            if (json.status === 'success' && json.data) {
                return { source: 'microlink', data: json.data };
            }
        } catch (e) {
            console.warn('Microlink fetch failed:', e);
        }

        // --- Source 3: External CORS proxies (last resort) ---
        const proxies = [
            (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        ];

        for (const makeProxyUrl of proxies) {
            try {
                const proxyUrl = makeProxyUrl(url);
                const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
                if (!response.ok) continue;

                const contentType = response.headers.get('content-type') || '';
                const text = await response.text();

                let html = text;
                if (contentType.includes('application/json')) {
                    try {
                        const j = JSON.parse(text);
                        html = j.contents || j.data || text;
                    } catch { html = text; }
                }

                if (html && html.length > 500) {
                    const extracted = extractProductDataFromHtml(html, url);
                    if (extracted.title || extracted.price || extracted.image.url) {
                        return { source: 'proxy', data: extracted };
                    }
                }
            } catch (e) {
                console.warn('Proxy fetch failed:', e);
            }
        }

        return null;
    }

    document.getElementById('itemUrl').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            fetchBtn.click();
        }
    });

    fetchBtn.addEventListener('click', async () => {
        let url = document.getElementById('itemUrl').value.trim();
        if (!url) {
            document.getElementById('itemUrl').focus();
            return;
        }

        if (!/^https?:\/\//i.test(url)) {
            url = 'https://' + url;
            document.getElementById('itemUrl').value = url;
        }

        fetchBtn.classList.add('loading');
        fetchBtn.disabled = true;
        fetchPreview.classList.remove('show');

        const nameInput = document.getElementById('itemName');
        const imageInput = document.getElementById('itemImage');
        const priceInput = document.getElementById('itemPrice');

        try {
            const fetchResult = await fetchProductData(url);
            const domainData = parseDomainSpecifics(url);
            const data = fetchResult?.data || null;

            const isJunk = data && (
                (data.title || '').toLowerCase().includes('robot check') ||
                (data.title || '').toLowerCase() === 'amazon' ||
                (data.title || '').toLowerCase().includes('just a moment') ||
                (data.title || '').toLowerCase().includes('access denied') ||
                (data.title || '').toLowerCase().includes('are you a human')
            );

            if (data && !isJunk) {
                // --- Name: best from fetched title, domain-specific, or URL ---
                const cleanedTitle = cleanTitle(data.title, url);
                nameInput.value = cleanedTitle || domainData.name || parseNameFromUrl(url) || '';

                // --- Image: collect all candidates, pick the best ---
                const normalizeUrl = (imgUrl) => {
                    if (!imgUrl) return null;
                    if (typeof imgUrl === 'object') imgUrl = imgUrl.url;
                    if (!imgUrl || typeof imgUrl !== 'string') return null;
                    try { return new URL(imgUrl, url).href; } catch { return imgUrl; }
                };

                const imageCandidates = [
                    data.image,
                    domainData.image,
                    ...(Array.isArray(data.images) ? data.images : []),
                    data.logo,
                ].map(normalizeUrl).filter(img => 
                    img && img.length > 10 && 
                    !img.includes('favicon') && 
                    !img.includes('logo') &&
                    !img.includes('/icons/')
                );

                let bestImage = imageCandidates[0] || '';

                // --- Image Search Fallback: if no good image found, search for one ---
                if (!bestImage || bestImage.includes('favicon')) {
                    try {
                        const productName = nameInput.value || cleanedTitle || domainData.name || '';
                        const imgSearchRes = await fetch(`/api/search-image?q=${encodeURIComponent(productName)}&url=${encodeURIComponent(url)}`);
                        if (imgSearchRes.ok) {
                            const imgData = await imgSearchRes.json();
                            if (imgData.best) {
                                bestImage = imgData.best;
                                console.log('[Scraper] Image found via search:', bestImage.substring(0, 80));
                            } else if (imgData.screenshot) {
                                bestImage = imgData.screenshot;
                                console.log('[Scraper] Using page screenshot as image');
                            }
                        }
                    } catch (e) {
                        console.warn('Image search fallback failed:', e);
                    }
                }

                // Absolute last resort
                if (!bestImage) bestImage = getFaviconFallback(url);
                imageInput.value = bestImage;

                // --- Price: from structured data, fetched data, or regex ---
                let detectedPrice = '';
                if (data.price && typeof data.price === 'string') {
                    detectedPrice = data.price;
                } else if (data.price && typeof data.price === 'number') {
                    detectedPrice = `£${data.price}`;
                } else {
                    // Search description and title for price patterns
                    const searchStr = [data.description, data.title, typeof data.text === 'string' ? data.text : ''].join(' ');
                    const currencyRegex = /(?:£|€|\$)\s?[\d,.]+(?:\.\d{2})?/;
                    const priceMatch = searchStr.match(currencyRegex);
                    if (priceMatch) detectedPrice = priceMatch[0];
                }

                // --- Price fallback: search engines ---
                if (!detectedPrice) {
                    try {
                        const productName = nameInput.value || domainData.name || '';
                        const searchRes = await fetch(`/api/search-product?q=${encodeURIComponent(productName)}&url=${encodeURIComponent(url)}`);
                        if (searchRes.ok) {
                            const searchData = await searchRes.json();
                            if (searchData.price) {
                                detectedPrice = searchData.price;
                                console.log('[Scraper] Price found via search:', detectedPrice);
                            }
                        }
                    } catch (e) {
                        console.warn('Search price fallback failed:', e);
                    }
                }

                priceInput.value = detectedPrice;

                // --- Category ---
                const detected = detectCategory(url, nameInput.value || data.title || '', data.description || '');
                applyCategoryToForm(detected);

                // --- Update preview ---
                if (bestImage && !bestImage.includes('favicon')) {
                    fetchPreviewImg.src = bestImage;
                    fetchPreviewImg.style.display = 'block';
                } else {
                    fetchPreviewImg.src = bestImage;
                    fetchPreviewImg.style.display = 'block';
                }
                fetchPreviewTitle.textContent = nameInput.value || 'Product detected';
                const categoryLabel = detected.category ? CATEGORY_LABELS[detected.category] || detected.category : '';
                const subLabel = detected.subcategory && detected.subcategory !== 'other' ? SUBCATEGORY_LABELS[detected.subcategory] || detected.subcategory : '';
                const catInfo = categoryLabel ? ` • ${categoryLabel}${subLabel ? ' › ' + subLabel : ''}` : '';
                const priceInfo = detectedPrice ? `Price: ${detectedPrice}` : '';
                const descInfo = !priceInfo && data.description ? data.description.substring(0, 80) + '...' : '';
                fetchPreviewDesc.textContent = (priceInfo || descInfo || 'Details fetched') + catInfo;

            } else {
                // --- Fallback: URL-only parsing + Search engine fallback ---
                const parsedName = domainData.name || parseNameFromUrl(url);
                nameInput.value = parsedName;

                // Try image search first, then screenshot, then favicon
                let fallbackImage = domainData.image || '';
                if (!fallbackImage) {
                    try {
                        const imgSearchRes = await fetch(`/api/search-image?q=${encodeURIComponent(parsedName)}&url=${encodeURIComponent(url)}`);
                        if (imgSearchRes.ok) {
                            const imgData = await imgSearchRes.json();
                            if (imgData.best) {
                                fallbackImage = imgData.best;
                                console.log('[Scraper Fallback] Image found via search:', fallbackImage.substring(0, 80));
                            } else if (imgData.screenshot) {
                                fallbackImage = imgData.screenshot;
                                console.log('[Scraper Fallback] Using page screenshot');
                            }
                        }
                    } catch (e) {
                        console.warn('[Scraper Fallback] Image search failed:', e);
                    }
                }
                if (!fallbackImage) fallbackImage = getFaviconFallback(url);
                imageInput.value = fallbackImage;

                // Price fallback via search engine
                let detectedPrice = '';
                try {
                    const searchRes = await fetch(`/api/search-product?q=${encodeURIComponent(parsedName)}&url=${encodeURIComponent(url)}`);
                    if (searchRes.ok) {
                        const searchData = await searchRes.json();
                        if (searchData.price) {
                            detectedPrice = searchData.price;
                            priceInput.value = detectedPrice;
                            console.log('[Scraper Fallback] Price found via search:', detectedPrice);
                        }
                    }
                } catch (e) {
                    console.warn('[Scraper Fallback] Price search failed:', e);
                }

                // Auto-detect category even on fallback
                const detected = detectCategory(url, parsedName, '');
                applyCategoryToForm(detected);

                fetchPreviewTitle.textContent = parsedName || 'Manual entry needed';
                fetchPreviewImg.src = fallbackImage;
                fetchPreviewImg.style.display = fallbackImage ? 'block' : 'none';

                const categoryLabel = detected.category ? CATEGORY_LABELS[detected.category] || detected.category : '';
                const subLabel = detected.subcategory && detected.subcategory !== 'other' ? SUBCATEGORY_LABELS[detected.subcategory] || detected.subcategory : '';
                const catInfo = categoryLabel ? ` • ${categoryLabel}${subLabel ? ' › ' + subLabel : ''}` : '';
                const priceInfo = detectedPrice ? `Price: ${detectedPrice}` : 'Price not auto-detected';
                fetchPreviewDesc.textContent = `${priceInfo}${catInfo}`;
            }

            fetchPreview.classList.add('show');

        } catch (err) {
            console.error('Fetch error:', err);
            // Last resort: try domain parsing
            const domainData = parseDomainSpecifics(url);
            const parsedName = domainData.name || parseNameFromUrl(url);
            nameInput.value = parsedName;
            imageInput.value = domainData.image || getFaviconFallback(url);

            const detected = detectCategory(url, parsedName, '');
            applyCategoryToForm(detected);

            fetchPreviewTitle.textContent = parsedName || 'Fetch failed';
            const categoryLabel = detected.category ? CATEGORY_LABELS[detected.category] || detected.category : '';
            fetchPreviewDesc.textContent = 'Please check the link or fill in manually.' + (categoryLabel ? ` • ${categoryLabel}` : '');
            fetchPreview.classList.add('show');
        } finally {
            fetchBtn.classList.remove('loading');
            fetchBtn.disabled = false;
        }
    });

    // ==========================================
    //  RENDER
    // ==========================================

    function parsePrice(priceStr) {
        if (!priceStr) return Infinity;
        const cleaned = priceStr.replace(/[^\d.]/g, '');
        const val = parseFloat(cleaned);
        return isNaN(val) ? Infinity : val;
    }

    function parsePriceForTotal(priceStr) {
        if (!priceStr) return 0;
        const cleaned = priceStr.replace(/[^\d.]/g, '');
        const val = parseFloat(cleaned);
        return isNaN(val) ? 0 : val;
    }

    function updateSummary(filtered) {
        let total = 0;
        filtered.forEach(item => {
            total += parsePriceForTotal(item.price);
        });
        const currencyMatch = (filtered.find(i => i.price) || {}).price?.match(/^[^\d]/) || ['£'];
        const currency = currencyMatch[0];
        
        summaryText.textContent = `${filtered.length} items • ${currency}${total.toFixed(2)}`;
        wishlistSummary.style.display = 'block';
    }

    function getPlaceholderIcon(category) {
        const icons = {
            clothes: '👕',
            jewellery: '💎',
            shoes: '👟',
            bags: '👜',
            cosmetics: '💄',
            stationery: '✍️',
            home: '🏠',
            books: '📖',
            misc: '✦'
        };
        return icons[category] || '✦';
    }

    function render() {
        let filtered = items.filter(item => {
            // Category filter
            if (activeCategory !== 'all' && item.category !== activeCategory) return false;
            
            // Search filter
            if (currentSearch) {
                const searchLower = currentSearch.toLowerCase();
                const nameMatch = (item.name || '').toLowerCase().includes(searchLower);
                const urlMatch = (item.url || '').toLowerCase().includes(searchLower);
                const noteMatch = (item.note || '').toLowerCase().includes(searchLower);
                if (!nameMatch && !urlMatch && !noteMatch) return false;
            }
            
            // Price filter
            if (currentPriceFilter !== 'all') {
                const priceNum = parsePrice(item.price);
                if (currentPriceFilter === 'under25' && priceNum >= 25) return false;
                if (currentPriceFilter === '25to50' && (priceNum < 25 || priceNum > 50)) return false;
                if (currentPriceFilter === '50plus' && priceNum <= 50) return false;
            }
            
            return true;
        });

        // Calculate and update summary
        updateSummary(filtered);

        switch (activeSort) {
            case 'newest':
                filtered.sort((a, b) => {
                    if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
                    return (b.createdAt || 0) - (a.createdAt || 0);
                });
                break;
            case 'oldest':
                filtered.sort((a, b) => {
                    if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
                    return (a.createdAt || 0) - (b.createdAt || 0);
                });
                break;
            case 'price-low':
                filtered.sort((a, b) => {
                    if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
                    return parsePrice(a.price) - parsePrice(b.price);
                });
                break;
            case 'price-high':
                filtered.sort((a, b) => {
                    if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
                    return parsePrice(b.price) - parsePrice(a.price);
                });
                break;
            case 'name':
                filtered.sort((a, b) => {
                    if (a.is_priority !== b.is_priority) return a.is_priority ? -1 : 1;
                    return (a.name || '').localeCompare(b.name || '');
                });
                break;
        }

        grid.innerHTML = '';

        if (filtered.length === 0) {
            emptyState.style.display = 'block';
            grid.style.display = 'none';
            const emptyText = emptyState.querySelector('.empty-text');
            const emptyHint = document.getElementById('emptyHint');
            if (activeCategory === 'all') {
                emptyText.textContent = 'No items yet';
            } else {
                emptyText.textContent = `No ${CATEGORY_LABELS[activeCategory] || activeCategory} items`;
            }
            if (emptyHint) {
                emptyHint.textContent = currentUser ? 'Tap the + button to add an item' : 'Check back later for new items!';
            }
        } else {
            emptyState.style.display = 'none';
            grid.style.display = 'grid';

            const shouldGroup = activeCategory === 'clothes';

            if (shouldGroup) {
                const groups = {};
                const ungrouped = [];
                filtered.forEach(item => {
                    const sub = item.subcategory || '';
                    if (sub) {
                        if (!groups[sub]) groups[sub] = [];
                        groups[sub].push(item);
                    } else {
                        ungrouped.push(item);
                    }
                });

                const orderedKeys = Object.keys(SUBCATEGORY_LABELS).filter(k => groups[k]);
                Object.keys(groups).forEach(k => { if (!orderedKeys.includes(k)) orderedKeys.push(k); });

                let globalIndex = 0;
                orderedKeys.forEach(key => {
                    const header = document.createElement('div');
                    header.className = 'subcategory-header';
                    header.textContent = SUBCATEGORY_LABELS[key] || key;
                    grid.appendChild(header);

                    groups[key].forEach(item => {
                        grid.appendChild(createCard(item, globalIndex++));
                    });
                });

                if (ungrouped.length > 0) {
                    if (orderedKeys.length > 0) {
                        const header = document.createElement('div');
                        header.className = 'subcategory-header';
                        header.textContent = 'Uncategorised';
                        grid.appendChild(header);
                    }
                    ungrouped.forEach(item => {
                        grid.appendChild(createCard(item, globalIndex++));
                    });
                }
            } else {
                filtered.forEach((item, i) => {
                    grid.appendChild(createCard(item, i));
                });
            }
        }
    }

    function createCard(item, i) {
        const card = document.createElement('div');
        card.className = 'wish-card';
        card.style.animationDelay = `${i * 0.04}s`;

        const priceHtml = item.price
            ? `<div class="wish-card-price">${escapeHtml(item.price)}</div>`
            : '';
        const noteHtml = item.note
            ? `<div class="wish-card-note">${escapeHtml(item.note)}</div>`
            : '';
        const imageHtml = item.image
            ? `<img class="wish-card-image" src="${escapeHtml(item.image)}" alt="${escapeHtml(item.name)}" onerror="this.parentElement.classList.add('no-image'); this.remove();">`
            : '';
        const placeholderIcon = getPlaceholderIcon(item.category);
        const subcatHtml = item.subcategory && SUBCATEGORY_LABELS[item.subcategory]
            ? `<span class="wish-card-subcategory">${SUBCATEGORY_LABELS[item.subcategory]}</span>`
            : '';

        // Badges: admin never sees reservation info — only priority
        const badgesHtml = `
          <div class="item-badges">
            ${item.is_priority ? '<span class="badge-priority">⭐ Priority</span>' : ''}
          </div>
        `;

        // Action buttons differ by role
        let actionsHtml = '';
        if (currentUser) {
            // Admin: edit + delete only, no reservation info at all
            actionsHtml = `
              <button class="btn-copy btn-icon" data-url="${escapeHtml(item.url)}" aria-label="Copy Link" title="Copy Link" style="font-size: 14px;">🔗</button>
              <button class="btn-edit" data-id="${item.id}" aria-label="Edit item">✎</button>
              <button class="btn-delete" data-id="${item.id}" aria-label="Delete item">&times;</button>
            `;
        } else {
            // Guest: copy link + Claim / Claimed button
            actionsHtml = `
              <button class="btn-copy btn-icon" data-url="${escapeHtml(item.url)}" aria-label="Copy Link" title="Copy Link" style="font-size: 14px;">🔗</button>
              ${item.reserved_by
                ? `<span class="btn-claimed">Claimed</span>`
                : `<button class="btn-claim" data-id="${item.id}">Claim</button>`
              }
            `;
        }

        card.innerHTML = `
          <div class="wish-card-image-container">
            ${imageHtml}
            ${badgesHtml}
            <div class="wish-card-placeholder">${placeholderIcon}</div>
          </div>
          <div class="wish-card-body">
            <div class="wish-card-content">
              <div class="wish-card-name">${escapeHtml(item.name)}</div>
              <span class="wish-card-category">${CATEGORY_LABELS[item.category] || item.category}</span>
              ${subcatHtml}
              ${priceHtml}
              ${noteHtml}
              <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="wish-card-url" onclick="event.stopPropagation()">
                ${displayUrl(item.url)}
              </a>
            </div>
            <div class="item-actions">
              ${actionsHtml}
            </div>
          </div>
        `;

        card.addEventListener('click', async (e) => {
            // --- Copy button ---
            if (e.target.closest('.btn-copy')) {
                const url = e.target.closest('.btn-copy').dataset.url;
                try {
                    await navigator.clipboard.writeText(url);
                    showToast('Link copied!', true);
                } catch (err) {
                    console.error('Failed to copy', err);
                }
                return;
            }
            
            // --- "I'm getting this" claim button ---
            if (e.target.closest('.btn-claim')) {
                const name = prompt("Enter your name to claim this gift:");
                if (name && name.trim()) {
                    try {
                        const id = e.target.closest('.btn-claim').dataset.id;
                        await updateItem(id, { reserved_by: name.trim() });
                        items = await loadItems();
                        render();
                        showClaimConfirmation(item.name, name.trim());
                    } catch(err) {
                        alert("Failed to claim item.");
                    }
                }
                return;
            }
            
            // --- Edit / Delete / URL link clicks ---
            if (
                e.target.closest('.btn-delete') ||
                e.target.closest('.btn-edit') ||
                e.target.closest('.wish-card-url')
            )
                return;

            // --- CLAIMED ITEM INTERCEPT (guest only) ---
            // If item is claimed and user is NOT admin, block redirect & show popup
            if (item.reserved_by && !currentUser) {
                e.preventDefault();
                e.stopPropagation();
                showClaimedPopup(item.name, item.reserved_by);
                return;
            }

            window.open(item.url, '_blank', 'noopener,noreferrer');
        });

        return card;
    }

    // --- Claimed Item Popup (blocks redirect) ---
    function showClaimedPopup(itemName, claimedBy) {
        const overlay = document.createElement('div');
        overlay.className = 'claim-popup-overlay';
        overlay.innerHTML = `
          <div class="claim-popup">
            <div class="claim-popup-icon">×</div>
            <h2 class="claim-popup-title">Already Claimed</h2>
            <p class="claim-popup-text">
              <strong>${escapeHtml(claimedBy)}</strong> is already getting<br>
              <em>"${escapeHtml(itemName)}"</em>
            </p>
            <p class="claim-popup-hint">Please choose a different gift to avoid duplicates.</p>
            <button class="claim-popup-close">Got it</button>
          </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('open'));

        const close = () => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        };
        overlay.querySelector('.claim-popup-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    }

    // --- Claim Confirmation (after successfully claiming) ---
    function showClaimConfirmation(itemName, yourName) {
        const overlay = document.createElement('div');
        overlay.className = 'claim-popup-overlay';
        overlay.innerHTML = `
          <div class="claim-popup claim-popup-success">
            <div class="claim-popup-icon claim-popup-icon-tick">&#10003;</div>
            <h2 class="claim-popup-title">Claimed</h2>
            <p class="claim-popup-text">
              <strong>${escapeHtml(yourName)}</strong>, you've claimed<br>
              <em>"${escapeHtml(itemName)}"</em>
            </p>
            <p class="claim-popup-hint">Other visitors will see this gift is taken.</p>
            <button class="claim-popup-close">Done</button>
          </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('open'));

        const close = () => {
            overlay.classList.remove('open');
            setTimeout(() => overlay.remove(), 300);
        };
        overlay.querySelector('.claim-popup-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            tabs.forEach((t) => t.classList.remove('active'));
            tab.classList.add('active');
            activeCategory = tab.dataset.category;
            render();
        });
    });

    sortSelect.addEventListener('change', () => {
        activeSort = sortSelect.value;
        render();
    });

    searchInput.addEventListener('input', (e) => {
        currentSearch = e.target.value;
        render();
    });

    priceFilterSelect.addEventListener('change', () => {
        currentPriceFilter = priceFilterSelect.value;
        render();
    });
    


    function openModal() {
        modalOverlay.classList.add('open');
        addBtn.classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            document.getElementById('itemUrl').focus();
        }, 350);
    }

    function closeModal() {
        modalOverlay.classList.remove('open');
        addBtn.classList.remove('open');
        document.body.style.overflow = '';
        itemForm.reset();
        itemPriorityCheckbox.checked = false;
        fetchPreview.classList.remove('show');
        subcategoryGroup.style.display = 'none';
        subcategorySelect.value = '';
        if (editingItemId) {
            editingItemId = null;
            formSubmitBtn.textContent = 'Add Item';
            document.querySelector('.modal-title').textContent = 'Add to Wishlist';
        }
    }

    addBtn.addEventListener('click', () => {
        if (modalOverlay.classList.contains('open')) {
            closeModal();
        } else {
            openModal();
        }
    });

    modalClose.addEventListener('click', closeModal);

    modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (modalOverlay.classList.contains('open')) closeModal();
            if (authModalOverlay.classList.contains('open')) closeAuthModal();
        }
    });

    function openAuthModal() {
        authModalOverlay.classList.add('open');
        document.body.style.overflow = 'hidden';
        setTimeout(() => authPasswordInput.focus(), 350);
    }

    function closeAuthModal() {
        authModalOverlay.classList.remove('open');
        document.body.style.overflow = '';
        authForm.reset();
        authMessage.style.display = 'none';
        authMessage.className = 'auth-message';
    }

    authBtn.addEventListener('click', openAuthModal);
    authModalClose.addEventListener('click', closeAuthModal);

    authModalOverlay.addEventListener('click', (e) => {
        if (e.target === authModalOverlay) closeAuthModal();
    });

    authForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = authPasswordInput.value.trim();

        if (password === ADMIN_PASSWORD) {
            currentUser = { email: 'Admin (Hardcoded)', id: 'admin' };
            localStorage.setItem('wishlist_admin_session', 'true');
            updateAuthUI();
            closeAuthModal();
        } else {
            authMessage.textContent = 'Incorrect password.';
            authMessage.className = 'auth-message error';
            authMessage.style.display = 'block';
        }
    });

    logoutBtn.addEventListener('click', async () => {
        localStorage.removeItem('wishlist_admin_session');
        currentUser = null;
        updateAuthUI();
    });

    function updateAuthUI() {
        if (currentUser) {
            document.body.classList.add('is-authenticated');
            authBtn.style.display = 'none';
            userDisplay.style.display = 'flex';
            userEmailSpan.innerHTML = '<span class="admin-badge">Admin</span>';
        } else {
            document.body.classList.remove('is-authenticated');
            authBtn.style.display = 'block';
            userDisplay.style.display = 'none';
            userEmailSpan.textContent = '';
        }
        render();
    }

    itemForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('itemName').value.trim();
        const url = document.getElementById('itemUrl').value.trim();
        const note = document.getElementById('itemNote').value.trim();
        const category = document.getElementById('itemCategory').value;
        const price = document.getElementById('itemPrice').value.trim();
        const image = document.getElementById('itemImage').value.trim();
        const is_priority = itemPriorityCheckbox.checked;
        const subcategory = category === 'clothes' ? subcategorySelect.value : '';

        if (!name || !url) return;

        if (editingItemId) {
            await updateItem(editingItemId, { name, url, note, category, price, image, subcategory, is_priority });
            editingItemId = null;
            formSubmitBtn.textContent = 'Add Item';
            document.querySelector('.modal-title').textContent = 'Add to Wishlist';
        } else {
            const newItem = {
                id: uid(),
                name,
                url,
                note,
                category,
                price,
                image,
                subcategory,
                is_priority,
                createdAt: Date.now(),
            };
            await saveItem(newItem);
        }
        
        items = await loadItems();
        render();
        closeModal();
    });

    grid.addEventListener('click', (e) => {
        const editBtn = e.target.closest('.btn-edit');
        if (!editBtn) return;

        e.stopPropagation();
        const id = editBtn.dataset.id;
        const item = items.find(i => i.id === id);
        if (!item) return;

        editingItemId = id;
        document.getElementById('itemUrl').value = item.url || '';
        document.getElementById('itemName').value = item.name || '';
        document.getElementById('itemImage').value = item.image || '';
        document.getElementById('itemNote').value = item.note || '';
        document.getElementById('itemCategory').value = item.category || 'misc';
        document.getElementById('itemPrice').value = item.price || '';
        itemPriorityCheckbox.checked = !!item.is_priority;
        if (item.category === 'clothes') {
            subcategoryGroup.style.display = 'block';
            subcategorySelect.value = item.subcategory || '';
        } else {
            subcategoryGroup.style.display = 'none';
            subcategorySelect.value = '';
        }
        formSubmitBtn.textContent = 'Update Item';
        document.querySelector('.modal-title').textContent = 'Edit Item';
        openModal();
    });

    grid.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.btn-delete');
        if (!deleteBtn) return;

        e.stopPropagation();
        const id = deleteBtn.dataset.id;

        await removeItem(id);
        items = await loadItems();
        render();
    });

    function showToast(message = 'Item removed', showUndo = true) {
        clearTimeout(toastTimeout);
        toast.querySelector('.toast-text').textContent = message;
        toastUndo.style.display = showUndo ? 'inline-block' : 'none';
        toast.classList.add('show');
        toastTimeout = setTimeout(() => {
            toast.classList.remove('show');
            lastDeleted = null;
        }, 4000);
    }

    toastUndo.addEventListener('click', async () => {
        if (!lastDeleted) return;

        await saveItem(lastDeleted.item);
        items = await loadItems();
        render();

        lastDeleted = null;
        toast.classList.remove('show');
        clearTimeout(toastTimeout);
    });

    function startSupabaseKeepalive() {
        // Ping Supabase every 4 minutes to keep project active & prevent cold starts/pauses
        setInterval(async () => {
            try {
                await fetch(`${SUPABASE_URL}/rest/v1/wishlist?select=id&limit=1`, {
                    headers: getHeaders()
                });
                console.log('[Keepalive] Supabase pinged successfully');
            } catch (e) {
                console.warn('[Keepalive] Ping failed:', e);
            }
        }, 4 * 60 * 1000);
    }

    async function init() {
        items = await loadItems();
        render();

        if (localStorage.getItem('wishlist_admin_session') === 'true') {
            currentUser = { email: 'Admin (Hardcoded)', id: 'admin' };
            updateAuthUI();
        }

        startSupabaseKeepalive();
    }

    init();
})();
