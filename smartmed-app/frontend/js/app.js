function $(sel) { return document.querySelector(sel); }
function $$(sel) { return Array.from(document.querySelectorAll(sel)); }
function rupee(amount) { return `₹${Number(amount).toFixed(2)}`; }

function toast(message, isError = false) {
  const el = $('#toast');
  el.textContent = message;
  el.classList.toggle('error', isError);
  el.classList.remove('hidden');
  clearTimeout(toast._t);
  toast._t = setTimeout(() => el.classList.add('hidden'), 2400);
}

/* ----------- View switching ----------- */
function switchView(view) {
  state.view = view;
  $$('.view').forEach((v) => v.classList.add('hidden'));
  $(`#view-${view}`).classList.remove('hidden');
  $$('.nav-link').forEach((l) => l.classList.toggle('active', l.dataset.view === view));

  if (view === 'medicines') renderMedicines();
  if (view === 'cart') loadCart();
  if (view === 'orders') loadOrders();
}

/* ----------- Auth UI ----------- */
function renderUserArea() {
  const area = $('#user-area');
  if (state.user) {
    area.innerHTML = `
      <span class="user-greeting">Hi, ${state.user.name.split(' ')[0]}</span>
      <button class="btn-secondary" id="logout-btn">Logout</button>
    `;
    $('#logout-btn').addEventListener('click', () => {
      logout();
      renderUserArea();
      switchView('medicines');
      updateCartBadge(0);
      toast('Logged out');
    });
  } else {
    area.innerHTML = `
      <button class="btn-secondary" id="open-login">Login</button>
      <button class="btn-primary" id="open-register">Sign up</button>
    `;
    $('#open-login').addEventListener('click', () => openAuth('login'));
    $('#open-register').addEventListener('click', () => openAuth('register'));
  }
}

function openAuth(tab) {
  $('#auth-modal').classList.remove('hidden');
  switchAuthTab(tab);
}

function switchAuthTab(tab) {
  $$('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === tab));
  $('#login-form').classList.toggle('hidden', tab !== 'login');
  $('#register-form').classList.toggle('hidden', tab !== 'register');
  $('#login-error').textContent = '';
  $('#register-error').textContent = '';
}

async function onLogin(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const { token, user } = await api.login({
      email: fd.get('email'),
      password: fd.get('password'),
    });
    localStorage.setItem('smartmed_token', token);
    setUser(user);
    $('#auth-modal').classList.add('hidden');
    e.target.reset();
    renderUserArea();
    toast(`Welcome back, ${user.name}!`);
    loadCart();
  } catch (err) {
    $('#login-error').textContent = err.message;
  }
}

async function onRegister(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const { token, user } = await api.register({
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      password: fd.get('password'),
    });
    localStorage.setItem('smartmed_token', token);
    setUser(user);
    $('#auth-modal').classList.add('hidden');
    e.target.reset();
    renderUserArea();
    toast('Account created. Welcome!');
  } catch (err) {
    $('#register-error').textContent = err.message;
  }
}

/* ----------- Medicines ----------- */
async function loadMedicines() {
  try {
    const { items } = await api.listMedicines();
    state.medicines = items;
    const categories = await api.categories();
    state.categories = categories;
    const select = $('#category-filter');
    select.innerHTML = '<option value="">All categories</option>' +
      categories.map((c) => `<option value="${c}">${c}</option>`).join('');
    renderMedicines();
  } catch (err) {
    toast(`Failed to load medicines: ${err.message}`, true);
  }
}

