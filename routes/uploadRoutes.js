// --- START OF FILE routes/uploadRoutes.js ---

import path from 'path';
import express from 'express';
import multer from 'multer';
import fs from 'fs'; 

const router = express.Router();

// Define the root directory
const __dirname = path.resolve();

// Ensure upload folders exist on startup to prevent Multer ENOENT upload crashes
const productUploadPath = path.join(__dirname, 'public/uploads/products/');
const heroUploadPath = path.join(__dirname, 'public/uploads/heroes/');

if (!fs.existsSync(productUploadPath)) {
  fs.mkdirSync(productUploadPath, { recursive: true });
}
if (!fs.existsSync(heroUploadPath)) {
  fs.mkdirSync(heroUploadPath, { recursive: true });
}

// Configure storage for product images
const productStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, productUploadPath);
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});

// Configure storage for hero images
const heroStorage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, heroUploadPath);
  },
  filename(req, file, cb) {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
  },
});


function checkFileType(file, cb) {
  const filetypes = /jpg|jpeg|png/;
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = filetypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb('Images only! (jpg, jpeg, png)');
  }
}

const uploadProduct = multer({
  storage: productStorage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

const uploadHero = multer({
  storage: heroStorage,
  fileFilter: function (req, file, cb) {
    checkFileType(file, cb);
  },
});

// Route for product images
router.post('/product', uploadProduct.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'Please upload a file' });
  }
  res.send({
    message: 'Image uploaded successfully',
    image: `/uploads/products/${req.file.filename}`,
  });
});

// Route for hero images
router.post('/hero', uploadHero.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).send({ message: 'Please upload a file' });
  }
  res.send({
    message: 'Hero image uploaded successfully',
    image: `/uploads/heroes/${req.file.filename}`,
  });
});

export default router;