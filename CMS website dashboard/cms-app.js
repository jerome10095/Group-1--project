// ═══════════════════════════════════════════════════════════
//  IREME CREATIONS CMS — Application Logic
// ═══════════════════════════════════════════════════════════

// ── Pagination state ─────────────────────────────────────
const PAGE_SIZE = 10;
let state = { orders: 1, products: 1, customers: 1 };

// ── Chart instances (kept for destroy/recreate) ──────────
let revenueChartInst, categoryChartInst, statusChartInst, topProdChartInst;

// ═══════════════════════════════════════
//  BOOT
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  CMS_DB.seed();

  // Sidebar navigation
  document.querySelectorAll('.nav-link[data-page]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigate(link.dataset.page);
    });
  });

  // Global search
  document.getElementById('globalSearch').addEventListener('input', function() {
    const v = this.value.toLowerCase().trim();
    if (!v) return;
    // Search across orders + products
    const orderMatch = CMS_DB.getOrders().find(o =>
      o.customer.toLowerCase().includes(v) || o.id.toLowerCase().includes(v));
    const prodMatch  = CMS_DB.getProducts().find(p => p.name.toLowerCase().includes(v));
    if (orderMatch)  { navigate('orders');   setTimeout(() => { document.getElementById('orderSearch').value = v; renderOrdersTable(); }, 100); }
    else if (prodMatch) { navigate('products'); setTimeout(() => { document.getElementById('prodSearch').value = v; renderProductsTable(); }, 100); }
  });

  // Sidebar toggle (mobile)
  const tog = document.getElementById('sidebarToggle');
  if (window.innerWidth <= 768) tog.style.display = 'flex';
  tog.addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));

  navigate('dashboard');
});

// ═══════════════════════════════════════
//  NAVIGATION
// ═══════════════════════════════════════
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');

  const link = document.querySelector(`.nav-link[data-page="${page}"]`);
  if (link) link.classList.add('active');

  const titles = {
    dashboard: ['Dashboard', 'Overview & Stats'],
    orders:    ['Orders',    'Manage all orders'],
    products:  ['Products',  'Manage inventory'],
    customers: ['Customers', 'Customer database'],
    analytics: ['Analytics', 'Reports & insights'],
    settings:  ['Settings',  'Store configuration'],
  };
  const [t, s] = titles[page] || ['', ''];
  document.getElementById('topbarTitle').textContent  = t;
  document.getElementById('topbarCrumb').textContent  = `Ireme Creations / ${t}`;

  // Render page content
  const renderers = {
    dashboard: renderDashboard,
    orders:    renderOrdersTable,
    products:  renderProductsTable,
    customers: renderCustomersTable,
    analytics: renderAnalytics,
  };
  if (renderers[page]) renderers[page]();

  // Update pending badge
  const pending = CMS_DB.getOrders().filter(o => o.status === 'pending').length;
  const badge = document.getElementById('pendingBadge');
  if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? '' : 'none'; }
}

function refreshAll() {
  navigate(document.querySelector('.nav-link.active')?.dataset.page || 'dashboard');
  showToast('Data refreshed', 'info');
}

