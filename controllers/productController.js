import Product from '../models/productModel.js';
import mongoose from 'mongoose';
import { generateDescriptionWithGemini, generateFeaturesWithGemini } from '../utils/geminiService.js';

const getProducts = async (req, res) => {
  const { keyword, category, curated, seller } = req.query;
  let query = {};

  if (seller) {
    query.seller = seller;
  }

  if (keyword) {
    query.title = { $regex: keyword, $options: 'i' };
  }
  
  if (category) {
    const categories = category.split(',').map(c => c.trim()).filter(Boolean);
    const lowerCats = categories.map(c => c.toLowerCase());
    
    const catQueries = lowerCats.map(cat => {
      switch (cat) {
        case 'electronics':
          return { category: { $in: ['electronics', 'phones', 'computers', 'tvs-audio', 'chargers-power', 'other-electronics'] } };
        case 'phones':
          return { category: 'phones' };
        case 'iphones':
          return { $or: [{ category: 'iphones' }, { category: 'phones' }, { title: { $regex: 'iphone', $options: 'i' } }, { clothingFilters: 'brand-iphone' }] };
        case 'samsung-phones':
          return { $or: [{ category: 'samsung-phones' }, { category: 'phones' }, { title: { $regex: 'samsung', $options: 'i' } }, { clothingFilters: 'brand-samsung' }] };
        case 'android-phones':
          return { $or: [{ category: 'android-phones' }, { category: 'phones' }, { title: { $regex: 'android', $options: 'i' } }, { title: { $regex: 'samsung', $options: 'i' } }, { clothingFilters: 'brand-samsung' }] };
        case 'tablets':
          return { $or: [{ category: 'tablets' }, { title: { $regex: 'tablet', $options: 'i' } }, { title: { $regex: 'ipad', $options: 'i' } }, { title: { $regex: 'tab', $options: 'i' } }] };
        case 'ipads':
          return { $or: [{ category: 'ipads' }, { title: { $regex: 'ipad', $options: 'i' } }] };
        case 'samsung-tabs':
          return { $or: [{ category: 'samsung-tabs' }, { title: { $regex: 'samsung.*tab', $options: 'i' } }, { title: { $regex: 'tab.*samsung', $options: 'i' } }, { $and: [{ title: { $regex: 'samsung', $options: 'i' } }, { title: { $regex: 'tab', $options: 'i' } }] }] };
        case 'lenovo-tabs':
          return { $or: [{ category: 'lenovo-tabs' }, { title: { $regex: 'lenovo.*tab', $options: 'i' } }, { $and: [{ title: { $regex: 'lenovo', $options: 'i' } }, { title: { $regex: 'tab', $options: 'i' } }] }] };
        case 'computers':
          return { category: { $in: ['computers', 'macbooks', 'dell-laptops', 'hp-laptops', 'lenovo-laptops', 'imacs', 'hp-aio'] } };
        case 'laptops':
          return { $or: [{ category: 'computers' }, { title: { $regex: 'laptop', $options: 'i' } }, { title: { $regex: 'macbook', $options: 'i' } }] };
        case 'macbooks':
          return { $or: [{ category: 'macbooks' }, { title: { $regex: 'macbook', $options: 'i' } }] };
        case 'hp-laptops':
          return { $or: [{ category: 'hp-laptops' }, { title: { $regex: 'hp.*laptop', $options: 'i' } }, { $and: [{ title: { $regex: 'hp', $options: 'i' } }, { $or: [{ title: { $regex: 'laptop', $options: 'i' } }, { category: 'computers' }] }] }] };
        case 'dell-laptops':
          return { $or: [{ category: 'dell-laptops' }, { title: { $regex: 'dell.*laptop', $options: 'i' } }, { $and: [{ title: { $regex: 'dell', $options: 'i' } }, { $or: [{ title: { $regex: 'laptop', $options: 'i' } }, { category: 'computers' }] }] }] };
        case 'imacs':
          return { $or: [{ category: 'imacs' }, { title: { $regex: 'imac', $options: 'i' } }] };
        case 'hp-aio':
          return { $or: [{ title: { $regex: 'hp.*all-in-one', $options: 'i' } }, { title: { $regex: 'hp.*aio', $options: 'i' } }, { title: { $regex: 'aio.*hp', $options: 'i' } }] };
        case 'tvs-audio':
          return { category: 'tvs-audio' };
        case 'chargers-power':
          return { category: 'chargers-power' };
        case 'other-electronics':
          return { category: 'other-electronics' };
        
        case 'solar':
          return { category: { $in: ['solar', 'solar-panels', 'solar-lights', 'inverters-batteries', 'solar-kits'] } };
        case 'solar-panels':
          return { $or: [{ category: 'solar-panels' }, { title: { $regex: 'panel', $options: 'i' } }] };
        case 'solar-lights':
          return { $or: [{ category: 'solar-lights' }, { title: { $regex: 'light', $options: 'i' } }, { title: { $regex: 'lamp', $options: 'i' } }] };
        case 'inverters-batteries':
          return { $or: [{ category: 'inverters-batteries' }, { title: { $regex: 'inverter', $options: 'i' } }, { title: { $regex: 'batter', $options: 'i' } }] };
        case 'solar-kits':
          return { $or: [{ category: 'solar-kits' }, { title: { $regex: 'kit', $options: 'i' } }] };
          
        case 'fashion':
          return { category: { $in: ['fashion', 'clothes-shoes', 'mens-clothing', 'womens-clothing', 'kids-clothing', 'traditional-attire', 'beauty-products', 'jewellery-accessories'] } };
        case 'clothes-shoes':
          return { $or: [{ category: { $in: ['clothes-shoes', 'mens-clothing', 'womens-clothing', 'kids-clothing'] } }, { curatedPages: { $in: ['womens-clothes', 'mens-clothes', 'kids-clothing'] } }] };
        case 'mens-clothing':
        case 'mens-clothes':
          return { $or: [{ category: 'mens-clothing' }, { curatedPages: 'mens-clothes' }, { title: { $regex: 'men', $options: 'i' } }] };
        case 'womens-clothing':
        case 'womens-clothes':
          return { $or: [{ category: 'womens-clothing' }, { curatedPages: 'womens-clothes' }, { title: { $regex: 'women', $options: 'i' } }] };
        case 'kids-clothing':
          return { $or: [{ category: 'kids-clothing' }, { curatedPages: 'kids-clothing' }, { title: { $regex: 'kid', $options: 'i' } }, { title: { $regex: 'child', $options: 'i' } }] };
        case 'traditional-attire':
          return { $or: [{ category: 'traditional-attire' }, { title: { $regex: 'traditional', $options: 'i' } }, { clothingFilters: 'traditional' }] };
        case 'beauty-products':
          return { $or: [{ category: 'beauty-products' }, { title: { $regex: 'beauty', $options: 'i' } }, { title: { $regex: 'makeup', $options: 'i' } }] };
        case 'jewellery-accessories':
          return { $or: [{ category: 'jewellery-accessories' }, { title: { $regex: 'jewel', $options: 'i' } }, { title: { $regex: 'ring', $options: 'i' } }, { title: { $regex: 'necklace', $options: 'i' } }] };
          
        case 'groceries':
          return { category: { $in: ['groceries', 'food-items', 'drinks-beverages', 'household-essentials'] } };
        case 'food-items':
          return { $or: [{ category: 'food-items' }, { title: { $regex: 'food', $options: 'i' } }, { title: { $regex: 'meal', $options: 'i' } }, { title: { $regex: 'kapana', $options: 'i' } }] };
        case 'drinks-beverages':
          return { $or: [{ category: 'drinks-beverages' }, { title: { $regex: 'drink', $options: 'i' } }, { title: { $regex: 'juice', $options: 'i' } }, { title: { $regex: 'soda', $options: 'i' } }, { title: { $regex: 'beer', $options: 'i' } }] };
        case 'household-essentials':
          return { $or: [{ category: 'household-essentials' }, { title: { $regex: 'essential', $options: 'i' } }, { title: { $regex: 'soap', $options: 'i' } }] };
          
        case 'appliances':
          return { category: { $in: ['appliances', 'fridges-freezers', 'stoves-cookers', 'furniture', 'kitchen-tools'] } };
        case 'fridges-freezers':
          return { $or: [{ category: 'fridges-freezers' }, { title: { $regex: 'fridge', $options: 'i' } }, { title: { $regex: 'freezer', $options: 'i' } }] };
        case 'stoves-cookers':
          return { $or: [{ category: 'stoves-cookers' }, { title: { $regex: 'stove', $options: 'i' } }, { title: { $regex: 'cooker', $options: 'i' } }] };
        case 'furniture':
          return { $or: [{ category: 'furniture' }, { category: { $in: ['beds', 'tables', 'chairs', 'sofas', 'wardrobes'] } }, { curatedPages: { $in: ['living-room', 'bedroom', 'office', 'kitchen'] } }] };
        case 'beds':
          return { $or: [{ category: 'beds' }, { title: { $regex: 'bed', $options: 'i' } }] };
        case 'tables':
          return { $or: [{ category: 'tables' }, { title: { $regex: 'table', $options: 'i' } }] };
        case 'chairs':
          return { $or: [{ category: 'chairs' }, { title: { $regex: 'chair', $options: 'i' } }] };
        case 'sofas':
          return { $or: [{ category: 'sofas' }, { title: { $regex: 'sofa', $options: 'i' } }, { title: { $regex: 'couch', $options: 'i' } }] };
        case 'wardrobes':
          return { $or: [{ category: 'wardrobes' }, { title: { $regex: 'wardrobe', $options: 'i' } }] };
        case 'kitchen-tools':
          return { $or: [{ category: 'kitchen-tools' }, { title: { $regex: 'kitchen', $options: 'i' } }, { title: { $regex: 'tool', $options: 'i' } }] };
          
        case 'vehicles':
          return { category: { $in: ['vehicles', 'cars-bakkies', 'motorcycles', 'vehicle-parts', 'bicycles'] } };
        case 'cars-bakkies':
          return { $or: [{ category: 'cars-bakkies' }, { title: { $regex: 'car', $options: 'i' } }, { title: { $regex: 'bakkie', $options: 'i' } }, { title: { $regex: 'hilux', $options: 'i' } }, { title: { $regex: 'toyota', $options: 'i' } }, { clothingFilters: 'bakkies' }] };
        case 'motorcycles':
          return { $or: [{ category: 'motorcycles' }, { title: { $regex: 'motorcycle', $options: 'i' } }, { title: { $regex: 'bike', $options: 'i' } }] };
        case 'vehicle-parts':
          return { $or: [{ category: 'vehicle-parts' }, { title: { $regex: 'part', $options: 'i' } }, { title: { $regex: 'tyre', $options: 'i' } }] };
        case 'bicycles':
          return { $or: [{ category: 'bicycles' }, { title: { $regex: 'bicycle', $options: 'i' } }] };
          
        case 'crafts':
          return { category: { $in: ['crafts', 'handmade-crafts', 'traditional-items', 'art-decor'] } };
        case 'handmade-crafts':
          return { $or: [{ category: 'handmade-crafts' }, { title: { $regex: 'handmade', $options: 'i' } }, { title: { $regex: 'craft', $options: 'i' } }] };
        case 'traditional-items':
          return { $or: [{ category: 'traditional-items' }, { title: { $regex: 'traditional', $options: 'i' } }] };
        case 'art-decor':
          return { $or: [{ category: 'art-decor' }, { title: { $regex: 'art', $options: 'i' } }, { title: { $regex: 'decor', $options: 'i' } }] };
          
        case 'farm':
          return { category: { $in: ['farm', 'fresh-produce', 'meat-poultry', 'farm-tools'] } };
        case 'fresh-produce':
          return { $or: [{ category: 'fresh-produce' }, { title: { $regex: 'produce', $options: 'i' } }, { title: { $regex: 'fresh', $options: 'i' } }] };
        case 'meat-poultry':
          return { $or: [{ category: 'meat-poultry' }, { title: { $regex: 'meat', $options: 'i' } }, { title: { $regex: 'poultry', $options: 'i' } }, { title: { $regex: 'biltong', $options: 'i' } }] };
        case 'farm-tools':
          return { $or: [{ category: 'farm-tools' }, { title: { $regex: 'farm', $options: 'i' } }] };
          
        case 'fuel':
          return { category: { $in: ['fuel', 'charcoal', 'firewood', 'other-fuel'] } };
        case 'charcoal':
          return { $or: [{ category: 'charcoal' }, { title: { $regex: 'charcoal', $options: 'i' } }] };
        case 'firewood':
          return { $or: [{ category: 'firewood' }, { title: { $regex: 'firewood', $options: 'i' } }] };
        case 'other-fuel':
          return { $or: [{ category: 'other-fuel' }, { title: { $regex: 'fuel', $options: 'i' } }] };
          
        case 'other':
          return { category: { $in: ['other', 'books-stationery', 'sports-toys', 'services', 'anything-else'] } };
        case 'books-stationery':
          return { $or: [{ category: 'books-stationery' }, { title: { $regex: 'book', $options: 'i' } }, { title: { $regex: 'stationery', $options: 'i' } }] };
        case 'sports-toys':
          return { $or: [{ category: 'sports-toys' }, { title: { $regex: 'sport', $options: 'i' } }, { title: { $regex: 'toy', $options: 'i' } }] };
        case 'services':
          return { $or: [{ category: 'services' }, { title: { $regex: 'service', $options: 'i' } }] };
        case 'anything-else':
          return { $or: [{ category: 'anything-else' }, { title: { $regex: 'anything', $options: 'i' } }] };
        
        default:
          const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
          return { category: new RegExp(`^${escapeRegex(cat)}$`, 'i') };
      }
    });

    if (catQueries.length > 0) {
      if (catQueries.length === 1) {
        Object.assign(query, catQueries[0]);
      } else {
        query.$or = catQueries;
      }
    }
  }

  if (curated) {
    if (curated === 'trending') {
      query.$or = [
        { curatedPages: 'trending' },
        { purchaseCount: { $gt: 0 } }
      ];
    } else {
      query.curatedPages = curated;
    }
  }

  try {
    let products;
    if (curated === 'trending') {
      products = await Product.find(query)
        .sort({ purchaseCount: -1 })
        .populate('seller', 'name businessName isVerified showBestSellerBadge location');
    } else {
      products = await Product.find(query).populate('seller', 'name businessName isVerified showBestSellerBadge location');
    }
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

const getProductById = async (req, res) => {
  try {
    let product = await Product.findOne({ productId: req.params.id })
      .populate('seller', 'name businessName isVerified showBestSellerBadge location sellerRating')
      .populate('exploreMoreReseller', 'name businessName');
      
    if (!product) {
       if (mongoose.Types.ObjectId.isValid(req.params.id)) {
         product = await Product.findById(req.params.id)
           .populate('seller', 'name businessName isVerified showBestSellerBadge location sellerRating')
           .populate('exploreMoreReseller', 'name businessName');
       }
    }
    if (product) res.json(product);
    else res.status(404).json({ message: 'Product not found' });
  } catch (error) {
     res.status(500).json({ message: 'Server Error' });
  }
};

const createProduct = async (req, res) => {
    try {
        const isMainAdmin = req.user && req.user.isAdmin === true;

        if (isMainAdmin) {
            try {
                if (!req.body.description || req.body.description.trim() === '') {
                    req.body.description = await generateDescriptionWithGemini(req.body.title, req.body.features || []);
                }
                if (!req.body.features || req.body.features.length === 0) {
                    req.body.features = await generateFeaturesWithGemini(req.body.title);
                }
            } catch (aiError) {
                console.warn('Continuing product creation without AI enhancements', aiError.message);
            }
        }

        let finalProductId = req.body.productId;
        if (!finalProductId || finalProductId.trim() === '') {
            const lastProduct = await Product.findOne().sort({ createdAt: -1 });
            let nextNum = 1;
            if (lastProduct && lastProduct.productId) {
                const match = lastProduct.productId.match(/\d+/);
                if (match) {
                    nextNum = parseInt(match[0], 10) + 1;
                } else {
                    const count = await Product.countDocuments();
                    nextNum = count + 1;
                }
            } else {
                const count = await Product.countDocuments();
                nextNum = count + 1;
            }
            finalProductId = `PROD-${nextNum}`;
        } else {
            const existing = await Product.findOne({ productId: finalProductId });
            if (existing) {
                return res.status(400).json({ message: 'Duplicate productId', details: { productId: finalProductId } });
            }
        }

        const product = new Product({
            productId: finalProductId,
            title: req.body.title,
            description: req.body.description,
            oldPrice: req.body.oldPrice,
            currentPrice: req.body.currentPrice,
            image: req.body.image,
            category: req.body.category,
            genderCategory: req.body.genderCategory,
            clothingFilters: Array.isArray(req.body.clothingFilters) ? req.body.clothingFilters : [],
            stock: req.body.stock,
            condition: req.body.condition,
            colors: req.body.colors,
            colorsEnabled: req.body.colorsEnabled,
            sizes: req.body.sizes,
            thumbnails: req.body.thumbnails,
            features: req.body.features,
            onSale: req.body.onSale,
            saleStartDate: req.body.saleStartDate,
            saleEndDate: req.body.saleEndDate,
            curatedPages: req.body.curatedPages,
            comboEndDate: req.body.comboEndDate,
            comboProductIds: req.body.comboProductIds,
            giftCardEnabled: req.body.giftCardEnabled,
            giftCardType: req.body.giftCardType,
            giftCardValue: req.body.giftCardValue,
            exploreMoreReseller: req.body.exploreMoreReseller || undefined,
            
            freeTransport: req.body.freeTransport !== undefined ? req.body.freeTransport : false,
            deliveryPriceWindhoek: req.body.deliveryPriceWindhoek !== undefined ? req.body.deliveryPriceWindhoek : 0,
            deliveryPriceOutside: req.body.deliveryPriceOutside !== undefined ? req.body.deliveryPriceOutside : 0,
            cashOnDelivery: req.body.cashOnDelivery !== undefined ? req.body.cashOnDelivery : false,
            warrantyDuration: req.body.warrantyDuration || 'No Warranty',
            promotionStatus: req.body.promotionStatus || 'None',

            safeInsuranceEnabled: req.body.safeInsuranceEnabled !== undefined ? req.body.safeInsuranceEnabled : false,
            safeInsurancePrice: req.body.safeInsurancePrice !== undefined ? req.body.safeInsurancePrice : 0,

            showTradeIn: req.body.showTradeIn !== undefined ? req.body.showTradeIn : true,
            showLayBye: req.body.showLayBye !== undefined ? req.body.showLayBye : true,
            showDeposit: req.body.showDeposit !== undefined ? req.body.showDeposit : true,
            showDeliveryNationwide: req.body.showDeliveryNationwide !== undefined ? req.body.showDeliveryNationwide : true,
            showOneYearWarranty: req.body.showOneYearWarranty !== undefined ? req.body.showOneYearWarranty : true,
            showFifteenDayReturns: req.body.showFifteenDayReturns !== undefined ? req.body.showFifteenDayReturns : true
        });

        if (req.body.seller) product.seller = req.body.seller;
        else if (req.user && req.user._id && req.user.sellerType && req.user.sellerType !== 'customer') product.seller = req.user._id;

        const createdProduct = await product.save();
        res.status(201).json(createdProduct);
    } catch (error) {
      console.error('Error creating product:', error);
      if (error.name === 'ValidationError') {
        return res.status(400).json({ message: 'Validation failed', details: error.message });
      }
      return res.status(500).json({ message: 'Server error while creating product', error: error.message });
    }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (req.user && !req.user.isAdmin && String(product.seller) !== String(req.user._id)) {
      return res.status(401).json({ message: 'Not authorized to modify this product.' });
    }

    Object.assign(product, req.body);
    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    console.error('Error updating product', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    if (req.user && !req.user.isAdmin && String(product.seller) !== String(req.user._id)) {
      return res.status(401).json({ message: 'Not authorized to remove this product.' });
    }

    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product removed' });
  } catch (error) {
    console.error('Error deleting product', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const addViewer = async (req, res) => {
    try {
        const product = await Product.findOne({ productId: req.params.productId });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        
        const { name, viewTime } = req.body || {};
        let viewedAt = new Date();
        if (viewTime && typeof viewTime === 'object' && typeof viewTime.hour === 'number') {
          viewedAt = new Date();
          viewedAt.setHours(viewTime.hour, viewTime.minute || 0, 0, 0);
        }
        
        const newViewerData = { viewedAt, name: name || undefined, addedByAdmin: !!name };
        product.viewers.push(newViewerData);
        await product.save();

        const savedViewer = product.viewers[product.viewers.length - 1];
        res.status(201).json({ viewerCount: product.viewers.length, viewer: savedViewer });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const addReview = async (req, res) => {
  try {
    const { author, rating, text, viewerId } = req.body || {};
    if (!author || !rating || !text || !viewerId) {
      return res.status(400).json({ message: 'author, rating, text, and viewerId are required' });
    }
    const product = await Product.findOne({ productId: req.params.productId });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    product.reviews.push({ author, rating: Number(rating), text, viewerId });
    product.reviewCount = product.reviews.length;
    const sum = product.reviews.reduce((acc, r) => acc + (r.rating || 0), 0);
    product.rating = product.reviews.length ? (sum / product.reviews.length) : 0;
    await product.save();
    res.status(201).json({ message: 'Review added', reviewCount: product.reviewCount, rating: product.rating });
  } catch (error) {
    console.error('Error adding review', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getAllViewers = async (req, res) => {
    try {
        const productsWithViewers = await Product.find({ 'viewers.0': { $exists: true } }).select('title viewers reviews');
        res.json(productsWithViewers);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const getViewersByProductId = async (req, res) => {
    try {
        const product = await Product.findOne({ productId: req.params.productId });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json({ viewerCount: product.viewers.length, viewers: product.viewers });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

const deleteViewer = async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId);
        if (!product) return res.status(404).json({ message: 'Product not found' });
        product.viewers.pull({ _id: req.params.viewerId });
        await product.save();
        res.json({ message: 'Viewer removed' });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

export { 
    getProducts, getProductById, createProduct, updateProduct, deleteProduct,
    addViewer, getViewersByProductId, getAllViewers, deleteViewer, addReview
};