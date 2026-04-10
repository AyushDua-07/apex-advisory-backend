import Review from '../models/Review.js';
import Appointment from '../models/Appointment.js';
import Consultant from '../models/Consultant.js';

export const createReview = async (req, res) => {
  try {
    const { appointmentId, consultantId, rating, reviewText } = req.body;

    // Check appointment exists, is completed, and belongs to user
    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ message: 'Appointment not found' });
    }
    if (appointment.status !== 'completed') {
      return res.status(400).json({ message: 'Can only review completed appointments' });
    }
    if (appointment.clientUserId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to review this appointment' });
    }

    // Check for duplicate review
    const existing = await Review.findOne({ appointmentId });
    if (existing) {
      return res.status(400).json({ message: 'You have already reviewed this appointment' });
    }

    const review = await Review.create({
      appointmentId,
      clientUserId: req.user._id,
      consultantId,
      rating,
      reviewText,
    });

    // Recalculate average rating
    const reviews = await Review.find({ consultantId });
    const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    await Consultant.findByIdAndUpdate(consultantId, { averageRating: Math.round(avg * 10) / 10 });

    const populated = await Review.findById(review._id).populate('clientUserId');
    const obj = populated.toObject();
    obj.client = obj.clientUserId;
    delete obj.clientUserId;

    res.status(201).json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getConsultantReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ consultantId: req.params.id })
      .populate('clientUserId')
      .sort({ createdAt: -1 });

    const results = reviews.map((r) => {
      const obj = r.toObject();
      obj.client = obj.clientUserId;
      delete obj.clientUserId;
      return obj;
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