function renderMedicines() {
  const { q, category, otcOnly } = state.filters;
  let list = state.medicines;
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter((m) =>
      m.name.toLowerCase().includes(needle) ||
      m.description.toLowerCase().includes(needle) ||
      m.manufacturer.toLowerCase().includes(needle)
    );
  }
  if (category) list = list.filter((m) => m.category === category);
  if (otcOnly) list = list.filter((m) => !m.prescriptionRequired);

  const grid = $('#medicine-grid');
  if (list.length === 0) {
    grid.innerHTML = '<div class="empty">No medicines match your filters.</div>';
    return;
  }

  grid.innerHTML = list.map((m) => {
    const stockClass = m.stock === 0 ? 'out' : m.stock < 20 ? 'low' : '';
    const stockText = m.stock === 0 ? 'Out of stock' : m.stock < 20 ? `Only ${m.stock} left` : 'In stock';
    return `
      <div class="card">
        <img src="${m.image}" alt="${m.name}" />
        <span class="category">${m.category}</span>
        ${m.prescriptionRequired ? '<span class="rx-badge">Rx</span>' : ''}
        <h3>${m.name}</h3>
        <div class="manufacturer">${m.manufacturer}</div>
        <div class="price">${rupee(m.price)}</div>
        <div class="stock ${stockClass}">${stockText}</div>
        <button class="btn-primary" data-add="${m.id}" ${m.stock === 0 ? 'disabled' : ''}>
          Add to Cart
        </button>
      </div>
    `;
  }).join('');

  grid.querySelectorAll('[data-add]').forEach((btn) => {
    btn.addEventListener('click', () => addToCart(btn.dataset.add));
  });
}

async function addToCart(medicineId) {
  if (!isAuthed()) {
    openAuth('login');
    toast('Please login to add items to your cart', true);
    return;
  }
  try {
    const cart = await api.addToCart(medicineId, 1);
    state.cart = cart;
    updateCartBadge(cart.items.reduce((s, i) => s + i.quantity, 0));
    toast('Added to cart');
  } catch (err) {
    toast(err.message, true);
  }
}

function updateCartBadge(n) { $('#cart-badge').textContent = n; }

/* ----------- Cart ----------- */
async function loadCart() {
  if (!isAuthed()) {
    $('#cart-contents').innerHTML = '<div class="empty">Please log in to see your cart.</div>';
    $('#cart-summary').classList.add('hidden');
    updateCartBadge(0);
    return;
  }
  try {
    const cart = await api.getCart();
    state.cart = cart;
    renderCart();
  } catch (err) {
    toast(err.message, true);
  }
}

function renderCart() {
  const c = state.cart;
  const contents = $('#cart-contents');
  if (c.items.length === 0) {
    contents.innerHTML = '<div class="empty">Your cart is empty.</div>';
    $('#cart-summary').classList.add('hidden');
    updateCartBadge(0);
    return;
  }

  contents.innerHTML = c.items.map((line) => `
    <div class="cart-item">
      <img src="${line.image}" alt="${line.name}" />
      <div>
        <strong>${line.name}</strong>
        ${line.prescriptionRequired ? '<span class="rx-badge">Rx</span>' : ''}
        <div class="muted">${rupee(line.price)} each</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" data-dec="${line.medicineId}">-</button>
        <span>${line.quantity}</span>
        <button class="qty-btn" data-inc="${line.medicineId}">+</button>
      </div>
      <div>
        <strong>${rupee(line.subtotal)}</strong>
        <button class="remove-btn" data-remove="${line.medicineId}">Remove</button>
      </div>
    </div>
  `).join('');

  $('#cart-subtotal').textContent = rupee(c.subtotal);
  $('#cart-shipping').textContent = c.shipping === 0 ? 'Free' : rupee(c.shipping);
  $('#cart-total').textContent = rupee(c.total);
  $('#rx-warning').classList.toggle('hidden', !c.needsPrescription);
  $('#cart-summary').classList.remove('hidden');

  updateCartBadge(c.items.reduce((s, i) => s + i.quantity, 0));

  contents.querySelectorAll('[data-inc]').forEach((b) =>
    b.addEventListener('click', () => changeQty(b.dataset.inc, +1))
  );
  contents.querySelectorAll('[data-dec]').forEach((b) =>
    b.addEventListener('click', () => changeQty(b.dataset.dec, -1))
  );
  contents.querySelectorAll('[data-remove]').forEach((b) =>
    b.addEventListener('click', () => removeItem(b.dataset.remove))
  );
}

