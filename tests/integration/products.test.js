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
});
