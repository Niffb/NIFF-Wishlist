// ============================================
//  WISHLIST — App Logic
// ============================================

(function () {
    'use strict';

    // --- Constants ---
    const STORAGE_KEY = 'wishlist_items';
    const MICROLINK_API = 'https://api.microlink.io';
    const CATEGORIES = ['clothes', 'tech', 'accessories', 'health', 'home', 'misc'];
    const CATEGORY_LABELS = {
        clothes: 'Clothes',
        tech: 'Tech',
        accessories: 'Accessories',
        health: 'Health',
        home: 'Home',
        misc: 'Misc',
        // Aliases for stored database categories
        shoes: 'Clothes',
        watches: 'Accessories',
        jewellery: 'Accessories',
        edc: 'Accessories',
        bags: 'Accessories',
        stationery: 'Accessories',
        grooming: 'Health',
        cosmetics: 'Health',
        fitness: 'Health',
        books: 'Misc',
    };

    function getCategoryAlias(cat) {
        if (!cat) return 'misc';
        const lower = cat.toLowerCase();
        if (['clothes', 'shoes'].includes(lower)) return 'clothes';
        if (['tech'].includes(lower)) return 'tech';
        if (['accessories', 'watches', 'jewellery', 'edc', 'bags', 'stationery'].includes(lower)) return 'accessories';
        if (['health', 'grooming', 'cosmetics', 'fitness'].includes(lower)) return 'health';
        if (['home'].includes(lower)) return 'home';
        return 'misc';
    }

    const SUBCATEGORY_LABELS = {
        't-shirts': 'T-Shirts & Tees',
        shirts: 'Shirts & Polos',
        jumpers: 'Jumpers & Knitwear',
        hoodies: 'Hoodies & Sweatshirts',
        jackets: 'Jackets & Coats',
        trousers: 'Trousers & Jeans',
        shorts: 'Shorts',
        shoes: 'Shoes & Boots',
        suits: 'Suits & Tailoring',
        accessories: 'Hats & Accessories',
        other: 'Other',
        // Legacy compatibility
        tops: 'Shirts & Polos',
        dresses: 'Suits & Tailoring',
        skirts: 'Shorts',
        activewear: 'Shorts',
        underwear: 'Other',
        swimwear: 'Shorts',
    };

    // ==========================================
    //  AUTO-CATEGORISATION
    // ==========================================

    // Keyword maps for exact categories
    const CATEGORY_KEYWORDS = {
        clothes: ['shirt', 'shirts', 'polo', 'polos', 't-shirt', 'tshirt', 'tee', 'tees', 'jumper', 'jumpers', 'sweater', 'sweaters', 'hoodie', 'hoodies', 'sweatshirt', 'sweatshirts', 'jacket', 'jackets', 'coat', 'coats', 'blazer', 'blazers', 'suit', 'suits', 'trousers', 'pants', 'jeans', 'shorts', 'chino', 'chinos', 'shoe', 'shoes', 'sneaker', 'sneakers', 'trainer', 'trainers', 'boot', 'boots', 'loafer', 'loafers', 'slipper', 'footwear', 'underwear', 'boxers', 'socks', 'pyjamas', 'loungewear', 'tracksuit', 'dress', 'top'],
        tech: ['tech', 'gadget', 'gadgets', 'headphone', 'headphones', 'earphone', 'earphones', 'earbuds', 'speaker', 'speakers', 'monitor', 'keyboard', 'mouse', 'charger', 'powerbank', 'cable', 'phone', 'ipad', 'macbook', 'laptop', 'camera', 'drone', 'console', 'controller', 'gaming', 'smartwatch', 'apple watch', 'audio', 'wireless', 'bluetooth'],
        accessories: ['watch', 'watches', 'timepiece', 'chronograph', 'strap', 'watchband', 'sunglasses', 'shades', 'belt', 'belts', 'wallet', 'wallets', 'card-holder', 'cardholder', 'keychain', 'ring', 'rings', 'chain', 'bracelet', 'necklace', 'cufflink', 'cufflinks', 'edc', 'knife', 'knives', 'swiss army', 'multi-tool', 'multitool', 'tool', 'tools', 'flashlight', 'torch', 'pocket knife', 'pen', 'victorinox', 'leatherman', 'bag', 'bags', 'backpack', 'backpacks', 'rucksack', 'duffel', 'holdall', 'sling', 'crossbody', 'tote', 'pouch', 'luggage', 'jewellery', 'jewelry'],
        health: ['cologne', 'fragrance', 'perfume', 'eau de parfum', 'eau de toilette', 'aftershave', 'beard', 'shaving', 'razor', 'trimmer', 'clipper', 'pomade', 'hair clay', 'hair wax', 'skincare', 'skin-care', 'moisturiser', 'moisturizer', 'cleanser', 'serum', 'deodorant', 'shower gel', 'grooming', 'health', 'fitness', 'gym', 'workout', 'supplements', 'protein', 'vitamins', 'cosmetic', 'cosmetics'],
        home: ['home', 'homeware', 'furniture', 'coffee', 'espresso', 'mug', 'mugs', 'candle', 'candles', 'lamp', 'desk', 'chair', 'bedding', 'pillow', 'poster', 'art', 'plant', 'planter', 'glassware', 'decanter', 'decor', 'kitchen', 'mirror', 'storage'],
        misc: ['book', 'books', 'novel', 'hardback', 'paperback', 'hardcover', 'ebook', 'audiobook', 'manga', 'comic', 'graphic novel', 'biography', 'stationery', 'notebook', 'journal', 'misc', 'miscellaneous'],
    };

    // Subcategory keyword detection (for clothes only)
    const SUBCATEGORY_KEYWORDS = {
        't-shirts': ['t-shirt', 'tshirt', 'tee', 'tees', 'graphic tee', 'heavyweight tee'],
        shirts: ['shirt', 'shirts', 'polo', 'polos', 'button-down', 'overshirt', 'flannel', 'linen shirt', 'dress shirt', 'top'],
        jumpers: ['jumper', 'jumpers', 'sweater', 'sweaters', 'knitwear', 'knit', 'cardigan', 'pullover', 'crew neck'],
        hoodies: ['hoodie', 'hoodies', 'sweatshirt', 'sweatshirts', 'zip-up', 'zip up', 'tracksuit'],
        jackets: ['jacket', 'jackets', 'coat', 'coats', 'blazer', 'parka', 'gilet', 'anorak', 'windbreaker', 'bomber', 'denim jacket', 'leather jacket', 'puffer', 'fleece'],
        trousers: ['trousers', 'pants', 'jeans', 'chinos', 'cargo', 'joggers', 'sweatpants'],
        shorts: ['shorts', 'short', 'swim shorts', 'cargo shorts'],
        suits: ['suit', 'suits', 'tailoring', 'tuxedo', 'waistcoat'],
        activewear: ['activewear', 'sportswear', 'gym', 'running', 'workout', 'training', 'compression'],
        underwear: ['underwear', 'boxers', 'briefs', 'socks', 'pyjamas', 'pajamas', 'loungewear', 'sleepwear', 'robe'],
        accessories: ['cap', 'caps', 'beanie', 'hat', 'hats', 'scarf', 'scarves', 'gloves', 'belt', 'belts', 'tie', 'ties'],
    };

    // Domain patterns
    const TECH_DOMAINS = ['apple.com', 'currys', 'anker', 'logitech', 'keychron', 'razer', 'playstation', 'xbox', 'bose', 'sony', 'samsung', 'dji', 'garmin', 'corsair', 'elgato', 'scan.co.uk'];
    const ACCESSORY_DOMAINS = ['victorinox', 'heinnie', 'bladehq', 'leatherman', 'bellroy', 'benchmade', 'spyderco', 'gerber', 'olight', 'watch', 'seiko', 'casio', 'g-shock', 'gshock', 'tissot', 'omega', 'rolex', 'tudor', 'timex', 'hamilton', 'chimi', 'ray-ban', 'rayban', 'oakley', 'sunglasshut'];
    const HEALTH_DOMAINS = ['horace', 'manscaped', 'kiehls', 'byredo', 'boots', 'superdrug', 'lookfantastic', 'murdock', 'bulldog', 'hairstory', 'crew', 'gymshark', 'castore', 'underarmour', 'rapha', 'cotopaxi', 'patagonia', 'finisterre', 'myprotein', 'bulk', 'rogue', 'decathlon'];
    const FASHION_DOMAINS = ['mrporter', 'endclothing', 'ssense', 'percival', 'uniqlo', 'zara', 'hm', 'mango', 'asos', 'next', 'abercrombie', 'hollister', 'gap', 'levi', 'superdry', 'reiss', 'cos', 'arket', 'weekday', 'massimo', 'ralphlauren', 'tommy', 'lacoste', 'carhartt', 'stussy', 'palace', 'nike', 'adidas', 'puma', 'reebok', 'newbalance', 'converse', 'vans', 'drmartens', 'clarks', 'timberland', 'crocs', 'birkenstock', 'footlocker', 'jdsports', 'size'];
    const BOOK_DOMAINS = ['waterstones', 'bookdepository', 'penguin', 'harpercollins', 'panmacmillan', 'blackwells', 'foyles', 'wob', 'abebooks', 'wordery'];
    const HOME_DOMAINS = ['ikea', 'wayfair', 'dunelm', 'johnlewis', 'next', 'habitat', 'madecom', 'made', 'westelm', 'oliverbonas', 'zarahome', 'tkmaxx', 'homesense'];

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
            const scores = {};
            for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
                let score = 0;
                for (const kw of keywords) {
                    const regex = new RegExp(`(?:^|[\\s/\\-_.,])${kw.replace(/[-/]/g, '[\\-/]?')}(?:$|[\\s/\\-_.,])`, 'i');
                    if (regex.test(combined)) {
                        score += 1;
                        if (title && regex.test(title.toLowerCase())) score += 1;
                    }
                }
                if (score > 0) scores[cat] = score;
            }

            let bestCat = '';
            let bestScore = 0;
            for (const [cat, score] of Object.entries(scores)) {
                if (score > bestScore) {
                    bestScore = score;
                    bestCat = cat;
                }
            }

            if (bestCat) {
                result.category = bestCat;
            } else if (domainHint) {
                result.category = domainHint;
            }

            // --- Step 3: Detect subcategory if clothes ---
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
        for (const d of TECH_DOMAINS) {
            if (hostname.includes(d)) return 'tech';
        }
        for (const d of ACCESSORY_DOMAINS) {
            if (hostname.includes(d)) return 'accessories';
        }
        for (const d of HEALTH_DOMAINS) {
            if (hostname.includes(d)) return 'health';
        }
        for (const d of BOOK_DOMAINS) {
            if (hostname.includes(d)) return 'misc';
        }
        for (const d of HOME_DOMAINS) {
            if (hostname.includes(d)) return 'home';
        }
        for (const d of FASHION_DOMAINS) {
            if (hostname.includes(d)) return 'clothes';
        }
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

    /**
     * Auto-detect Volume / Weight / Quantity / Size from text metadata.
     */
    function detectVariant(text = '', title = '', url = '') {
        const combined = `${title} ${text} ${url}`.toLowerCase();
        
        // 1. Volume (e.g. 50ml, 100 ml, 3.4 fl oz, 1L)
        const volumeMatch = combined.match(/\b(\d+(?:\.\d+)?\s*(?:ml|l|fl\.?\s*oz|fluid\s*oz))\b/i);
        if (volumeMatch) {
            let v = volumeMatch[1].replace(/\s+/g, '');
            if (/fl\.?oz|fluid/i.test(v)) return v.replace(/fl\.?oz|fluidoz/i, ' fl oz');
            if (/ml/i.test(v)) return v.replace(/ml/i, 'ml');
            if (/^(\d+)l$/i.test(v)) return v.replace(/l$/i, 'L');
            return v;
        }
        
        // 2. Weight (e.g. 100g, 250 g, 1kg, 500g)
        const weightMatch = combined.match(/\b(\d+(?:\.\d+)?\s*(?:g|kg|lbs?))\b/i);
        if (weightMatch) {
            return weightMatch[1].replace(/\s+/g, '').toLowerCase();
        }
        
        // 3. Packs / Sets (e.g. Pack of 3, 3 Pack, Set of 2)
        const packMatch = combined.match(/\b(pack\s+of\s+\d+|\d+\s*pack|set\s+of\s+\d+)\b/i);
        if (packMatch) {
            return packMatch[1].replace(/\b\w/g, c => c.toUpperCase());
        }

        return '';
    }

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
    const itemVariantInput = document.getElementById('itemVariant');
    const shareBtn = document.getElementById('shareBtn');
    const refreshPricesBtn = document.getElementById('refreshPricesBtn');

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
        const isClothes = categorySelect.value === 'clothes';
        subcategoryGroup.style.display = isClothes ? 'block' : 'none';
        if (!isClothes) subcategorySelect.value = '';
    });

    // --- API Data Sync (Supabase) ---
    function getHeaders() {
        return {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
        };
    }

    // Encode variant, price history, and is_received into existing Supabase columns
    function toDbFormat(item, itemId = null) {
        const copy = { ...item };
        const idToFind = itemId || copy.id;
        const existing = idToFind ? items.find(i => i.id === idToFind) : null;
        
        // Convert createdAt to created_at
        if (copy.createdAt) {
            copy.created_at = copy.createdAt;
            delete copy.createdAt;
        }

        // Handle is_received by storing in reserved_by if special flag
        if (copy.is_received === true) {
            copy.reserved_by = '__RECEIVED__';
        } else if (copy.is_received === false) {
            copy.reserved_by = null;
        } else if (copy.reserved_by === '__RECEIVED__') {
            copy.reserved_by = null;
        }
        delete copy.is_received;

        // Check if note or metadata properties are explicitly provided in copy
        const noteExplicitlyPassed = copy.note !== undefined;
        const variantExplicitlyPassed = copy.variant !== undefined;
        const historyExplicitlyPassed = copy.price_history !== undefined;
        const origPriceExplicitlyPassed = copy.original_price !== undefined;
        const prevPriceExplicitlyPassed = copy.previous_price !== undefined;

        const isNoteOrMetaTouched = noteExplicitlyPassed || variantExplicitlyPassed || historyExplicitlyPassed || origPriceExplicitlyPassed || prevPriceExplicitlyPassed || !existing;

        if (isNoteOrMetaTouched) {
            const baseNote = noteExplicitlyPassed ? copy.note : (existing ? existing.note : '');
            const baseVariant = variantExplicitlyPassed ? copy.variant : (existing ? existing.variant : '');
            const baseOrig = origPriceExplicitlyPassed ? copy.original_price : (existing ? existing.original_price : (copy.price || (existing ? existing.price : '')));
            const basePrev = prevPriceExplicitlyPassed ? copy.previous_price : (existing ? existing.previous_price : '');
            const baseHist = historyExplicitlyPassed ? copy.price_history : (existing ? existing.price_history : []);

            // Clean base note from old metadata/variant tags
            let cleanNote = (baseNote || '').replace(/^\[[^\]]+\]\s*/, '');
            // Strip [PH:{...}] using balanced-bracket matching
            const phCleanIdx = cleanNote.indexOf('[PH:');
            if (phCleanIdx !== -1) {
                const afterPH = cleanNote.substring(phCleanIdx + 4);
                let d = 0, ep = -1;
                for (let i = 0; i < afterPH.length; i++) {
                    if (afterPH[i] === '{') d++;
                    else if (afterPH[i] === '}') { d--; if (d === 0 && afterPH[i + 1] === ']') { ep = i + 2; break; } }
                }
                if (ep !== -1) cleanNote = (cleanNote.substring(0, phCleanIdx) + cleanNote.substring(phCleanIdx + 4 + ep)).trim();
            }
            cleanNote = cleanNote.trim();

            let prefix = '';
            if (baseVariant) {
                prefix = `[${baseVariant}] `;
            }

            const phMeta = {
                orig: baseOrig || '',
                prev: basePrev || '',
                hist: Array.isArray(baseHist) ? baseHist : []
            };

            const phTag = ` [PH:${JSON.stringify(phMeta)}]`;
            copy.note = `${prefix}${cleanNote}${phTag}`.trim();
        } else {
            delete copy.note;
        }

        delete copy.variant;
        delete copy.original_price;
        delete copy.previous_price;
        delete copy.price_history;

        // Remove any unknown properties before sending to PostgREST
        const validColumns = ['id', 'name', 'url', 'note', 'category', 'price', 'image', 'subcategory', 'is_priority', 'reserved_by', 'created_at'];
        const dbPayload = {};
        for (const key of validColumns) {
            if (copy[key] !== undefined) {
                dbPayload[key] = copy[key];
            }
        }
        return dbPayload;
    }

    // Decode variant, price history, and is_received from existing Supabase columns
    function fromDbFormat(dbItem) {
        const item = {
            ...dbItem,
            createdAt: dbItem.created_at,
            is_received: dbItem.reserved_by === '__RECEIVED__',
            reserved_by: dbItem.reserved_by === '__RECEIVED__' ? null : dbItem.reserved_by,
            variant: '',
            note: dbItem.note || '',
            original_price: dbItem.price || '',
            previous_price: '',
            price_history: []
        };

        // 1. Unpack [PH:{...}] price history metadata if present
        // Use balanced-bracket matching to handle nested JSON (arrays/objects)
        const phStart = (item.note || '').indexOf('[PH:');
        if (phStart !== -1) {
            // Find the matching closing bracket by counting braces
            const afterPH = item.note.substring(phStart + 4); // after "[PH:"
            let depth = 0;
            let endPos = -1;
            for (let i = 0; i < afterPH.length; i++) {
                if (afterPH[i] === '{') depth++;
                else if (afterPH[i] === '}') {
                    depth--;
                    if (depth === 0) {
                        // Found the closing }, now expect ]
                        if (i + 1 < afterPH.length && afterPH[i + 1] === ']') {
                            endPos = i + 2; // include the ]
                        }
                        break;
                    }
                }
            }
            if (endPos !== -1) {
                const jsonStr = afterPH.substring(0, endPos - 1); // exclude the trailing ]
                try {
                    const meta = JSON.parse(jsonStr);
                    if (meta.orig) item.original_price = meta.orig;
                    if (meta.prev) item.previous_price = meta.prev;
                    item.price_history = Array.isArray(meta.hist) ? meta.hist : [];
                } catch (e) {}
                // Remove the full [PH:{...}] tag from note
                item.note = (item.note.substring(0, phStart) + item.note.substring(phStart + 4 + endPos)).trim();
            }
        }

        // 2. Unpack [variant] from note if present
        const variantMatch = (item.note || '').match(/^\[([^\]]+)\]\s*(.*)$/);
        if (variantMatch) {
            item.variant = variantMatch[1];
            item.note = variantMatch[2];
        }

        if (!item.original_price && item.price) {
            item.original_price = item.price;
        }

        // Ensure price_history has entries
        if (item.price) {
            const createdTime = item.createdAt ? (typeof item.createdAt === 'number' ? item.createdAt : new Date(item.createdAt).getTime()) : Date.now();

            if (!item.price_history || item.price_history.length === 0) {
                if (item.original_price && item.original_price !== item.price) {
                    item.price_history = [
                        { price: item.original_price, date: createdTime > 0 ? createdTime - 86400000 : Date.now() - 86400000 },
                        { price: item.price, date: createdTime > 0 ? createdTime : Date.now() }
                    ];
                } else {
                    item.price_history = [{ price: item.price, date: createdTime > 0 ? createdTime : Date.now() }];
                }
            } else {
                // If original_price exists, differs from current price, and is missing from history, prepend it
                if (item.original_price && item.original_price !== item.price) {
                    const hasOrig = item.price_history.some(h => h.price === item.original_price);
                    if (!hasOrig) {
                        const earliestDate = item.price_history.reduce((min, h) => Math.min(min, h.date || Infinity), Infinity);
                        const baseDate = earliestDate !== Infinity ? earliestDate : createdTime;
                        item.price_history.unshift({ price: item.original_price, date: baseDate - 86400000 });
                    }
                }
            }
        }

        return item;
    }

    async function loadItems() {
        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/wishlist?select=*&order=created_at.desc`, {
                headers: getHeaders()
            });
            if (!response.ok) throw new Error('Failed to load items from Supabase');
            const data = await response.json();
            
            return data.map(fromDbFormat);
        } catch (error) {
            console.error('Error loading items from Supabase:', error);
            return [];
        }
    }

    async function saveItem(item) {
        const dbItem = toDbFormat(item);

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
        const dbUpdates = toDbFormat(updates, id);

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

    const JUNK_TITLE_PATTERNS = [
        'robot check',
        'just a moment',
        'access denied',
        'are you a human',
        'pardon our interruption',
        'attention required',
        'security check',
        'cloudflare',
        'shield square',
        'incapsula',
        'distil',
        'perimeterx',
        'imperva',
        'blocked',
        'captcha',
        'verify you are human',
        'checking your browser',
        'human verification',
        'site maintenance',
        'service unavailable',
        '403 forbidden',
        '503 service',
        'please wait',
        'one moment',
        'challenge-platform',
        'ddos protection',
        'bot protection',
        'automated access',
        'browser check',
        'you have been blocked',
        'ray id',
        'enable javascript',
        'cookies are required',
        'loading...',
        'redirecting...',
        'please enable cookies',
        'error 403',
        'error 503',
        'page not found',
        '404 not found',
        'sorry, you have been blocked'
    ];

    // Brand-only titles that indicate the scraper only got the site name, not the product
    const BRAND_ONLY_TITLES = new Set([
        'amazon', 'boots', 'etsy', 'ebay', 'zara', 'nike', 'asos', 'adidas',
        'sephora', 'argos', 'currys', 'apple', 'samsung', 'john lewis',
        'selfridges', 'harrods', 'net-a-porter', 'farfetch', 'asos',
        'prettylittlething', 'boohoo', 'shein', 'h&m', 'uniqlo', 'mango',
        'cos', 'arket', 'weekday', 'monki', 'gap', 'next', 'primark',
        'urban outfitters', 'anthropologie', 'free people', 'lululemon',
        'new look', 'river island', 'topshop', 'missguided', 'plt',
        'abercrombie', 'hollister', 'superdry', 'pandora', 'victorinox',
        'the north face', 'patagonia', 'timberland', 'vans', 'converse',
        'puma', 'reebok', 'new balance', 'asics', 'under armour',
        'home', 'shop', 'store', 'welcome', 'official site', 'homepage'
    ]);

    function isJunkTitle(title) {
        if (!title || typeof title !== 'string') return true;
        const lower = title.toLowerCase().trim();
        if (lower.length < 2) return true;
        if (BRAND_ONLY_TITLES.has(lower)) return true;
        return JUNK_TITLE_PATTERNS.some(p => lower.includes(p));
    }

    // --- Clean Title Helper ---
    function cleanTitle(title, url) {
        if (!title || isJunkTitle(title)) return '';

        let cleaned = title;

        // 0. Strip anything after ? (query params leaking into titles)
        cleaned = cleaned.split('?')[0];

        // 0b. Strip symbols: ™ ® © ° ‡ † ‹ › « » and other non-product characters
        cleaned = cleaned.replace(/[™®©°‡†‹›«»✓✗★☆♦♣♠♥●▪▶◀◆■□▲△▼▽⬆⬇⬅➡→←↑↓§¶±≥≤≠≈∞∑∏∆√∫…·•‖¡¿⁰¹²³⁴⁵⁶⁷⁸⁹₀₁₂₃₄₅₆₇₈₉]/g, '');

        // 0c. Strip HTML entities that leaked through
        cleaned = cleaned.replace(/&(?:amp|lt|gt|quot|apos|nbsp|#\d+|#x[a-fA-F0-9]+);/g, ' ');

        // 0d. Strip UTM / tracking params that leaked into title
        cleaned = cleaned.replace(/utm_[a-z_]+=\S*/gi, '');

        // 0e. Strip encoded characters (%20 etc.)
        try { cleaned = decodeURIComponent(cleaned); } catch (e) {}

        // 0f. Strip remaining special chars that aren't punctuation
        cleaned = cleaned.replace(/[^\w\s\-'.,&:()\/]/g, ' ');

        // 0g. Collapse multiple spaces
        cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();

        // 1. Remove separators and what follows them if they look like site names
        const separators = [' | ', ' - ', ' – ', ' — ', ' : '];
        for (const sep of separators) {
            if (cleaned.includes(sep)) {
                const parts = cleaned.split(sep);
                const lastPart = parts[parts.length - 1].toLowerCase().trim();
                const firstPart = parts[0].toLowerCase().trim();
                // Common generic site words
                const genericWords = ['store', 'official', 'website', 'online', 'shop', 'amazon', 'etsy', 'ebay', 'asos', 'zara', 'h&m', 'abercrombie', 'hollister', 'men\'s', 'women\'s', 'clearance', 'sale', 'new arrivals', 'victorinox', 'sephora', 'boots', 'nike', 'adidas', 'home', 'buy'];
                
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

        // 1b. Strip trailing product IDs (numeric strings like "1005", "617432") and product codes
        cleaned = cleaned.replace(/\s+[\d.]{3,}$/, '').trim();
        cleaned = cleaned.replace(/\s+[A-Z0-9]{5,}\.\d+[A-Z]*$/i, '').trim();

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
            let pathParts = u.pathname.split('/').filter(Boolean);

            // Decode each segment and strip ™®© symbols
            pathParts = pathParts.map(p => {
                try { p = decodeURIComponent(p); } catch (e) {}
                return p.replace(/[™®©]/g, '');
            });

            // Common skip words (language, category, generic path segments)
            const skipWords = new Set(['uk', 'us', 'en', 'gb', 'eu', 'en-gb', 'en-us', 'de', 'fr', 'es', 'it', 'listing', 'product', 'products', 'item', 'items', 'shop', 'dp', 'p', 'prd', 'category', 'categories', 'collections', 'c', 'men', 'women', 'mens', 'womens', 'kids', 'sale', 'clearance', 'new', 'essentials', 'and-tools', 'tools', 'accessories']);

            // Strategy 1: Find the slug right BEFORE a product code segment (/p/, /dp/, /prd/)
            const codeIndicators = ['p', 'dp', 'prd', 'pid', 'sku'];
            for (let i = 0; i < pathParts.length; i++) {
                if (codeIndicators.includes(pathParts[i].toLowerCase()) && i > 0) {
                    const candidate = pathParts[i - 1];
                    if (candidate.length > 3 && !/^\d+$/.test(candidate)) {
                        return candidate
                            .replace(/[-_]+/g, ' ')
                            .replace(/\s+\d{4,}$/, '')
                            .replace(/\b\w/g, c => c.toUpperCase())
                            .trim();
                    }
                }
            }

            // Strategy 2: Find the most descriptive slug (longest non-generic, non-numeric)
            let best = '';
            let bestScore = 0;
            for (let part of pathParts) {
                part = part.split('?')[0];
                const lower = part.toLowerCase();
                if (/^\d+$/.test(part)) continue;
                if (/^\d{4,}/.test(part)) continue;
                if (/^[A-Z0-9]{3,}\.\d/.test(part)) continue; // Product codes like 0.6223.2PIS
                if (skipWords.has(lower)) continue;
                if (part.length < 3) continue;

                // Score: prefer longer slugs with hyphens (more descriptive)
                const score = part.length + (part.includes('-') ? 10 : 0);
                if (score > bestScore) {
                    best = part;
                    bestScore = score;
                }
            }

            if (best) {
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
            const pathParts = path.split('/').filter(Boolean);

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
                // ASOS: /product-name-slug/prd/12345678
                const prdMatch = path.match(/\/([^/]+)\/prd\/(\d+)/);
                if (prdMatch) {
                    result.name = prdMatch[1].replace(/-/g, ' ');
                    // ASOS CDN: https://images.asos-media.com/products/slug/ID-1?$n_640w$
                    const productId = prdMatch[2];
                    result.image = `https://images.asos-media.com/products/${prdMatch[1]}/${productId}-1?$n_640w$`;
                } else {
                    const parts = path.split('/').filter(p => p && p.includes('-'));
                    if (parts.length > 0) result.name = parts[0].replace(/-/g, ' ');
                }
            }
            // --- ABERCROMBIE / HOLLISTER ---
            else if (hostname.includes('abercrombie.') || hostname.includes('hollister.')) {
                const slugMatch = path.match(/\/p\/([^/?#]+)/);
                if (slugMatch) {
                    let slug = slugMatch[1];
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
            // --- NIKE ---
            else if (hostname.includes('nike.com')) {
                // Nike: /t/product-name/SKUCODE
                const tMatch = path.match(/\/t\/([^/]+)/);
                if (tMatch) result.name = tMatch[1].replace(/-/g, ' ');
            }
            // --- ADIDAS ---
            else if (hostname.includes('adidas.')) {
                // Adidas: /product-name-slug/PRODUCTCODE.html
                const slugMatch = path.match(/\/([^/]+-[^/]+)\/[A-Z0-9]+\.html/i);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ');
                else result.name = parseNameFromUrl(url);
            }
            // --- BOOTS ---
            else if (hostname.includes('boots.com')) {
                // Boots: /brand-product-name-10246231
                const slugParts = pathParts.filter(p => p.includes('-') && p.length > 5);
                if (slugParts.length > 0) {
                    result.name = slugParts[slugParts.length - 1].replace(/-\d{5,}$/, '').replace(/-/g, ' ');
                }
            }
            // --- SEPHORA ---
            else if (hostname.includes('sephora.')) {
                // Sephora: /brand/product-name-P12345
                const slugMatch = path.match(/\/([^/]+-P\d+)/i);
                if (slugMatch) {
                    result.name = slugMatch[1].replace(/-P\d+$/i, '').replace(/-/g, ' ');
                } else {
                    result.name = parseNameFromUrl(url);
                }
            }
            // --- SELFRIDGES ---
            else if (hostname.includes('selfridges.com')) {
                const slugMatch = path.match(/\/([^/]+_\d+)/);
                if (slugMatch) result.name = slugMatch[1].replace(/_\d+$/, '').replace(/[-_]/g, ' ');
                else result.name = parseNameFromUrl(url);
            }
            // --- JOHN LEWIS ---
            else if (hostname.includes('johnlewis.com')) {
                // /product-name/p12345
                const slugMatch = path.match(/\/([^/]+)\/p\d+/);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ');
                else result.name = parseNameFromUrl(url);
            }
            // --- ARGOS ---
            else if (hostname.includes('argos.co.uk')) {
                const slugMatch = path.match(/\/product\/\d+\/([^/?#]+)/);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ');
                else result.name = parseNameFromUrl(url);
            }
            // --- CURRYS ---
            else if (hostname.includes('currys.co.uk')) {
                const slugMatch = path.match(/\/([^/]+)\/\d{6,}/);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ');
                else result.name = parseNameFromUrl(url);
            }
            // --- PRETTYLITTLETHING ---
            else if (hostname.includes('prettylittlething.')) {
                const slugMatch = path.match(/\/([^/]+-\w+)\.html/i);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ');
                else result.name = parseNameFromUrl(url);
            }
            // --- BOOHOO ---
            else if (hostname.includes('boohoo.com')) {
                const slugMatch = path.match(/\/([^/]+)\.html/i);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ');
                else result.name = parseNameFromUrl(url);
            }
            // --- SHEIN ---
            else if (hostname.includes('shein.')) {
                const slugMatch = path.match(/\/([^/]+-p-\d+)/i);
                if (slugMatch) result.name = slugMatch[1].replace(/-p-\d+$/, '').replace(/-/g, ' ');
                else result.name = parseNameFromUrl(url);
            }
            // --- UNIQLO ---
            else if (hostname.includes('uniqlo.com')) {
                result.name = parseNameFromUrl(url);
            }
            // --- APPLE ---
            else if (hostname.includes('apple.com')) {
                // Apple: /shop/product/MLXY3B/product-name or /iphone-16-pro
                const productMatch = path.match(/\/shop\/product\/[A-Z0-9]+\/([^/?#]+)/i);
                if (productMatch) result.name = productMatch[1].replace(/-/g, ' ');
                else result.name = parseNameFromUrl(url);
            }
            // --- URBAN OUTFITTERS ---
            else if (hostname.includes('urbanoutfitters.com')) {
                const slugMatch = path.match(/\/shop\/([^/?#]+)/);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ');
                else result.name = parseNameFromUrl(url);
            }
            // --- PANDORA ---
            else if (hostname.includes('pandora.')) {
                result.name = parseNameFromUrl(url);
            }
            // --- NEXT ---
            else if (hostname.includes('next.co.uk')) {
                const slugMatch = path.match(/\/style\/[a-z]+\d+\/([^/?#]+)/i);
                if (slugMatch) result.name = slugMatch[1].replace(/-/g, ' ').replace(/#.*/, '');
                else result.name = parseNameFromUrl(url);
            }
            // --- VICTORINOX ---
            else if (hostname.includes('victorinox.')) {
                // /en-GB/Products/Category/SubCat/Product-Name/p/CODE
                const pIndex = pathParts.findIndex(p => p.toLowerCase() === 'p');
                if (pIndex > 0) {
                    result.name = pathParts[pIndex - 1].replace(/-/g, ' ');
                } else {
                    result.name = parseNameFromUrl(url);
                }
            }
            // --- Generic: try URL slug ---
            else {
                result.name = parseNameFromUrl(url);
            }

            // Clean up name if found — strip symbols and title case
            if (result.name) {
                result.name = result.name
                    .replace(/[™®©]/g, '')
                    .split(' ')
                    .filter(w => w.length > 0)
                    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                    .join(' ')
                    .trim();
                // Strip trailing product codes/IDs
                result.name = result.name.replace(/\s+[\d.]{5,}$/, '').trim();
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

            // --- 5. Additional image extraction (if still missing) ---
            if (!result.image.url) {
                // Try common product image selectors
                const imgSelectors = [
                    'img[data-zoom-image]',        // Zoom image attribute
                    'img.product-image',            // Common class
                    'img.pdp-image',                // Product detail page image
                    'img[data-main-image]',         // Main image marker
                    '.product-gallery img',         // Gallery images
                    '.product-media img',           // Media container
                    '.product-hero img',            // Hero image
                    '#product-image img',           // Product image ID
                    '[data-testid="product-image"] img',
                    '.slick-active img',            // Carousel active slide
                    'picture source[type="image/webp"]', // Modern picture element
                ];
                for (const selector of imgSelectors) {
                    try {
                        const el = doc.querySelector(selector);
                        if (el) {
                            const imgUrl = el.getAttribute('data-zoom-image') ||
                                          el.getAttribute('data-src') ||
                                          el.getAttribute('data-original') ||
                                          el.getAttribute('data-lazy-src') ||
                                          el.getAttribute('srcset')?.split(',')[0]?.trim()?.split(' ')[0] ||
                                          el.getAttribute('src') ||
                                          el.getAttribute('content') || '';
                            if (imgUrl && imgUrl.startsWith('http') && !imgUrl.includes('favicon') && !imgUrl.includes('logo')) {
                                result.image.url = imgUrl;
                                break;
                            }
                        }
                    } catch (e) {}
                }
            }

            // --- 6. Extract image from inline JSON/JS data (for SPAs) ---
            if (!result.image.url) {
                const scriptEls = doc.querySelectorAll('script:not([type]), script[type="text/javascript"]');
                for (const script of scriptEls) {
                    const text = script.textContent || '';
                    if (text.length < 100 || text.length > 500000) continue;
                    // Look for image URLs in JS data
                    const imgMatch = text.match(/"(?:imageUrl|imageSrc|productImage|mainImage|heroImage|primaryImage|fullImage|largeImage)"\s*:\s*"(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i);
                    if (imgMatch && !imgMatch[1].includes('favicon') && !imgMatch[1].includes('logo')) {
                        result.image.url = imgMatch[1].replace(/\\\//g, '/');
                        break;
                    }
                }
            }

        } catch (e) {
            console.warn('HTML extraction error:', e);
        }

        return result;
    }

    // Try fetching product data from multiple sources with tight timeouts
    async function fetchProductData(url) {
        // --- Source 1: Our server-side proxy (fastest) ---
        try {
            const response = await fetch(`/api/fetch-page?url=${encodeURIComponent(url)}`, {
                signal: AbortSignal.timeout(3500)
            });
            if (response.ok) {
                const json = await response.json();
                if (json.html && json.html.length > 200) {
                    const extracted = extractProductDataFromHtml(json.html, url);
                    if (extracted.title || extracted.price || extracted.image.url) {
                        console.log('[Scraper] Server proxy succeeded:', extracted.title);
                        return { source: 'server-proxy', data: extracted };
                    }
                }
            }
        } catch (e) {
            console.warn('Server proxy timeout/failed:', e.message);
        }

        // --- Source 2: Microlink API (3s timeout) ---
        try {
            const response = await fetch(
                `${MICROLINK_API}?url=${encodeURIComponent(url)}&meta=true`,
                { signal: AbortSignal.timeout(3000) }
            );
            const json = await response.json();
            if (json.status === 'success' && json.data) {
                return { source: 'microlink', data: json.data };
            }
        } catch (e) {
            console.warn('Microlink fetch timeout/failed:', e.message);
        }

        // --- Source 3: CORS proxy fallback ---
        try {
            const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
            const response = await fetch(proxyUrl, { signal: AbortSignal.timeout(3000) });
            if (response.ok) {
                const text = await response.text();
                if (text && text.length > 500) {
                    const extracted = extractProductDataFromHtml(text, url);
                    if (extracted.title || extracted.price || extracted.image.url) {
                        return { source: 'proxy', data: extracted };
                    }
                }
            }
        } catch (e) {
            console.warn('CORS proxy failed:', e.message);
        }

        return null;
    }

    document.getElementById('itemUrl').addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            fetchBtn.click();
        }
    });

    // --- LIGHTNING FAST PARALLEL FETCH HANDLER ---
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

        // 0ms INSTANT PARSE: fill URL slug details immediately
        const domainData = parseDomainSpecifics(url);
        const parsedSlugName = domainData.name || parseNameFromUrl(url);
        if (parsedSlugName) nameInput.value = parsedSlugName;

        const instantCategory = detectCategory(url, parsedSlugName, '');
        applyCategoryToForm(instantCategory);

        const instantVariant = detectVariant('', parsedSlugName, url);
        if (instantVariant && itemVariantInput) itemVariantInput.value = instantVariant;

        const searchName = parsedSlugName || domainData.name || 'product';

        try {
            // PARALLEL EXECUTION: Fire Page Fetch, Image Search, and Price Search simultaneously!
            const [pageResult, imageResult, priceResult] = await Promise.allSettled([
                fetchProductData(url),
                fetch(`/api/search-image?q=${encodeURIComponent(searchName)}&url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(3000) }).then(r => r.ok ? r.json() : null),
                fetch(`/api/search-product?q=${encodeURIComponent(searchName)}&url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(3000) }).then(r => r.ok ? r.json() : null)
            ]);

            const fetchResult = pageResult.status === 'fulfilled' ? pageResult.value : null;
            const imgSearchData = imageResult.status === 'fulfilled' ? imageResult.value : null;
            const priceSearchData = priceResult.status === 'fulfilled' ? priceResult.value : null;

            const data = fetchResult?.data || null;
            const isJunk = !data || !data.title || isJunkTitle(data.title);

            // 1. Resolve Best Product Name
            let finalName = parsedSlugName;
            if (data && !isJunk) {
                const cleaned = cleanTitle(data.title, url);
                if (cleaned) finalName = cleaned;
            }
            nameInput.value = finalName || 'Product';

            // 2. Resolve Best Product Image
            const normalizeUrl = (imgUrl) => {
                if (!imgUrl) return null;
                if (typeof imgUrl === 'object') imgUrl = imgUrl.url;
                if (!imgUrl || typeof imgUrl !== 'string') return null;
                try { return new URL(imgUrl, url).href; } catch { return imgUrl; }
            };

            let bestImage = '';
            if (data && !isJunk) {
                const candidates = [
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
                bestImage = candidates[0] || '';
            }

            if (!bestImage || bestImage.includes('favicon')) {
                // Prefer domain-specific CDN images (e.g. ASOS) over search results
                if (domainData.image && domainData.image.includes('asos-media.com')) {
                    bestImage = domainData.image;
                } else if (imgSearchData?.best) {
                    bestImage = imgSearchData.best;
                } else if (imgSearchData?.images?.length > 0) {
                    bestImage = imgSearchData.images[0];
                } else if (domainData.image) {
                    bestImage = domainData.image;
                }
                // No fallback to thum.io — a missing image is better than a page screenshot
            }
            imageInput.value = bestImage;

            // 3. Resolve Best Price
            let detectedPrice = '';
            if (data && !isJunk) {
                if (data.price && typeof data.price === 'string') {
                    detectedPrice = data.price;
                } else if (data.price && typeof data.price === 'number') {
                    detectedPrice = `£${data.price}`;
                } else {
                    const searchStr = [data.description, data.title, typeof data.text === 'string' ? data.text : ''].join(' ');
                    const currencyRegex = /(?:£|€|\$)\s?[\d,.]+(?:\.\d{2})?/;
                    const priceMatch = searchStr.match(currencyRegex);
                    if (priceMatch) detectedPrice = priceMatch[0];
                }
            }

            if (!detectedPrice && priceSearchData?.price) {
                detectedPrice = priceSearchData.price;
            }

            if (detectedPrice) {
                if (!/^(?:£|€|\$)/.test(detectedPrice)) {
                    const cleanNum = parseFloat(detectedPrice.replace(/[^\d.]/g, ''));
                    if (!isNaN(cleanNum)) detectedPrice = `£${cleanNum.toFixed(2)}`;
                }
                priceInput.value = detectedPrice;
            }

            // 4. Resolve Category & Variant
            const finalCategory = detectCategory(url, finalName, data?.description || '');
            applyCategoryToForm(finalCategory);

            const finalVariant = detectVariant(data?.description || '', finalName, url);
            if (finalVariant && itemVariantInput) {
                itemVariantInput.value = finalVariant;
            }

            // 5. Update Preview Card
            fetchPreviewImg.src = bestImage;
            fetchPreviewImg.style.display = bestImage ? 'block' : 'none';
            fetchPreviewTitle.textContent = finalName;

            const categoryLabel = finalCategory.category ? CATEGORY_LABELS[finalCategory.category] || finalCategory.category : '';
            const subLabel = finalCategory.subcategory && finalCategory.subcategory !== 'other' ? SUBCATEGORY_LABELS[finalCategory.subcategory] || finalCategory.subcategory : '';
            const catInfo = categoryLabel ? ` • ${categoryLabel}${subLabel ? ' › ' + subLabel : ''}` : '';
            const priceInfo = detectedPrice ? `Price: ${detectedPrice}` : '';
            fetchPreviewDesc.textContent = (priceInfo || 'Product details fetched') + catInfo;

            fetchPreview.classList.add('show');

        } catch (err) {
            console.warn('[Parallel Scraper] Exception:', err);
            fetchPreviewTitle.textContent = nameInput.value || 'Product Link';
            fetchPreviewDesc.textContent = 'Details fetched';
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

    function getNumericPrice(priceStr) {
        if (!priceStr) return 0;
        const cleaned = priceStr.replace(/[^\d.]/g, '');
        const val = parseFloat(cleaned);
        return isNaN(val) ? 0 : val;
    }

    function calculatePriceDrop(item) {
        const currVal = getNumericPrice(item.price);
        const origVal = getNumericPrice(item.original_price);
        const prevVal = getNumericPrice(item.previous_price);

        if (origVal > 0 && currVal > 0 && currVal < origVal) {
            const diff = origVal - currVal;
            const percent = Math.round((diff / origVal) * 100);
            const symbol = (item.price && item.price.match(/^[^\d\s]/) || item.original_price.match(/^[^\d\s]/) || ['£'])[0];
            return {
                hasDrop: true,
                diffFormatted: `${symbol}${diff.toFixed(2)}`,
                percent,
                origFormatted: item.original_price
            };
        }

        if (prevVal > 0 && currVal > 0 && currVal < prevVal) {
            const diff = prevVal - currVal;
            const percent = Math.round((diff / prevVal) * 100);
            const symbol = (item.price && item.price.match(/^[^\d\s]/) || ['£'])[0];
            return {
                hasDrop: true,
                diffFormatted: `${symbol}${diff.toFixed(2)}`,
                percent,
                origFormatted: item.previous_price
            };
        }

        return { hasDrop: false };
    }

    function openPriceHistoryModal(item) {
        const historyModalOverlay = document.getElementById('historyModalOverlay');
        const historyModalTitle = document.getElementById('historyModalTitle');
        const historySummary = document.getElementById('historySummary');
        const historyTimeline = document.getElementById('historyTimeline');

        if (!historyModalOverlay) return;

        historyModalTitle.textContent = item.name ? `${item.name} — Price History` : 'Price History';

        const dropInfo = calculatePriceDrop(item);
        const origVal = item.original_price || item.price || '—';
        const currVal = item.price || '—';
        
        let lowestVal = currVal;
        let lowestNum = getNumericPrice(currVal);
        const history = item.price_history || [{ price: item.price, date: item.createdAt || Date.now() }];
        
        history.forEach(entry => {
            const num = getNumericPrice(entry.price);
            if (num > 0 && (lowestNum === 0 || num < lowestNum)) {
                lowestNum = num;
                lowestVal = entry.price;
            }
        });

        historySummary.innerHTML = `
          <div class="history-stat-box">
            <span class="history-stat-label">Original</span>
            <span class="history-stat-value">${escapeHtml(origVal)}</span>
          </div>
          <div class="history-stat-box">
            <span class="history-stat-label">Current</span>
            <span class="history-stat-value ${dropInfo.hasDrop ? 'drop' : ''}">${escapeHtml(currVal)}</span>
          </div>
          <div class="history-stat-box">
            <span class="history-stat-label">Lowest</span>
            <span class="history-stat-value drop">${escapeHtml(lowestVal)}</span>
          </div>
        `;

        const sortedHistory = [...history].sort((a, b) => (b.date || 0) - (a.date || 0));

        let timelineHtml = '';
        sortedHistory.forEach((entry, idx) => {
            const dateStr = entry.date ? new Date(entry.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : 'Initial';
            const priceNum = getNumericPrice(entry.price);
            const prevEntry = sortedHistory[idx + 1];
            const prevNum = prevEntry ? getNumericPrice(prevEntry.price) : priceNum;

            let tagHtml = `<span class="history-tag tag-initial">Initial</span>`;
            if (prevEntry) {
                if (priceNum < prevNum) {
                    tagHtml = `<span class="history-tag tag-drop">Drop</span>`;
                } else if (priceNum > prevNum) {
                    tagHtml = `<span class="history-tag tag-increase">Increase</span>`;
                } else {
                    tagHtml = `<span class="history-tag tag-initial">Unchanged</span>`;
                }
            }

            timelineHtml += `
              <div class="history-item">
                <span class="history-date">${escapeHtml(dateStr)}</span>
                <div class="history-price-val">
                  <span>${escapeHtml(entry.price)}</span>
                  ${tagHtml}
                </div>
              </div>
            `;
        });

        historyTimeline.innerHTML = timelineHtml;
        historyModalOverlay.classList.add('show');
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
        return '✦';
    }

    function render() {
        let filtered = items.filter(item => {
            // Received tab vs active wishlist
            if (activeCategory === 'received') {
                if (!item.is_received) return false;
            } else {
                if (item.is_received) return false;
            }

            // Priority tab vs category tabs
            if (activeCategory === 'priority') {
                if (!item.is_priority) return false;
            } else if (activeCategory !== 'all' && activeCategory !== 'received') {
                const itemAlias = getCategoryAlias(item.category);
                if (itemAlias !== activeCategory && item.category !== activeCategory) return false;
            }
            
            // Search filter
            if (currentSearch) {
                const searchLower = currentSearch.toLowerCase();
                const nameMatch = (item.name || '').toLowerCase().includes(searchLower);
                const urlMatch = (item.url || '').toLowerCase().includes(searchLower);
                const noteMatch = (item.note || '').toLowerCase().includes(searchLower);
                const variantMatch = (item.variant || '').toLowerCase().includes(searchLower);
                if (!nameMatch && !urlMatch && !noteMatch && !variantMatch) return false;
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

        const dropInfo = calculatePriceDrop(item);
        
        let priceHtml = '';
        if (item.price) {
            const origPriceSpan = dropInfo.hasDrop
                ? `<span class="wish-card-price-orig">${escapeHtml(dropInfo.origFormatted)}</span>`
                : '';
            const historyBtn = `<button class="btn-price-history" data-id="${item.id}" title="View Price History" aria-label="View Price History">History</button>`;
            priceHtml = `
              <div class="wish-card-price-wrapper">
                ${origPriceSpan}
                <div class="wish-card-price">${escapeHtml(item.price)}</div>
                ${historyBtn}
              </div>
            `;
        }

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
        const variantHtml = item.variant
            ? `<span class="wish-card-variant">${escapeHtml(item.variant)}</span>`
            : '';

        // Badges: admin never sees reservation info — priority & price drop
        const dropBadge = dropInfo.hasDrop
            ? `<span class="badge-price-drop">-${dropInfo.diffFormatted} (${dropInfo.percent}%)</span>`
            : '';

        const badgesHtml = `
          <div class="item-badges">
            ${item.is_priority ? '<span class="badge-priority">Priority</span>' : ''}
            ${dropBadge}
          </div>
        `;

        // Action buttons differ by role
        let actionsHtml = '';
        if (currentUser) {
            // Admin: copy, mark received/unarchive, edit, delete
            actionsHtml = `
              <button class="btn-copy btn-icon" data-url="${escapeHtml(item.url)}" aria-label="Copy Link" title="Copy Link" style="font-size: 14px;">🔗</button>
              <button class="${item.is_received ? 'btn-unarchive' : 'btn-received'}" data-id="${item.id}" aria-label="${item.is_received ? 'Move back to wishlist' : 'Mark as received'}" title="${item.is_received ? 'Move back to wishlist' : 'Mark as received'}">${item.is_received ? '↩' : '✓'}</button>
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
            <h3 class="wish-card-name">${escapeHtml(item.name)}</h3>
            <div class="wish-card-meta">
              <span class="wish-card-category">${CATEGORY_LABELS[item.category] || item.category}</span>
              ${subcatHtml}
              ${variantHtml}
            </div>
            ${noteHtml}
            <div class="wish-card-footer">
              ${priceHtml}
              <a href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer" class="wish-card-url" onclick="event.stopPropagation()">
                ${displayUrl(item.url)}
              </a>
            </div>
          </div>
          <div class="item-actions">
            ${actionsHtml}
          </div>
        `;

        card.addEventListener('click', async (e) => {
            // --- Price History button ---
            if (e.target.closest('.btn-price-history')) {
                e.stopPropagation();
                openPriceHistoryModal(item);
                return;
            }

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
            
            // --- Mark as Received / Unarchive button ---
            if (e.target.closest('.btn-received') || e.target.closest('.btn-unarchive')) {
                const btn = e.target.closest('.btn-received') || e.target.closest('.btn-unarchive');
                const id = btn.dataset.id;
                const itemToToggle = items.find(i => i.id === id);
                if (itemToToggle) {
                    const newStatus = !itemToToggle.is_received;
                    await updateItem(id, { ...itemToToggle, is_received: newStatus });
                    items = await loadItems();
                    render();
                    showToast(newStatus ? 'Marked as received' : 'Moved back to active list', false);
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
                showClaimedPopup(item.name, item.reserved_by, item.id);
                return;
            }

            window.open(item.url, '_blank', 'noopener,noreferrer');
        });

        return card;
    }

    // --- Claimed Item Popup (blocks redirect) ---
    function showClaimedPopup(itemName, claimedBy, itemId) {
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
            <div class="claim-popup-actions">
              <button class="claim-popup-close">Got it</button>
              ${itemId ? `<button class="btn-unclaim-link" id="unclaimLink">Was this you? Tap to unclaim</button>` : ''}
            </div>
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

        const unclaimBtn = overlay.querySelector('#unclaimLink');
        if (unclaimBtn && itemId) {
            unclaimBtn.addEventListener('click', async () => {
                const inputName = prompt(`Enter the name used when claiming ("${claimedBy}") to unclaim:`);
                if (inputName && inputName.trim().toLowerCase() === claimedBy.trim().toLowerCase()) {
                    try {
                        await updateItem(itemId, { reserved_by: null });
                        items = await loadItems();
                        render();
                        close();
                        showToast('Gift unclaimed successfully', false);
                    } catch(err) {
                        alert('Failed to unclaim item.');
                    }
                } else if (inputName) {
                    alert('Name does not match.');
                }
            });
        }
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

    // Function to set active category and scroll tab into view
    function setCategory(catName) {
        activeCategory = catName;
        tabs.forEach((tab) => {
            if (tab.dataset.category === catName) {
                tab.classList.add('active');
                tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            } else {
                tab.classList.remove('active');
            }
        });
        render();
    }

    tabs.forEach((tab) => {
        tab.addEventListener('click', () => {
            setCategory(tab.dataset.category);
        });
    });

    // --- Touch Swipe Left/Right Navigation between Categories ---
    (function initSwipeNavigation() {
        const categories = Array.from(tabs).map(t => t.dataset.category);
        let touchStartX = 0;
        let touchStartY = 0;

        document.addEventListener('touchstart', (e) => {
            // Don't intercept swipe inside modals, form inputs or overlays
            if (e.target.closest('.modal-overlay') || e.target.closest('input') || e.target.closest('select') || e.target.closest('button')) {
                touchStartX = 0;
                return;
            }
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });

        document.addEventListener('touchend', (e) => {
            if (!touchStartX) return;
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndY = e.changedTouches[0].clientY;

            const diffX = touchEndX - touchStartX;
            const diffY = touchEndY - touchStartY;

            // Ensure gesture was primarily horizontal swipe (threshold: 50px horizontal, less than 40px vertical)
            if (Math.abs(diffX) > 50 && Math.abs(diffY) < 40) {
                const currentIndex = categories.indexOf(activeCategory);
                if (currentIndex === -1) return;

                if (diffX < 0 && currentIndex < categories.length - 1) {
                    // Swipe Left -> Next Category
                    setCategory(categories[currentIndex + 1]);
                } else if (diffX > 0 && currentIndex > 0) {
                    // Swipe Right -> Previous Category
                    setCategory(categories[currentIndex - 1]);
                }
            }
            touchStartX = 0;
            touchStartY = 0;
        }, { passive: true });
    })();

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
        if (itemVariantInput) itemVariantInput.value = '';
        fetchPreview.classList.remove('show');
        subcategoryGroup.style.display = 'none';
        subcategorySelect.value = '';
        if (editingItemId) {
            editingItemId = null;
            formSubmitBtn.textContent = 'Add Item';
            document.querySelector('.modal-title').textContent = 'Add to Wishlist';
        }
    }

    // Share Button Event Listener
    if (shareBtn) {
        shareBtn.addEventListener('click', async () => {
            const shareData = {
                title: "NIFF's WISHLIST",
                text: "Check out NIFF's WISHLIST!",
                url: window.location.href
            };
            if (navigator.share) {
                try {
                    await navigator.share(shareData);
                } catch (err) {
                    if (err.name !== 'AbortError') console.warn('Share error:', err);
                }
            } else {
                try {
                    await navigator.clipboard.writeText(window.location.href);
                    showToast('Wishlist link copied to clipboard!', false);
                } catch (err) {
                    showToast('Failed to copy link', false);
                }
            }
        });
    }

    // Refresh Prices Button Event Listener
    if (refreshPricesBtn) {
        refreshPricesBtn.addEventListener('click', async () => {
            refreshPricesBtn.classList.add('loading');
            refreshPricesBtn.textContent = 'Checking...';
            showToast('Re-scraping pages for price updates...', false);

            try {
                const res = await fetch('/api/refresh-prices');
                const data = await res.json();
                
                // Reload latest items
                items = await loadItems();
                render();

                if (data.updated > 0) {
                    showToast(`Updated ${data.updated} price(s)!`, false);
                } else {
                    showToast(`All ${data.verified || items.length} prices verified up to date`, false);
                }
            } catch (err) {
                console.error('Refresh prices error:', err);
                showToast('Failed to refresh prices', false);
            } finally {
                refreshPricesBtn.classList.remove('loading');
                refreshPricesBtn.textContent = 'Refresh Prices';
            }
        });
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
        const HARDCODED_ADMIN_PASS = 'Karamalis1310!';

        let authenticated = false;

        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            if (res.ok) {
                const data = await res.json();
                if (data.success) authenticated = true;
            } else {
                // If API endpoint returns 404/405 on static hosting (e.g. GitHub Pages)
                if (password === HARDCODED_ADMIN_PASS) {
                    authenticated = true;
                }
            }
        } catch (err) {
            // Network error fallback
            if (password === HARDCODED_ADMIN_PASS) {
                authenticated = true;
            }
        }

        if (authenticated) {
            currentUser = { email: 'Admin', id: 'admin' };
            localStorage.setItem('wishlist_admin_session', 'true');
            updateAuthUI();
            closeAuthModal();
            render();
            showToast('Logged in as Admin', false);
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
        const receivedTab = document.getElementById('receivedTab');
        if (currentUser) {
            document.body.classList.add('is-authenticated');
            authBtn.style.display = 'none';
            userDisplay.style.display = 'flex';
            userEmailSpan.innerHTML = '<span class="admin-badge">Admin</span>';
            if (receivedTab) receivedTab.style.display = 'inline-block';
        } else {
            document.body.classList.remove('is-authenticated');
            authBtn.style.display = 'block';
            userDisplay.style.display = 'none';
            userEmailSpan.textContent = '';
            if (receivedTab) receivedTab.style.display = 'none';
            if (activeCategory === 'received') activeCategory = 'all';
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
        const variant = itemVariantInput ? itemVariantInput.value.trim() : '';
        const is_priority = itemPriorityCheckbox.checked;
        const subcategory = category === 'clothes' ? subcategorySelect.value : '';

        if (!name || !url) return;

        if (editingItemId) {
            const existing = items.find(i => i.id === editingItemId);
            let history = existing ? [...(existing.price_history || [])] : [];
            const oldPrice = existing ? existing.price : '';
            const origPrice = existing ? (existing.original_price || oldPrice || price) : price;
            
            if (price && price !== oldPrice) {
                if (history.length === 0 && oldPrice) {
                    history.push({ price: oldPrice, date: existing.createdAt || Date.now() - 1000 });
                }
                history.push({ price, date: Date.now() });
            }
            if (history.length === 0 && price) {
                history.push({ price, date: Date.now() });
            }

            await updateItem(editingItemId, {
                name, url, note, category, price, image, variant, subcategory, is_priority,
                original_price: origPrice,
                previous_price: oldPrice,
                price_history: history
            });
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
                variant,
                subcategory,
                is_priority,
                is_received: false,
                original_price: price,
                previous_price: price,
                price_history: price ? [{ price, date: Date.now() }] : [],
                createdAt: Date.now(),
            };
            await saveItem(newItem);
        }
        
        items = await loadItems();
        render();
        closeModal();
    });

    // History Modal Close handlers
    const historyModalOverlay = document.getElementById('historyModalOverlay');
    const historyModalClose = document.getElementById('historyModalClose');
    if (historyModalClose && historyModalOverlay) {
        historyModalClose.addEventListener('click', () => {
            historyModalOverlay.classList.remove('show');
        });
        historyModalOverlay.addEventListener('click', (e) => {
            if (e.target === historyModalOverlay) {
                historyModalOverlay.classList.remove('show');
            }
        });
    }

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
        if (itemVariantInput) itemVariantInput.value = item.variant || '';
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

    async function syncItems() {
        try {
            const latestItems = await loadItems();
            // Only update DOM if items actually changed to avoid jarring re-renders
            if (JSON.stringify(latestItems) !== JSON.stringify(items)) {
                items = latestItems;
                render();
            }
        } catch (e) {
            console.warn('[Sync] Background sync failed:', e);
        }
    }

    // Auto-Find Image button in modal
    const findImgBtn = document.getElementById('findImgBtn');
    if (findImgBtn) {
        findImgBtn.addEventListener('click', async () => {
            const name = document.getElementById('itemName').value.trim();
            const url = document.getElementById('itemUrl').value.trim();
            if (!name && !url) {
                showToast('Enter name or URL first', false);
                return;
            }

            findImgBtn.disabled = true;
            findImgBtn.textContent = 'Searching…';

            try {
                const searchQ = name || url;
                const res = await fetch(`/api/search-image?q=${encodeURIComponent(searchQ)}&url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(4000) });
                if (res.ok) {
                    const json = await res.json();
                    const best = json.best || (json.images && json.images[0]);
                    if (best) {
                        document.getElementById('itemImage').value = best;
                        if (fetchPreviewImg) {
                            fetchPreviewImg.src = best;
                            fetchPreviewImg.style.display = 'block';
                        }
                        showToast('Image found!', true);
                    } else {
                        showToast('No image found', false);
                    }
                }
            } catch (e) {
                console.warn('Find image failed:', e);
                showToast('Image search failed', false);
            } finally {
                findImgBtn.disabled = false;
                findImgBtn.textContent = '🔍 Find';
            }
        });
    }

    // Check if an image URL actually loads successfully
    function validateImageUrl(url) {
        return new Promise((resolve) => {
            if (!url) { resolve(false); return; }
            const img = new Image();
            img.onload = () => resolve(img.naturalWidth > 1 && img.naturalHeight > 1);
            img.onerror = () => resolve(false);
            img.src = url;
            // Timeout after 5s
            setTimeout(() => resolve(false), 5000);
        });
    }

    async function autoRepairMissingImages() {
        const itemsToRepair = [];

        // First pass: identify items with missing or potentially broken images
        for (const item of items) {
            if (!item.name || !item.url) continue;

            if (!item.image) {
                // No image at all
                itemsToRepair.push(item);
            } else {
                // Has an image URL — validate it actually loads
                const isValid = await validateImageUrl(item.image);
                if (!isValid) {
                    console.log(`[AutoRepair] Broken image detected for "${item.name}": ${item.image.substring(0, 60)}`);
                    itemsToRepair.push(item);
                }
            }
        }

        if (itemsToRepair.length === 0) {
            console.log('[AutoRepair] All item images are valid');
            return;
        }

        console.log(`[AutoRepair] Attempting to recover images for ${itemsToRepair.length} item(s)`);
        let repaired = 0;

        for (const item of itemsToRepair) {
            try {
                const res = await fetch(`/api/search-image?q=${encodeURIComponent(item.name)}&url=${encodeURIComponent(item.url)}`, { signal: AbortSignal.timeout(6000) });
                if (res.ok) {
                    const json = await res.json();
                    const candidates = json.images || [];
                    if (json.best) candidates.unshift(json.best);

                    // Try each candidate until one actually loads
                    let foundImage = '';
                    for (const candidate of candidates.slice(0, 5)) {
                        const valid = await validateImageUrl(candidate);
                        if (valid) {
                            foundImage = candidate;
                            break;
                        }
                    }

                    if (foundImage) {
                        console.log(`[AutoRepair] Recovered image for "${item.name}": ${foundImage.substring(0, 60)}`);
                        item.image = foundImage;
                        await updateItem(item.id, { image: foundImage });
                        repaired++;
                    }
                }
            } catch (e) {
                console.warn(`[AutoRepair] Failed for "${item.name}":`, e.message);
            }
        }

        if (repaired > 0) {
            console.log(`[AutoRepair] Repaired ${repaired} image(s)`);
            render();
        }
    }

    async function init() {
        items = await loadItems();
        render();

        if (localStorage.getItem('wishlist_admin_session') === 'true') {
            currentUser = { email: 'Admin', id: 'admin' };
            updateAuthUI();
        }

        // Auto-recover missing/broken images in background (slight delay to not block UI)
        setTimeout(() => autoRepairMissingImages(), 2000);

        startSupabaseKeepalive();
        // Auto-sync items every 10 seconds for real-time multi-device updates
        setInterval(syncItems, 10000);
    }

    init();
})();
