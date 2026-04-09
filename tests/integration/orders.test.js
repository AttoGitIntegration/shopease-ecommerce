const request = require('supertest');
const app = require('../../src/app');
describe('Orders API', () => {
  let orderId;
  test('POST /orders - place order', async () => {
    const res = await request(app).post('/api/orders').send({
      userId: 1,
      items: [{ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 }],
      address: '123 MG Road, Bengaluru, KA 560001'
    });
    expect(res.status).toBe(201);
    orderId = res.body.order.id;
  });
  test('GET /orders - list all', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(200);
  });
  test('GET /orders/:id - get by ID', async () => {
    const res = await request(app).get(`/api/orders/${orderId}`);
    expect(res.status).toBe(200);
  });
  test('PUT /orders/:id/cancel - cancel order', async () => {
    const res = await request(app).put(`/api/orders/${orderId}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('cancelled');
  });
});
