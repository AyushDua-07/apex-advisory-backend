import Appointment from '../models/Appointment.js';
import Availability from '../models/Availability.js';
import Consultant from '../models/Consultant.js';
import Payment from '../models/Payment.js';
import MembershipPlan from '../models/MembershipPlan.js';

export const createAppointment = async (req, res) => {
  try {
    const { consultantId, appointmentDate, appointmentTime, sessionType, availabilityId } = req.body;

    // Check consultant exists and is approved
    const consultant = await Consultant.findById(consultantId);
    if (!consultant || consultant.verificationStatus !== 'approved') {
      return res.status(400).json({ message: 'Consultant not available' });
    }

    // Check availability slot
    if (availabilityId) {
      const slot = await Availability.findById(availabilityId);
      if (!slot || slot.isBooked) {
        return res.status(400).json({ message: 'Time slot is not available' });
      }

      // Check for booking conflicts
      const conflict = await Appointment.findOne({
        consultantId,
        appointmentDate: slot.availableDate,
        appointmentTime: slot.startTime,
        status: { $in: ['pending', 'confirmed'] },
      });
      if (conflict) {
        return res.status(400).json({ message: 'Time slot already booked' });
      }

      // Mark slot as booked
      slot.isBooked = true;
      await slot.save();
    }

    // Check monthly transaction limit based on consultant's plan
    let plan = null;
    if (consultant.membershipPlanId) {
      plan = await MembershipPlan.findById(consultant.membershipPlanId);
    }
    const monthlyLimit = plan ? plan.monthlyTransactionLimit : 10; // Basic default

    if (monthlyLimit !== -1) {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

      const monthlyCount = await Appointment.countDocuments({
        consultantId,
        status: { $in: ['confirmed', 'completed'] },
        appointmentDate: { $gte: startOfMonth, $lte: endOfMonth },
      });

      if (monthlyCount >= monthlyLimit) {
        return res.status(400).json({
          message: `Consultant has reached their monthly session limit (${monthlyLimit}). They need to upgrade their plan.`,
        });
      }
    }

    // Jitsi Meet: room name is derived client-side from appointmentId — no backend call needed.
    // meetingLink is left null; the frontend builds the Jitsi URL as:
    // https://meet.jit.si/apex-<appointmentId>

    // Create appointment
    const appointment = await Appointment.create({
      clientUserId: req.user._id,
      consultantId,
      appointmentDate,
      appointmentTime,
      sessionType: sessionType || 'video_call',
      status: 'confirmed',
      meetingLink: null,
    });

    // Calculate payment using plan's commission rate (default 15% for Basic)
    const commissionPercent = plan ? plan.commissionRate : 15;
    const grossAmount = consultant.hourlyRate;
    const commissionAmount = grossAmount * (commissionPercent / 100);
    const netAmount = grossAmount - commissionAmount;

    await Payment.create({
      appointmentId: appointment._id,
      payerUserId: req.user._id,
      grossAmount,
      commissionAmount,
      netAmount,
      paymentMethod: 'card',
      paymentStatus: 'completed',
      paidAt: new Date(),
    });

    const populated = await Appointment.findById(appointment._id)
      .populate({
        path: 'consultantId',
        populate: { path: 'userId' },
      })
      .populate('clientUserId');

    const obj = populated.toObject();
    obj.consultant = obj.consultantId;
    if (obj.consultant) {
      obj.consultant.user = obj.consultant.userId;
      delete obj.consultant.userId;
    }
    obj.client = obj.clientUserId;
    delete obj.consultantId;
    delete obj.clientUserId;

    res.status(201).json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getMyAppointments = async (req, res) => {
  try {
    let filter = {};

    if (req.user.role === 'client') {
      filter = { clientUserId: req.user._id };
    } else if (req.user.role === 'consultant') {
      const consultant = await Consultant.findOne({ userId: req.user._id });
      if (!consultant) {
        return res.json([]);
      }
      filter = { consultantId: consultant._id };
    } else if (req.user.role === 'admin') {
      filter = {};
    }

    const appointments = await Appointment.find(filter)
      .populate({
        path: 'consultantId',
        populate: { path: 'userId' },
      })
      .populate('clientUserId')
      .sort({ createdAt: -1 });

    const results = appointments.map((a) => {
      const obj = a.toObject();
      obj.consultant = obj.consultantId;
      if (obj.consultant) {
        obj.consultant.user = obj.consultant.userId;
        delete obj.consultant.userId;
      }
      obj.client = obj.clientUserId;
      delete obj.consultantId;
      delete obj.clientUserId;
      return obj;
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate({
        path: 'consultantId',
        populate: { path: 'userId' },
      })
      .populate('clientUserId');

    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    const obj = appointment.toObject();
    obj.consultant = obj.consultantId;
    if (obj.consultant) {
      obj.consultant.user = obj.consultant.userId;
      delete obj.consultant.userId;
    }
    obj.client = obj.clientUserId;
    delete obj.consultantId;
    delete obj.clientUserId;

    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const updateAppointmentStatus = async (req, res) => {
  try {
    const { status } = req.body;
    if (!['completed', 'cancelled'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }

    // Authorization: only the client, the consultant, or an admin can update
    const consultant = await Consultant.findOne({ userId: req.user._id });
    const isClient = appointment.clientUserId.toString() === req.user._id.toString();
    const isConsultant = consultant && appointment.consultantId.toString() === consultant._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isClient && !isConsultant && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to update this appointment' });
    }

    appointment.status = status;
    await appointment.save();

    const populated = await Appointment.findById(appointment._id)
      .populate({
        path: 'consultantId',
        populate: { path: 'userId' },
      })
      .populate('clientUserId');

    const obj = populated.toObject();
    obj.consultant = obj.consultantId;
    if (obj.consultant) {
      obj.consultant.user = obj.consultant.userId;
      delete obj.consultant.userId;
    }
    obj.client = obj.clientUserId;
    delete obj.consultantId;
    delete obj.clientUserId;

    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
