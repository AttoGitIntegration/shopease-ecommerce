let cart = { items: [], total: 0 };
const recalculate = () => { cart.total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0); };
exports.getCart    = (req, res) => res.json(cart);
exports.addItem    = (req, res) => {
  const { productId, name, price, quantity = 1 } = req.body;
  const existing = cart.items.find(i => i.productId === productId);
  if (existing) existing.quantity += quantity;
  else cart.items.push({ productId, name, price, quantity });
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
exports.getItem    = (req, res) => {
  const item = cart.items.find(i => i.productId === req.params.productId);
  if (!item) return res.status(404).json({ error: 'Item not in cart' });
  res.json(item);
};
exports.clearCart  = (req, res) => {
  cart = { items: [], total: 0 };
  res.json({ message: 'Cart cleared', cart });
};
