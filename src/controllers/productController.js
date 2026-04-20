const products = [
  { id: 1, name: 'Wireless Headphones', price: 2999, category: 'Electronics', stock: 50, rating: 4.5 },
  { id: 2, name: 'Running Shoes',        price: 1499, category: 'Footwear',    stock: 30, rating: 4.2 },
  { id: 3, name: 'Leather Wallet',       price: 499,  category: 'Accessories', stock: 100, rating: 4.7 },
  { id: 4, name: 'Yoga Mat',             price: 799,  category: 'Sports',      stock: 25, rating: 4.3 },
  { id: 5, name: 'Coffee Maker',         price: 3499, category: 'Appliances',  stock: 15, rating: 4.6 },
];
exports.getAll  = (req, res) => res.json({ products, total: products.length });
exports.getById = (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
};
exports.search  = (req, res) => {
  const { q, category, minPrice, maxPrice } = req.query;
  let results = [...products];
  if (q)        results = results.filter(p => p.name.toLowerCase().includes(q.toLowerCase()));
  if (category) results = results.filter(p => p.category === category);
  if (minPrice) results = results.filter(p => p.price >= parseInt(minPrice));
  if (maxPrice) results = results.filter(p => p.price <= parseInt(maxPrice));
  res.json({ results, count: results.length });
};
exports.select  = (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.status === 'cancelled') return res.status(400).json({ error: 'Product is cancelled and unavailable' });
  const quantity = parseInt(req.body.quantity) || 1;
  if (quantity <= 0) return res.status(400).json({ error: 'quantity must be positive' });
  if (quantity > product.stock) return res.status(400).json({ error: 'Insufficient stock', available: product.stock });
  const selection = {
    productId: product.id,
    name: product.name,
    price: product.price,
    quantity,
    lineTotal: product.price * quantity
  };
  res.json({ message: 'Product selected', selection });
};
exports.cancel  = (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  if (product.status === 'cancelled') return res.status(400).json({ error: 'Product already cancelled' });
  const reason = req.body?.reason;
  if (!reason) return res.status(400).json({ error: 'reason required' });
  product.status = 'cancelled';
  product.cancelledAt = new Date();
  product.cancellationReason = reason;
  res.json({ message: 'Product cancelled', product });
};
