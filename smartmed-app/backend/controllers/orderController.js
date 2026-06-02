const { v4: uuid } = require('uuid');
const { medicines, users, orders, prescriptions } = require('../data/store');
const { getCart, buildCartView } = require('./cartController');

const ALLOWED_PAYMENT = ['COD', 'UPI', 'CARD', 'NETBANKING'];

function placeOrder(req, res) {
  const userId = req.user.id;
  const user = users.get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { addressId, paymentMethod, prescriptionId } = req.body || {};

  if (!addressId || !paymentMethod) {
    return res.status(400).json({ error: 'addressId and paymentMethod are required' });
  }
  if (!ALLOWED_PAYMENT.includes(paymentMethod)) {
    return res.status(400).json({ error: `paymentMethod must be one of ${ALLOWED_PAYMENT.join(', ')}` });
  }

  const address = user.addresses.find((a) => a.id === addressId);
  if (!address) {
    return res.status(404).json({ error: 'Address not found for this user' });
  }

  const cart = getCart(userId);
  if (cart.items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  const view = buildCartView(cart);

  if (view.needsPrescription) {
    if (!prescriptionId) {
      return res.status(400).json({
        error: 'Prescription is required for one or more medicines in the cart',
      });
    }
    const rx = prescriptions.get(prescriptionId);
    if (!rx || rx.userId !== userId) {
      return res.status(404).json({ error: 'Prescription not found' });
    }
    if (rx.status !== 'verified') {
      return res.status(409).json({ error: 'Prescription not yet verified' });
    }
  }

  for (const line of view.items) {
    const medicine = medicines.find((m) => m.id === line.medicineId);
    if (!medicine || medicine.stock < line.quantity) {
      return res.status(409).json({
        error: `Insufficient stock for ${medicine ? medicine.name : line.medicineId}`,
      });
    }
  }

  for (const line of view.items) {
    const medicine = medicines.find((m) => m.id === line.medicineId);
    medicine.stock -= line.quantity;
  }

  const order = {
    id: `ORD-${Date.now().toString(36).toUpperCase()}-${uuid().slice(0, 4)}`,
    userId,
    items: view.items,
    subtotal: view.subtotal,
    shipping: view.shipping,
    total: view.total,
    address,
    paymentMethod,
    prescriptionId: view.needsPrescription ? prescriptionId : null,
    status: 'PLACED',
    placedAt: new Date().toISOString(),
    timeline: [{ status: 'PLACED', at: new Date().toISOString() }],
  };

  orders.set(order.id, order);
  cart.items = [];

  res.status(201).json(order);
}

function listOrders(req, res) {
  const userId = req.user.id;
  const userOrders = Array.from(orders.values())
    .filter((o) => o.userId === userId)
    .sort((a, b) => new Date(b.placedAt) - new Date(a.placedAt));
  res.json({ count: userOrders.length, items: userOrders });
}

function getOrder(req, res) {
  const order = orders.get(req.params.id);
  if (!order || order.userId !== req.user.id) {
    return res.status(404).json({ error: 'Order not found' });
  }
  res.json(order);
}

function cancelOrder(req, res) {
  const order = orders.get(req.params.id);
  if (!order || order.userId !== req.user.id) {
    return res.status(404).json({ error: 'Order not found' });
  }
  if (['DELIVERED', 'CANCELLED', 'SHIPPED'].includes(order.status)) {
    return res.status(409).json({
      error: `Order in status ${order.status} cannot be cancelled`,
    });
  }

  for (const line of order.items) {
    const medicine = medicines.find((m) => m.id === line.medicineId);
    if (medicine) medicine.stock += line.quantity;
  }

  order.status = 'CANCELLED';
  order.timeline.push({ status: 'CANCELLED', at: new Date().toISOString() });
  res.json(order);
}

function uploadPrescription(req, res) {
  const { fileName, notes } = req.body || {};
  if (!fileName) {
    return res.status(400).json({ error: 'fileName is required' });
  }
  const rx = {
    id: `RX-${uuid().slice(0, 8).toUpperCase()}`,
    userId: req.user.id,
    fileName,
    notes: notes || '',
    status: 'verified',
    uploadedAt: new Date().toISOString(),
  };
  prescriptions.set(rx.id, rx);
  res.status(201).json(rx);
}

module.exports = {
  placeOrder,
  listOrders,
  getOrder,
  cancelOrder,
  uploadPrescription,
};
