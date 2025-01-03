require('dotenv').config();  // Only once at the top
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const connectDB = require('./middleware/db');
// const multerRoutes = require('./routes/multerRoutes');
// const queryRoutes = require('./routes/queryRoutes');
// const organisationRoutes = require('./routes/organisation');
// const uploadRoutes = require('./testing/uploadRoutes');
// const analysisRoutes = require('./testing/analysisRoutes');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors({
    origin: '*',
    // credentials: true, // If you're dealing with cookies and sessions, use this
    exposedHeaders: ['Content-Type', 'Origin', 'X-Requested-With', 'Accept']
}));

connectDB();

// mongoose connection status check
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
});

// Middleware for parsing JSON
// app.use(express.json({ limit: '350mb' }));
// app.use(express.urlencoded({ limit: '350mb', extended: true }));

// Routes
app.use('/api/auth', authRoutes);
// Testing routes
// app.use('/api', uploadRoutes);
// app.use('/api', analysisRoutes);

// Single place for body parsing with consistent limits
app.use(bodyParser.json({ limit: '500mb' }));
app.use(bodyParser.urlencoded({ 
    limit: '500mb', 
    extended: true,
    parameterLimit: 50000 
}));

// Add timeout setting separately if needed
app.use((req, res, next) => {
    req.setTimeout(600000);  // 10 minutes
    next();
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
