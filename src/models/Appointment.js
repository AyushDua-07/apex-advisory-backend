import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    clientUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    consultantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Consultant', required: true },
    appointmentDate: { type: String },
    appointmentTime: { type: String },
    sessionType: { type: String, enum: ['video_call', 'chat', 'other'], default: 'video_call' },
    status: { type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' },
    meetingLink: { type: String },
  },
  { timestamps: true }
);

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
