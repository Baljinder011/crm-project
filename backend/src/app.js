const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const contactRoutes = require('./routes/contactRoutes');
const leadRoutes = require('./routes/leadRoutes');
const mailRoutes = require('./routes/mailRoutes');
const embedFormRoutes = require('./routes/embedFormRoutes');
const { notFoundHandler, errorHandler } = require('./middlewares/errorMiddleware');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'CRM backend is running',
  });
});

// Open CORS only for embed/script routes
const embedCors = cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CRM-Origin'],
});

// Restricted CORS for app/frontend routes
const appCors = cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true,
});

// Protected / normal app routes
app.use('/api/auth', appCors, authRoutes);
app.use('/api/contacts', appCors, contactRoutes);
app.use('/api/leads', appCors, leadRoutes);
app.use('/api/mail', appCors, mailRoutes);

// Public embed routes for external websites/scripts
app.use('/api/embed', embedCors, embedFormRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;