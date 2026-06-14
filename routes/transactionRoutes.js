import express from 'express';
const router = express.Router();
import { createTransaction, getAllTransactions, updateTransaction } from '../controllers/transactionController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

router.route('/')
    .post(createTransaction)
    .get(protect, admin, getAllTransactions);

router.route('/:id')
    .put(protect, admin, updateTransaction);

export default router;