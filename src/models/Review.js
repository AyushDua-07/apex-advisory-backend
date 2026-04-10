import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment', required: true },
    clientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    consultantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    reviewText: { type: String, maxlength: 1000 },
  },
  { timestamps: true }
);

const Review = mongoose.model('Review', reviewSchema);
export default Review;
