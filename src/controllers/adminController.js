import User from '../models/User.js';
import Consultant from '../models/Consultant.js';
import Appointment from '../models/Appointment.js';
import Payment from '../models/Payment.js';
import AdminAction from '../models/AdminAction.js';
import Availability from '../models/Availability.js';

export const getStats = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalConsultants = await Consultant.countDocuments({ verificationStatus: 'approved' });
    const totalBookings = await Appointment.countDocuments();
    const pendingConsultants = await Consultant.countDocuments({ verificationStatus: 'pending' });
    const revenueResult = await Payment.aggregate([{ $match: { paymentStatus: 'completed' } }, { $group: { _id: null, total: { $sum: '$grossAmount' } } }]);
    const revenue = revenueResult.length > 0 ? revenueResult[0].total : 0;
    res.json({ totalUsers, totalConsultants, totalBookings, revenue, pendingConsultants });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getAllUsers = async (req, res) => {
  try { res.json(await User.find().sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateUserStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['active', 'suspended'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const user = await User.findByIdAndUpdate(req.params.id, { accountStatus: status }, { new: true });
    if (!user) return res.status(404).json({ message: 'User not found' });
    await AdminAction.create({ adminUserId: req.user._id, targetUserId: user._id, actionType: `user_${status}`, actionNotes: `User account ${status}` });
    res.json(user);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getAllConsultants = async (req, res) => {
  try {
    const consultants = await Consultant.find().populate('userId').populate('membershipPlanId').sort({ createdAt: -1 });
    const results = consultants.map((c) => { const obj = c.toObject(); obj.user = obj.userId; obj.membershipPlan = obj.membershipPlanId || null; delete obj.userId; delete obj.membershipPlanId; return obj; });
    res.json(results);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getConsultantById = async (req, res) => {
  try {
    const consultant = await Consultant.findById(req.params.id).populate('userId').populate('membershipPlanId');
    if (!consultant) return res.status(404).json({ message: 'Consultant not found' });
    const obj = consultant.toObject(); obj.user = obj.userId; obj.membershipPlan = obj.membershipPlanId || null; delete obj.userId; delete obj.membershipPlanId;
    res.json(obj);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateConsultantStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const consultant = await Consultant.findByIdAndUpdate(req.params.id, { verificationStatus: status }, { new: true }).populate('userId');
    if (!consultant) return res.status(404).json({ message: 'Consultant not found' });
    if (status === 'approved') {
      const existingSlots = await Availability.countDocuments({ consultantId: consultant._id });
      if (existingSlots === 0) {
        const slots = [];
        for (let i = 1; i <= 7; i++) { const d = new Date(); d.setDate(d.getDate() + i); const ds = d.toISOString().split('T')[0]; for (const t of ['09:00','10:00','11:00','14:00','15:00','16:00']) { const eh = (parseInt(t.split(':')[0])+1).toString().padStart(2,'0'); slots.push({ consultantId: consultant._id, availableDate: ds, startTime: t, endTime: `${eh}:00`, isBooked: false }); } }
        await Availability.insertMany(slots);
      }
    }
    await AdminAction.create({ adminUserId: req.user._id, targetUserId: consultant.userId?._id || consultant.userId, actionType: `consultant_${status}`, actionNotes: `Consultant verification ${status}` });
    const obj = consultant.toObject(); obj.user = obj.userId; delete obj.userId;
    res.json(obj);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getAllSessions = async (req, res) => {
  try {
    const appointments = await Appointment.find().populate({ path: 'consultantId', populate: { path: 'userId' } }).populate('clientUserId').sort({ createdAt: -1 });
    const results = appointments.map((a) => { const obj = a.toObject(); obj.consultant = obj.consultantId; if (obj.consultant) { obj.consultant.user = obj.consultant.userId; delete obj.consultant.userId; } obj.client = obj.clientUserId; delete obj.consultantId; delete obj.clientUserId; return obj; });
    res.json(results);
  } catch (error) { res.status(500).json({ message: error.message }); }
};
