import mongoose from 'mongoose';

const membershipPlanSchema = new mongoose.Schema(
  {
    planName: { type: String, required: true },
    commissionRate: { type: Number, required: true },
    listingPriority: { type: Number, default: 0 },
    supportLevel: { type: String },
    monthlyTransactionLimit: { type: Number },
    price: { type: Number, default: 0 },
    planType: { type: String, enum: ['client', 'consultant', 'both'], default: 'both' },
    features: [{ type: String }],
  },
  { timestamps: true }
);

const MembershipPlan = mongoose.model('MembershipPlan', membershipPlanSchema);
export default MembershipPlan;
