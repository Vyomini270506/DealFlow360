const Invoice = require('../models/Invoice');
const Subscription = require('../models/Subscription');
const CustomerRequest = require('../models/CustomerRequest');
const Negotiation = require('../models/Negotiation');
const Quotation = require('../models/Quotation');
const Order = require('../models/Order');
const { allocateFulfillmentStock } = require('./fulfillmentService');
const { updateCustomerTierByOrderCount } = require('../utils/customerTierHelper');
const { logAudit } = require('./auditService');

/**
 * Single source of truth for finalizing a closed deal.
 * Performs dual confirmation, updates status to Closed, creates Invoices and Subscriptions without duplicates,
 * and triggers stock allocation for physical items.
 */
const finalizeClosedDeal = async ({ quotationId, userId, userRole }) => {
  const quotation = await Quotation.findById(quotationId)
    .populate('customer')
    .populate('salesRep')
    .populate('items.product');

  if (!quotation) {
    throw new Error('Quotation not found');
  }

  // 1. Mark Quotation as Closed
  quotation.status = 'Closed';
  quotation.approvalChainState = 'APPROVED';
  if (userId) {
    quotation.acceptedBy = userId;
    quotation.acceptedAt = new Date();
  }
  await quotation.save();

  // 2. Mark Customer Request as Closed if linked
  if (quotation.customerRequest) {
    await CustomerRequest.findByIdAndUpdate(quotation.customerRequest, { status: 'Closed' });
  }

  // 3. Mark Negotiation thread as Closed with dual confirmation
  const filterConditions = [];
  if (quotation._id) filterConditions.push({ quotation: quotation._id });
  if (quotation.customerRequest) filterConditions.push({ customerRequest: quotation.customerRequest });

  if (filterConditions.length > 0) {
    await Negotiation.updateMany(
      { $or: filterConditions },
      {
        $set: {
          status: 'Closed',
          'customerConfirmation.status': 'CONFIRMED',
          'customerConfirmation.confirmedAt': new Date(),
          'salesRepConfirmation.status': 'CONFIRMED',
          'salesRepConfirmation.confirmedAt': new Date()
        }
      }
    );
  }

  // 4. Partition items into One-Time (Physical/Hardware) vs Recurring (Subscriptions/Services)
  const oneTimeItems = [];
  const subscriptionItems = [];

  for (const item of quotation.items) {
    const prod = item.product;
    const category = prod?.category || 'Hardware';
    const isRecurring =
      prod?.type === 'RECURRING' ||
      category === 'Services' ||
      category === 'Software' ||
      category.toLowerCase().includes('subscription') ||
      category.toLowerCase().includes('service') ||
      category.toLowerCase().includes('software');

    if (isRecurring) {
      subscriptionItems.push(item);
    } else {
      oneTimeItems.push(item);
    }
  }

  // 5. Generate ONE-TIME Invoice (Prevent duplicates)
  let productInvoice = await Invoice.findOne({ quotation: quotation._id, type: 'ONE_TIME' });
  let fulfillmentRecord = null;

  if (oneTimeItems.length > 0 || quotation.items.length > 0) {
    fulfillmentRecord = await allocateFulfillmentStock(quotation);

    if (!productInvoice) {
      const invCount = await Invoice.countDocuments();
      const invoiceNumber = `INV-${1000 + invCount + 1}`;

      const invItems = (oneTimeItems.length > 0 ? oneTimeItems : quotation.items).map(i => ({
        product: i.product._id || i.product,
        shippedQuantity: i.quantity,
        unitPrice: i.finalUnitPrice || i.unitPrice,
        lineTotal: i.lineTotal
      }));

      let subtotalVal = 0;
      invItems.forEach(i => { subtotalVal += i.lineTotal; });
      const taxVal = Number((subtotalVal * 0.18).toFixed(2));
      const grandTotalVal = Number((subtotalVal + taxVal).toFixed(2));

      productInvoice = await Invoice.create({
        invoiceNumber,
        quotation: quotation._id,
        fulfillment: fulfillmentRecord?._id || null,
        customer: quotation.customer._id || quotation.customer,
        salesRep: quotation.salesRep?._id || quotation.salesRep,
        type: 'ONE_TIME',
        items: invItems,
        subtotal: Number(subtotalVal.toFixed(2)),
        tax: taxVal,
        grandTotal: grandTotalVal,
        paymentStatus: 'UNPAID',
        deliveryStatus: 'PENDING',
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });

      await logAudit({
        recordType: 'Invoice',
        recordId: productInvoice._id,
        action: 'INVOICE_CREATED',
        previousStatus: '',
        newStatus: 'UNPAID',
        performedBy: userId,
        performerRole: userRole,
        comment: `Invoice ${invoiceNumber} generated post deal closure`
      });
    }
  }

  // 5.5 Generate ORDER Record (Prevent duplicates)
  let orderRecord = await Order.findOne({ quotation: quotation._id });
  if (!orderRecord) {
    const ordCount = await Order.countDocuments();
    const orderNumber = `ORD-${1000 + ordCount + 1}`;

    const ordItems = (oneTimeItems.length > 0 ? oneTimeItems : quotation.items).map(i => ({
      product: i.product._id || i.product,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      discountPercent: i.discountPercent || 0,
      finalUnitPrice: i.finalUnitPrice || i.unitPrice,
      lineTotal: i.lineTotal
    }));

    let subtotalVal = 0;
    ordItems.forEach(i => { subtotalVal += i.lineTotal; });
    const taxVal = Number((subtotalVal * 0.18).toFixed(2));
    const grandTotalVal = Number((subtotalVal + taxVal).toFixed(2));

    let statusVal = 'CONFIRMED';
    if (fulfillmentRecord) {
      if (fulfillmentRecord.status === 'FULFILLED') statusVal = 'FULFILLED';
      else if (fulfillmentRecord.status === 'BACKORDERED' || fulfillmentRecord.status === 'PARTIALLY_FULFILLED') statusVal = 'PARTIALLY_FULFILLED';
      else statusVal = 'PROCESSING';
    }

    orderRecord = await Order.create({
      orderNumber,
      customer: quotation.customer._id || quotation.customer,
      salesRep: quotation.salesRep?._id || quotation.salesRep,
      quotation: quotation._id,
      items: ordItems,
      subtotal: Number(subtotalVal.toFixed(2)),
      tax: taxVal,
      grandTotal: grandTotalVal,
      orderStatus: statusVal,
      invoice: productInvoice?._id || null,
      fulfillment: fulfillmentRecord?._id || null
    });

    await logAudit({
      recordType: 'Order',
      recordId: orderRecord._id,
      action: 'ORDER_CREATED',
      previousStatus: '',
      newStatus: statusVal,
      performedBy: userId,
      performerRole: userRole,
      comment: `Order ${orderNumber} generated post deal closure`
    });
  }

  // 6. Generate Subscriptions & Initial Recurring Invoices (Prevent duplicates)
  const createdSubscriptions = [];
  if (subscriptionItems.length > 0) {
    for (const sItem of subscriptionItems) {
      const prod = sItem.product;
      const prodId = prod._id || prod;

      let sub = await Subscription.findOne({ quotation: quotation._id, product: prodId });
      if (!sub) {
        const subCount = await Subscription.countDocuments();
        const subscriptionNumber = `SUB-${1000 + subCount + 1}`;

        sub = await Subscription.create({
          subscriptionNumber,
          customer: quotation.customer._id || quotation.customer,
          salesRep: quotation.salesRep?._id || quotation.salesRep,
          quotation: quotation._id,
          product: prodId,
          planName: prod.name || 'Recurring Service Plan',
          billingCycle: prod.billingFrequency || 'Monthly',
          billingFrequency: prod.billingFrequency || 'Monthly',
          amount: sItem.lineTotal,
          status: 'ACTIVE',
          startDate: new Date(),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        // Generate initial recurring invoice for subscription
        const subInvCount = await Invoice.countDocuments();
        const subInvNumber = `INV-${1000 + subInvCount + 1}`;
        const taxVal = Number((sItem.lineTotal * 0.18).toFixed(2));
        const grandTotalVal = Number((sItem.lineTotal + taxVal).toFixed(2));

        await Invoice.create({
          invoiceNumber: subInvNumber,
          quotation: quotation._id,
          subscription: sub._id,
          customer: quotation.customer._id || quotation.customer,
          salesRep: quotation.salesRep?._id || quotation.salesRep,
          type: 'RECURRING',
          items: [{
            product: prodId,
            shippedQuantity: sItem.quantity,
            unitPrice: sItem.finalUnitPrice || sItem.unitPrice,
            lineTotal: sItem.lineTotal
          }],
          subtotal: Number(sItem.lineTotal.toFixed(2)),
          tax: taxVal,
          grandTotal: grandTotalVal,
          paymentStatus: 'UNPAID',
          deliveryStatus: 'DELIVERED',
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
      }
      createdSubscriptions.push(sub);
    }
  }

  // 7. Update Customer Tier based on total closed orders count
  await updateCustomerTierByOrderCount(quotation.customer._id || quotation.customer);

  return {
    quotation,
    order: orderRecord,
    invoice: productInvoice,
    fulfillment: fulfillmentRecord,
    subscriptions: createdSubscriptions
  };
};

module.exports = { finalizeClosedDeal };
