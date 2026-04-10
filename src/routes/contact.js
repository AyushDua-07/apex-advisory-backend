import { Router } from 'express';

const router = Router();

// POST /api/contact — receive contact form submissions
router.post('/', async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    // In production, this would send an email or store in database
    // For now, log and acknowledge
    console.log('Contact form submission:', { name, email, subject, message });

    res.json({ message: 'Message received. We will get back to you soon.' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
