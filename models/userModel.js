import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  businessName: {
    type: String,
    default: ''
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  isAdmin: {
    type: Boolean,
    required: true,
    default: false,
  },
  sellerType: {
    type: String,
    enum: ['customer', 'admin', 'electronics', 'solar', 'fashion', 'groceries', 'appliances', 'vehicles', 'crafts', 'farm', 'fuel', 'other'],
    default: 'customer',
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  sellerIdNumber: {
    type: String,
    default: ''
  },
  businessRegistrationNumber: {
    type: String,
    default: ''
  },
  businessRegistrationDocument: {
    type: String,
    default: ''
  },
  physicalAddress: {
    type: String,
    default: ''
  },
  location: {
    type: String,
    default: ''
  },
  sellerRating: {
    type: Number,
    default: 0
  },
  isApproved: {
    type: Boolean,
    required: true,
    default: true, // Customers are auto-approved
  },
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
}, {
  timestamps: true,
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

export default User;