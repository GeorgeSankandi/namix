import express from 'express';
const router = express.Router();
import { authUser, registerUser, getUsers, deleteUser, approveUser, getUserBalance } from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

router.post('/login', authUser);
router.route('/').post(registerUser).get(protect, admin, getUsers);

// Route to get user balance
router.get('/balance', protect, getUserBalance);

router.delete('/:id', protect, admin, deleteUser);
router.put('/:id/approve', protect, admin, approveUser);

export default router;