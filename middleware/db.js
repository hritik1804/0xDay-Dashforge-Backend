const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();


const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.DATABASE_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      maxPoolSize: 50,
      wtimeoutMS: 2500,
      socketTimeoutMS: 30000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    // console.log('MongoDB connection successful', process.env.DATABASE_URL);
  } catch (error) {
    console.log('MongoDB connection error:', error);
    
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
