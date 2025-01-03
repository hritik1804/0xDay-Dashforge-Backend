const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');


exports.signup = async (req, res) => {
  const { f_name, l_name, gmail, username, password } = req.body;

  try {
    const existingUser = await prisma.user.findUnique({where: {gmail}})
    if(existingUser){
      return res.status(400).json({message: "User already exists"})
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: {
        f_name,
        l_name,
        gmail,
        username,
        password: hashedPassword
      }
    });
    res.status(201).json({message: "User created successfully", user: newUser})
  } catch (error) {
    console.error("Error creating user", error);
    res.status(500).json({message: "Internal server error", error: error.message})
  }
};

exports.login = async (req, res) => {
  const {gmail, password} = req.body;
  try {
    const user = await prisma.user.findUnique({where : {gmail}})
    if(!user){
      return res.status(400).json({message: "Invalid credentials"})
    }
    const isMatch = await bcrypt.compare(password, user.password);
    if(!isMatch){
      return res.status(400).json({message: "Invalid credentials"})
    }
    const token = jwt.sign({id: user.id}, process.env.JWT_SECRET, {expiresIn: "1h"});
    res.status(200).json({message: "Login successful", token, user: {id: user.id, username: user.username}})
  } catch (error) {
    console.error("Error logging in", error);
    res.status(500).json({message: "Internal server error", error: error.message})
  }
};

exports.getCurrentUser = async (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if(!token){
    return res.status(401).json({message: "Authentication required"})
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({where: {id: decoded.id}})
    res.status(200).json({user})
  } catch (error) {
    console.error("Error fetching user", error);
    res.status(500).json({message: "Internal server error", error: error.message})
  }
};
