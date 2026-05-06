const orders = [];
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
  order.status = 'return_approved';
  order.returnApprovedAt = new Date();
  order.returnApprovalNote = req.body?.note || null;
  res.json({ message: 'Return request approved', order });
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
  res.json({ message: 'Refund issued', order });
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
