import mongoose from 'mongoose';

const availabilitySchema = new mongoose.Schema(
  {
    consultantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
    availableDate: { type: String },
    startTime: { type: String },
    endTime: { type: String },
    isBooked: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Availability = mongoose.model('Availability', availabilitySchema);
export default Availability;
