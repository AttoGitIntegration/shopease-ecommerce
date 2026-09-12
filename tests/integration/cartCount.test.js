const request = require('supertest');
const app = require('../../src/app');

describe('GET /api/cart/count', () => {
  beforeEach(async () => {
    await request(app).delete('/api/cart/clear');
  });

  test('returns zero counts on empty cart', async () => {
    const res = await request(app).get('/api/cart/count');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itemCount: 0, productCount: 0 });
  });

  test('returns correct counts after adding a single item', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 3 });
    const res = await request(app).get('/api/cart/count');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itemCount: 3, productCount: 1 });
  });

  test('itemCount sums quantities across multiple products', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 2 });
    await request(app).post('/api/cart/add')
      .send({ productId: 2, name: 'Running Shoes', price: 4999, quantity: 4 });
    const res = await request(app).get('/api/cart/count');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itemCount: 6, productCount: 2 });
  });

  test('productCount does not increase when adding more of an existing item', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 });
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 2 });
    const res = await request(app).get('/api/cart/count');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itemCount: 3, productCount: 1 });
  });

  test('counts update correctly after removing an item', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 2 });
    await request(app).post('/api/cart/add')
      .send({ productId: 2, name: 'Running Shoes', price: 4999, quantity: 1 });
    await request(app).delete('/api/cart/remove')
      .send({ productId: 1 });
    const res = await request(app).get('/api/cart/count');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itemCount: 1, productCount: 1 });
  });

  test('returns zero counts after clearing cart', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 5 });
    await request(app).delete('/api/cart/clear');
    const res = await request(app).get('/api/cart/count');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itemCount: 0, productCount: 0 });
  });

  test('counts reflect quantity update via PUT /cart/update', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 });
    await request(app).put('/api/cart/update')
      .send({ productId: 1, quantity: 10 });
    const res = await request(app).get('/api/cart/count');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ itemCount: 10, productCount: 1 });
  });
});
