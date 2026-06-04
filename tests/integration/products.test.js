const request = require('supertest');
const app = require('../../src/app');
describe('Products API', () => {
  test('GET /products - returns all', async () => {
    const res = await request(app).get('/api/products');
    expect(res.status).toBe(200);
    expect(res.body.products.length).toBeGreaterThan(0);
  });
  test('GET /products/:id - valid ID', async () => {
    const res = await request(app).get('/api/products/1');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('name');
  });
  test('GET /products/:id - invalid ID returns 404', async () => {
    const res = await request(app).get('/api/products/999');
    expect(res.status).toBe(404);
  });
  test('GET /products/search?q=shoes', async () => {
    const res = await request(app).get('/api/products/search?q=shoes');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
  });
  test('GET /products/search?q=shirts', async () => {
    const res = await request(app).get('/api/products/search?q=shirts');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
  });
  test('GET /products/search?q=clothing - matches by category keyword', async () => {
    const res = await request(app).get('/api/products/search?q=clothing');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    res.body.results.forEach(p => expect(p.category).toBe('Clothing'));
  });
  test('GET /products/search?q=cotton - matches by description keyword', async () => {
    const res = await request(app).get('/api/products/search?q=cotton');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
  });
  test('GET /products/search?q=nonexistent - returns empty results', async () => {
    const res = await request(app).get('/api/products/search?q=nonexistent');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBe(0);
    expect(res.body.count).toBe(0);
  });
  test('GET /products/search?category=Footwear - filters by category', async () => {
    const res = await request(app).get('/api/products/search?category=Footwear');
    expect(res.status).toBe(200);
    res.body.results.forEach(p => expect(p.category).toBe('Footwear'));
  });
  test('GET /products/search?minPrice=1000&maxPrice=2000 - filters by price range', async () => {
    const res = await request(app).get('/api/products/search?minPrice=1000&maxPrice=2000');
    expect(res.status).toBe(200);
    res.body.results.forEach(p => {
      expect(p.price).toBeGreaterThanOrEqual(1000);
      expect(p.price).toBeLessThanOrEqual(2000);
    });
  });
  test('GET /products/search - no params returns 400', async () => {
    const res = await request(app).get('/api/products/search');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
  test('GET /products/top-rated - returns products sorted by rating', async () => {
    const res = await request(app).get('/api/products/top-rated');
    expect(res.status).toBe(200);
    expect(res.body.results.length).toBeGreaterThan(0);
    for (let i = 1; i < res.body.results.length; i++) {
      expect(res.body.results[i - 1].rating).toBeGreaterThanOrEqual(res.body.results[i].rating);
    }
  });
  test('GET /products/top-rated?min=4.5 - filters by minimum rating', async () => {
    const res = await request(app).get('/api/products/top-rated?min=4.5');
    expect(res.status).toBe(200);
    res.body.results.forEach(p => expect(p.rating).toBeGreaterThanOrEqual(4.5));
  });
  test('GET /products/price-range - returns min and max price across all products', async () => {
    const res = await request(app).get('/api/products/price-range');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('minPrice');
    expect(res.body).toHaveProperty('maxPrice');
    expect(res.body.minPrice).toBeLessThanOrEqual(res.body.maxPrice);
    expect(res.body.category).toBe('all');
  });
  test('GET /products/price-range?category=Electronics - scopes range to category', async () => {
    const res = await request(app).get('/api/products/price-range?category=Electronics');
    expect(res.status).toBe(200);
    expect(res.body.category).toBe('Electronics');
    expect(res.body.minPrice).toBe(2999);
    expect(res.body.maxPrice).toBe(2999);
  });
  test('GET /products/price-range?category=unknown - returns 404 for missing category', async () => {
    const res = await request(app).get('/api/products/price-range?category=unknown');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });

  // Image search
  test('POST /products/search/image - matches products from image URL filename', async () => {
    const res = await request(app)
      .post('/api/products/search/image')
      .send({ imageUrl: 'https://example.com/products/running-shoes.jpg' });
    expect(res.status).toBe(200);
    expect(res.body.searchMethod).toBe('image');
    expect(res.body).toHaveProperty('detectedLabels');
    expect(res.body.detectedLabels).toEqual(expect.arrayContaining(['running', 'shoes']));
    expect(res.body.results.length).toBeGreaterThan(0);
    expect(res.body.results[0].category).toBe('Footwear');
  });

  test('POST /products/search/image - returns top-rated suggestions when no label matches', async () => {
    const res = await request(app)
      .post('/api/products/search/image')
      .send({ imageUrl: 'https://example.com/uploads/xyz-unknown-object.png' });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('note');
    expect(res.body.results.length).toBe(3);
    for (let i = 1; i < res.body.results.length; i++) {
      expect(res.body.results[i - 1].rating).toBeGreaterThanOrEqual(res.body.results[i].rating);
    }
  });

  test('POST /products/search/image - missing imageUrl returns 400', async () => {
    const res = await request(app)
      .post('/api/products/search/image')
      .send({});
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /products/search/image - invalid URL returns 400', async () => {
    const res = await request(app)
      .post('/api/products/search/image')
      .send({ imageUrl: 'not-a-valid-url' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  test('POST /products/search/image - matches headphones from image URL', async () => {
    const res = await request(app)
      .post('/api/products/search/image')
      .send({ imageUrl: 'https://cdn.store.com/images/wireless-headphones-product.jpg' });
    expect(res.status).toBe(200);
    expect(res.body.results.some(p => p.name.toLowerCase().includes('headphone'))).toBe(true);
    expect(res.body).toHaveProperty('imageUrl');
  });
});