import Consultant from '../models/Consultant.js';
import Availability from '../models/Availability.js';

export const getAdvisors = async (req, res) => {
  try {
    const { query, industry } = req.query;
    const filter = { verificationStatus: 'approved' };

    let consultants = await Consultant.find(filter).populate('userId').populate('membershipPlanId');

    // Rename userId to user and membershipPlanId to membershipPlan in response
    let results = consultants.map((c) => {
      const obj = c.toObject();
      obj.user = obj.userId;
      obj.membershipPlan = obj.membershipPlanId || null;
      delete obj.userId;
      delete obj.membershipPlanId;
      return obj;
    });

    if (query) {
      const q = query.toLowerCase();
      results = results.filter(
        (c) =>
          c.user?.fullName?.toLowerCase().includes(q) ||
          c.specialization?.toLowerCase().includes(q) ||
          c.bio?.toLowerCase().includes(q)
      );
    }

    if (industry) {
      const ind = industry.toLowerCase();
      results = results.filter((c) => c.specialization?.toLowerCase().includes(ind));
    }

    // Sort by listing priority (higher = shown first), then by average rating
    results.sort((a, b) => {
      const priorityA = a.membershipPlan?.listingPriority || 0;
      const priorityB = b.membershipPlan?.listingPriority || 0;
      if (priorityB !== priorityA) return priorityB - priorityA;
      return (b.averageRating || 0) - (a.averageRating || 0);
    });

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdvisorById = async (req, res) => {
  try {
    const consultant = await Consultant.findById(req.params.id).populate('userId');
    if (!consultant) {
      return res.status(404).json({ message: 'Consultant not found' });
    }
    const obj = consultant.toObject();
    obj.user = obj.userId;
    delete obj.userId;
    res.json(obj);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getAdvisorAvailability = async (req, res) => {
  try {
    const slots = await Availability.find({
      consultantId: req.params.id,
      isBooked: false,
    });
    res.json(slots);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
