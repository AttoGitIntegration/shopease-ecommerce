const request = require('supertest');
const app = require('../../src/app');

describe('Add to Cart API', () => {
  beforeEach(async () => {
    await request(app).delete('/api/cart/clear');
  });

  test('POST /cart/add - adds a new item to cart', async () => {
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Item added');
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0]).toMatchObject({
      productId: 1,
      name: 'Wireless Headphones',
      price: 2999,
      quantity: 1,
    });
    expect(res.body.cart.total).toBe(2999);
  });

  test('POST /cart/add - increments quantity for existing item', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 });
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 3 });
    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(1);
    expect(res.body.cart.items[0].quantity).toBe(4);
    expect(res.body.cart.total).toBe(2999 * 4);
  });

  test('POST /cart/add - adds multiple different items', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 });
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 2, name: 'Running Shoes', price: 4999, quantity: 2 });
    expect(res.status).toBe(200);
    expect(res.body.cart.items).toHaveLength(2);
    expect(res.body.cart.total).toBe(2999 + 4999 * 2);
  });

  test('POST /cart/add - defaults quantity to 1 when not provided', async () => {
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999 });
    expect(res.status).toBe(200);
    expect(res.body.cart.items[0].quantity).toBe(1);
  });

  test('POST /cart/add - cart total recalculates correctly', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 2 });
    const res = await request(app).post('/api/cart/add')
      .send({ productId: 2, name: 'Running Shoes', price: 4999, quantity: 1 });
    expect(res.body.cart.total).toBe(2999 * 2 + 4999);
  });

  test('GET /cart - reflects added items', async () => {
    await request(app).post('/api/cart/add')
      .send({ productId: 1, name: 'Wireless Headphones', price: 2999, quantity: 1 });
    const res = await request(app).get('/api/cart');
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].productId).toBe(1);
  });
});
