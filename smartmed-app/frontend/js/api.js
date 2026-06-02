const API_BASE = (window.location.origin && window.location.port !== '5500')
  ? `${window.location.origin}/api`
  : 'http://localhost:4000/api';

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  const token = localStorage.getItem('smartmed_token');
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const err = new Error((data && data.error) || `HTTP ${res.status}`);
    err.status = res.status;
    err.payload = data;
    throw err;
  }
  return data;
}

const api = {
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request('/auth/me'),
  addAddress: (body) => request('/auth/addresses', { method: 'POST', body: JSON.stringify(body) }),

  listMedicines: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/medicines${q ? `?${q}` : ''}`);
  },
  categories: () => request('/medicines/categories'),

  getCart: () => request('/cart'),
  addToCart: (medicineId, quantity = 1) =>
    request('/cart/items', { method: 'POST', body: JSON.stringify({ medicineId, quantity }) }),
  updateCart: (medicineId, quantity) =>
    request(`/cart/items/${medicineId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) }),
  removeFromCart: (medicineId) =>
    request(`/cart/items/${medicineId}`, { method: 'DELETE' }),

  placeOrder: (body) => request('/orders', { method: 'POST', body: JSON.stringify(body) }),
  listOrders: () => request('/orders'),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST' }),
  uploadPrescription: (body) => request('/orders/prescriptions', { method: 'POST', body: JSON.stringify(body) }),
};

window.api = api;
