import mongoose from 'mongoose';
import dotenv from 'dotenv';
import connectDB from '../config/db.js';
import Product from '../models/productModel.js';
import User from '../models/userModel.js'; // Import User model
import { defaultProducts } from './productData.js';
import { users } from './userData.js'; // Import users data

dotenv.config();

const importData = async () => {
  try {
    await connectDB();

    // Clear existing data
    await Product.deleteMany();
    await User.deleteMany();
    console.log('Existing products and users cleared...');

    // Prepare and insert products, ensuring review consistency
    const productsToInsert = Object.entries(defaultProducts).map(([key, value]) => {
      const product = {
        productId: key,
        ...value,
      };
      // If reviews exist, calculate count and rating. If not, ensure they are 0.
      if (product.reviews && product.reviews.length > 0) {
        product.reviewCount = product.reviews.length;
        const totalRating = product.reviews.reduce((acc, item) => acc + item.rating, 0);
        product.rating = totalRating / product.reviewCount;
      } else {
        product.reviews = [];
        product.reviewCount = 0;
        product.rating = 0;
      }
      return product;
    });

    await Product.insertMany(productsToInsert);
    console.log(`✅ ${productsToInsert.length} Products Imported Successfully!`);

    // Use User.create() to ensure password hashing middleware runs
    await User.create(users);
    console.log(`✅ ${users.length} Users Imported Successfully!`);

  } catch (error) {
    console.error('❌ ERROR DURING DATA IMPORT:', error);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    await connectDB();
    await Product.deleteMany();
    await User.deleteMany();
    console.log('✅ Data Destroyed Successfully!');
  } catch (error) {
    console.error('❌ ERROR DURING DATA DESTRUCTION:', error);
    process.exit(1);
  }
};

// Main execution logic
const run = async () => {
  if (process.argv[2] === '-d') {
    await destroyData();
  } else {
    await importData();
  }
  await mongoose.connection.close();
  process.exit(0);
};

run();