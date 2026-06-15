import mongoose from 'mongoose';

const brandSchema = mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
  }
}, {
  timestamps: true,
});

const Brand = mongoose.model('Brand', brandSchema);

export default Brand;