// ═══════════════════════════════════════
//  DASHBOARD
// ═══════════════════════════════════════
function renderDashboard() {
  const s = CMS_DB.getStats();

  // Stat cards
  const cards = [
    { label:'Total Revenue', value:'$' + s.revenue.toFixed(2), icon:'💰', color:'gold',   trend:'+12%', up:true },
    { label:'Total Orders',  value:s.orders,                   icon:'📦', color:'blue',   trend:'+8%',  up:true },
    { label:'Customers',     value:s.customers,                icon:'👥', color:'green',  trend:'+5%',  up:true },
    { label:'Products',      value:s.products,                 icon:'🛍️', color:'orange', trend:'',     up:true },
    { label:'Pending Orders',value:s.pending,                  icon:'⏳', color:'red',    trend:'',     up:false },
  ];
  document.getElementById('statsGrid').innerHTML = cards.map(c => `
    <div class="stat-card ${c.color}">
      <div class="stat-icon">${c.icon}</div>
      <div class="stat-value">${c.value}</div>
      <div class="stat-label">${c.label}</div>
      ${c.trend ? `<div class="stat-trend ${c.up?'up':'down'}">${c.trend}</div>` : ''}
    </div>`).join('');

  // Revenue chart
  const monthly = CMS_DB.getMonthlyRevenue();
  const mLabels = Object.keys(monthly);
  const mData   = Object.values(monthly).map(v => +v.toFixed(2));

  if (revenueChartInst) revenueChartInst.destroy();
  revenueChartInst = new Chart(document.getElementById('revenueChart'), {
    type: 'bar',
    data: {
      labels: mLabels,
      datasets: [{
        label: 'Revenue ($)',
        data: mData,
        backgroundColor: 'rgba(212,168,67,0.22)',
        borderColor: '#d4a843',
        borderWidth: 2,
        borderRadius: 7,
        hoverBackgroundColor: 'rgba(212,168,67,0.42)',
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888' } },
        y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#888', callback: v => '$' + v } },
      }
    }
  });

  // Category donut
  const catRev = CMS_DB.getCategoryRevenue();
  const catColors = { keychains:'#d4a843', 'wall-art':'#3b82f6', decor:'#22c55e', clothing:'#f97316' };
  if (categoryChartInst) categoryChartInst.destroy();
  categoryChartInst = new Chart(document.getElementById('categoryChart'), {
    type: 'doughnut',
    data: {
      labels: Object.keys(catRev).map(k => k.charAt(0).toUpperCase() + k.slice(1)),
      datasets: [{
        data: Object.values(catRev).map(v => +v.toFixed(2)),
        backgroundColor: Object.keys(catRev).map(k => catColors[k] || '#888'),
        borderWidth: 0, hoverOffset: 8,
      }]
    },
    options: {
      responsive: true, cutout: '68%',
      plugins: { legend: { position: 'bottom', labels: { color: '#999', padding: 14, font: { size: 12 } } } }
    }
  });

  // Recent orders
  const recent = CMS_DB.getOrders().slice(0, 6);
  document.getElementById('recentOrders').innerHTML = recent.map(o => `
    <div class="order-mini">
      <div style="width:34px;height:34px;border-radius:8px;background:rgba(212,168,67,0.1);
        display:flex;align-items:center;justify-content:center;font-size:16px">📦</div>
      <div class="order-mini-info">
        <div class="order-mini-name">${o.customer}</div>
        <div class="order-mini-id">${o.id} · ${fmtDate(o.date)}</div>
      </div>
      <span class="badge badge-${o.status}">${o.status}</span>
      <div class="order-mini-amt">$${o.total.toFixed(2)}</div>
    </div>`).join('');

  // Low stock
  const lowStock = CMS_DB.getProducts().filter(p => p.stock <= 10).sort((a,b) => a.stock - b.stock);
  document.getElementById('lowStockList').innerHTML = lowStock.length === 0
    ? '<div class="empty-state"><p>All products well-stocked ✅</p></div>'
    : lowStock.map(p => `
    <div class="order-mini">
      <div style="width:34px;height:34px;border-radius:8px;background:#181818;
        display:flex;align-items:center;justify-content:center;font-size:16px">🛍️</div>
      <div class="order-mini-info">
        <div class="order-mini-name">${p.name}</div>
        <div class="order-mini-id">${p.category}</div>
      </div>
      <span class="badge badge-${p.stock <= 3 ? 'cancelled' : 'pending'}">${p.stock} left</span>
    </div>`).join('');
}

// ═══════════════════════════════════════
//  ORDERS TABLE
// ═══════════════════════════════════════
function renderOrdersTable() {
  const search    = (document.getElementById('orderSearch')?.value || '').toLowerCase();
  const statusF   = document.getElementById('orderStatusFilter')?.value || '';
  let   orders    = CMS_DB.getOrders();

  if (search)  orders = orders.filter(o =>
    o.customer.toLowerCase().includes(search) ||
    o.id.toLowerCase().includes(search) ||
    o.address.toLowerCase().includes(search));
  if (statusF) orders = orders.filter(o => o.status === statusF);

  const total = orders.length;
  const start = (state.orders - 1) * PAGE_SIZE;
  const page  = orders.slice(start, start + PAGE_SIZE);

  document.getElementById('ordersTbody').innerHTML = page.length === 0
    ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">📭</div><p>No orders found</p></div></td></tr>`
    : page.map(o => `
    <tr>
      <td><strong style="color:var(--gold)">${o.id}</strong></td>
      <td>
        <div style="font-weight:600">${o.customer}</div>
        <div style="font-size:11px;color:var(--muted)">${o.phone}</div>
      </td>
      <td>${o.items.map(i => `${i.name} ×${i.qty}`).join(', ')}</td>
      <td><strong>$${o.total.toFixed(2)}</strong></td>
      <td>
        <select class="filter-select" style="padding:4px 8px;font-size:12px"
          onchange="updateStatus('${o.id}',this.value)">
          ${['pending','processing','shipped','delivered','cancelled'].map(s =>
            `<option value="${s}" ${s===o.status?'selected':''}>${s.charAt(0).toUpperCase()+s.slice(1)}</option>`
          ).join('')}
        </select>
      </td>
      <td style="color:var(--muted);font-size:12px">${fmtDate(o.date)}</td>
      <td>
        <div class="act-group">
          <button class="btn btn-ghost btn-sm" onclick="showOrderDetail('${o.id}')">👁 View</button>
          <button class="btn btn-ghost btn-sm" onclick="sendWhatsApp('${o.id}')">📲 WA</button>
        </div>
      </td>
    </tr>`).join('');

  renderPagination('ordersPag', total, state.orders, p => { state.orders = p; renderOrdersTable(); });
}

function updateStatus(id, status) {
  CMS_DB.updateOrderStatus(id, status);
  showToast(`Order ${id} → ${status}`, 'success');
  // Update pending badge
  const pending = CMS_DB.getOrders().filter(o => o.status === 'pending').length;
  const badge = document.getElementById('pendingBadge');
  if (badge) { badge.textContent = pending; badge.style.display = pending > 0 ? '' : 'none'; }
}

function showOrderDetail(id) {
  const o = CMS_DB.getOrders().find(x => x.id === id);
  if (!o) return;
  document.getElementById('orderDetailContent').innerHTML = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px">
      <div class="form-group"><label>Order ID</label><input readonly value="${o.id}" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);width:100%"></div>
      <div class="form-group"><label>Date</label><input readonly value="${fmtDate(o.date)}" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);width:100%"></div>
      <div class="form-group"><label>Customer</label><input readonly value="${o.customer}" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);width:100%"></div>
      <div class="form-group"><label>Phone</label><input readonly value="${o.phone}" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);width:100%"></div>
      <div class="form-group" style="grid-column:1/-1"><label>Delivery Address</label><input readonly value="${o.address}" style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:8px 12px;font-size:13px;color:var(--text);width:100%"></div>
    </div>
    <div class="table-card" style="margin-bottom:16px">
      <table>
        <thead><tr><th>Item</th><th>Qty</th><th>Unit</th><th>Total</th></tr></thead>
        <tbody>
          ${o.items.map(i => `<tr><td>${i.name}</td><td>${i.qty}</td><td>$${i.price.toFixed(2)}</td><td>$${(i.price*i.qty).toFixed(2)}</td></tr>`).join('')}
          <tr style="border-top:1px solid var(--border)">
            <td colspan="3"><strong>Shipping</strong></td><td>${o.ship === 0 ? '🎉 Free' : '$'+o.ship.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="3"><strong style="color:var(--gold)">TOTAL</strong></td>
            <td><strong style="color:var(--gold)">$${o.total.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div style="display:flex;align-items:center;gap:10px">
      <label style="font-size:12px;color:var(--muted);font-weight:600">STATUS:</label>
      <span class="badge badge-${o.status}">${o.status}</span>
    </div>`;
  openModal('orderModal');
}

function sendWhatsApp(id) {
  const o = CMS_DB.getOrders().find(x => x.id === id);
  if (!o) return;
  const lines = o.items.map(i => `• ${i.name} ×${i.qty} = $${(i.price*i.qty).toFixed(2)}`).join('\n');
  const msg = `📦 *Order Update — ${o.id}*\nCustomer: ${o.customer}\nStatus: ${o.status.toUpperCase()}\n\n${lines}\n\nTotal: $${o.total.toFixed(2)}\n\n_Ireme Creations_`;
  window.open(`https://wa.me/${o.phone.replace(/\D/g,'')}?text=${encodeURIComponent(msg)}`, '_blank');
}

function exportOrders() {
  const orders = CMS_DB.getOrders();
  const rows   = [['ID','Customer','Phone','Address','Items','Total','Status','Date']];
  orders.forEach(o => rows.push([
    o.id, o.customer, o.phone, o.address,
    o.items.map(i=>`${i.name}x${i.qty}`).join('; '),
    '$'+o.total.toFixed(2), o.status, fmtDate(o.date)
  ]));
  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = `ireme_orders_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  showToast('Orders exported as CSV', 'success');
}

// ═══════════════════════════════════════
//  PRODUCTS TABLE
// ═══════════════════════════════════════
function renderProductsTable() {
  const search = (document.getElementById('prodSearch')?.value || '').toLowerCase();
  const catF   = document.getElementById('prodCatFilter')?.value || '';
  let   prods  = CMS_DB.getProducts();

  if (search) prods = prods.filter(p => p.name.toLowerCase().includes(search));
  if (catF)   prods = prods.filter(p => p.category === catF);

  const total = prods.length;
  const start = (state.products - 1) * PAGE_SIZE;
  const page  = prods.slice(start, start + PAGE_SIZE);

  document.getElementById('productsTbody').innerHTML = page.length === 0
    ? `<tr><td colspan="7"><div class="empty-state"><div class="empty-icon">🛍️</div><p>No products found</p></div></td></tr>`
    : page.map(p => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:12px">
          <div style="width:42px;height:42px;border-radius:8px;background:rgba(212,168,67,0.08);
            display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0">🛍️</div>
          <div>
            <div style="font-weight:600;font-size:13px">${p.name}</div>
            <div style="font-size:11px;color:var(--muted)">${p.id}</div>
          </div>
        </div>
      </td>
      <td><span style="font-size:12px;color:var(--muted)">${p.category}</span></td>
      <td><strong style="color:var(--gold)">$${p.price.toFixed(2)}</strong></td>
      <td>
        <span style="font-weight:600;color:${p.stock <= 5 ? 'var(--red)' : p.stock <= 15 ? 'var(--orange)' : 'var(--green)'}">
          ${p.stock}
        </span>
      </td>
      <td>${p.sales || 0}</td>
      <td><span class="badge badge-${p.status}">${p.status}</span></td>
      <td>
        <div class="act-group">
          <button class="btn btn-ghost btn-sm" onclick="openProductModal('${p.id}')">✏️</button>
          <button class="btn btn-danger btn-sm" onclick="deleteProduct('${p.id}')">🗑</button>
        </div>
      </td>
    </tr>`).join('');

  renderPagination('productsPag', total, state.products, p => { state.products = p; renderProductsTable(); });
}

