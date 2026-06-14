import mongoose from 'mongoose';

// Peak human activity times for realistic viewer timestamps
export const PEAK_ACTIVITY_TIMES = [
  { label: '6:00 AM', hour: 6, minute: 0 },
  { label: '8:00 AM', hour: 8, minute: 0 },
  { label: '10:00 AM', hour: 10, minute: 0 },
  { label: '12:00 PM (Noon)', hour: 12, minute: 0 },
  { label: '2:00 PM', hour: 14, minute: 0 },
  { label: '4:00 PM', hour: 16, minute: 0 },
  { label: '6:00 PM', hour: 18, minute: 0 },
  { label: '8:00 PM', hour: 20, minute: 0 },
  { label: '10:00 PM', hour: 22, minute: 0 },
];

const reviewSchema = mongoose.Schema({
  author: { type: String, required: true },
  rating: { type: Number, required: true },
  text: { type: String, required: true },
  viewerId: { type: mongoose.Schema.Types.ObjectId }, // Link to the viewer subdocument _id
}, {
  timestamps: true
});

const viewerSchema = mongoose.Schema({
  viewedAt: { type: Date, required: true },
  name: { type: String },
  addedByAdmin: { type: Boolean, default: false },
});

const productSchema = mongoose.Schema({
  productId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: { type: String },
  oldPrice: { type: Number, required: true },
  currentPrice: { type: Number, required: true },
  image: { type: String, required: true },
  category: { type: String, required: true, index: true },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  thumbnails: [{ type: String }],
  reviews: [reviewSchema],
  features: [{ type: String }],
  // Clothing-specific filters (e.g., 'tops','bottoms','shoes') used on clothes pages
  clothingFilters: [{ type: String }],
  // New field for Clothing Sizes
  sizes: [{ type: String }], 
  stock: { type: Number },
  
  // Sale & Promotion Fields
  onSale: { type: Boolean, default: false },
  saleStartDate: { type: Date },
  saleEndDate: { type: Date },
  
  // Super Combo Specifics
  comboEndDate: { type: Date },
  comboProductIds: [{ type: String }], // Store IDs of products in the combo
  
  // Gift Card Reward Settings
  giftCardEnabled: { type: Boolean, default: false },
  giftCardType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  giftCardValue: { type: Number, default: 5 }, // Default 5%

  colors: [{ type: String }],
  colorsEnabled: { type: Boolean, default: true },
  // Reference to the seller (User)
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Reference to the target reseller assigned to the "Explore More" filter button
  exploreMoreReseller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  // Clothing gender classification: 'men', 'women', or 'unisex'
  genderCategory: { type: String, enum: ['men', 'women', 'unisex'], default: 'unisex' },
  // list of special page slugs this product belongs to (e.g., 'new-arrivals', 'on-sale')
  curatedPages: [{ type: String }],
  purchaseCount: { type: Number, default: 0 },
  condition: { type: String, enum: ['new', 'second-hand'], default: 'new' },
  viewers: [viewerSchema],
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);

export default Product;