import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Consultant from '../models/Consultant.js';

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

export const register = async (req, res) => {
  try {
    const { fullName, email, password, phone, role, specialization, yearsExperience, hourlyRate, bio } = req.body;

    if (role === 'admin') {
      return res.status(400).json({ message: 'Cannot register as admin' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const user = await User.create({
      fullName,
      email,
      password,
      phone,
      role: role || 'client',
    });

    if (role === 'consultant') {
      await Consultant.create({
        userId: user._id,
        specialization: specialization || 'General',
        bio: bio || '',
        yearsExperience: yearsExperience || 0,
        hourlyRate: hourlyRate || 0,
        verificationStatus: 'pending',
      });
    }

    const token = generateToken(user._id);
    res.status(201).json({ token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    if (user.accountStatus !== 'active') {
      return res.status(403).json({ message: 'Account is suspended or inactive' });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = generateToken(user._id);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
