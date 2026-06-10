const request = require('supertest');
const app = require('../../src/app');

const addToCart = (productId, quantity) =>
  request(app).post('/api/cart/add').send({ productId, quantity });

describe('Orders API', () => {
  beforeEach(async () => {
    await request(app).delete('/api/cart/clear');
  });

  let orderId;

  test('POST /orders - places order from cart and clears it', async () => {
    await addToCart(1, 2);
    await addToCart(3, 1);

    const res = await request(app).post('/api/orders').send({
      userId: 1,
      address: '123 MG Road, Bengaluru, KA 560001',
    });

    expect(res.status).toBe(201);
    expect(res.body.order.items).toHaveLength(2);
    expect(res.body.order.total).toBe(2 * 2999 + 1 * 499);
    expect(res.body.order.status).toBe('placed');
    orderId = res.body.order.id;

    // cart must be empty after checkout
    const cartRes = await request(app).get('/api/cart');
    expect(cartRes.body.items).toHaveLength(0);
  });

  test('POST /orders - uses catalog price, not any client-supplied value', async () => {
    await addToCart(2, 1);
    const res = await request(app).post('/api/orders').send({
      userId: 1,
      address: '1 Test St',
    });
    expect(res.status).toBe(201);
    expect(res.body.order.items[0].price).toBe(1499);
  });

  test('POST /orders - 400 when cart is empty', async () => {
    const res = await request(app).post('/api/orders').send({
      userId: 1,
      address: '1 Test St',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/empty/i);
  });

  test('POST /orders - 400 when userId missing', async () => {
    await addToCart(1, 1);
    const res = await request(app).post('/api/orders').send({ address: '1 Test St' });
    expect(res.status).toBe(400);
  });

  test('POST /orders - 400 when address missing', async () => {
    await addToCart(1, 1);
    const res = await request(app).post('/api/orders').send({ userId: 1 });
    expect(res.status).toBe(400);
  });

  test('GET /orders - lists all orders', async () => {
    const res = await request(app).get('/api/orders');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('orders');
  });

  test('GET /orders/:id - returns order by ID', async () => {
    await addToCart(4, 1);
    const place = await request(app).post('/api/orders').send({ userId: 2, address: '5 Park Ave' });
    const id = place.body.order.id;

    const res = await request(app).get(`/api/orders/${id}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(id);
  });

  test('GET /orders/:id - 404 for unknown order', async () => {
    const res = await request(app).get('/api/orders/99999');
    expect(res.status).toBe(404);
  });

  test('PUT /orders/:id/cancel - cancels a placed order', async () => {
    await addToCart(3, 1);
    const place = await request(app).post('/api/orders').send({ userId: 3, address: '7 Hill Rd' });
    const id = place.body.order.id;

    const res = await request(app).put(`/api/orders/${id}/cancel`);
    expect(res.status).toBe(200);
    expect(res.body.order.status).toBe('cancelled');
  });

  test('PUT /orders/:id/cancel - 400 when already cancelled', async () => {
    await addToCart(3, 1);
    const place = await request(app).post('/api/orders').send({ userId: 3, address: '7 Hill Rd' });
    const id = place.body.order.id;
    await request(app).put(`/api/orders/${id}/cancel`);

    const res = await request(app).put(`/api/orders/${id}/cancel`);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/already cancelled/i);
  });
});
