const orders = [];
const OTP_EXPIRY_MINUTES = 30;
const PICKUP_OTP_EXPIRY_HOURS = 48;

function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.placeOrder   = (req, res) => {
  const { userId, items, address } = req.body;
  if (!userId || !items?.length || !address) return res.status(400).json({ error: 'userId, items and address required' });
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const order = { id: orders.length + 1, userId, items, address, total, status: 'placed', createdAt: new Date() };
  orders.push(order);
  res.status(201).json({ message: 'Order placed', order });
};
exports.getOrders    = (req, res) => res.json({ orders, total: orders.length });
exports.getOrderById = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
};
exports.cancelOrder  = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'cancelled') return res.status(400).json({ error: 'Order already cancelled' });
  if (order.status === 'shipped' || order.status === 'delivered') {
    return res.status(400).json({ error: `Cannot cancel ${order.status} order` });
  }
  const CANCEL_WINDOW_HOURS = 24;
  const hoursSince = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60 * 60);
  if (hoursSince > CANCEL_WINDOW_HOURS) {
    return res.status(400).json({ error: `Cancellation window of ${CANCEL_WINDOW_HOURS} hours has expired` });
  }
  order.status = 'cancelled';
  order.cancelledAt = new Date();
  order.cancellationReason = req.body?.reason || 'No reason provided';
  res.json({ message: 'Order cancelled', order });
};
exports.returnOrder  = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'delivered') {
    return res.status(400).json({ error: `Cannot return ${order.status} order` });
  }
  const reason = req.body?.reason;
  if (!reason) return res.status(400).json({ error: 'reason required' });
  const RETURN_WINDOW_DAYS = 30;
  const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt) : new Date(order.createdAt);
  const daysSince = (Date.now() - deliveredAt.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSince > RETURN_WINDOW_DAYS) {
    return res.status(400).json({ error: `Return window of ${RETURN_WINDOW_DAYS} days has expired` });
  }
  order.status = 'returned';
  order.returnedAt = new Date();
  order.returnReason = reason;
  order.refundAmount = order.total;
  res.json({ message: 'Order return initiated', order });
};
exports.rejectReturn = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'returned') {
    return res.status(400).json({ error: `Cannot reject return for ${order.status} order` });
  }
  const reason = req.body?.reason;
  if (!reason) return res.status(400).json({ error: 'reason required' });
  order.status = 'return_rejected';
  order.returnRejectedAt = new Date();
  order.returnRejectionReason = reason;
  order.refundAmount = 0;
  res.json({ message: 'Return request rejected', order });
};
exports.approveReturn = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'returned') {
    return res.status(400).json({ error: `Cannot approve return for ${order.status} order` });
  }
  const pickupOtp = generateOtp();
  order.status = 'return_approved';
  order.returnApprovedAt = new Date();
  order.returnApprovalNote = req.body?.note || null;
  order.pickupOtp = pickupOtp;
  order.pickupOtpExpiresAt = new Date(Date.now() + PICKUP_OTP_EXPIRY_HOURS * 60 * 60 * 1000);
  order.pickupOtpVerified = false;
  res.json({
    message: 'Return request approved, pickup OTP generated for collection',
    order,
    pickupOtp,
    pickupOtpExpiresAt: order.pickupOtpExpiresAt
  });
};
exports.issueRefund = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'return_approved') {
    return res.status(400).json({ error: `Cannot issue refund for ${order.status} order` });
  }
  const method = req.body?.method || 'original_payment';
  order.status = 'refunded';
  order.refundedAt = new Date();
  order.refundAmount = order.total;
  order.refundMethod = method;
  order.refundTransactionId = `RFND-${Date.now()}-${order.id}`;
  order.pickupOtp = null;
  order.pickupOtpExpiresAt = null;
  res.json({ message: 'Refund issued', order });
};

exports.regeneratePickupOtp = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'return_approved') {
    return res.status(400).json({ error: `Can only regenerate pickup OTP for return_approved orders, current status: ${order.status}` });
  }
  const otp = generateOtp();
  order.pickupOtp = otp;
  order.pickupOtpExpiresAt = new Date(Date.now() + PICKUP_OTP_EXPIRY_HOURS * 60 * 60 * 1000);
  res.json({
    message: 'New pickup OTP generated',
    orderId: order.id,
    pickupOtp: otp,
    pickupOtpExpiresAt: order.pickupOtpExpiresAt
  });
};

