import mongoose from 'mongoose';

const consultantSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    membershipPlanId: { type: mongoose.Schema.Types.ObjectId, ref: 'MembershipPlan', default: null },
    specialization: { type: String, required: true },
    bio: { type: String, maxlength: 2000 },
    yearsExperience: { type: Number, min: 0 },
    hourlyRate: { type: Number, required: true, min: 0 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    verificationStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    profilePhoto: { type: String, default: null },
    documents: [
      {
        fileName: { type: String },
        filePath: { type: String },
        fileType: { type: String },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

const Consultant = mongoose.model('Consultant', consultantSchema);
export default Consultant;
