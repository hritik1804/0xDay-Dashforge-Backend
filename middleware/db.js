const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

let isConnected = false; // track the connection status

const connectDB = async () => {
  if (isConnected) {
    console.log('Using existing database connection');
    return;
  }

  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not defined in environment variables');
    process.exit(1);
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      maxPoolSize: 50,
      socketTimeoutMS: 30000,
    });

    isConnected = true;
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Detailed MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
