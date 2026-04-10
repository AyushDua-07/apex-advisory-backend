import mongoose from 'mongoose';

const adminActionSchema = new mongoose.Schema(
  {
    adminUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    targetAppointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    actionType: { type: String, required: true },
    actionNotes: { type: String },
  },
  { timestamps: true }
);

const AdminAction = mongoose.model('AdminAction', adminActionSchema);
export default AdminAction;
