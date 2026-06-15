import express from 'express';
const router = express.Router();
import { getBrands, createBrand, updateBrand, deleteBrand } from '../controllers/brandController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

router.route('/')
  .get(getBrands)
  .post(protect, admin, createBrand);

router.route('/:id')
  .put(protect, admin, updateBrand)
  .delete(protect, admin, deleteBrand);

export default router;