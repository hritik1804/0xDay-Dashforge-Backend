const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  f_name: { type: String, required: true },
  l_name: { type: String },
  gmail: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  website: { type: String, required: true },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User ', userSchema);