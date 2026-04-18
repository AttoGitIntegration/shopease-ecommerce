const request = require('supertest');
const app = require('../../src/app');

describe('Checkout API', () => {
  beforeAll(async () => {
    await request(app).delete('/api/cart/clear');
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 });
  });

  test('POST /checkout/initiate - fails when cart is empty', async () => {
    await request(app).delete('/api/cart/clear');
    const res = await request(app).post('/api/checkout/initiate');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/empty/i);
  });

  test('POST /checkout/initiate - creates session with computed totals', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 });
    const res = await request(app).post('/api/checkout/initiate');
    expect(res.status).toBe(201);
    expect(res.body.session.status).toBe('initiated');
    expect(res.body.session.totals.subtotal).toBe(2999);
    expect(res.body.session.totals.shipping).toBe(0); // over free-ship threshold
    expect(res.body.session.totals.total).toBe(2999 + Math.round(2999 * 0.08));
  });

  test('GET /checkout - returns active session', async () => {
    const res = await request(app).get('/api/checkout');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('totals');
  });

  test('POST /checkout/shipping - rejects incomplete address', async () => {
    const res = await request(app).post('/api/checkout/shipping').send({ fullName: 'A' });
    expect(res.status).toBe(400);
  });

  test('POST /checkout/shipping - saves valid address', async () => {
    const res = await request(app).post('/api/checkout/shipping').send({
      fullName: 'Sai K', line1: '123 MG Road', city: 'Bengaluru',
      state: 'KA', postalCode: '560001', country: 'IN'
    });
    expect(res.status).toBe(200);
    expect(res.body.session.status).toBe('shipping_set');
    expect(res.body.session.address.city).toBe('Bengaluru');
  });

  test('POST /checkout/payment - rejects invalid method', async () => {
    const res = await request(app).post('/api/checkout/payment').send({ method: 'crypto' });
    expect(res.status).toBe(400);
  });

  test('POST /checkout/payment - accepts valid method', async () => {
    const res = await request(app).post('/api/checkout/payment').send({ method: 'upi' });
    expect(res.status).toBe(200);
    expect(res.body.session.payment.method).toBe('upi');
  });

  test('POST /checkout/confirm - places order and clears cart', async () => {
    const res = await request(app).post('/api/checkout/confirm');
    expect(res.status).toBe(201);
    expect(res.body.order.status).toBe('placed');
    expect(res.body.order.totals.total).toBeGreaterThan(0);
    const cartRes = await request(app).get('/api/cart');
    expect(cartRes.body.items).toHaveLength(0);
    const sessionRes = await request(app).get('/api/checkout');
    expect(sessionRes.status).toBe(404);
  });

  test('POST /checkout/confirm - fails without active session', async () => {
    const res = await request(app).post('/api/checkout/confirm');
    expect(res.status).toBe(404);
  });

  test('POST /checkout/confirm - requires shipping and payment', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 2, name: 'Running Shoes', price: 1499, quantity: 1 });
    await request(app).post('/api/checkout/initiate');
    const res = await request(app).post('/api/checkout/confirm');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/shipping/i);
    await request(app).delete('/api/checkout');
    await request(app).delete('/api/cart/clear');
  });

  test('shipping fee applies under free-ship threshold', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 3, name: 'Leather Wallet', price: 499, quantity: 1 });
    const res = await request(app).post('/api/checkout/initiate');
    expect(res.body.session.totals.shipping).toBe(99);
    expect(res.body.session.totals.total).toBe(499 + Math.round(499 * 0.08) + 99);
    await request(app).delete('/api/checkout');
    await request(app).delete('/api/cart/clear');
  });
});
