const state = {
  user: null,
  medicines: [],
  filteredMedicines: [],
  categories: [],
  filters: { q: '', category: '', otcOnly: false },
  cart: { items: [], subtotal: 0, shipping: 0, total: 0, needsPrescription: false },
  orders: [],
  selectedAddressId: null,
  prescriptionId: null,
  view: 'medicines',
};

function setUser(user) {
  state.user = user;
  if (user) localStorage.setItem('smartmed_user', JSON.stringify(user));
  else localStorage.removeItem('smartmed_user');
}

function loadUserFromStorage() {
  const raw = localStorage.getItem('smartmed_user');
  if (raw) {
    try { state.user = JSON.parse(raw); } catch { state.user = null; }
  }
}

function isAuthed() { return !!localStorage.getItem('smartmed_token'); }

function logout() {
  localStorage.removeItem('smartmed_token');
  localStorage.removeItem('smartmed_user');
  state.user = null;
  state.cart = { items: [], subtotal: 0, shipping: 0, total: 0, needsPrescription: false };
  state.orders = [];
}

window.state = state;
window.setUser = setUser;
window.loadUserFromStorage = loadUserFromStorage;
window.isAuthed = isAuthed;
window.logout = logout;
