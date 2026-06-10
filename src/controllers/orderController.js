const products = require('../data/products');
const { getCartState, clearCartState } = require('./cartController');

const orders = [];

exports.placeOrder = (req, res) => {
  const { userId, address } = req.body;

  if (!userId) return res.status(400).json({ error: 'userId is required' });
  if (!address || !address.trim()) return res.status(400).json({ error: 'address is required' });

  const cart = getCartState();
  if (!cart.items.length) return res.status(400).json({ error: 'Cart is empty' });

  // Verify stock and resolve current catalog prices before committing
  for (const item of cart.items) {
    const product = products.find(p => p.id === item.productId);
    if (!product) {
      return res.status(409).json({ error: `Product ${item.productId} no longer exists` });
    }
    if (item.quantity > product.stock) {
      return res.status(409).json({
        error: `Insufficient stock for "${product.name}"`,
        available: product.stock,
      });
    }
  }

  // Deduct stock and snapshot order items with current catalog prices
  const orderItems = cart.items.map(item => {
    const product = products.find(p => p.id === item.productId);
    product.stock -= item.quantity;
    return { productId: product.id, name: product.name, price: product.price, quantity: item.quantity };
  });

  const total = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const order = {
    id: orders.length + 1,
    userId,
    items: orderItems,
    address: address.trim(),
    total,
    status: 'placed',
    createdAt: new Date(),
  };

  orders.push(order);
  clearCartState();

  res.status(201).json({ message: 'Order placed', order });
};

exports.getOrders = (req, res) => res.json({ orders, total: orders.length });

exports.getOrderById = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  res.json(order);
};

exports.cancelOrder = (req, res) => {
  const order = orders.find(o => o.id === parseInt(req.params.id));
  if (!order) return res.status(404).json({ error: 'Order not found' });
  if (order.status === 'shipped') return res.status(400).json({ error: 'Cannot cancel shipped order' });
  if (order.status === 'cancelled') return res.status(400).json({ error: 'Order is already cancelled' });
  order.status = 'cancelled';
  res.json({ message: 'Order cancelled', order });
};
