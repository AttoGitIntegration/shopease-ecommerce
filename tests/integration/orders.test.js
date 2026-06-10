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
    expect(res.status).toBe(202);
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
  test('GET /orders/user/:userId - get orders by user', async () => {
    await request(app).post('/api/orders').send({
      userId: 42,
      items: [{ productId: 5, name: 'Keyboard', price: 1500, quantity: 2 }],
      address: '7 Brigade Road, Bengaluru, KA 560001'
    });
    const res = await request(app).get('/api/orders/user/42');
    expect(res.status).toBe(200);
    expect(res.body.orders).toBeInstanceOf(Array);
    expect(res.body.orders.length).toBeGreaterThan(0);
    expect(res.body.orders[0].userId).toBe(42);
    expect(typeof res.body.total).toBe('number');
  });
  test('GET /orders/user/:userId - empty array for unknown user', async () => {
    const res = await request(app).get('/api/orders/user/99999');
    expect(res.status).toBe(200);
    expect(res.body.orders).toEqual([]);
    expect(res.body.total).toBe(0);
  });
});
