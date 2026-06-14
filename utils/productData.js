// utils/productData.js

// Helper to create a future date for sales
const saleEndDate = new Date();
saleEndDate.setDate(saleEndDate.getDate() + 15); // Sale ends in 15 days

export const defaultProducts = {
    // ===================================
    // 1. ELECTRONICS -> PHONES & ACCESSORIES
    // ===================================
    "7plus128": { 
        title: "iPhone 7 Plus 128GB Renewed Premium", 
        oldPrice: 4499, 
        currentPrice: 2499, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone7plus/iphone7-plus-colors.jpg", 
        category: "phones", 
        rating: 4.7, 
        reviewCount: 96, 
        clothingFilters: ["brand-iphone", "storage-128gb", "condition-renewed", "color-black"],
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone7plus/iphone7-plus-colors.jpg", 
            "https://m.media-amazon.com/images/I/51n24P9jqlL._AC_SL1000_.jpg"
        ], 
        features: ["5.5-inch Retina HD display", "A10 Fusion chip", "12MP wide and telephoto cameras", "Splash, water, and dust resistant"] 
    },
    "8plus256": { 
        title: "iPhone 8 Plus 256GB Renewed Premium", 
        oldPrice: 5799, 
        currentPrice: 3299, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone8plus/iphone8-plus-colors.jpg", 
        category: "phones", 
        rating: 4.7, 
        reviewCount: 96, 
        clothingFilters: ["brand-iphone", "storage-128gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone8plus/iphone8-plus-colors.jpg", 
            "https://m.media-amazon.com/images/I/61H42B0+7OL._AC_SL1024_.jpg"
        ], 
        features: ["5.5-inch Retina HD display with True Tone", "A11 Bionic chip", "12MP wide and telephoto cameras with Portrait mode", "Wireless charging support"] 
    },
    "x64": { 
        title: "iPhone X 64GB Renewed Premium", 
        oldPrice: 5999, 
        currentPrice: 3599, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone-x-colors.jpg", 
        category: "phones", 
        rating: 4.7, 
        reviewCount: 96, 
        clothingFilters: ["brand-iphone", "storage-64gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone-x-colors.jpg", 
            "https://m.media-amazon.com/images/I/51H5s6aXm4L._AC_SL1000_.jpg"
        ], 
        features: ["5.8-inch Super Retina HD display (OLED)", "A11 Bionic chip with Neural Engine", "12MP dual cameras with dual OIS", "Face ID for secure authentication"] 
    },
    "x256": { 
        title: "iPhone X 256GB Renewed Premium", 
        oldPrice: 6499, 
        currentPrice: 3999, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone-x-colors.jpg", 
        category: "phones", 
        rating: 4.7, 
        reviewCount: 96, 
        clothingFilters: ["brand-iphone", "storage-128gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone-x-colors.jpg", 
            "https://m.media-amazon.com/images/I/51H5s6aXm4L._AC_SL1000_.jpg"
        ], 
        features: ["5.8-inch Super Retina HD display (OLED)", "A11 Bionic chip with Neural Engine", "256GB internal storage", "Face ID for secure authentication"] 
    },
    "xsmax256": { 
        title: "iPhone XS Max 256GB Renewed Premium", 
        oldPrice: 8399, 
        currentPrice: 4799, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone-xs-max-colors.jpg", 
        category: "phones", 
        rating: 4.7, 
        reviewCount: 96, 
        clothingFilters: ["brand-iphone", "storage-128gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone-xs-max-colors.jpg", 
            "https://m.media-amazon.com/images/I/71w31+l9GCL._AC_SL1500_.jpg"
        ], 
        features: ["6.5-inch Super Retina HD display (OLED)", "A12 Bionic chip with next-generation Neural Engine", "Dual 12MP wide-angle and telephoto cameras", "IP68 water resistance"] 
    },
    "xr64": { 
        title: "iPhone XR 64GB Renewed Premium", 
        oldPrice: 7399, 
        currentPrice: 4299, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone-xr/iphone-xr-colors.jpg", 
        category: "phones", 
        rating: 4.7, 
        reviewCount: 96, 
        clothingFilters: ["brand-iphone", "storage-64gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone-xr/iphone-xr-colors.jpg", 
            "https://m.media-amazon.com/images/I/51q1d2x+JDL._AC_SL1000_.jpg"
        ], 
        features: ["6.1-inch Liquid Retina HD display (LCD)", "A12 Bionic chip", "Single 12MP wide camera with Portrait mode", "Face ID and long battery life"] 
    },
    "11-128": { 
        title: "iPhone 11 128GB Renewed Premium", 
        oldPrice: 8999, 
        currentPrice: 5499, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone-11-colors.jpg", 
        category: "phones", 
        rating: 4.9, 
        reviewCount: 98, 
        clothingFilters: ["brand-iphone", "storage-128gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone-11-colors.jpg", 
            "https://m.media-amazon.com/images/I/71i2XhHU3pL._AC_SL1500_.jpg"
        ], 
        features: ["6.1-inch Liquid Retina HD display", "A13 Bionic chip", "Dual-camera system with 12MP Ultra Wide and Wide cameras", "Night mode and 4K video recording"] 
    },
    "12pro128": { 
        title: "iPhone 12 Pro 128GB Renewed Premium", 
        oldPrice: 13599, 
        currentPrice: 7899, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone12pro/iphone-12-pro-colors.jpg", 
        category: "phones", 
        rating: 4.6, 
        reviewCount: 95, 
        onSale: true, 
        saleEndDate: saleEndDate.toISOString(), 
        clothingFilters: ["brand-iphone", "storage-128gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone12pro/iphone-12-pro-colors.jpg", 
            "https://m.media-amazon.com/images/I/71MHTD3uL4L._AC_SL1500_.jpg"
        ], 
        features: ["6.1-inch Super Retina XDR display", "A14 Bionic chip", "Pro 12MP camera system (Ultra Wide, Wide, Telephoto)", "LiDAR Scanner for augmented reality"] 
    },
    "13pro256": { 
        title: "iPhone 13 Pro 256GB Renewed Premium", 
        oldPrice: 18199, 
        currentPrice: 11199, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone13pro/iphone-13-pro-colors.png", 
        category: "phones", 
        rating: 4.8, 
        reviewCount: 97, 
        clothingFilters: ["brand-iphone", "storage-128gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone13pro/iphone-13-pro-colors.png", 
            "https://m.media-amazon.com/images/I/61jLiCovxVL._AC_SL1500_.jpg"
        ], 
        features: ["6.1-inch Super Retina XDR display with ProMotion", "A15 Bionic chip", "Pro camera system with new 12MP Telephoto, Wide, and Ultra Wide cameras", "Cinematic mode for video recording"] 
    },
    "14pro128": { 
        title: "iPhone 14 Pro 128GB Renewed Premium", 
        oldPrice: 18299, 
        currentPrice: 11499, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone14pro/iphone-14-pro-colors.png", 
        category: "phones", 
        rating: 4.9, 
        reviewCount: 28, 
        clothingFilters: ["brand-iphone", "storage-128gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone14pro/iphone-14-pro-colors.png", 
            "https://m.media-amazon.com/images/I/61HHS0HrjpL._AC_SL1500_.jpg"
        ], 
        features: ["6.1-inch Super Retina XDR display with Dynamic Island", "A16 Bionic chip", "48MP Main camera for incredible detail", "Always-On display and Crash Detection"] 
    },
    "15pro256": { 
        title: "iPhone 15 Pro 256GB Renewed Premium", 
        oldPrice: 27799, 
        currentPrice: 15799, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone15pro/iphone-15-pro-colors.png", 
        category: "phones", 
        rating: 4.8, 
        reviewCount: 98, 
        clothingFilters: ["brand-iphone", "storage-128gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/iphone/iphone15pro/iphone-15-pro-colors.png", 
            "https://m.media-amazon.com/images/I/81c5clA289L._AC_SL1500_.jpg"
        ], 
        features: ["6.1-inch Super Retina XDR display", "A17 Pro chip with 6-core GPU", "Titanium design with Action button", "USB-C connector with USB 3 speeds"] 
    },
    "16pro128": { 
        title: "iPhone 16 Pro 128GB Renewed Premium", 
        oldPrice: 41599, 
        currentPrice: 19299, 
        image: "https://m.media-amazon.com/images/I/61Im8-jW1PL._AC_SL1500_.jpg", 
        category: "phones", 
        rating: 4.8, 
        reviewCount: 15, 
        clothingFilters: ["brand-iphone", "storage-128gb", "condition-renewed"],
        reviews: [{ author: "Jane D.", rating: 5, text: "Absolutely stunning phone, the performance is top-notch!" }], 
        thumbnails: [
            "https://m.media-amazon.com/images/I/61Im8-jW1PL._AC_SL1500_.jpg", 
            "https://m.media-amazon.com/images/I/7120Gg84olL._AC_SL1500_.jpg"
        ], 
        features: ["6.3-inch Super Retina XDR display", "A18 Pro chip, the fastest chip ever in a smartphone", "5x Telephoto camera and customizable Action button", "Next-generation portraits with Focus and Depth Control"] 
    },
    "s21ultra256": { 
        title: "Samsung Galaxy S21 Ultra 5G 256GB Renewed Premium", 
        oldPrice: 11699, 
        currentPrice: 6999, 
        image: "https://images.samsung.com/is/image/samsung/p6pim/uk/galaxy-s21/gallery/uk-galaxy-s21-ultra-5g-g998-sm-g998bzkdeua-thumb-368338803", 
        category: "phones", 
        rating: 4.7, 
        reviewCount: 95, 
        clothingFilters: ["brand-samsung", "storage-128gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://images.samsung.com/is/image/samsung/p6pim/uk/galaxy-s21/gallery/uk-galaxy-s21-ultra-5g-g998-sm-g998bzkdeua-thumb-368338803", 
            "https://m.media-amazon.com/images/I/61O45C5qASL._AC_SL1000_.jpg"
        ], 
        features: ["6.8-inch Dynamic AMOLED 2X display", "108MP pro-grade camera with 100x Space Zoom", "S Pen compatibility", "Intelligent 5000mAh battery"] 
    },
    "s23ultra256": { 
        title: "Samsung Galaxy S23 Ultra 256GB Renewed Premium", 
        oldPrice: 24999, 
        currentPrice: 13999, 
        image: "https://images.samsung.com/is/image/samsung/p6pim/uk/sm-s918bzadeub/gallery/uk-galaxy-s23-ultra-s918-sm-s918bzadeub-534863458?$684_547_PNG$", 
        category: "phones", 
        rating: 4.9, 
        reviewCount: 99, 
        clothingFilters: ["brand-samsung", "storage-128gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://images.samsung.com/is/image/samsung/p6pim/uk/sm-s918bzadeub/gallery/uk-galaxy-s23-ultra-s918-sm-s918bzadeub-534863458?$684_547_PNG$", 
            "https://m.media-amazon.com/images/I/61VfL-aiToL._AC_SL1500_.jpg"
        ], 
        features: ["6.8-inch Dynamic AMOLED 2X Display", "200MP Wide-angle Camera with Nightography", "Embedded S Pen for ultimate precision", "Snapdragon 8 Gen 2 Mobile Platform for Galaxy"] 
    },
    "s25ultra512": { 
        title: "Samsung Galaxy S25 Ultra 512GB Renewed Premium", 
        oldPrice: 53999, 
        currentPrice: 25899, 
        image: "https://m.media-amazon.com/images/I/71ma282tECL._AC_SL1500_.jpg", 
        category: "phones", 
        rating: 4.7, 
        reviewCount: 96, 
        clothingFilters: ["brand-samsung", "storage-128gb", "condition-renewed"],
        reviews: [], 
        thumbnails: [
            "https://m.media-amazon.com/images/I/71ma282tECL._AC_SL1500_.jpg", 
            "https://m.media-amazon.com/images/I/61a+N-d+2uL._AC_SL1500_.jpg"
        ], 
        features: ["Next-generation 200MP camera with AI enhancements", "Snapdragon 8 Gen 4 processor", "Built-in S Pen with new air gestures", "Titanium frame and Gorilla Glass Armor"] 
    },

    // ===================================
    // 1. ELECTRONICS -> PORTABLE TABLETS & ACCESSORIES
    // ===================================
    "ipad-pro-m4-11-256-wifi": { 
        title: "iPad Pro 11\" M4 256GB WiFi Renewed Premium", 
        oldPrice: 24999, 
        currentPrice: 15499, 
        image: "https://m.media-amazon.com/images/I/61Qe0euJJZL._AC_SL1500_.jpg", 
        category: "other-electronics", 
        rating: 5.0, 
        reviewCount: 130, 
        reviews: [], 
        thumbnails: [
            "https://m.media-amazon.com/images/I/61Qe0euJJZL._AC_SL1500_.jpg", 
            "https://m.media-amazon.com/images/I/71s7HByu2ZL._AC_SL1500_.jpg"
        ], 
        features: ["11-inch Ultra Retina XDR display", "Apple M4 chip for phenomenal performance", "Support for Apple Pencil Pro", "Thinnest Apple product ever at 5.3mm"] 
    },
    "ipad-9-64-wifi": { 
        title: "iPad 9th Gen 10.2\" 64GB WiFi Renewed Premium", 
        oldPrice: 6999, 
        currentPrice: 3999, 
        image: "https://m.media-amazon.com/images/I/61NGnpjoRDL._AC_SL1500_.jpg", 
        category: "other-electronics", 
        rating: 4.6, 
        reviewCount: 150, 
        reviews: [], 
        thumbnails: [
            "https://m.media-amazon.com/images/I/61NGnpjoRDL._AC_SL1500_.jpg", 
            "https://m.media-amazon.com/images/I/61L5o+y77VL._AC_SL1500_.jpg"
        ], 
        features: ["10.2-inch Retina display with True Tone", "A13 Bionic chip", "12MP Ultra Wide front camera with Center Stage", "Support for Apple Pencil (1st generation)"] 
    },
    
    // ===================================
    // 1. ELECTRONICS -> COMPUTERS & LAPTOPS
    // ===================================
    "dellg77588": { 
        title: "Dell G7 7588 Gaming - i5-8300H 8GB/1TB+128GB", 
        oldPrice: 15999, 
        currentPrice: 7699, 
        image: "https://i.dell.com/sites/csimages/Video_Imagery/all/laptops-g-series-g7-15-7588-gallery-1.jpg", 
        category: "computers", 
        rating: 4.6, 
        reviewCount: 54, 
        reviews: [], 
        thumbnails: [
            "https://i.dell.com/sites/csimages/Video_Imagery/all/laptops-g-series-g7-15-7588-gallery-1.jpg", 
            "https://m.media-amazon.com/images/I/71F2Y3jX+5L._AC_SL1500_.jpg"
        ], 
        features: ["8th Gen Intel Core i5-8300H processor", "NVIDIA GeForce GTX 1050 Ti graphics", "15.6-inch FHD (1920 x 1080) IPS display", "Dual-drive setup with 128GB SSD + 1TB HDD"] 
    },
    "hpspectretouch": { 
        title: "HP Spectre x360 i7 8th Gen 16GB/512GB SSD Touch", 
        oldPrice: 19999, 
        currentPrice: 8099, 
        image: "https://ssl-product-images.www8-hp.com/digmedialib/prodimg/lowres/c08092770.png", 
        category: "computers", 
        rating: 4.7, 
        reviewCount: 31, 
        onSale: true, 
        saleEndDate: saleEndDate.toISOString(), 
        reviews: [], 
        thumbnails: [
            "https://ssl-product-images.www8-hp.com/digmedialib/prodimg/lowres/c08092770.png", 
            "https://m.media-amazon.com/images/I/718X+3W5v+L._AC_SL1500_.jpg"
        ], 
        features: ["8th Gen Intel Core i7 processor", "16GB DDR4 Memory, 512GB PCIe NVMe M.2 SSD", "13.3-inch diagonal FHD IPS micro-edge WLED-backlit touch screen", "Convertible 2-in-1 design"] 
    },
    "macbookpro2019_i5_8_256": { 
        title: "MacBook Pro 2019 i5 8GB/256GB Renewed Premium", 
        oldPrice: 20199, 
        currentPrice: 10199, 
        image: "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/macbookpro/macbook-pro-13-2019-two-thunderbolt3-ports-silver.jpg", 
        category: "computers", 
        rating: 4.7, 
        reviewCount: 96, 
        reviews: [], 
        thumbnails: [
            "https://support.apple.com/library/content/dam/edam/applecare/images/en_US/macbookpro/macbook-pro-13-2019-two-thunderbolt3-ports-silver.jpg", 
            "https://m.media-amazon.com/images/I/71jG+e7roXL._AC_SL1500_.jpg"
        ], 
        features: ["13.3-inch Retina Display", "Intel Core i5 Processor", "8GB of 2133MHz LPDDR3 memory", "256GB SSD Storage and Touch Bar"] 
    },
    "hpaio24i512th": { 
        title: "HP All-in-One 24-cb1142nd - i5-12400 16GB/512GB SSD", 
        oldPrice: 14999, 
        currentPrice: 11699, 
        image: "https://ssl-product-images.www8-hp.com/digmedialib/prodimg/lowres/c08092770.png", 
        category: "computers", 
        rating: 4.8, 
        reviewCount: 18, 
        thumbnails: [
            "https://ssl-product-images.www8-hp.com/digmedialib/prodimg/lowres/c08092770.png", 
            "https://m.media-amazon.com/images/I/71D1i+1+1lL._AC_SL1500_.jpg"
        ], 
        features: ["Intel Core i5-12400T processor", "23.8-inch Full HD display", "16GB DDR4 RAM and 512GB NVMe SSD", "Includes HP 710 white wireless keyboard and mouse combo"] 
    },
    
    // ===================================
    // 1. ELECTRONICS -> OTHER ELECTRONICS & GAMING
    // ===================================
    "ps5pro": { 
        title: "PlayStation 5 Pro Console", 
        oldPrice: 24999, 
        currentPrice: 20899, 
        image: "https://gmedia.playstation.com/is/image/SIEPDC/ps5-pro-console-product-thumbnail-01-en-12sep24?$facebook$", 
        category: "other-electronics", 
        rating: 4.7, 
        reviewCount: 96, 
        reviews: [], 
        thumbnails: [
            "https://gmedia.playstation.com/is/image/SIEPDC/ps5-pro-console-product-thumbnail-01-en-12sep24?$facebook$", 
            "https://m.media-amazon.com/images/I/619BkvKW35L._SL1500_.jpg"
        ], 
        features: ["Enhanced CPU and GPU for superior performance", "8K resolution and ray tracing support", "Detachable disc drive", "Faster loading with an ultra-high-speed SSD"] 
    },
    "ps5-controller": { 
        title: "Sony PS5 DualSense Controller Renewed Premium", 
        oldPrice: 1999, 
        currentPrice: 1399, 
        image: "https://gmedia.playstation.com/is/image/SIEPDC/dualsense-wireless-controller-product-thumbnail-01-en-14sep20", 
        category: "other-electronics", 
        rating: 4.8, 
        reviewCount: 150, 
        reviews: [], 
        thumbnails: [
            "https://gmedia.playstation.com/is/image/SIEPDC/dualsense-wireless-controller-product-thumbnail-01-en-14sep20", 
            "https://m.media-amazon.com/images/I/612bjbLaDLR._AC_SL1500_.jpg"
        ], 
        features: ["Haptic feedback for immersive gameplay", "Adaptive triggers with dynamic resistance", "Built-in microphone and headset jack", "Signature comfortable design"] 
    },

    // ===================================
    // 6. VEHICLES & PARTS -> CARS & BAKKIES
    // ===================================
    "hilux2021": {
        title: "Toyota Hilux 2.8 GD-6 Raider Double Cab",
        oldPrice: 540000,
        currentPrice: 520000,
        image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
        category: "cars-bakkies",
        rating: 4.8,
        reviewCount: 14,
        clothingFilters: ["bakkies"],
        reviews: [],
        thumbnails: [
            "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80"
        ],
        features: ["2.8L GD-6 Turbodiesel engine", "6-speed automatic transmission", "4x4 drivetrain with low range", "Raider specification trim package"]
    },
    "golf7gti": {
        title: "Volkswagen Golf 7 GTI 2.0 TSI",
        oldPrice: 360000,
        currentPrice: 340000,
        image: "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80",
        category: "cars-bakkies",
        rating: 4.9,
        reviewCount: 38,
        clothingFilters: ["hatchbacks"],
        reviews: [],
        thumbnails: [
            "https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=800&q=80"
        ],
        features: ["2.0 TSI turbocharged engine", "DSG dual-clutch transmission", "GTI performance brakes and suspension", "Active Info Display digital instrument cluster"]
    },

    // ===================================
    // 10. OTHER/MISC -> ANYTHING ELSE & REAL ESTATE
    // ===================================
    "housewindhoek": {
        title: "Modern 3-Bedroom House in Olympia, Windhoek",
        oldPrice: 2600000,
        currentPrice: 2450000,
        image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80",
        category: "anything-else",
        rating: 4.7,
        reviewCount: 5,
        clothingFilters: ["forsale"],
        reviews: [],
        thumbnails: [
            "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=800&q=80"
        ],
        features: ["3 spacious bedrooms with built-in cupboards", "2 modern bathrooms (main en-suite)", "Entertainment lapa with built-in braai and swimming pool", "Double automated garage with security fencing"]
    },
    "apartmentswakop": {
        title: "Luxury 2-Bedroom Apartment with Sea View in Swakopmund",
        oldPrice: 1950000,
        currentPrice: 1850000,
        image: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
        category: "anything-else",
        rating: 5.0,
        reviewCount: 12,
        clothingFilters: ["forrent"],
        reviews: [],
        thumbnails: [
            "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80"
        ],
        features: ["Unobstructed Atlantic Ocean views", "2 bedrooms with en-suite walk-in showers", "Imported German kitchen fittings", "Safe walking distance to downtown Swakopmund"]
    },

    // ===================================
    // 4. GROCERIES & 8. FARM FOODS -> FOOD ITEMS
    // ===================================
    "kapanaplatter": {
        title: "Traditional Namibian Kapana Platter",
        oldPrice: 180,
        currentPrice: 150,
        image: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80",
        category: "food-items",
        rating: 4.9,
        reviewCount: 142,
        clothingFilters: ["hotmeals"],
        reviews: [],
        thumbnails: [
            "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=800&q=80"
        ],
        features: ["Freshly grilled premium Namibian beef", "Traditional spice seasoning mix", "Served hot with sliced tomatoes, onions, and fresh chillies", "Includes standard side of hand-cooked fat cakes"]
    },
    "biltongcombo": {
        title: "Premium Namibian Beef Biltong & Chilli Bites (1kg)",
        oldPrice: 360,
        currentPrice: 320,
        image: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80",
        category: "meat-poultry",
        rating: 4.8,
        reviewCount: 88,
        clothingFilters: ["groceries"],
        reviews: [],
        thumbnails: [
            "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=800&q=80"
        ],
        features: ["A-grade naturally dried Namibian grass-fed beef", "Classic coriander and vinegar spice cure", "Includes 500g sliced soft biltong and 500g snapsticks", "Packaged in re-sealable stay-fresh pouches"]
    },

    // ===================================
    // 10. OTHER/MISC -> BOOKS & STATIONERY
    // ===================================
    "book-purple-violet": {
        title: "The Purple Violet of Oshaantu by Neshani Andreas",
        oldPrice: 195,
        currentPrice: 145,
        image: "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80",
        category: "books-stationery",
        rating: 4.9,
        reviewCount: 35,
        clothingFilters: ["fiction"],
        reviews: [],
        thumbnails: [
            "https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=600&q=80"
        ],
        features: ["A masterpiece of Namibian post-colonial literature", "Explores themes of community, sisterhood, and resilience", "Softcover - 180 pages", "Standard local educational edition"]
    },
    "book-namibia-heritage": {
        title: "Namibian Heritage: Custom and Cultures",
        oldPrice: 350,
        currentPrice: 280,
        image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
        category: "books-stationery",
        rating: 4.8,
        reviewCount: 14,
        clothingFilters: ["heritage"],
        reviews: [],
        thumbnails: [
            "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80"
        ],
        features: ["Richly illustrated guide to Namibian traditional heritage", "Authored by prominent local historians", "Includes historical photographs and cultural map", "Hardcover collector's edition"]
    }
};