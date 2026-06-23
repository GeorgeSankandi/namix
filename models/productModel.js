import mongoose from 'mongoose';

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
  viewerId: { type: mongoose.Schema.Types.ObjectId },
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
  clothingFilters: [{ type: String }],
  sizes: [{ type: String }], 
  stock: { type: Number },
  
  onSale: { type: Boolean, default: false },
  saleStartDate: { type: Date },
  saleEndDate: { type: Date },
  
  comboEndDate: { type: Date },
  comboProductIds: [{ type: String }],
  
  giftCardEnabled: { type: Boolean, default: false },
  giftCardType: { type: String, enum: ['percent', 'fixed'], default: 'percent' },
  giftCardValue: { type: Number, default: 5 },

  colors: [{ type: String }],
  colorsEnabled: { type: Boolean, default: true },
  seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  exploreMoreReseller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  genderCategory: { type: String, enum: ['men', 'women', 'unisex'], default: 'unisex' },
  curatedPages: [{ type: String }],
  purchaseCount: { type: Number, default: 0 },
  condition: { type: String, enum: ['new', 'second-hand'], default: 'new' },
  viewers: [viewerSchema],
  
  // Transport options
  freeTransport: { type: Boolean, default: false },
  deliveryPriceWindhoek: { type: Number, default: 0 },
  deliveryPriceOutside: { type: Number, default: 0 },
  cashOnDelivery: { type: Boolean, default: false },

  // Flexible safe delivery insurance details
  safeInsuranceEnabled: { type: Boolean, default: false },
  safeInsurancePrice: { type: Number, default: 0 },

  // Flexible Warranty duration
  warrantyDuration: { type: String, default: 'No Warranty' },

  // Promotion Status Banners
  promotionStatus: { type: String, enum: ['None', 'Hot Deal', 'Limited Offer', 'WhatsApp Promo', 'Countdown Special'], default: 'None' },
  
  // Trust Visibility Toggles
  showTradeIn: { type: Boolean, default: true },
  showLayBye: { type: Boolean, default: true },
  showDeposit: { type: Boolean, default: true },
  showDeliveryNationwide: { type: Boolean, default: true },
  showOneYearWarranty: { type: Boolean, default: true },
  showFifteenDayReturns: { type: Boolean, default: true }
}, {
  timestamps: true
});

const Product = mongoose.model('Product', productSchema);

export default Product;