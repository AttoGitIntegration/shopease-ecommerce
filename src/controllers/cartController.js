const products = require('../data/products');

let cart = { items: [], total: 0 };

const recalculate = () => {
  cart.total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
};

exports.getCart = (req, res) => res.json(cart);

exports.addItem = (req, res) => {
  const { productId, quantity = 1 } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'productId is required' });
  }

  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty < 1) {
    return res.status(400).json({ error: 'quantity must be a positive integer' });
  }

  const product = products.find(p => p.id === parseInt(productId, 10));
  if (!product) {
    return res.status(404).json({ error: 'Product not found' });
  }

  const existing = cart.items.find(i => i.productId === product.id);
  const currentQty = existing ? existing.quantity : 0;
  if (currentQty + qty > product.stock) {
    return res.status(409).json({
      error: 'Insufficient stock',
      available: product.stock - currentQty,
    });
  }

  if (existing) {
    existing.quantity += qty;
  } else {
    cart.items.push({ productId: product.id, name: product.name, price: product.price, quantity: qty });
  }

  recalculate();
  res.json({ message: 'Item added', cart });
};

exports.updateItem = (req, res) => {
  const { productId, quantity } = req.body;
  const item = cart.items.find(i => i.productId === productId);
  if (!item) return res.status(404).json({ error: 'Item not in cart' });
  if (quantity <= 0) cart.items = cart.items.filter(i => i.productId !== productId);
  else item.quantity = quantity;
  recalculate();
  res.json({ message: 'Cart updated', cart });
};

exports.removeItem = (req, res) => {
  const { productId } = req.body;
  cart.items = cart.items.filter(i => i.productId !== productId);
  recalculate();
  res.json({ message: 'Item removed', cart });
};

exports.clearCart = (req, res) => {
  cart = { items: [], total: 0 };
  res.json({ message: 'Cart cleared', cart });
};