function openProductModal(id) {
  const el = document.getElementById('productModal');
  if (id) {
    const p = CMS_DB.getProducts().find(x => x.id === id);
    if (!p) return;
    document.getElementById('productModalTitle').textContent = 'Edit Product';
    document.getElementById('prodId').value     = p.id;
    document.getElementById('prodName').value   = p.name;
    document.getElementById('prodPrice').value  = p.price;
    document.getElementById('prodCat').value    = p.category;
    document.getElementById('prodStock').value  = p.stock;
    document.getElementById('prodImg').value    = p.img || '';
    document.getElementById('prodStatus').value = p.status;
    document.getElementById('prodSales').value  = p.sales || 0;
  } else {
    document.getElementById('productModalTitle').textContent = 'Add Product';
    ['prodId','prodName','prodPrice','prodStock','prodImg','prodSales'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('prodCat').value    = 'keychains';
    document.getElementById('prodStatus').value = 'active';
  }
  openModal('productModal');
}

function saveProduct() {
  const name  = document.getElementById('prodName').value.trim();
  const price = parseFloat(document.getElementById('prodPrice').value);
  const stock = parseInt(document.getElementById('prodStock').value);
  if (!name || isNaN(price) || isNaN(stock)) { showToast('Fill all required fields', 'error'); return; }

  const p = {
    id:       document.getElementById('prodId').value || '',
    name, price, stock,
    category: document.getElementById('prodCat').value,
    img:      document.getElementById('prodImg').value,
    status:   document.getElementById('prodStatus').value,
    sales:    parseInt(document.getElementById('prodSales').value) || 0,
  };
  CMS_DB.saveProduct(p);
  closeModal('productModal');
  renderProductsTable();
  showToast(`Product "${name}" saved!`, 'success');
}

function deleteProduct(id) {
  if (!confirm('Delete this product? This cannot be undone.')) return;
  CMS_DB.deleteProduct(id);
  renderProductsTable();
  showToast('Product deleted', 'info');
}

// ═══════════════════════════════════════
//  CUSTOMERS TABLE
// ═══════════════════════════════════════
function renderCustomersTable() {
  const search  = (document.getElementById('custSearch')?.value || '').toLowerCase();
  const statusF = document.getElementById('custStatusFilter')?.value || '';
  let   custs   = CMS_DB.getCustomers();

  if (search)  custs = custs.filter(c => c.name.toLowerCase().includes(search) || c.email.toLowerCase().includes(search) || (c.city||'').toLowerCase().includes(search));
  if (statusF) custs = custs.filter(c => c.status === statusF);

  const total = custs.length;
  const start = (state.customers - 1) * PAGE_SIZE;
  const page  = custs.slice(start, start + PAGE_SIZE);

  document.getElementById('customersTbody').innerHTML = page.length === 0
    ? `<tr><td colspan="8"><div class="empty-state"><div class="empty-icon">👥</div><p>No customers found</p></div></td></tr>`
    : page.map(c => `
    <tr>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <div style="width:34px;height:34px;border-radius:50%;background:var(--gold-soft);
            display:flex;align-items:center;justify-content:center;font-weight:700;color:var(--gold);font-size:14px;flex-shrink:0">
            ${c.name.charAt(0)}
          </div>
          <div>
            <div style="font-weight:600;font-size:13px">${c.name}</div>
            <div style="font-size:11px;color:var(--muted)">${c.id}</div>
          </div>
        </div>
      </td>
      <td style="font-size:12px;color:var(--muted)">${c.email}</td>
      <td style="font-size:12px">${c.phone}</td>
      <td style="font-size:12px;color:var(--muted)">${c.city || '—'}</td>
      <td><strong>${c.orders}</strong></td>
      <td><strong style="color:var(--gold)">$${c.spent.toFixed(2)}</strong></td>
      <td><span class="badge badge-${c.status}">${c.status}</span></td>
      <td>
        <div class="act-group">
          <button class="btn btn-ghost btn-sm" onclick="openCustomerModal('${c.id}')">✏️</button>
          <button class="btn btn-ghost btn-sm" onclick="window.open('https://wa.me/${(c.phone||'').replace(/\D/g,'')}','_blank')">📲</button>
        </div>
      </td>
    </tr>`).join('');

  renderPagination('customersPag', total, state.customers, p => { state.customers = p; renderCustomersTable(); });
}

function openCustomerModal(id) {
  if (id) {
    const c = CMS_DB.getCustomers().find(x => x.id === id);
    if (!c) return;
    document.getElementById('customerModalTitle').textContent = 'Edit Customer';
    document.getElementById('custId').value       = c.id;
    document.getElementById('custName2').value    = c.name;
    document.getElementById('custEmail').value    = c.email;
    document.getElementById('custPhone2').value   = c.phone;
    document.getElementById('custCity').value     = c.city || '';
    document.getElementById('custStatus2').value  = c.status;
    document.getElementById('custSpent').value    = c.spent;
  } else {
    document.getElementById('customerModalTitle').textContent = 'Add Customer';
    ['custId','custName2','custEmail','custPhone2','custCity','custSpent'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('custStatus2').value = 'active';
  }
  openModal('customerModal');
}

function saveCustomer() {
  const name  = document.getElementById('custName2').value.trim();
  const email = document.getElementById('custEmail').value.trim();
  if (!name || !email) { showToast('Name and email are required', 'error'); return; }

  const c = {
    id:     document.getElementById('custId').value || '',
    name, email,
    phone:  document.getElementById('custPhone2').value,
    city:   document.getElementById('custCity').value,
    status: document.getElementById('custStatus2').value,
    spent:  parseFloat(document.getElementById('custSpent').value) || 0,
    orders: 0, joined: new Date().toISOString(),
  };
  CMS_DB.saveCustomer(c);
  closeModal('customerModal');
  renderCustomersTable();
  showToast(`Customer "${name}" saved!`, 'success');
}

// ═══════════════════════════════════════
//  ANALYTICS
// ═══════════════════════════════════════
function renderAnalytics() {
  const orders    = CMS_DB.getOrders();
  const products  = CMS_DB.getProducts();
  const customers = CMS_DB.getCustomers();
  const revenue   = orders.filter(o => o.status !== 'cancelled').reduce((s,o) => s + o.total, 0);
  const avgOrder  = orders.length ? revenue / orders.length : 0;
  const topCust   = customers.sort((a,b) => b.spent - a.spent)[0];

  document.getElementById('analyticsStats').innerHTML = `
    <div class="stat-card gold"><div class="stat-icon">💰</div><div class="stat-value">$${revenue.toFixed(0)}</div><div class="stat-label">Total Revenue</div></div>
    <div class="stat-card blue"><div class="stat-icon">🧾</div><div class="stat-value">$${avgOrder.toFixed(2)}</div><div class="stat-label">Avg Order Value</div></div>
    <div class="stat-card green"><div class="stat-icon">🏆</div><div class="stat-value">${topCust?.name.split(' ')[0] || '—'}</div><div class="stat-label">Top Customer</div></div>
    <div class="stat-card orange"><div class="stat-icon">📦</div><div class="stat-value">${orders.filter(o=>o.status==='delivered').length}</div><div class="stat-label">Delivered Orders</div></div>
  `;

  // Orders by status donut
  const statuses  = ['pending','processing','shipped','delivered','cancelled'];
  const statusCnt = statuses.map(s => orders.filter(o => o.status === s).length);
  const statCols  = ['#f97316','#d4a843','#3b82f6','#22c55e','#ef4444'];

  if (statusChartInst) statusChartInst.destroy();
  statusChartInst = new Chart(document.getElementById('statusChart'), {
    type: 'doughnut',
    data: {
      labels: statuses.map(s => s.charAt(0).toUpperCase()+s.slice(1)),
      datasets: [{ data: statusCnt, backgroundColor: statCols, borderWidth: 0, hoverOffset: 6 }]
    },
    options: { responsive:true, cutout:'62%',
      plugins: { legend: { position:'bottom', labels:{ color:'#999', padding:12, font:{size:12} } } } }
  });

  // Top products bar
  const topProds = [...products].sort((a,b) => (b.sales||0) - (a.sales||0)).slice(0, 6);
  if (topProdChartInst) topProdChartInst.destroy();
  topProdChartInst = new Chart(document.getElementById('topProdChart'), {
    type: 'bar',
    data: {
      labels: topProds.map(p => p.name.length > 16 ? p.name.slice(0,15)+'…' : p.name),
      datasets: [{
        label: 'Sales',
        data: topProds.map(p => p.sales || 0),
        backgroundColor: 'rgba(34,197,94,0.22)',
        borderColor: '#22c55e', borderWidth: 2, borderRadius: 6,
      }]
    },
    options: {
      indexAxis: 'y', responsive: true,
      plugins: { legend: { display:false } },
      scales: {
        x: { grid:{color:'rgba(255,255,255,0.04)'}, ticks:{color:'#888'} },
        y: { grid:{display:false}, ticks:{color:'#aaa', font:{size:11}} }
      }
    }
  });
}

// ═══════════════════════════════════════
//  SETTINGS
// ═══════════════════════════════════════
function saveSettings() {
  const settings = {
    storeName: document.getElementById('setStoreName').value,
    whatsapp:  document.getElementById('setWhatsApp').value,
    email:     document.getElementById('setEmail').value,
    freeShip:  document.getElementById('setFreeShip').value,
    currency:  document.getElementById('setCurrency').value,
  };
  CMS_DB.set('settings', settings);
  showToast('Settings saved!', 'success');
}

// ═══════════════════════════════════════
//  MODAL HELPERS
// ═══════════════════════════════════════
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}
function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}
// Close modal on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
});

