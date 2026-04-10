import 'dotenv/config';
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import MembershipPlan from '../src/models/MembershipPlan.js';

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const existingAdmin = await User.findOne({ email: 'admin@apex.com' });
    if (!existingAdmin) {
      await User.create({ fullName: 'Admin User', email: 'admin@apex.com', password: 'Admin123!', role: 'admin' });
      console.log('Admin user created (admin@apex.com / Admin123!)');
    } else {
      console.log('Admin user already exists');
    }

    // Drop and recreate plans so price/features are populated
    await MembershipPlan.deleteMany({});
    await MembershipPlan.insertMany([
      {
        planName: 'Basic', commissionRate: 15, listingPriority: 1, supportLevel: 'Email',
        monthlyTransactionLimit: 3, price: 0, planType: 'both',
        features: ['Up to 3 sessions per month', 'Email support', 'Basic consultant listing', 'Standard visibility'],
      },
      {
        planName: 'Standard', commissionRate: 10, listingPriority: 2, supportLevel: 'Priority Email + Chat',
        monthlyTransactionLimit: 15, price: 29, planType: 'both',
        features: ['Up to 15 sessions per month', 'Priority email + chat support', 'Featured listing', 'Enhanced visibility', 'Analytics dashboard'],
      },
      {
        planName: 'Premium', commissionRate: 5, listingPriority: 3, supportLevel: '24/7 Dedicated Support',
        monthlyTransactionLimit: -1, price: 79, planType: 'both',
        features: ['Unlimited sessions', '24/7 dedicated support', 'Top listing priority', 'Maximum visibility', 'Advanced analytics', 'Custom branding'],
      },
    ]);
    console.log('Membership plans created/updated');
    console.log('\nSeed complete! Admin: admin@apex.com / Admin123!');
    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seed();
