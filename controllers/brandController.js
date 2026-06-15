import Brand from '../models/brandModel.js';

// @desc    Get all brands
// @route   GET /api/brands
const getBrands = async (req, res) => {
  try {
    const brands = await Brand.find({}).sort({ name: 1 });
    res.json(brands);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Create a brand
// @route   POST /api/brands
const createBrand = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Brand name is required' });
    }
    const exists = await Brand.findOne({ name: new RegExp(`^${name.trim()}$`, 'i') });
    if (exists) {
      return res.status(400).json({ message: 'Brand already exists' });
    }
    const brand = new Brand({ name: name.trim() });
    const createdBrand = await brand.save();
    res.status(201).json(createdBrand);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Update a brand
// @route   PUT /api/brands/:id
const updateBrand = async (req, res) => {
  try {
    const { name } = req.body;
    const brand = await Brand.findById(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }
    if (name) {
      const exists = await Brand.findOne({ name: new RegExp(`^${name.trim()}$`, 'i'), _id: { $ne: req.params.id } });
      if (exists) {
        return res.status(400).json({ message: 'Another brand with this name already exists' });
      }
      brand.name = name.trim();
    }
    const updatedBrand = await brand.save();
    res.json(updatedBrand);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    Delete a brand
// @route   DELETE /api/brands/:id
const deleteBrand = async (req, res) => {
  try {
    const brand = await Brand.findByIdAndDelete(req.params.id);
    if (!brand) {
      return res.status(404).json({ message: 'Brand not found' });
    }
    res.json({ message: 'Brand removed' });
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

export { getBrands, createBrand, updateBrand, deleteBrand };