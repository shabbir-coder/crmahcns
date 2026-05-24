const bcrypt = require('bcryptjs');
const User = require('../models/users.model')
const jwt = require('jsonwebtoken');

exports.createUser = async (req, res) => {
  try {
    const { name, designation, password } = req.body;

    const numberId = req?.user?.numberId

    const existingUser = await User.findOne({ name });
    if (existingUser) return res.status(400).json({ message: 'Name already exists' });

    const newUser = new User({ name, designation, password , numberId});
    await newUser.save();
    
    res.status(201).json({ message: 'User created successfully', user: newUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.loginUser = async (req, res) => {
  try {
    const { userName, password } = req.body;

    const user = await User.findOne({ name: userName });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ message: 'Login successful', token, user });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const existingUser = await User.findOne({ name });

    const updatedUser = await User.findOneAndUpdate({ _id: userId }, updates, { new: true });
    if (!updatedUser) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User updated successfully', user: updatedUser });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    const deletedUser = await User.findOneAndDelete({ userId });
    if (!deletedUser) return res.status(404).json({ message: 'User not found' });

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find({role:'agent'}, '-password'); // Exclude password
    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

// **Get Single User**
exports.getUserById = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findOne({ userId }, '-password'); // Exclude password
    if (!user) return res.status(404).json({ message: 'User not found' });

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};
