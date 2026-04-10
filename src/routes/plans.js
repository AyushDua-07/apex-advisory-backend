import { Router } from 'express';
import MembershipPlan from '../models/MembershipPlan.js';
import Consultant from '../models/Consultant.js';
import Appointment from '../models/Appointment.js';
import ClientSubscription from '../models/ClientSubscription.js';
import { protect } from '../middleware/auth.js';

const router = Router();

router.get('/', async (req, res) => {
  try { res.json(await MembershipPlan.find().sort({ listingPriority: 1 })); } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/my-subscription', protect, async (req, res) => {
  try {
    const subscription = await ClientSubscription.findOne({ userId: req.user._id, status: 'active' }).populate('planId');
    if (!subscription) return res.json({ hasSubscription: false, subscription: null });
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (subscription.lastResetDate !== currentMonth) { subscription.sessionsUsedThisMonth = 0; subscription.lastResetDate = currentMonth; await subscription.save(); }
    const plan = subscription.planId;
    const limit = plan ? plan.monthlyTransactionLimit : 3;
    res.json({ hasSubscription: true, subscription: { _id: subscription._id, plan, status: subscription.status, paymentMethod: subscription.paymentMethod, cardLast4: subscription.cardLast4, cardBrand: subscription.cardBrand, amountPaid: subscription.amountPaid, paidAt: subscription.paidAt, expiresAt: subscription.expiresAt, sessionsUsedThisMonth: subscription.sessionsUsedThisMonth, monthlyLimit: limit, remaining: limit === -1 ? 'Unlimited' : Math.max(0, limit - subscription.sessionsUsedThisMonth), isAtLimit: limit !== -1 && subscription.sessionsUsedThisMonth >= limit } });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/client-subscribe', protect, async (req, res) => {
  try {
    const { planId, cardNumber, cardExpiry, cardCvc, cardName } = req.body;
    if (req.user.role !== 'client') return res.status(403).json({ message: 'Only clients can subscribe' });
    const plan = await MembershipPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    if (plan.price > 0) { if (!cardNumber || !cardExpiry || !cardCvc || !cardName) return res.status(400).json({ message: 'Payment details required for paid plans' }); const clean = cardNumber.replace(/\s/g, ''); if (clean.length < 13 || clean.length > 19) return res.status(400).json({ message: 'Invalid card number' }); }
    await ClientSubscription.updateMany({ userId: req.user._id, status: 'active' }, { status: 'cancelled' });
    const expiresAt = new Date(); expiresAt.setMonth(expiresAt.getMonth() + 1);
    const cleanCard = cardNumber ? cardNumber.replace(/\s/g, '') : '';
    const subscription = await ClientSubscription.create({ userId: req.user._id, planId: plan._id, status: 'active', paymentMethod: plan.price > 0 ? 'card' : 'free', cardLast4: cleanCard ? cleanCard.slice(-4) : null, cardBrand: cleanCard ? detectCardBrand(cleanCard) : null, amountPaid: plan.price, paidAt: new Date(), expiresAt, sessionsUsedThisMonth: 0, lastResetDate: new Date().toISOString().slice(0, 7) });
    const populated = await ClientSubscription.findById(subscription._id).populate('planId');
    const result = populated.toObject(); result.plan = result.planId; delete result.planId;
    res.status(201).json({ message: plan.price > 0 ? `Payment of $${plan.price} processed. You are now on the ${plan.planName} plan!` : `You are now on the ${plan.planName} plan!`, subscription: result });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.post('/subscribe', protect, async (req, res) => {
  try {
    const { planId } = req.body;
    if (req.user.role !== 'consultant') return res.status(403).json({ message: 'Only consultants can subscribe to plans' });
    const plan = await MembershipPlan.findById(planId);
    if (!plan) return res.status(404).json({ message: 'Plan not found' });
    const consultant = await Consultant.findOne({ userId: req.user._id });
    if (!consultant) return res.status(404).json({ message: 'Consultant profile not found' });
    consultant.membershipPlanId = plan._id; await consultant.save();
    const populated = await Consultant.findById(consultant._id).populate('userId').populate('membershipPlanId');
    const obj = populated.toObject(); obj.user = obj.userId; obj.membershipPlan = obj.membershipPlanId; delete obj.userId; delete obj.membershipPlanId;
    res.json(obj);
  } catch (error) { res.status(500).json({ message: error.message }); }
});

router.get('/my-usage', protect, async (req, res) => {
  try {
    if (req.user.role !== 'consultant') return res.status(403).json({ message: 'Only consultants can check usage' });
    const consultant = await Consultant.findOne({ userId: req.user._id }).populate('membershipPlanId');
    if (!consultant) return res.status(404).json({ message: 'Consultant profile not found' });
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
    const monthlyCount = await Appointment.countDocuments({ consultantId: consultant._id, status: { $in: ['confirmed', 'completed'] }, appointmentDate: { $gte: startOfMonth, $lte: endOfMonth } });
    const plan = consultant.membershipPlanId;
    const limit = plan ? plan.monthlyTransactionLimit : 10;
    res.json({ planName: plan ? plan.planName : 'Basic (Default)', monthlyTransactionLimit: limit, usedThisMonth: monthlyCount, remaining: limit === -1 ? 'Unlimited' : Math.max(0, limit - monthlyCount), isAtLimit: limit !== -1 && monthlyCount >= limit });
  } catch (error) { res.status(500).json({ message: error.message }); }
});

function detectCardBrand(number) {
  if (/^4/.test(number)) return 'Visa';
  if (/^5[1-5]/.test(number)) return 'Mastercard';
  if (/^3[47]/.test(number)) return 'Amex';
  if (/^6(?:011|5)/.test(number)) return 'Discover';
  return 'Card';
}

export default router;
