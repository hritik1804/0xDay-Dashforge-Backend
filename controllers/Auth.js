const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Sign up a new user
exports.signup = async (req, res) => {
  const { f_name, m_name, l_name, gmail, username, password, website } = req.body;
  console.log(req.body);

  try {
    const existingUser  = await User.findOne({ gmail });
    if (existingUser ) {
      return res.status(400).json({ message: 'User  already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser  = new User({
      f_name,
      l_name,
      gmail,
      username,
      password: hashedPassword,
      website,
    });
    

    await newUser .save();
    res.status(201).json({ message: 'User  created successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
};

// Log in a user
exports.login = async (req, res) => {
    const { gmail, password } = req.body;
  
    try {
      const user = await User.findOne({ gmail });
      if (!user) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }
  
      const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.status(200).json({ token, user: { id: user._id, username: user.username } });
    } catch (error) {
      console.error('Login error:', error); 
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  };


// Get the current logged-in user
exports.getCurrentUser = async (req, res) => {
  // Get the token from the authorization header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    // Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Find the user by ID (decoded.id)
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return user details (you can customize the response as needed)
    res.status(200).json({
      id: user._id,
      f_name: user.f_name,
      m_name: user.m_name,
      l_name: user.l_name,
      username: user.username,
      gmail: user.gmail,
      website: user.website,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
