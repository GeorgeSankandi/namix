export const categoryData = {
    // 1. Electronics
    'electronics': { name: 'Electronics', heroImage: 'https://images.unsplash.com/photo-1498049794561-7780e7231661?auto=format&fit=crop&w=1350&q=80', subcategories: ['phones', 'computers', 'tvs-audio', 'chargers-power', 'other-electronics'] },
    'phones': { name: 'Phones & Accessories', parent: 'electronics', heroImage: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=1350&q=80' },
    'computers': { name: 'Computers & Laptops', parent: 'electronics', heroImage: 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?auto=format&fit=crop&w=1350&q=80' },
    'tvs-audio': { name: 'TVs & Audio', parent: 'electronics', heroImage: 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1350&q=80' },
    'chargers-power': { name: 'Chargers & Power Banks', parent: 'electronics', heroImage: 'https://images.unsplash.com/photo-1609592424109-dd9892f1b17c?auto=format&fit=crop&w=1350&q=80' },
    'other-electronics': { name: 'Other Electronics', parent: 'electronics', heroImage: 'https://images.unsplash.com/photo-1550745165-9bc0b252726a?auto=format&fit=crop&w=1350&q=80' },

    // 2. Solar Energy
    'solar': { name: 'Solar Energy', heroImage: 'https://images.unsplash.com/photo-1509391366360-2e959784a276?auto=format&fit=crop&w=1350&q=80', subcategories: ['solar-panels', 'solar-lights', 'inverters-batteries', 'solar-kits'] },
    'solar-panels': { name: 'Solar Panels', parent: 'solar', heroImage: 'https://images.unsplash.com/photo-1508514177221-188b1cf16e9d?auto=format&fit=crop&w=1350&q=80' },
    'solar-lights': { name: 'Solar Lights & Lamps', parent: 'solar', heroImage: 'https://images.unsplash.com/photo-1550985543-f47f38aee64e?auto=format&fit=crop&w=1350&q=80' },
    'inverters-batteries': { name: 'Inverters & Batteries', parent: 'solar', heroImage: 'https://images.unsplash.com/photo-1620714223084-8fcacc6dfd8d?auto=format&fit=crop&w=1350&q=80' },
    'solar-kits': { name: 'Solar Kits & Accessories', parent: 'solar', heroImage: 'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&w=1350&q=80' },

    // 3. Fashion & Beauty
    'fashion': { name: 'Fashion & Beauty', heroImage: 'https://images.unsplash.com/photo-1445205170230-053b83016050?auto=format&fit=crop&w=1350&q=80', subcategories: ['clothes-shoes', 'traditional-attire', 'beauty-products', 'jewellery-accessories'] },
    'clothes-shoes': { name: 'Clothes & Shoes', parent: 'fashion', heroImage: 'https://images.unsplash.com/photo-1489987707025-afc232f7ea0f?auto=format&fit=crop&w=1350&q=80', subcategories: ['mens-clothing', 'womens-clothing', 'kids-clothing'] },
    'mens-clothing': { name: "Men's Clothing", parent: 'clothes-shoes', heroImage: 'https://images.unsplash.com/photo-1490367532201-b9bc1dc483f6?auto=format&fit=crop&w=1350&q=80' },
    'womens-clothing': { name: "Women's Clothing", parent: 'clothes-shoes', heroImage: 'https://images.unsplash.com/photo-1572804013427-4d7ca726b655?auto=format&fit=crop&w=1350&q=80' },
    'kids-clothing': { name: "Children's Clothing", parent: 'clothes-shoes', heroImage: 'https://images.unsplash.com/photo-1519457431-44cac6c763a4?auto=format&fit=crop&w=1350&q=80' },
    'traditional-attire': { name: 'Traditional Attire', parent: 'fashion', heroImage: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1350&q=80' },
    'beauty-products': { name: 'Beauty Products', parent: 'fashion', heroImage: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1350&q=80' },
    'jewellery-accessories': { name: 'Jewellery & Accessories', parent: 'fashion', heroImage: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1350&q=80' },

    // 4. Groceries
    'groceries': { name: 'Groceries', heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1350&q=80', subcategories: ['food-items', 'drinks-beverages', 'household-essentials'] },
    'food-items': { name: 'Food & Cooking Items', parent: 'groceries', heroImage: 'https://images.unsplash.com/photo-1506084868230-bb9d95c24759?auto=format&fit=crop&w=1350&q=80' },
    'drinks-beverages': { name: 'Drinks & Beverages', parent: 'groceries', heroImage: 'https://images.unsplash.com/photo-1527960656366-ee2a69d9e5c8?auto=format&fit=crop&w=1350&q=80' },
    'household-essentials': { name: 'Household Essentials', parent: 'groceries', heroImage: 'https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=1350&q=80' },

    // 5. Home Appliances
    'appliances': { name: 'Home Appliances', heroImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1350&q=80', subcategories: ['fridges-freezers', 'stoves-cookers', 'furniture', 'kitchen-tools'] },
    'fridges-freezers': { name: 'Fridges & Freezers', parent: 'appliances', heroImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1350&q=80' },
    'stoves-cookers': { name: 'Stoves & Cookers', parent: 'appliances', heroImage: 'https://images.unsplash.com/photo-1525699078109-90605a3ee341?auto=format&fit=crop&w=1350&q=80' },
    'furniture': { name: 'Furniture', parent: 'appliances', heroImage: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?auto=format&fit=crop&w=1350&q=80', subcategories: ['beds', 'tables', 'chairs', 'sofas', 'wardrobes'] },
    'beds': { name: 'Beds', parent: 'furniture', heroImage: 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1350&q=80' },
    'tables': { name: 'Tables', parent: 'furniture', heroImage: 'https://images.unsplash.com/photo-1577140917170-285929fb55b7?auto=format&fit=crop&w=1350&q=80' },
    'chairs': { name: 'Chairs', parent: 'furniture', heroImage: 'https://images.unsplash.com/photo-1567538096630-e0c55bd6374c?auto=format&fit=crop&w=1350&q=80' },
    'sofas': { name: 'Sofas', parent: 'furniture', heroImage: 'https://images.unsplash.com/photo-1540574163026-6addeaabfcdb?auto=format&fit=crop&w=1350&q=80' },
    'wardrobes': { name: 'Wardrobes', parent: 'furniture', heroImage: 'https://images.unsplash.com/photo-1558882224-cca166733360?auto=format&fit=crop&w=1350&q=80' },
    'kitchen-tools': { name: 'Kitchen Tools', parent: 'appliances', heroImage: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=1350&q=80' },

    // 6. Vehicles & Parts
    'vehicles': { name: 'Vehicles & Parts', heroImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1350&q=80', subcategories: ['cars-bakkies', 'motorcycles', 'vehicle-parts', 'bicycles'] },
    'cars-bakkies': { name: 'Cars & Bakkies', parent: 'vehicles', heroImage: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1350&q=80' },
    'motorcycles': { name: 'Motorcycles', parent: 'vehicles', heroImage: 'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1350&q=80' },
    'vehicle-parts': { name: 'Vehicle Parts & Tyres', parent: 'vehicles', heroImage: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?auto=format&fit=crop&w=1350&q=80' },
    'bicycles': { name: 'Bicycles', parent: 'vehicles', heroImage: 'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1350&q=80' },

    // 7. Local Crafts & Handmade
    'crafts': { name: 'Local Crafts & Handmade', heroImage: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1350&q=80', subcategories: ['handmade-crafts', 'traditional-items', 'art-decor'] },
    'handmade-crafts': { name: 'Handmade Crafts', parent: 'crafts', heroImage: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1350&q=80' },
    'traditional-items': { name: 'Traditional Items', parent: 'crafts', heroImage: 'https://images.unsplash.com/photo-1561542320-9a18cd340469?auto=format&fit=crop&w=1350&q=80' },
    'art-decor': { name: 'Art & Decor', parent: 'crafts', heroImage: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=1350&q=80' },

    // 8. Farm & Food Products
    'farm': { name: 'Farm & Food Products', heroImage: 'https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&w=1350&q=80', subcategories: ['fresh-produce', 'meat-poultry', 'farm-tools'] },
    'fresh-produce': { name: 'Fresh Produce', parent: 'farm', heroImage: 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1350&q=80' },
    'meat-poultry': { name: 'Meat & Poultry', parent: 'farm', heroImage: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=1350&q=80' },
    'farm-tools': { name: 'Farm Tools & Equipment', parent: 'farm', heroImage: 'https://images.unsplash.com/photo-1589923188900-85dae440342b?auto=format&fit=crop&w=1350&q=80' },

    // 9. Charcoal & Fuel
    'fuel': { name: 'Charcoal & Fuel', heroImage: 'https://images.unsplash.com/photo-1524491989244-1f40317fe6f0?auto=format&fit=crop&w=1350&q=80', subcategories: ['charcoal', 'firewood', 'other-fuel'] },
    'charcoal': { name: 'Charcoal', parent: 'fuel', heroImage: 'https://images.unsplash.com/photo-1524491989244-1f40317fe6f0?auto=format&fit=crop&w=1350&q=80' },
    'firewood': { name: 'Firewood', parent: 'fuel', heroImage: 'https://images.unsplash.com/photo-1549400829-54c345333b29?auto=format&fit=crop&w=1350&q=80' },
    'other-fuel': { name: 'Other Fuel', parent: 'fuel', heroImage: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1350&q=80' },

    // 10. Other / Miscellaneous
    'other': { name: 'Other / Miscellaneous', heroImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1350&q=80', subcategories: ['books-stationery', 'sports-toys', 'services', 'anything-else'] },
    'books-stationery': { name: 'Books & Stationery', parent: 'other', heroImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=1350&q=80' },
    'sports-toys': { name: 'Sports & Toys', parent: 'other', heroImage: 'https://images.unsplash.com/photo-1531525645387-7f14be1bdbbd?auto=format&fit=crop&w=1350&q=80' },
    'services': { name: 'Services', parent: 'other', heroImage: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=1350&q=80' },
    'anything-else': { name: 'Anything Else', parent: 'other', heroImage: 'https://images.unsplash.com/photo-151342789411-b6a5d4f31634?auto=format&fit=crop&w=1350&q=80' }
};
