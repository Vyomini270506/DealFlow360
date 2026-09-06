const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Connect Database
connectDB();

// API Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/quotations', require('./routes/quotationRoutes'));
app.use('/api/approvals', require('./routes/approvalRoutes'));
app.use('/api/fulfillment', require('./routes/fulfillmentRoutes'));
app.use('/api/invoices', require('./routes/invoiceRoutes'));
app.use('/api/subscriptions', require('./routes/subscriptionRoutes'));
app.use('/api/negotiations', require('./routes/negotiationRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/analytics', require('./routes/analyticsRoutes'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/customer-requests', require('./routes/customerRequestRoutes'));
app.use('/api/messages', require('./routes/messageRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/orders', require('./routes/orderRoutes'));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', service: 'DealFlow360 API Server', timestamp: new Date() });
});

// Seed endpoint for quick demo trigger via HTTP if needed
app.post('/api/seed', async (req, res) => {
  try {
    process.env.FORCE_SEED = 'true';
    const seedScript = require('./seed/seed');
    await seedScript();
    process.env.FORCE_SEED = '';
    res.json({ message: 'Seed data generated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve static frontend assets if build directory exists
const path = require('path');
const frontendDist = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) return next();
  res.sendFile(path.join(frontendDist, 'index.html'), (err) => {
    if (err) {
      res.status(200).send('DealFlow360 API Server Running.');
    }
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` DealFlow360 Server running on http://localhost:${PORT} `);
  console.log(`=======================================================`);
});
