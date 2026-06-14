import Product from '../models/productModel.js';
import mongoose from 'mongoose';
import { generateDescriptionWithGemini, generateFeaturesWithGemini } from '../utils/geminiService.js';

// @desc    Fetch all products or search by keyword/category/curated page
// @route   GET /api/products
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

    if (lowerCats.includes('womens-clothes') || lowerCats.includes('womens-clothing')) {
      query.curatedPages = { $in: ['womens-clothes'] };
    } else if (lowerCats.includes('mens-clothes') || lowerCats.includes('mens-clothing')) {
      query.curatedPages = { $in: ['mens-clothes'] };
    } else if (lowerCats.some(c => ['living-room','livingroom','bedroom','office','kitchen'].includes(c))) {
      const furnitureSlugs = [];
      if (lowerCats.includes('living-room') || lowerCats.includes('livingroom')) furnitureSlugs.push('living-room');
      if (lowerCats.includes('bedroom')) furnitureSlugs.push('bedroom');
      if (lowerCats.includes('office')) furnitureSlugs.push('office');
      if (lowerCats.includes('kitchen')) furnitureSlugs.push('kitchen');
      if (furnitureSlugs.length) query.curatedPages = { $in: furnitureSlugs };
    } else if (lowerCats.includes('furniture') || lowerCats.includes('furnitures')) {
      query.$or = [
        { category: { $in: [/^furniture$/i, /^furnitures$/i] } },
        { curatedPages: { $in: ['living-room','bedroom','office','kitchen'] } }
      ];
    } else if (lowerCats.some(c => ['kids-electronics','kids-clothing','kids-toys'].includes(c))) {
      const kidsSlugs = [];
      if (lowerCats.includes('kids-electronics')) kidsSlugs.push('kids-electronics');
      if (lowerCats.includes('kids-clothing')) kidsSlugs.push('kids-clothing');
      if (lowerCats.includes('kids-toys')) kidsSlugs.push('kids-toys');
      if (kidsSlugs.length) query.curatedPages = { $in: kidsSlugs };
    } else if (lowerCats.includes('kids')) {
      query.$or = [
        { category: { $in: [/^kids$/i] } },
        { curatedPages: { $in: ['kids-electronics','kids-clothing','kids-toys'] } }
      ];
    } else {
      const clothesAliases = ['clothes','clothing'];
      if (lowerCats.some(c => clothesAliases.includes(c))) {
        query.$or = [
          { category: { $in: [/^clothes$/i, /^clothing$/i] } },
          { curatedPages: { $in: ['womens-clothes','mens-clothes'] } }
        ];
      } else {
        const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
        query.category = { $in: categories.map(c => new RegExp(`^${escapeRegex(c)}$`, 'i')) };
      }
    }
  }

  if (curated) query.curatedPages = curated;

  try {
    const products = await Product.find(query).populate('seller', 'name businessName isVerified location');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Fetch a single product by its custom ID
// @route   GET /api/products/:id
const getProductById = async (req, res) => {
  try {
    let product = await Product.findOne({ productId: req.params.id })
      .populate('seller', 'name businessName isVerified location sellerRating')
      .populate('exploreMoreReseller', 'name businessName');
      
    if (!product) {
       if (mongoose.Types.ObjectId.isValid(req.params.id)) {
         product = await Product.findById(req.params.id)
           .populate('seller', 'name businessName isVerified location sellerRating')
           .populate('exploreMoreReseller', 'name businessName');
       }
    }
    if (product) res.json(product);
    else res.status(404).json({ message: 'Product not found' });
  } catch (error) {
     res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a new product
// @route   POST /api/products
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

        if (req.body.productId) {
          const existing = await Product.findOne({ productId: req.body.productId });
          if (existing) {
            return res.status(400).json({ message: 'Duplicate productId', details: { productId: req.body.productId } });
          }
        }

        const product = new Product({
            productId: req.body.productId,
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
            exploreMoreReseller: req.body.exploreMoreReseller || undefined
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
      if (error.name === 'MongoServerError' && error.code === 11000) {
        return res.status(400).json({ message: 'Duplicate productId', details: error.keyValue });
      }
      return res.status(500).json({ message: 'Server error while creating product', error: error.message });
    }
};

// @desc    Update a product
// @route   PUT /api/products/:id
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json(product);
  } catch (error) {
    console.error('Error updating product', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a product
// @route   DELETE /api/products/:id
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    res.json({ message: 'Product removed' });
  } catch (error) {
    console.error('Error deleting product', error);
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Add a viewer to a product
// @route   POST /api/products/:productId/viewers
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

// @desc    Add a review to a product (admin)
// @route   POST /api/products/:productId/reviews
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

// @desc    Get all viewers for all products (admin only)
// @route   GET /api/products/viewers/all
const getAllViewers = async (req, res) => {
    try {
        const productsWithViewers = await Product.find({ 'viewers.0': { $exists: true } }).select('title viewers reviews');
        res.json(productsWithViewers);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Get viewers for a specific product
// @route   GET /api/products/:productId/viewers
const getViewersByProductId = async (req, res) => {
    try {
        const product = await Product.findOne({ productId: req.params.productId });
        if (!product) return res.status(404).json({ message: 'Product not found' });
        res.json({ viewerCount: product.viewers.length, viewers: product.viewers });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
};

// @desc    Delete a specific viewer entry (admin only)
// @route   DELETE /api/products/:productId/viewers/:viewerId
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