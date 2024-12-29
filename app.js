require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./middleware/db');
const multerRoutes = require('./routes/multerRoutes');
const queryRoutes = require('./routes/queryRoutes');
const organisationRoutes = require('./routes/organisation');
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
app.use(express.json({ limit: '350mb' }));
app.use(express.urlencoded({ limit: '350mb', extended: true }));

// Public route
// app.get('/', (req, res) => {
//   res.json({ message: 'Public route, no authentication needed' });
// });

// Protected routes with Clerk session middleware
// app.use('/api', requireSession, protectedRoutes);

app.use('/api', multerRoutes);
app.use('/api', queryRoutes);
app.use('/api', organisationRoutes);
// Debug log to verify environment variables are loaded
console.log('Environment check - MONGO_URI exists:', !!process.env.MONGODB_URI);

// // Increase payload size limits for Express
// app.use(express.json({ limit: '300mb' }));
// app.use(express.urlencoded({ 
//     limit: '300mb', 
//     extended: true,
//     parameterLimit: 50000 
// }));

// Add these headers to handle large files and CORS if needed
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    // Set timeout to 10 minutes for large file uploads
    req.setTimeout(600000); 
    next();
});

// If you're using body-parser, configure it as well
const bodyParser = require('body-parser');
app.use(bodyParser.json({ limit: '300mb' }));
app.use(bodyParser.urlencoded({ 
    limit: '300mb', 
    extended: true,
    parameterLimit: 50000 
}));

// If you're using NGINX as a reverse proxy, you'll also need to update your NGINX configuration:
// Add this to your nginx.conf:
/*
http {
    client_max_body_size 300M;
    ...
}
*/

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
