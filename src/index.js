import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import errorHandler from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import advisorRoutes from './routes/advisors.js';
import appointmentRoutes from './routes/appointments.js';
import reviewRoutes from './routes/reviews.js';
import adminRoutes from './routes/admin.js';
import consultantRoutes from './routes/consultants.js';
import contactRoutes from './routes/contact.js';
import planRoutes from './routes/plans.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

connectDB();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || '*', credentials: true }));
app.use(morgan('dev'));
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.get('/', (_req, res) => res.json({ message: 'Apex Advisory API is running' }));

app.use('/api/auth', authRoutes);
app.use('/api/advisors', advisorRoutes);
app.use('/api/consultants', consultantRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/plans', planRoutes);

app.use(errorHandler);

// ─── Socket.io — Real-time Chat (unchanged) ──────────────────────────────────
const sessionRooms = new Map();

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  socket.on('join_session', ({ appointmentId, userId, userName }) => {
    socket.join(appointmentId);
    socket.data.appointmentId = appointmentId;
    socket.data.userId = userId;
    socket.data.userName = userName;
    if (!sessionRooms.has(appointmentId)) sessionRooms.set(appointmentId, new Set());
    sessionRooms.get(appointmentId).add(socket.id);
    console.log(`[Socket] ${userName} joined room ${appointmentId}`);
    socket.to(appointmentId).emit('user_joined', { userName });
  });

  socket.on('send_message', ({ appointmentId, message }) => {
    const payload = {
      sender: socket.data.userName || 'Unknown',
      senderId: socket.data.userId,
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      id: `${Date.now()}-${socket.id}`,
    };
    io.to(appointmentId).emit('receive_message', payload);
  });

  socket.on('typing', ({ appointmentId, isTyping }) => {
    socket.to(appointmentId).emit('user_typing', { userName: socket.data.userName, isTyping });
  });

  socket.on('disconnect', () => {
    const { appointmentId, userName } = socket.data;
    if (appointmentId) {
      const room = sessionRooms.get(appointmentId);
      if (room) { room.delete(socket.id); if (room.size === 0) sessionRooms.delete(appointmentId); }
      socket.to(appointmentId).emit('user_left', { userName });
    }
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Socket.io ready for real-time chat`);
});
