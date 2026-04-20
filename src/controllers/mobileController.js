const mobiles = [
  { id: 301, name: 'Samsung Galaxy S24 Ultra', brand: 'Samsung', price: 129999, stock: 25, rating: 4.7, storage: '256GB', ram: '12GB', color: 'Titanium Black' },
  { id: 302, name: 'Samsung Galaxy S24',       brand: 'Samsung', price: 79999,  stock: 40, rating: 4.5, storage: '128GB', ram: '8GB',  color: 'Onyx Black'     },
  { id: 303, name: 'Samsung Galaxy Z Fold 5',  brand: 'Samsung', price: 154999, stock: 10, rating: 4.6, storage: '512GB', ram: '12GB', color: 'Phantom Black'  },
  { id: 304, name: 'Samsung Galaxy A55',       brand: 'Samsung', price: 39999,  stock: 80, rating: 4.3, storage: '128GB', ram: '8GB',  color: 'Awesome Blue'   },
  { id: 305, name: 'Samsung Galaxy M14',       brand: 'Samsung', price: 13999,  stock: 120, rating: 4.1, storage: '64GB', ram: '4GB',  color: 'Smoky Teal'     },
];

exports.list = (req, res) => {
  const { brand, maxPrice, minRating } = req.query;
  let results = [...mobiles];
  if (brand)     results = results.filter(m => m.brand.toLowerCase() === brand.toLowerCase());
  if (maxPrice)  results = results.filter(m => m.price <= parseInt(maxPrice));
  if (minRating) results = results.filter(m => m.rating >= parseFloat(minRating));
  res.json({ mobiles: results, count: results.length });
};

exports.search = (req, res) => {
  const { q, brand, minPrice, maxPrice, minRating, storage, ram, color } = req.query;
  let results = [...mobiles];
  if (q) {
    const term = q.toLowerCase();
    results = results.filter(m => m.name.toLowerCase().includes(term) || m.brand.toLowerCase().includes(term));
  }
  if (brand)     results = results.filter(m => m.brand.toLowerCase() === brand.toLowerCase());
  if (minPrice)  results = results.filter(m => m.price >= parseInt(minPrice));
  if (maxPrice)  results = results.filter(m => m.price <= parseInt(maxPrice));
  if (minRating) results = results.filter(m => m.rating >= parseFloat(minRating));
  if (storage)   results = results.filter(m => m.storage === storage);
  if (ram)       results = results.filter(m => m.ram === ram);
  if (color)     results = results.filter(m => m.color.toLowerCase() === color.toLowerCase());
  res.json({ results, count: results.length });
};

exports.getById = (req, res) => {
  const mobile = mobiles.find(m => m.id === parseInt(req.params.id));
  if (!mobile) return res.status(404).json({ error: 'Mobile not found' });
  res.json(mobile);
};

exports.select = (req, res) => {
  const mobile = mobiles.find(m => m.id === parseInt(req.params.id));
  if (!mobile) return res.status(404).json({ error: 'Mobile not found' });
  if (mobile.status === 'cancelled') return res.status(400).json({ error: 'Mobile is cancelled and unavailable' });
  const quantity = parseInt(req.body.quantity) || 1;
  if (quantity <= 0) return res.status(400).json({ error: 'quantity must be positive' });
  if (quantity > mobile.stock) return res.status(400).json({ error: 'Insufficient stock', available: mobile.stock });
  const selection = {
    mobileId: mobile.id,
    name: mobile.name,
    quantity,
    unitPrice: mobile.price,
    total: mobile.price * quantity
  };
  res.json({ message: 'Mobile selected', selection });
};

exports.cancel = (req, res) => {
  const mobile = mobiles.find(m => m.id === parseInt(req.params.id));
  if (!mobile) return res.status(404).json({ error: 'Mobile not found' });
  if (mobile.status === 'cancelled') return res.status(400).json({ error: 'Mobile already cancelled' });
  const reason = req.body?.reason;
  if (!reason) return res.status(400).json({ error: 'reason required' });
  mobile.status = 'cancelled';
  mobile.cancelledAt = new Date();
  mobile.cancellationReason = reason;
  res.json({ message: 'Mobile cancelled', mobile });
};

exports.reinstate = (req, res) => {
  const mobile = mobiles.find(m => m.id === parseInt(req.params.id));
  if (!mobile) return res.status(404).json({ error: 'Mobile not found' });
  if (mobile.status !== 'cancelled') return res.status(400).json({ error: 'Mobile is not cancelled' });
  delete mobile.status;
  delete mobile.cancelledAt;
  delete mobile.cancellationReason;
  res.json({ message: 'Mobile reinstated', mobile });
};

exports.listCancelled = (req, res) => {
  const results = mobiles.filter(m => m.status === 'cancelled');
  res.json({ cancelled: results, count: results.length });
};
