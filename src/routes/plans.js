import { Router } from 'express';
import MembershipPlan from '../models/MembershipPlan.js';
import Consultant from '../models/Consultant.js';
import Appointment from '../models/Appointment.js';
import { protect } from '../middleware/auth.js';

const router = Router();

// GET /api/plans — public: list all plans
router.get('/', async (req, res) => {
  try {
    const plans = await MembershipPlan.find().sort({ listingPriority: 1 });
    res.json(plans);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// POST /api/plans/subscribe — consultant selects a plan
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { planId } = req.body;

    if (req.user.role !== 'consultant') {
      return res.status(403).json({ message: 'Only consultants can subscribe to plans' });
    }

    const plan = await MembershipPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({ message: 'Plan not found' });
    }

    const consultant = await Consultant.findOne({ userId: req.user._id });
    if (!consultant) {
      return res.status(404).json({ message: 'Consultant profile not found' });
    }

    consultant.membershipPlanId = plan._id;
    await consultant.save();

    const populated = await Consultant.findById(consultant._id)
      .populate('userId')
      .populate('membershipPlanId');
    const obj = populated.toObject();
    obj.user = obj.userId;
    obj.membershipPlan = obj.membershipPlanId;
    delete obj.userId;
    delete obj.membershipPlanId;

    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET /api/plans/my-usage — consultant checks monthly transaction count vs limit
router.get('/my-usage', protect, async (req, res) => {
  try {
    if (req.user.role !== 'consultant') {
      return res.status(403).json({ message: 'Only consultants can check usage' });
    }

    const consultant = await Consultant.findOne({ userId: req.user._id }).populate('membershipPlanId');
    if (!consultant) {
      return res.status(404).json({ message: 'Consultant profile not found' });
    }

    // Count this month's appointments
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const monthlyCount = await Appointment.countDocuments({
      consultantId: consultant._id,
      status: { $in: ['confirmed', 'completed'] },
      appointmentDate: { $gte: startOfMonth, $lte: endOfMonth },
    });

    const plan = consultant.membershipPlanId;
    const limit = plan ? plan.monthlyTransactionLimit : 10; // Default Basic limit
    const planName = plan ? plan.planName : 'Basic (Default)';

    res.json({
      planName,
      monthlyTransactionLimit: limit,
      usedThisMonth: monthlyCount,
      remaining: limit === -1 ? 'Unlimited' : Math.max(0, limit - monthlyCount),
      isAtLimit: limit !== -1 && monthlyCount >= limit,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