async function changeQty(medicineId, delta) {
  const line = state.cart.items.find((l) => l.medicineId === medicineId);
  if (!line) return;
  const newQty = line.quantity + delta;
  if (newQty < 1) return removeItem(medicineId);
  try {
    state.cart = await api.updateCart(medicineId, newQty);
    renderCart();
  } catch (err) {
    toast(err.message, true);
  }
}

async function removeItem(medicineId) {
  try {
    state.cart = await api.removeFromCart(medicineId);
    renderCart();
    toast('Item removed');
  } catch (err) {
    toast(err.message, true);
  }
}

/* ----------- Checkout ----------- */
async function openCheckout() {
  if (state.cart.items.length === 0) return toast('Cart is empty', true);
  try {
    const profile = await api.me();
    state.user = profile;
    renderAddresses(profile.addresses);
    $('#rx-section').style.display = state.cart.needsPrescription ? '' : 'none';
    $('#rx-status').textContent = state.prescriptionId
      ? `Prescription ${state.prescriptionId} attached.`
      : '';
    renderCheckoutSummary();
    $('#checkout-modal').classList.remove('hidden');
  } catch (err) {
    toast(err.message, true);
  }
}

function renderAddresses(addresses) {
  const container = $('#address-list');
  if (!addresses || addresses.length === 0) {
    container.innerHTML = '<p class="muted">No saved addresses. Add one below.</p>';
    return;
  }
  container.innerHTML = addresses.map((a) => `
    <div class="address-card ${a.id === state.selectedAddressId ? 'selected' : ''}" data-addr="${a.id}">
      <input type="radio" name="address" value="${a.id}" ${a.id === state.selectedAddressId ? 'checked' : ''} />
      <div>
        <div class="label">${a.label}</div>
        <div>${a.line1}, ${a.city}, ${a.state} - ${a.pincode}</div>
      </div>
    </div>
  `).join('');

  container.querySelectorAll('[data-addr]').forEach((card) => {
    card.addEventListener('click', () => {
      state.selectedAddressId = card.dataset.addr;
      renderAddresses(state.user.addresses);
    });
  });

  if (!state.selectedAddressId && addresses[0]) {
    state.selectedAddressId = addresses[0].id;
    renderAddresses(addresses);
  }
}

function renderCheckoutSummary() {
  const c = state.cart;
  $('#checkout-summary').innerHTML = `
    ${c.items.map((l) => `
      <div class="summary-row">
        <span>${l.name} × ${l.quantity}</span>
        <span>${rupee(l.subtotal)}</span>
      </div>
    `).join('')}
    <div class="summary-row"><span>Shipping</span><span>${c.shipping === 0 ? 'Free' : rupee(c.shipping)}</span></div>
    <div class="summary-row total"><span>Total</span><span>${rupee(c.total)}</span></div>
  `;
}

async function onAddressSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const addr = await api.addAddress({
      label: fd.get('label'),
      line1: fd.get('line1'),
      city: fd.get('city'),
      state: fd.get('state'),
      pincode: fd.get('pincode'),
    });
    state.user.addresses.push(addr);
    state.selectedAddressId = addr.id;
    renderAddresses(state.user.addresses);
    e.target.reset();
    toast('Address saved');
  } catch (err) {
    toast(err.message, true);
  }
}

async function onPrescriptionSubmit(e) {
  e.preventDefault();
  const fd = new FormData(e.target);
  try {
    const rx = await api.uploadPrescription({
      fileName: fd.get('fileName'),
      notes: fd.get('notes'),
    });
    state.prescriptionId = rx.id;
    $('#rx-status').textContent = `Prescription ${rx.id} attached and verified.`;
    e.target.reset();
    toast('Prescription uploaded');
  } catch (err) {
    toast(err.message, true);
  }
}

