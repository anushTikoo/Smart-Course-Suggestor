import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import pool from './db.js';
import authRoutes from './routes/basicAuth.js';
import googleAuthRoutes from './routes/googleAuth.js';
import userRoutes from './routes/userRoutes.js';
import studentRoutes from './routes/studentRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(cookieParser());

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/auth/google', googleAuthRoutes);

// User routes (protected)
app.use('/api/user', userRoutes);

// Student-specific routes (onboarding, profile)
app.use('/api/student', studentRoutes);

// Basic test route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// Example route to test DB connection
app.get('/api/test-db', async (req, res) => {
  try {
    const defaultResponse = await pool.query('SELECT NOW()');
    res.json({ success: true, time: defaultResponse.rows[0] });
  } catch (error) {
    console.error('Database connection error:', error);
    res.status(500).json({ success: false, error: 'Database connection failed' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
