import mongoose from 'mongoose';

const clientSubscriptionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan', required: true },
    status: { type: String, enum: ['active', 'cancelled', 'expired'], default: 'active' },
    paymentMethod: { type: String, default: 'card' },
    cardLast4: { type: String },
    cardBrand: { type: String },
    amountPaid: { type: Number, default: 0 },
    paidAt: { type: Date, default: Date.now },
    expiresAt: { type: Date },
    sessionsUsedThisMonth: { type: Number, default: 0 },
    lastResetDate: { type: String },
  },
  { timestamps: true }
);

const ClientSubscription = mongoose.model('ClientSubscription', clientSubscriptionSchema);
export default ClientSubscription;
