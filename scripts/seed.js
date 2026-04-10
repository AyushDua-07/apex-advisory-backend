import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import MembershipPlan from '../src/models/MembershipPlan.js';

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Create admin user if not exists
    const existingAdmin = await User.findOne({ email: 'admin@apex.com' });
    if (!existingAdmin) {
      await User.create({
        fullName: 'Admin User',
        email: 'admin@apex.com',
        password: 'Admin123!',
        role: 'admin',
      });
      console.log('Admin user created');
    } else {
      console.log('Admin user already exists');
    }

    // Create membership plans if not exist
    const existingPlans = await MembershipPlan.countDocuments();
    if (existingPlans === 0) {
      await MembershipPlan.insertMany([
        {
          planName: 'Basic',
          commissionRate: 15,
          listingPriority: 1,
          supportLevel: 'Email',
          monthlyTransactionLimit: 10,
        },
        {
          planName: 'Standard',
          commissionRate: 10,
          listingPriority: 2,
          supportLevel: 'Priority Email + Chat',
          monthlyTransactionLimit: 50,
        },
        {
          planName: 'Premium',
          commissionRate: 5,
          listingPriority: 3,
          supportLevel: '24/7 Dedicated Support',
          monthlyTransactionLimit: -1,
        },
      ]);
      console.log('Membership plans created');
    } else {
      console.log('Membership plans already exist');
    }

    console.log('Seed complete');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
