const products = require('../data/products');
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
