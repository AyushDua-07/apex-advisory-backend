import Appointment from '../models/Appointment.js';
import Availability from '../models/Availability.js';
import Consultant from '../models/Consultant.js';
import Payment from '../models/Payment.js';
import MembershipPlan from '../models/MembershipPlan.js';
import ClientSubscription from '../models/ClientSubscription.js';

export const createAppointment = async (req, res) => {
  try {
    const { consultantId, appointmentDate, appointmentTime, sessionType, availabilityId } = req.body;

    // Client subscription check
    const clientSub = await ClientSubscription.findOne({ userId: req.user._id, status: 'active' }).populate('planId');
    if (!clientSub) {
      return res.status(403).json({ message: 'You need to subscribe to a plan before booking.', requiresPlan: true });
    }
    const currentMonth = new Date().toISOString().slice(0, 7);
    if (clientSub.lastResetDate !== currentMonth) { clientSub.sessionsUsedThisMonth = 0; clientSub.lastResetDate = currentMonth; await clientSub.save(); }
    const clientPlan = clientSub.planId;
    const clientLimit = clientPlan ? clientPlan.monthlyTransactionLimit : 3;
    if (clientLimit !== -1 && clientSub.sessionsUsedThisMonth >= clientLimit) {
      return res.status(403).json({ message: `You've reached your monthly session limit (${clientLimit}). Upgrade your plan.`, requiresUpgrade: true });
    }

    const consultant = await Consultant.findById(consultantId);
    if (!consultant || consultant.verificationStatus !== 'approved') return res.status(400).json({ message: 'Consultant not available' });

    if (availabilityId) {
      const slot = await Availability.findById(availabilityId);
      if (!slot || slot.isBooked) return res.status(400).json({ message: 'Time slot is not available' });
      const conflict = await Appointment.findOne({ consultantId, appointmentDate: slot.availableDate, appointmentTime: slot.startTime, status: { $in: ['pending', 'confirmed'] } });
      if (conflict) return res.status(400).json({ message: 'Time slot already booked' });
      slot.isBooked = true;
      await slot.save();
    }

    let plan = null;
    if (consultant.membershipPlanId) plan = await MembershipPlan.findById(consultant.membershipPlanId);
    const monthlyLimit = plan ? plan.monthlyTransactionLimit : 10;
    if (monthlyLimit !== -1) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      const monthlyCount = await Appointment.countDocuments({ consultantId, status: { $in: ['confirmed', 'completed'] }, appointmentDate: { $gte: startOfMonth, $lte: endOfMonth } });
      if (monthlyCount >= monthlyLimit) return res.status(400).json({ message: `Consultant has reached their monthly limit (${monthlyLimit}).` });
    }

    const appointment = await Appointment.create({ clientUserId: req.user._id, consultantId, appointmentDate, appointmentTime, sessionType: sessionType || 'video_call', status: 'confirmed', meetingLink: null });

    clientSub.sessionsUsedThisMonth += 1;
    await clientSub.save();

    const commissionPercent = plan ? plan.commissionRate : 15;
    const grossAmount = consultant.hourlyRate;
    await Payment.create({ appointmentId: appointment._id, payerUserId: req.user._id, grossAmount, commissionAmount: grossAmount * (commissionPercent / 100), netAmount: grossAmount - grossAmount * (commissionPercent / 100), paymentMethod: 'card', paymentStatus: 'completed', paidAt: new Date() });

    const populated = await Appointment.findById(appointment._id).populate({ path: 'consultantId', populate: { path: 'userId' } }).populate('clientUserId');
    const obj = populated.toObject();
    obj.consultant = obj.consultantId; if (obj.consultant) { obj.consultant.user = obj.consultant.userId; delete obj.consultant.userId; }
    obj.client = obj.clientUserId; delete obj.consultantId; delete obj.clientUserId;
    res.status(201).json(obj);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getMyAppointments = async (req, res) => {
  try {
    let filter = {};
    if (req.user.role === 'client') { filter = { clientUserId: req.user._id }; }
    else if (req.user.role === 'consultant') { const c = await Consultant.findOne({ userId: req.user._id }); if (!c) return res.json([]); filter = { consultantId: c._id }; }
    else if (req.user.role === 'admin') { filter = {}; }
    const appointments = await Appointment.find(filter).populate({ path: 'consultantId', populate: { path: 'userId' } }).populate('clientUserId').sort({ createdAt: -1 });
    const results = appointments.map((a) => { const obj = a.toObject(); obj.consultant = obj.consultantId; if (obj.consultant) { obj.consultant.user = obj.consultant.userId; delete obj.consultant.userId; } obj.client = obj.clientUserId; delete obj.consultantId; delete obj.clientUserId; return obj; });
    res.json(results);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate({ path: 'consultantId', populate: { path: 'userId' } }).populate('clientUserId');
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    const obj = appointment.toObject();
    obj.consultant = obj.consultantId; if (obj.consultant) { obj.consultant.user = obj.consultant.userId; delete obj.consultant.userId; }
    obj.client = obj.clientUserId; delete obj.consultantId; delete obj.clientUserId;
    res.json(obj);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['completed', 'cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid status' });
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: 'Appointment not found' });
    const consultant = await Consultant.findOne({ userId: req.user._id });
    const isClient = appointment.clientUserId.toString() === req.user._id.toString();
    const isConsultant = consultant && appointment.consultantId.toString() === consultant._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isClient && !isConsultant && !isAdmin) return res.status(403).json({ message: 'Not authorized' });

    if (status === 'cancelled') {
      await Availability.updateOne({ consultantId: appointment.consultantId, availableDate: appointment.appointmentDate, startTime: appointment.appointmentTime, isBooked: true }, { isBooked: false });
      const clientSub = await ClientSubscription.findOne({ userId: appointment.clientUserId, status: 'active' });
      if (clientSub && clientSub.sessionsUsedThisMonth > 0) { clientSub.sessionsUsedThisMonth -= 1; await clientSub.save(); }
    }

    appointment.status = status;
    await appointment.save();
    const populated = await Appointment.findById(appointment._id).populate({ path: 'consultantId', populate: { path: 'userId' } }).populate('clientUserId');
    const obj = populated.toObject();
    obj.consultant = obj.consultantId; if (obj.consultant) { obj.consultant.user = obj.consultant.userId; delete obj.consultant.userId; }
    obj.client = obj.clientUserId; delete obj.consultantId; delete obj.clientUserId;
    res.json(obj);
  } catch (error) { res.status(500).json({ message: error.message }); }
};
