const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const connStr = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/dealflow360';
    console.log(`Connecting to MongoDB at: ${connStr}`);
    
    const conn = await mongoose.connect(connStr, {
      serverSelectionTimeoutMS: 5000,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error(`MongoDB Connection Error: ${error.message}`);
    console.warn('Running without active MongoDB connection or attempting fallback. Make sure MongoDB is running on port 27017 or MONGODB_URI is provided in .env');
    return false;
  }
};

module.exports = connectDB;
