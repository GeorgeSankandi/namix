import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
const router = express.Router();
import { authUser, registerUser, getUsers, deleteUser, approveUser, getUserBalance, updateUserProfile } from '../controllers/userController.js';
import { protect, admin } from '../middleware/authMiddleware.js';

// Setup profile image storage
const profileStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = 'public/uploads/profiles/';
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename(req, file, cb) {
    cb(null, `profile-${req.user._id}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`);
  }
});
const uploadProfile = multer({ storage: profileStorage });

router.post('/login', authUser);
router.route('/').post(registerUser).get(protect, admin, getUsers);

// Route to get user balance
router.get('/balance', protect, getUserBalance);

// Route to update profile settings (reseller profiles)
router.put('/profile', protect, uploadProfile.single('profileImage'), updateUserProfile);

router.delete('/:id', protect, admin, deleteUser);
router.put('/:id/approve', protect, admin, approveUser);

export default router;