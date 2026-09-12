const mongoose = require('mongoose');

const connectDB = async () => {
  const mongoURI = process.env.MONGODB_URI;

  if (!mongoURI) {
    console.error('MongoDB connection error: MONGODB_URI is not defined in environment variables.');
    return;
  }

  try {
    const conn = await mongoose.connect(mongoURI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
  }
};

module.exports = connectDB;
