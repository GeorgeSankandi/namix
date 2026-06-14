import express from 'express';
const router = express.Router();
import { 
    getProducts, 
    getProductById, 
    createProduct, 
    updateProduct, 
    deleteProduct,
    addViewer,
    getViewersByProductId,
    getAllViewers,
    deleteViewer
    ,
    addReview
} from '../controllers/productController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Admin-only routes first (to avoid conflicts with /:id)
router.route('/').post(protect, admin, createProduct);
router.route('/viewers/all').get(protect, admin, getAllViewers);

// Public routes
router.route('/').get(getProducts);
router.route('/:id').get(getProductById);
router.route('/:productId/viewers').get(getViewersByProductId).post(addViewer);
router.route('/:productId/reviews').post(protect, admin, addReview);
router.route('/:id').put(protect, admin, updateProduct).delete(protect, admin, deleteProduct);
router.route('/:productId/viewers/:viewerId').delete(protect, admin, deleteViewer);

export default router;