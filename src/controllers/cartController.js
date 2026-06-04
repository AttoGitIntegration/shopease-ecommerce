let cart = { items: [], total: 0 };
const recalculate = () => { cart.total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0); };
exports.readCart   = () => cart;
exports.resetCart  = () => { cart = { items: [], total: 0 }; };
exports.getCart    = (req, res) => res.json(cart);
exports.addItem    = (req, res) => {
  const { productId, name, price, quantity = 1 } = req.body;
  if (!productId || !name || price == null) {
    return res.status(400).json({ error: 'productId, name, and price are required' });
  }
  if (typeof price !== 'number' || price < 0) {
    return res.status(400).json({ error: 'price must be a non-negative number' });
  }
  if (typeof quantity !== 'number' || quantity < 1) {
    return res.status(400).json({ error: 'quantity must be a positive number' });
  }
  const existing = cart.items.find(i => i.productId === productId);
  if (existing) {
    existing.quantity += quantity;
    recalculate();
    return res.json({ message: 'Quantity updated for existing item', item: existing, cart });
  }
  const newItem = { productId, name, price, quantity };
  cart.items.push(newItem);
  recalculate();
  res.status(201).json({ message: 'Item added to cart', item: newItem, cart });
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
exports.getCartCount = (req, res) => {
  const productCount = cart.items.length;
  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);
  res.json({ itemCount, productCount });
};
