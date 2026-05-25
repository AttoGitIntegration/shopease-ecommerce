const products = [
  { id: 1, name: 'Wireless Headphones', price: 2999, category: 'Electronics', stock: 50, rating: 4.5, description: 'Noise-cancelling over-ear wireless headphones' },
  { id: 2, name: 'Running Shoes',        price: 1499, category: 'Footwear',    stock: 30, rating: 4.2, description: 'Lightweight breathable running shoes for all terrains' },
  { id: 3, name: 'Leather Wallet',       price: 499,  category: 'Accessories', stock: 100, rating: 4.7, description: 'Slim genuine leather bifold wallet' },
  { id: 4, name: 'Yoga Mat',             price: 799,  category: 'Sports',      stock: 25, rating: 4.3, description: 'Non-slip eco-friendly yoga and exercise mat' },
  { id: 5, name: 'Coffee Maker',         price: 3499, category: 'Appliances',  stock: 15, rating: 4.6, description: 'Programmable drip coffee maker with thermal carafe' },
  { id: 6, name: 'Casual Shirts',        price: 899,  category: 'Clothing',    stock: 60, rating: 4.1, description: 'Comfortable cotton casual shirts for everyday wear' },
  { id: 7, name: 'Formal Shirt',         price: 1299, category: 'Clothing',    stock: 40, rating: 4.4, description: 'Slim-fit formal shirts for office and events' },
];
exports.getAll  = (req, res) => res.json({ products, total: products.length });
exports.getById = (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json(product);
};
exports.search  = (req, res) => {
  const { q, category, minPrice, maxPrice } = req.query;
  if (!q && !category && !minPrice && !maxPrice) {
    return res.status(400).json({ error: 'At least one search parameter is required (q, category, minPrice, maxPrice)' });
  }
  let results = [...products];
  if (q) {
    const keyword = q.toLowerCase();
    results = results.filter(p =>
      p.name.toLowerCase().includes(keyword) ||
      p.category.toLowerCase().includes(keyword) ||
      (p.description && p.description.toLowerCase().includes(keyword))
    );
  }
  if (category) results = results.filter(p => p.category.toLowerCase() === category.toLowerCase());
  if (minPrice) results = results.filter(p => p.price >= parseInt(minPrice));
  if (maxPrice) results = results.filter(p => p.price <= parseInt(maxPrice));
  res.json({ results, count: results.length });
};
exports.categories = (req, res) => {
  const counts = products.reduce((acc, p) => {
    acc[p.category] = (acc[p.category] || 0) + 1;
    return acc;
  }, {});
  const categories = Object.entries(counts).map(([name, count]) => ({ name, count }));
  res.json({ categories, total: categories.length });
};
exports.byCategory = (req, res) => {
  const name = req.params.name;
  const results = products.filter(p => p.category.toLowerCase() === name.toLowerCase());
  if (results.length === 0) return res.status(404).json({ error: 'Category not found' });
  res.json({ category: results[0].category, products: results, count: results.length });
};
exports.stock = (req, res) => {
  const product = products.find(p => p.id === parseInt(req.params.id));
  if (!product) return res.status(404).json({ error: 'Product not found' });
  res.json({ productId: product.id, stock: product.stock, inStock: product.stock > 0 });
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
exports.topRated = (req, res) => {
  const min = parseFloat(req.query.min) || 0;
  const results = [...products]
    .filter(p => p.rating >= min)
    .sort((a, b) => b.rating - a.rating);
  res.json({ results, count: results.length });
};
exports.priceRange = (req, res) => {
  const { category } = req.query;
  let pool = category
    ? products.filter(p => p.category.toLowerCase() === category.toLowerCase())
    : products;
  if (pool.length === 0) return res.status(404).json({ error: 'No products found' });
  const prices = pool.map(p => p.price);
  res.json({ category: category || 'all', minPrice: Math.min(...prices), maxPrice: Math.max(...prices) });
};
exports.imageSearch = (req, res) => {
  const { imageUrl } = req.body || {};
  if (!imageUrl || !imageUrl.trim()) {
    return res.status(400).json({ error: 'imageUrl is required' });
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(imageUrl);
  } catch {
    return res.status(400).json({ error: 'Invalid imageUrl — must be a valid URL' });
  }

  const pathname = parsedUrl.pathname.toLowerCase();
  const filename = pathname.split('/').pop().replace(/\.[^.]+$/, '');
  const stopWords = new Set(['img', 'image', 'photo', 'pic', 'picture', 'file', 'upload', 'media', 'static', 'assets']);
  const detectedLabels = [...new Set(
    filename.replace(/[-_]/g, ' ').split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
  )];

  let results = products.filter(p =>
    detectedLabels.some(label =>
      p.name.toLowerCase().includes(label) ||
      p.category.toLowerCase().includes(label) ||
      p.description.toLowerCase().includes(label)
    )
  );

  const fallback = results.length === 0;
  if (fallback) {
    results = [...products].sort((a, b) => b.rating - a.rating).slice(0, 3);
  }

  res.json({
    results,
    count: results.length,
    searchMethod: 'image',
    detectedLabels,
    imageUrl: imageUrl.trim(),
    ...(fallback && { note: 'No exact matches found. Showing top-rated suggestions.' })
  });
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
