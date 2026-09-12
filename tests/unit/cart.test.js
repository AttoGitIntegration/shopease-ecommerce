const request = require('supertest');
const app = require('../../src/app');
describe('Cart API', () => {
  test('GET /cart - returns cart', async () => {
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
  });
  test('POST /cart/add - adds item', async () => {
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.cart.items.length).toBeGreaterThan(0);
  });
  test('DELETE /cart/clear - clears cart', async () => {
    const res = await request(app).delete('/api/cart/clear');
    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(0);
  });
  test('GET /cart/count - returns itemCount and productCount', async () => {
    const res = await request(app).get('/api/cart/count');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('itemCount');
    expect(res.body).toHaveProperty('productCount');
  });
});
