require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./middleware/db');
const multerRoutes = require('./routes/multerRoutes');
// const { requireSession } = require('@clerk/clerk-sdk-node'); // Directly use requireSession middleware
// const protectedRoutes = require('./routes/protectedRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors({
    origin: '*',
    // credentials: true,
  }));

// Connect to the database
connectDB();


// Add mongoose connection status check
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
  });

// Middleware for parsing JSON
app.use(express.json());

// Public route
// app.get('/', (req, res) => {
//   res.json({ message: 'Public route, no authentication needed' });
// });

// Protected routes with Clerk session middleware
// app.use('/api', requireSession, protectedRoutes);

app.use('/api', multerRoutes);

// Debug log to verify environment variables are loaded
console.log('Environment check - MONGO_URI exists:', !!process.env.MONGODB_URI);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
