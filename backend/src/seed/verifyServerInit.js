const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('../backend/src/config/db');

dotenv.config({ path: '../backend/.env' });

async function verifyServerInitialization() {
  console.log('--- Testing Backend Server Initialization & Model Imports ---');
  try {
    // 1. Connect DB
    await connectDB();
    console.log('✓ Database connection successful.');

    // 2. Import All Models
    const models = [
      '../backend/src/models/User',
      '../backend/src/models/Customer',
      '../backend/src/models/Product',
      '../backend/src/models/CustomerRequest',
      '../backend/src/models/Quotation',
      '../backend/src/models/Approval',
      '../backend/src/models/Order',
      '../backend/src/models/Invoice',
      '../backend/src/models/Payment',
      '../backend/src/models/CreditNote',
      '../backend/src/models/Fulfillment',
      '../backend/src/models/Backorder',
      '../backend/src/models/Subscription',
      '../backend/src/models/Negotiation',
      '../backend/src/models/AuditLog'
    ];

    for (const m of models) {
      require(m);
      console.log(`✓ Model ${m.split('/').pop()} loaded successfully.`);
    }

    // 3. Import All Controllers
    const controllers = [
      '../backend/src/controllers/adminController',
      '../backend/src/controllers/analyticsController',
      '../backend/src/controllers/approvalController',
      '../backend/src/controllers/assignmentController',
      '../backend/src/controllers/auditController',
      '../backend/src/controllers/customerRequestController',
      '../backend/src/controllers/dealIntelligenceController',
      '../backend/src/controllers/financeController',
      '../backend/src/controllers/fulfillmentController',
      '../backend/src/controllers/invoiceController',
      '../backend/src/controllers/messageController',
      '../backend/src/controllers/negotiationController',
      '../backend/src/controllers/orderController',
      '../backend/src/controllers/quotationController'
    ];

    for (const c of controllers) {
      require(c);
      console.log(`✓ Controller ${c.split('/').pop()} loaded successfully.`);
    }

    // 4. Import All Routes
    const routes = [
      '../backend/src/routes/adminRoutes',
      '../backend/src/routes/analyticsRoutes',
      '../backend/src/routes/approvalRoutes',
      '../backend/src/routes/assignmentRoutes',
      '../backend/src/routes/auditRoutes',
      '../backend/src/routes/authRoutes',
      '../backend/src/routes/customerRequestRoutes',
      '../backend/src/routes/dealIntelligenceRoutes',
      '../backend/src/routes/financeRoutes',
      '../backend/src/routes/fulfillmentRoutes',
      '../backend/src/routes/invoiceRoutes',
      '../backend/src/routes/messageRoutes',
      '../backend/src/routes/negotiationRoutes',
      '../backend/src/routes/notificationRoutes',
      '../backend/src/routes/orderRoutes',
      '../backend/src/routes/quotationRoutes',
      '../backend/src/routes/subscriptionRoutes'
    ];

    for (const r of routes) {
      require(r);
      console.log(`✓ Route ${r.split('/').pop()} loaded successfully.`);
    }

    console.log('🎉 ALL BACKEND MODULES, MODELS, CONTROLLERS, AND ROUTES LOADED 100% ERROR-FREE!');
    process.exit(0);
  } catch (err) {
    console.error('❌ BACKEND INITIALIZATION ERROR DETECTED:', err);
    process.exit(1);
  }
}

verifyServerInitialization();
