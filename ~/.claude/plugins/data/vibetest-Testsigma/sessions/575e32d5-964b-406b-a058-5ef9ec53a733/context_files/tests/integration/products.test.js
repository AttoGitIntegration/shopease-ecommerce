{
  "type": "text",
  "file": {
    "filePath": "/Users/mohan.manjappa/Documents/GitHub/shopease-ecommerce/tests/integration/products.test.js",
    "content": "const request = require('supertest');\nconst app = require('../../src/app');\ndescribe('Products API', () => {\n  test('GET /products - returns all', async () => {\n    const res = await request(app).get('/api/products');\n    expect(res.status).toBe(200);\n    expect(res.body.products.length).toBeGreaterThan(0);\n  });\n  test('GET /products/:id - valid ID', async () => {\n    const res = await request(app).get('/api/products/1');\n    expect(res.status).toBe(200);\n    expect(res.body).toHaveProperty('name');\n  });\n  test('GET /products/:id - invalid ID returns 404', async () => {\n    const res = await request(app).get('/api/products/999');\n    expect(res.status).toBe(404);\n  });\n  test('GET /products/search?q=shoes', async () => {\n    const res = await request(app).get('/api/products/search?q=shoes');\n    expect(res.status).toBe(200);\n    expect(res.body.results.length).toBeGreaterThan(0);\n  });\n  test('GET /products/search?q=shirts', async () => {\n    const res = await request(app).get('/api/products/search?q=shirts');\n    expect(res.status).toBe(200);\n    expect(res.body.results.length).toBeGreaterThan(0);\n  });\n});",
    "numLines": 28,
    "startLine": 1,
    "totalLines": 28
  }
}