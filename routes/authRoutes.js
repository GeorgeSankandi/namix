import express from 'express';
import passport from '../config/passport.js';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { signup, logout, forgotPassword, resetPassword } from '../controllers/authController.js';
import jwt from 'jsonwebtoken';

const router = express.Router();

const __dirname = path.resolve();
const resellerDocumentDir = path.join(__dirname, 'public/uploads/reseller-documents');
if (!fs.existsSync(resellerDocumentDir)) {
  fs.mkdirSync(resellerDocumentDir, { recursive: true });
}

const resellerDocStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, resellerDocumentDir);
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const uploadFields = multer({
  storage: resellerDocStorage,
  limits: { fileSize: 25 * 1024 * 1024 },
}).fields([
  { name: 'businessRegistrationDocument', maxCount: 1 },
  { name: 'sellerIdImage', maxCount: 1 }
]);

const handleResellerDocumentUpload = (req, res, next) => {
  if (req.is('multipart/form-data')) {
    uploadFields(req, res, (err) => {
      if (err) {
        return res.status(400).json({ message: err.message || 'Failed to upload reseller documents.' });
      }
      next();
    });
  } else {
    next();
  }
};

// Session-based signup
router.post('/signup', handleResellerDocumentUpload, signup);

// Session-based login
router.post('/login', passport.authenticate('local'), (req, res) => {
  req.session.save((err) => {
    if (err) {
      console.error('Session save error:', err);
      return res.status(500).json({ message: 'Session error' });
    }
    console.log('✓ Session created and saved:', req.session.id);
    console.log('✓ User serialized in session:', req.session.passport?.user);
    
    const user = req.user;
    
    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET || 'dev_fallback_secret_change_me',
      { expiresIn: '7d' }
    );
    
    res.json({ 
      user: { 
        _id: user._id, 
        name: user.name, 
        email: user.email, 
        isAdmin: user.isAdmin, 
        sellerType: user.sellerType,
        token: token
      } 
    });
  });
});

// Return current user session info
router.get('/me', (req, res) => {
  if (req.user) {
    res.json({
      _id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      isAdmin: req.user.isAdmin,
      sellerType: req.user.sellerType
    });
  } else {
    res.status(401).json({ message: 'Not authenticated' });
  }
});

router.post('/logout', logout);
router.post('/forgot', forgotPassword);
router.post('/reset/:token', resetPassword);

export default router;