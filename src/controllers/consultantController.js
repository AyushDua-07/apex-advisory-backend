import Consultant from '../models/Consultant.js';
import Availability from '../models/Availability.js';

export const getMyProfile = async (req, res) => {
  try {
    const consultant = await Consultant.findOne({ userId: req.user._id }).populate('userId').populate('membershipPlanId');
    if (!consultant) return res.status(404).json({ message: 'Consultant profile not found' });
    const obj = consultant.toObject();
    obj.user = obj.userId; obj.membershipPlan = obj.membershipPlanId || null;
    delete obj.userId; delete obj.membershipPlanId;
    res.json(obj);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { specialization, bio, yearsExperience, hourlyRate } = req.body;
    const consultant = await Consultant.findOne({ userId: req.user._id });
    if (!consultant) return res.status(404).json({ message: 'Consultant profile not found' });
    if (specialization !== undefined) consultant.specialization = specialization;
    if (bio !== undefined) consultant.bio = bio;
    if (yearsExperience !== undefined) consultant.yearsExperience = yearsExperience;
    if (hourlyRate !== undefined) consultant.hourlyRate = hourlyRate;
    await consultant.save();
    const populated = await Consultant.findById(consultant._id).populate('userId').populate('membershipPlanId');
    const obj = populated.toObject();
    obj.user = obj.userId; obj.membershipPlan = obj.membershipPlanId || null;
    delete obj.userId; delete obj.membershipPlanId;
    res.json(obj);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const uploadProfilePhoto = async (req, res) => {
  try {
    const consultant = await Consultant.findOne({ userId: req.user._id });
    if (!consultant) return res.status(404).json({ message: 'Consultant profile not found' });
    if (!req.file) return res.status(400).json({ message: 'No photo file uploaded' });
    consultant.profilePhoto = req.file.path.replace(/\\/g, '/');
    await consultant.save();
    const populated = await Consultant.findById(consultant._id).populate('userId').populate('membershipPlanId');
    const obj = populated.toObject();
    obj.user = obj.userId; obj.membershipPlan = obj.membershipPlanId || null;
    delete obj.userId; delete obj.membershipPlanId;
    res.json(obj);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const uploadDocuments = async (req, res) => {
  try {
    const consultant = await Consultant.findOne({ userId: req.user._id });
    if (!consultant) return res.status(404).json({ message: 'Consultant profile not found' });
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No documents uploaded' });
    const newDocs = req.files.map((file) => ({
      fileName: file.originalname, filePath: file.path.replace(/\\/g, '/'), fileType: file.mimetype, uploadedAt: new Date(),
    }));
    consultant.documents.push(...newDocs);
    await consultant.save();
    const populated = await Consultant.findById(consultant._id).populate('userId').populate('membershipPlanId');
    const obj = populated.toObject();
    obj.user = obj.userId; obj.membershipPlan = obj.membershipPlanId || null;
    delete obj.userId; delete obj.membershipPlanId;
    res.json(obj);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteDocument = async (req, res) => {
  try {
    const consultant = await Consultant.findOne({ userId: req.user._id });
    if (!consultant) return res.status(404).json({ message: 'Consultant profile not found' });
    consultant.documents = consultant.documents.filter((d) => d._id.toString() !== req.params.docId);
    await consultant.save();
    res.json({ message: 'Document removed' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const getMyAvailability = async (req, res) => {
  try {
    const consultant = await Consultant.findOne({ userId: req.user._id });
    if (!consultant) return res.status(404).json({ message: 'Consultant profile not found' });
    const slots = await Availability.find({ consultantId: consultant._id }).sort({ availableDate: 1, startTime: 1 });
    res.json(slots);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const addAvailability = async (req, res) => {
  try {
    const consultant = await Consultant.findOne({ userId: req.user._id });
    if (!consultant) return res.status(404).json({ message: 'Consultant profile not found' });
    if (consultant.verificationStatus !== 'approved') return res.status(403).json({ message: 'Only approved consultants can manage availability' });
    const { slots } = req.body;
    if (!slots || !Array.isArray(slots) || slots.length === 0) return res.status(400).json({ message: 'Provide an array of slots' });
    const newSlots = slots.map((s) => ({ consultantId: consultant._id, availableDate: s.availableDate, startTime: s.startTime, endTime: s.endTime, isBooked: false }));
    const created = await Availability.insertMany(newSlots);
    res.status(201).json(created);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

export const deleteAvailability = async (req, res) => {
  try {
    const consultant = await Consultant.findOne({ userId: req.user._id });
    if (!consultant) return res.status(404).json({ message: 'Consultant profile not found' });
    const slot = await Availability.findById(req.params.slotId);
    if (!slot) return res.status(404).json({ message: 'Slot not found' });
    if (slot.consultantId.toString() !== consultant._id.toString()) return res.status(403).json({ message: 'Not authorized' });
    if (slot.isBooked) return res.status(400).json({ message: 'Cannot delete a booked slot' });
    await Availability.findByIdAndDelete(slot._id);
    res.json({ message: 'Slot deleted' });
  } catch (error) { res.status(500).json({ message: error.message }); }
};