async function onPlaceOrder() {
  $('#order-error').textContent = '';
  if (!state.selectedAddressId) {
    return ($('#order-error').textContent = 'Please select a delivery address');
  }
  const payment = document.querySelector('input[name="payment"]:checked').value;

  try {
    const order = await api.placeOrder({
      addressId: state.selectedAddressId,
      paymentMethod: payment,
      prescriptionId: state.prescriptionId,
    });
    $('#checkout-modal').classList.add('hidden');
    state.cart = { items: [], subtotal: 0, shipping: 0, total: 0, needsPrescription: false };
    state.prescriptionId = null;
    updateCartBadge(0);

    $('#confirm-text').textContent =
      `Order ${order.id} has been placed successfully. Total ${rupee(order.total)}.`;
    $('#confirm-modal').classList.remove('hidden');
  } catch (err) {
    $('#order-error').textContent = err.message;
  }
}

/* ----------- Orders ----------- */
async function loadOrders() {
  if (!isAuthed()) {
    $('#orders-list').innerHTML = '<div class="empty">Please log in to see your orders.</div>';
    return;
  }
  try {
    const { items } = await api.listOrders();
    state.orders = items;
    renderOrders();
  } catch (err) {
    toast(err.message, true);
  }
}

function renderOrders() {
  const list = $('#orders-list');
  if (state.orders.length === 0) {
    list.innerHTML = '<div class="empty">You have no orders yet.</div>';
    return;
  }
  list.innerHTML = state.orders.map((o) => `
    <div class="order-card">
      <div class="order-header">
        <div>
          <span class="order-id">${o.id}</span>
          <span class="order-date">· ${new Date(o.placedAt).toLocaleString()}</span>
        </div>
        <span class="order-status ${o.status}">${o.status}</span>
      </div>
      <div class="order-items">
        ${o.items.map((l) => `${l.name} × ${l.quantity}`).join(', ')}
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="order-total">${rupee(o.total)}</span>
        ${['PLACED'].includes(o.status)
          ? `<button class="btn-secondary" data-cancel="${o.id}">Cancel</button>`
          : ''}
      </div>
    </div>
  `).join('');

  list.querySelectorAll('[data-cancel]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      try {
        await api.cancelOrder(btn.dataset.cancel);
        toast('Order cancelled');
        loadOrders();
      } catch (err) {
        toast(err.message, true);
      }
    });
  });
}

/* ----------- Boot ----------- */
function bindEvents() {
  $$('.nav-link').forEach((l) =>
    l.addEventListener('click', (e) => {
      e.preventDefault();
      switchView(l.dataset.view);
    })
  );

  $('#search-input').addEventListener('input', (e) => {
    state.filters.q = e.target.value;
    renderMedicines();
  });
  $('#category-filter').addEventListener('change', (e) => {
    state.filters.category = e.target.value;
    renderMedicines();
  });
  $('#otc-only').addEventListener('change', (e) => {
    state.filters.otcOnly = e.target.checked;
    renderMedicines();
  });

  if ($('#open-login')) $('#open-login').addEventListener('click', () => openAuth('login'));
  if ($('#open-register')) $('#open-register').addEventListener('click', () => openAuth('register'));

  $$('.tab').forEach((t) => t.addEventListener('click', () => switchAuthTab(t.dataset.tab)));
  $('#login-form').addEventListener('submit', onLogin);
  $('#register-form').addEventListener('submit', onRegister);

  $$('[data-close]').forEach((b) =>
    b.addEventListener('click', () => b.closest('.modal').classList.add('hidden'))
  );
  $$('.modal').forEach((m) =>
    m.addEventListener('click', (e) => { if (e.target === m) m.classList.add('hidden'); })
  );

  $('#checkout-btn').addEventListener('click', openCheckout);
  $('#address-form').addEventListener('submit', onAddressSubmit);
  $('#rx-form').addEventListener('submit', onPrescriptionSubmit);
  $('#place-order-btn').addEventListener('click', onPlaceOrder);
}

async function init() {
  loadUserFromStorage();
  renderUserArea();
  bindEvents();
  await loadMedicines();
  if (isAuthed()) {
    try {
      const cart = await api.getCart();
      state.cart = cart;
      updateCartBadge(cart.items.reduce((s, i) => s + i.quantity, 0));
    } catch {}
  }
}

document.addEventListener('DOMContentLoaded', init);
