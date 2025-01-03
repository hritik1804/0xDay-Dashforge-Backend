const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const connectDB = async () => {
  // Add validation for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('Error: DATABASE_URL is not defined in environment variables');
    process.exit(1);
  }

  try {
    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 50,
      wtimeoutMS: 2500,
      socketTimeoutMS: 30000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Detailed MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
