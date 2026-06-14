import express from 'express';
const router = express.Router();
import { getFAQs, createFAQ, updateFAQ, deleteFAQ } from '../controllers/faqController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

router.route('/')
    .get(getFAQs)
    .post(protect, admin, createFAQ);

router.route('/:id')
    .put(protect, admin, updateFAQ)
    .delete(protect, admin, deleteFAQ);

export default router;