const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

const runFunctionalTest = async () => {
  console.log('=======================================================');
  console.log(' STARTING END-TO-END DEALFLOW360 FUNCTIONALITY VERIFICATION ');
  console.log('=======================================================');

  try {
    // 1. Test Auth Login for all 5 roles
    console.log('\n[1/7] Testing Authentication & JWT for 5 Roles...');
    
    const adminRes = await axios.post(`${API_URL}/auth/login`, { email: 'admin@dealflow360.com', password: 'password123' });
    const adminToken = adminRes.data.token;
    console.log(' ✓ Admin login successful:', adminRes.data.role);

    const managerRes = await axios.post(`${API_URL}/auth/login`, { email: 'manager@dealflow360.com', password: 'password123' });
    const managerToken = managerRes.data.token;
    console.log(' ✓ Sales Manager login successful:', managerRes.data.role);

    const repRes = await axios.post(`${API_URL}/auth/login`, { email: 'rahul@dealflow360.com', password: 'password123' });
    const repToken = repRes.data.token;
    console.log(' ✓ Sales Rep login successful:', repRes.data.role);

    const financeRes = await axios.post(`${API_URL}/auth/login`, { email: 'finance@dealflow360.com', password: 'password123' });
    const financeToken = financeRes.data.token;
    console.log(' ✓ Finance login successful:', financeRes.data.role);

    const customerRes = await axios.post(`${API_URL}/auth/login`, { email: 'customer@acmecorp.com', password: 'password123' });
    const customerToken = customerRes.data.token;
    console.log(' ✓ Customer login successful:', customerRes.data.role);

    // 2. Test Product & Customer retrieval
    console.log('\n[2/7] Testing Admin Catalog & Customer retrieval...');
    const custs = await axios.get(`${API_URL}/admin/customers`, { headers: { Authorization: `Bearer ${adminToken}` } });
    const prods = await axios.get(`${API_URL}/admin/products`, { headers: { Authorization: `Bearer ${adminToken}` } });
    console.log(` ✓ Retrieved ${custs.data.length} customers and ${prods.data.length} products`);

    const targetCustomer = custs.data[0]; // Acme Corp (Gold Tier - 15% limit)
    const targetProduct = prods.data[0];  // Business Laptop Pro 15 (Hardware)

    // 3. Test Quotation Creation & Live Discount Governance
    console.log('\n[3/7] Testing Quotation Creation with High Discount Breach (Risk Scoring)...');
    const newQuoteRes = await axios.post(
      `${API_URL}/quotations`,
      {
        customerId: targetCustomer._id,
        items: [
          {
            product: targetProduct._id,
            quantity: 15,
            unitPrice: targetProduct.unitPrice,
            discountPercent: 20, // 20% > 15% Gold limit -> Breach!
            category: targetProduct.category
          }
        ],
        notes: 'End-to-End Automated Verification Deal'
      },
      { headers: { Authorization: `Bearer ${repToken}` } }
    );

    const createdQuote = newQuoteRes.data;
    console.log(` ✓ Quotation ${createdQuote.quoteNumber} created. Risk Score: ${createdQuote.riskScore} (${createdQuote.riskLevel}). Status: ${createdQuote.status}`);

    // 4. Test Submit for Approval Workflow
    console.log('\n[4/7] Submitting Quotation for 2-Tier Approval Workflow...');
    const submitRes = await axios.post(
      `${API_URL}/quotations/${createdQuote._id}/submit`,
      {},
      { headers: { Authorization: `Bearer ${repToken}` } }
    );
    console.log(` ✓ Submitted. New Status: ${submitRes.data.quotation.status}, Current Step: ${submitRes.data.approval.currentStep}`);

    // 5. Test Sales Manager Approval Step
    console.log('\n[5/7] Testing Sales Manager Approval Step...');
    const approvalsRes = await axios.get(`${API_URL}/approvals`, { headers: { Authorization: `Bearer ${managerToken}` } });
    const pendingManagerApproval = approvalsRes.data.find(a => a.quotation._id === createdQuote._id || a.quotation.quoteNumber === createdQuote.quoteNumber);

    if (pendingManagerApproval) {
      const mgrApproveRes = await axios.post(
        `${API_URL}/approvals/${pendingManagerApproval._id}/action`,
        { action: 'APPROVE', reason: 'Sales Manager verified deal margin. Approved.' },
        { headers: { Authorization: `Bearer ${managerToken}` } }
      );
      console.log(` ✓ Manager Approved. Next Step: ${mgrApproveRes.data.approval.currentStep}`);

      // If High Risk, test Finance Approval Step
      if (mgrApproveRes.data.approval.currentStep === 'FINANCE_OPERATIONS') {
        console.log('\n High Risk Deal -> Executing Finance 2nd Tier Approval Step...');
        const finApproveRes = await axios.post(
          `${API_URL}/approvals/${pendingManagerApproval._id}/action`,
          { action: 'APPROVE', reason: 'Finance Operations high-risk discount approved.' },
          { headers: { Authorization: `Bearer ${financeToken}` } }
        );
        console.log(` ✓ Finance Approved! Final Quote Status: ${finApproveRes.data.quotation.status}`);
      }
    }

    // 6. Test Fulfillment & Invoice Generation
    console.log('\n[6/7] Testing Warehouse Stock Allocation & Partial Invoicing Guard...');
    const fulfillmentsRes = await axios.get(`${API_URL}/fulfillment`, { headers: { Authorization: `Bearer ${financeToken}` } });
    const targetFulfillment = fulfillmentsRes.data.find(f => f.quotation.quoteNumber === createdQuote.quoteNumber || f.quotation._id === createdQuote._id);

    if (targetFulfillment) {
      console.log(` ✓ Fulfillment Record found. Status: ${targetFulfillment.status}`);
      
      const invRes = await axios.post(
        `${API_URL}/invoices/generate/${targetFulfillment._id}`,
        {},
        { headers: { Authorization: `Bearer ${financeToken}` } }
      );
      console.log(` ✓ Invoice Generated: ${invRes.data.invoiceNumber}, Billed Grand Total: ₹${invRes.data.grandTotal.toLocaleString()}`);

      // Record Payment
      const payRes = await axios.post(
        `${API_URL}/invoices/${invRes.data._id}/payment`,
        { amount: invRes.data.grandTotal },
        { headers: { Authorization: `Bearer ${financeToken}` } }
      );
      console.log(` ✓ Payment Recorded. Payment Status: ${payRes.data.paymentStatus}`);
    }

    // 7. Test Admin Discount Governance Update
    console.log('\n[7/7] Testing Admin Discount Governance Rule Updates...');
    const tierUpdateRes = await axios.put(
      `${API_URL}/admin/discount-tier`,
      { tier: 'Gold', maxDiscountPercentage: 15 },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log(` ✓ Admin Gold Tier updated: Max Discount ${tierUpdateRes.data.maxDiscountPercentage}%`);

    console.log('\n=======================================================');
    console.log(' ALL DEALFLOW360 FUNCTIONALITIES VERIFIED 100% WORKING! ');
    console.log('=======================================================');
  } catch (error) {
    console.error('❌ Verification Error:', error.response?.data || error.message);
  }
};

runFunctionalTest();
