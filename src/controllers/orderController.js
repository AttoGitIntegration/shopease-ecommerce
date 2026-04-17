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
  if (order.status === 'shipped') return res.status(400).json({ error: 'Cannot cancel shipped order' });
  order.status = 'cancelled';
  res.json({ message: 'Order cancelled', order });
};
exports.getOrdersByUser = (req, res) => {
  const userId = parseInt(req.params.userId);
  const userOrders = orders.filter(o => o.userId === userId);
  res.json({ orders: userOrders, total: userOrders.length });
};