exports.collectReturn = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'return_approved') {
    return res.status(400).json({ error: `Cannot collect return for ${order.status} order` });
  }
  const { otp, condition, conditionNotes, refundMethod } = req.body;
  if (!otp) return res.status(400).json({ error: 'otp required' });
  if (!condition) return res.status(400).json({ error: 'condition required' });
  if (!['good', 'damaged'].includes(condition)) {
    return res.status(400).json({ error: 'condition must be "good" or "damaged"' });
  }
  if (new Date() > new Date(order.pickupOtpExpiresAt)) {
    return res.status(400).json({ error: 'Pickup OTP has expired, please request a new one' });
  }
  if (otp !== order.pickupOtp) {
    return res.status(400).json({ error: 'Invalid pickup OTP' });
  }

  order.pickupOtpVerified = true;
  order.pickupOtp = null;
  order.pickupOtpExpiresAt = null;
  order.collectedAt = new Date();
  order.productCondition = condition;
  order.productConditionNotes = conditionNotes || null;

  if (condition === 'good') {
    order.status = 'refunded';
    order.refundedAt = new Date();
    order.refundAmount = order.total;
    order.refundMethod = refundMethod || 'original_payment';
    order.refundTransactionId = `RFND-${Date.now()}-${order.id}`;
    return res.json({
      message: 'Return collected. Product in good condition. Refund issued to customer account.',
      order,
      refundAmount: order.refundAmount,
      refundTransactionId: order.refundTransactionId
    });
  } else {
    order.status = 'return_rejected';
    order.returnRejectedAt = new Date();
    order.returnRejectionReason = `Product received in damaged condition${conditionNotes ? ': ' + conditionNotes : ''}`;
    order.refundAmount = 0;
    return res.json({
      message: 'Return collected but product is damaged. Refund rejected.',
      order
    });
  }
};
exports.getReturnStatus = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  const RETURN_STATES = ['returned', 'return_approved', 'return_rejected', 'refunded'];
  if (!RETURN_STATES.includes(order.status)) {
    return res.status(400).json({ error: 'No return initiated for this order' });
  }
  res.json({
    orderId: order.id,
    status: order.status,
    returnReason: order.returnReason || null,
    requestedAt: order.returnedAt || null,
    approvedAt: order.returnApprovedAt || null,
    pickupOtpExpiresAt: order.pickupOtpExpiresAt || null,
    collectedAt: order.collectedAt || null,
    productCondition: order.productCondition || null,
    productConditionNotes: order.productConditionNotes || null,
    rejectedAt: order.returnRejectedAt || null,
    rejectionReason: order.returnRejectionReason || null,
    refundedAt: order.refundedAt || null,
    refundAmount: order.refundAmount ?? null,
    refundMethod: order.refundMethod || null,
    refundTransactionId: order.refundTransactionId || null
  });
};
exports.getOrdersByUser = (req, res) => {
  const userId = parseInt(req.params.userId);
  const userOrders = orders.filter(o => o.userId === userId);
  res.json({ orders: userOrders, total: userOrders.length });
};
exports.shipOrder = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'placed') {
    return res.status(400).json({ error: `Cannot ship ${order.status} order` });
  }
  const otp = generateOtp();
  order.status = 'shipped';
  order.shippedAt = new Date();
  order.deliveryOtp = otp;
  order.deliveryOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  order.deliveryOtpVerified = false;
  res.json({
    message: 'Order shipped, delivery OTP generated',
    orderId: order.id,
    deliveryOtp: otp,
    otpExpiresAt: order.deliveryOtpExpiresAt
  });
};
exports.verifyDeliveryOtp = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'shipped') {
    return res.status(400).json({ error: `OTP verification only valid for shipped orders, current status: ${order.status}` });
  }
  const { otp } = req.body;
  if (!otp) return res.status(400).json({ error: 'otp required' });
  if (new Date() > new Date(order.deliveryOtpExpiresAt)) {
    return res.status(400).json({ error: 'OTP has expired, please request a new one' });
  }
  if (otp !== order.deliveryOtp) {
    return res.status(400).json({ error: 'Invalid OTP' });
  }
  order.status = 'delivered';
  order.deliveredAt = new Date();
  order.deliveryOtpVerified = true;
  order.deliveryOtp = null;
  order.deliveryOtpExpiresAt = null;
  res.json({ message: 'Delivery verified successfully', order });
};
exports.regenerateDeliveryOtp = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status !== 'shipped') {
    return res.status(400).json({ error: `Can only regenerate OTP for shipped orders, current status: ${order.status}` });
  }
  const otp = generateOtp();
  order.deliveryOtp = otp;
  order.deliveryOtpExpiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);
  res.json({
    message: 'New delivery OTP generated',
    orderId: order.id,
    deliveryOtp: otp,
    otpExpiresAt: order.deliveryOtpExpiresAt
  });
};