// ═══════════════════════════════════════
//  PAGINATION HELPER
// ═══════════════════════════════════════
function renderPagination(containerId, total, current, onChange) {
  const pages = Math.ceil(total / PAGE_SIZE);
  const el = document.getElementById(containerId);
  if (!el) return;
  if (pages <= 1) { el.innerHTML = `<span>Showing ${total} records</span><div></div>`; return; }

  const start = (current - 1) * PAGE_SIZE + 1;
  const end   = Math.min(current * PAGE_SIZE, total);
  const btns  = [];
  for (let i = 1; i <= pages; i++) {
    btns.push(`<button class="pag-btn${i===current?' active':''}" onclick="(${onChange.toString()})(${i})">${i}</button>`);
  }
  el.innerHTML = `<span>Showing ${start}–${end} of ${total}</span><div class="pag-btns">${btns.join('')}</div>`;
}

// ═══════════════════════════════════════
//  TOAST
// ═══════════════════════════════════════
function showToast(msg, type = 'info') {
  const container = document.getElementById('cmsToast');
  if (!container) return;
  const icons = { success:'✅', error:'❌', info:'💡' };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `<span>${icons[type]||'💡'}</span> ${msg}`;
  container.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(60px)'; t.style.transition = '0.3s'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ═══════════════════════════════════════
//  DATE FORMAT
// ═══════════════════════════════════════
function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' });
}
