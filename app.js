require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const connectDB = require('./middleware/db');
const multerRoutes = require('./routes/multerRoutes');
const queryRoutes = require('./routes/queryRoutes');
const organisationRoutes = require('./routes/organisation');
const uploadRoutes = require('./testing/uploadRoutes');
// const { requireSession } = require('@clerk/clerk-sdk-node'); // Directly use requireSession middleware
// const protectedRoutes = require('./routes/protectedRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

app.use(cors({
    origin: '*',
    // credentials: true,
  }));


connectDB();


//mongoose connection status check
mongoose.connection.once('open', () => {
    console.log('Connected to MongoDB');
  });

// Middleware for parsing JSON
app.use(express.json());
app.use(express.json({ limit: '350mb' }));
app.use(express.urlencoded({ limit: '350mb', extended: true }));



app.use('/api', multerRoutes);
app.use('/api', queryRoutes);
app.use('/api', organisationRoutes);
app.use('/api/auth', authRoutes);
// Testing routes
app.use('/api/upload', uploadRoutes);



// Add these headers to handle large files and CORS if needed
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    req.setTimeout(600000); 
    next();
});

const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '300mb' }));
app.use(bodyParser.urlencoded({ 
    limit: '300mb', 
    extended: true,
    parameterLimit: 50000 
}));


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
