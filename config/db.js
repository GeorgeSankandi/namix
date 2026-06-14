import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // The deprecated options have been removed from the connect call.
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;