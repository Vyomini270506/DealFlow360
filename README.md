# DealFlow360 — Intelligent B2B Sales Operations Platform

DealFlow360 is a hackathon-ready, full-stack B2B SaaS web application managing the complete workflow: **Quotation → Discount Governance → Transparent Risk Scoring → Sales Manager & High-Risk Finance Approvals → Multi-Warehouse Fulfillment & Backorders → Subscription Management → Partial Invoice Reconciliation → Deal Health Monitoring**.

---

## 🚀 Key Platform Features

### 1. 5 Distinct Role-Based Dashboards & Hierarchy
- **`SALES_REP`**: Quotation builder, pipeline metrics, customer line-item Q&A negotiations, fulfillment tracking.
- **`SALES_MANAGER`**: Sales team performance dashboard ("My Sales Team" expandable widgets for Rahul ₹12.4L, Priya ₹9.8L, Aman ₹7.2L, Neha ₹6.5L), normal quotation approvals, bottleneck tracking.
- **`FINANCE_OPERATIONS`**: High-risk approval workflow, multi-warehouse stock allocation, active backorder resolution, partial invoice reconciliation, recurring subscription management.
- **`CUSTOMER`**: External customer portal with quotation line-item Q&A, discount counter-offers, order confirmations, invoice history, active subscriptions.
- **`ADMIN`**: Editable Customer Tier discount limits (Bronze 5%, Silver 10%, Gold 15%), Category limits (Hardware 15%, Services 10%, Software 20%), product catalog, price lists, warehouses, user permissions, and reporting.

### 2. Discount Governance Engine
- Enforces customer tier baseline limits and category max limits in backend controllers (`discountValidator.js`).
- Flags item violations with exact reason (e.g. *"Discount exceeds Gold tier limit by 3 percentage points"*).

### 3. Transparent Rule-Based Risk Engine (0-100)
- Calculates risk scores dynamically based on:
  - Discount limit breach: **+40 points**
  - High item discount (>25%): **+20 points**
  - Large deal value (> ₹50L / $50k): **+20 points**
  - Active customer negotiation: **+10 points**
  - Multi-warehouse stock shortage: **+10 points**
- Tiers: `LOW` (0-29), `MEDIUM` (30-59), `HIGH` (60-100).
- High-risk deals require 2-tier approval (`Sales Manager` → `Finance/Operations`).

### 4. Multi-Warehouse Stock Allocation & Backorders
- Scans priority warehouse hubs (Alpha - Mumbai, Beta - Bangalore, Gamma - Delhi NCR).
- Allocates stock automatically across warehouses (e.g. Order 20 Laptops → Wh A: 12, Wh B: 8).
- Generates `Backorder` records for stock shortages.

### 5. Partial Delivery Invoice Reconciliation
- Strict business rule: **Only bill products that have been shipped/fulfilled**.
- Supports partial shipment invoicing for delivered units.

---

## 🔑 Quick Login Credentials (1-Click Switcher Available on UI)

| Role | Email | Password |
|---|---|---|
| **System Admin** | `admin@dealflow360.com` | `password123` |
| **Sales Manager** | `manager@dealflow360.com` | `password123` |
| **Sales Rep (Rahul)** | `rahul@dealflow360.com` | `password123` |
| **Finance / Ops** | `finance@dealflow360.com` | `password123` |
| **Customer (Acme)** | `customer@acmecorp.com` | `password123` |

---

## 🛠 Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React, Recharts, React Router v6, Axios, Sonner.
- **Backend**: Node.js, Express.js, Mongoose, JWT Auth, bcryptjs, RBAC Middleware.
- **Database**: MongoDB (`mongodb://127.0.0.1:27017/dealflow360`).

---

## 🏃 Running the Application

### 1. Database Seed
To populate 15+ linked quotations, warehouses, stock, invoices, subscriptions, and negotiation threads:
```bash
cd backend
npm run seed
```

### 2. Start Backend Server
```bash
cd backend
npm start
# Server runs at http://localhost:5000
```

### 3. Start Frontend App
```bash
cd frontend
npm run dev
# App runs at http://localhost:3000
```
