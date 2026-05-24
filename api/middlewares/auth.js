// middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const Instance = require('../models/instance.model')
const User = require('../models/users.model')


// Middleware to verify JWT token
const authenticateInstance = async (req, res, next) => {
  const token = req.header('Authorization');
  if (!token) return res.status(401).json({ message: 'Access denied. No token provided.' });

  const instanceFound = await Instance.findOne({instance_id: token})
  if(! instanceFound) return res.status(403).json({message: 'Invalid InstanceID'})
  
  req.user = instanceFound;
  next();
};

const authenticateToken = async (req, res, next) => {
  const token = req.header('Authorization'); // Bearer Token
  if (!token) return res.status(401).json({ message: 'Not authorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const instance = await User.findOne({_id: decoded.userId})
    req.user = decoded
    if(instance?.numberId){
      req.user['numberId'] = instance?.numberId;
      req.user['name'] = instance?.name;
      req.user['designation'] = instance?.designation;
    }else if(!instance){
      return res.status(403).json({ message: 'User not found' });
    }
    next();
  } catch (error) {
    console.log(error)
    return res.status(401).json({ message: 'Invalid token' });
  }
};

module.exports = {
  authenticateInstance,
  authenticateToken
};
