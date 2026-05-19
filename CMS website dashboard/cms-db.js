// ═══════════════════════════════════════════════════════
//  IREME CREATIONS — CMS LOCAL DATABASE
//  Simulates a real REST API backed by localStorage
//  Drop-in: replace localStorage calls with fetch('/api/...')
// ═══════════════════════════════════════════════════════

const CMS_DB = {
  _k: k => 'cms_' + k,
  get(k)      { try { return JSON.parse(localStorage.getItem(this._k(k))); } catch { return null; } },
  set(k, v)   { localStorage.setItem(this._k(k), JSON.stringify(v)); return v; },
  del(k)      { localStorage.removeItem(this._k(k)); },

  // ── SEED demo data on first load ──────────────────────────
  seed() {
    if (this.get('seeded')) return;

    const products = [
      { id:'P01', name:'Crochet Keychain Set',   price:8.99,  category:'keychains', stock:45, status:'active',  img:'../Image/Adorable and Easy 26 Crochet Keychain Ideas You\'ll….jfif', sales:120 },
      { id:'P02', name:'Handmade Tote Bag',       price:12.99, category:'clothing',  stock:22, status:'active',  img:'../Image/Terzi mankenimiz olmayınca biz de birtakım ai….jfif',        sales:87  },
      { id:'P03', name:'Macrame Wall Piece',      price:18.99, category:'wall-art',  stock:18, status:'active',  img:'../Image/download (5).jfif',                                           sales:64  },
      { id:'P04', name:'Wooden Wall Art',         price:21.70, category:'wall-art',  stock:12, status:'active',  img:'../Image/Wood - Wood Art _ Facebook.jfif',                             sales:58  },
      { id:'P05', name:'Wall Sculpture',          price:26.34, category:'wall-art',  stock:9,  status:'active',  img:'../Image/барельеф.jfif',                                               sales:71  },
      { id:'P06', name:'Minimalist Wall Clock',   price:19.99, category:'decor',     stock:31, status:'active',  img:'../Image/Elevate your home with this stunning minimalist….jfif',       sales:49  },
      { id:'P07', name:'Shelf Display Set',       price:29.99, category:'decor',     stock:6,  status:'low',     img:'../Image/download (2).jfif',                                           sales:52  },
      { id:'P08', name:'LED Wall Decor',          price:39.99, category:'decor',     stock:14, status:'active',  img:'../Image/Upgrade your home with this modern LED wall decor….jfif',     sales:38  },
      { id:'P09', name:'Camera Keychain',         price:11.57, category:'keychains', stock:60, status:'active',  img:'../Image/Save this crochet keychain camera if you want to….jfif',      sales:95  },
      { id:'P10', name:'Bamboo Wall Panel',       price:45.00, category:'wall-art',  stock:3,  status:'low',     img:'../Image/барельеф.jfif',                                               sales:21  },
      { id:'P11', name:'Scented Beeswax Candle',  price:13.50, category:'decor',     stock:55, status:'active',  img:'../Image/Elevate your home with this stunning minimalist….jfif',       sales:33  },
      { id:'P12', name:'Woven Grass Keyring',     price:6.99,  category:'keychains', stock:80, status:'active',  img:'../Image/Adorable and Easy 26 Crochet Keychain Ideas You\'ll….jfif',   sales:105 },
    ];

    const names  = ['Marie Uwase','Jean Ndayishimiye','Amina Mukamana','David Habimana','Grace Ingabire','Eric Nshimiyimana','Diane Mutesi','Patrick Rugamba','Solange Iradukunda','Felix Mugisha'];
    const cities = ['Kigali','Butare','Gisenyi','Ruhengeri','Gitarama'];

    const customers = names.map((name, i) => ({
      id:      'C' + String(i+1).padStart(3,'0'),
      name,
      email:   name.toLowerCase().replace(' ','.') + '@gmail.com',
      phone:   '+25078' + String(Math.floor(1000000 + Math.random()*9000000)),
      city:    cities[i % cities.length],
      orders:  Math.floor(Math.random() * 8) + 1,
      spent:   parseFloat((Math.random() * 280 + 20).toFixed(2)),
      joined:  new Date(Date.now() - Math.random() * 1e10).toISOString(),
      status:  Math.random() > 0.15 ? 'active' : 'inactive',
    }));

    const statuses = ['pending','processing','shipped','delivered','cancelled'];
    const orders = Array.from({ length: 40 }, (_, i) => {
      const c    = customers[Math.floor(Math.random() * customers.length)];
      const qty  = Math.floor(Math.random() * 3) + 1;
      const prod = products[Math.floor(Math.random() * products.length)];
      const sub  = parseFloat((prod.price * qty).toFixed(2));
      const ship = sub >= 50 ? 0 : 5;
      return {
        id:         'ORD-' + String(1000 + i),
        customerId: c.id,
        customer:   c.name,
        phone:      c.phone,
        address:    c.city + ', Rwanda',
        items:      [{ name: prod.name, price: prod.price, qty }],
        sub, ship,
        total:      parseFloat((sub + ship).toFixed(2)),
        status:     statuses[Math.floor(Math.random() * statuses.length)],
        date:       new Date(Date.now() - Math.random() * 2.5e9).toISOString(),
        via:        'WhatsApp',
      };
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    this.set('products',  products);
    this.set('customers', customers);
    this.set('orders',    orders);
    this.set('seeded',    true);
    console.log('[CMS-DB] Demo data seeded.');
  },

  // ── PRODUCTS ─────────────────────────────────────────────
  getProducts()        { return this.get('products') || []; },
  saveProduct(p)       {
    const list = this.getProducts();
    const idx  = list.findIndex(x => x.id === p.id);
    if (idx > -1) list[idx] = p; else { p.id = 'P' + String(list.length+1).padStart(2,'0'); list.push(p); }
    return this.set('products', list), p;
  },
  deleteProduct(id)    { this.set('products', this.getProducts().filter(p => p.id !== id)); },

  // ── CUSTOMERS ────────────────────────────────────────────
  getCustomers()       { return this.get('customers') || []; },
  saveCustomer(c)      {
    const list = this.getCustomers();
    const idx  = list.findIndex(x => x.id === c.id);
    if (idx > -1) list[idx] = c; else { c.id = 'C' + String(list.length+1).padStart(3,'0'); list.push(c); }
    return this.set('customers', list), c;
  },

  // ── ORDERS ───────────────────────────────────────────────
  getOrders()          { return this.get('orders') || []; },
  updateOrderStatus(id, status) {
    const orders = this.getOrders();
    const o = orders.find(x => x.id === id);
    if (o) { o.status = status; this.set('orders', orders); }
    return o;
  },

  // ── ANALYTICS ────────────────────────────────────────────
  getStats() {
    const orders   = this.getOrders();
    const products = this.getProducts();
    const customers= this.getCustomers();
    const revenue  = orders.filter(o => o.status !== 'cancelled').reduce((s,o) => s + o.total, 0);
    const pending  = orders.filter(o => o.status === 'pending').length;
    const today    = new Date().toDateString();
    const todayOrd = orders.filter(o => new Date(o.date).toDateString() === today).length;
    return { revenue, orders: orders.length, customers: customers.length,
             products: products.length, pending, todayOrd };
  },

  // Monthly revenue for chart (last 6 months)
  getMonthlyRevenue() {
    const orders = this.getOrders().filter(o => o.status !== 'cancelled');
    const months = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      months[key] = 0;
    }
    orders.forEach(o => {
      const d = new Date(o.date);
      const key = d.toLocaleString('default', { month: 'short', year: '2-digit' });
      if (key in months) months[key] += o.total;
    });
    return months;
  },

  getCategoryRevenue() {
    const orders   = this.getOrders().filter(o => o.status !== 'cancelled');
    const products = this.getProducts();
    const map = {};
    orders.forEach(o => o.items.forEach(item => {
      const p   = products.find(x => x.name === item.name);
      const cat = p ? p.category : 'other';
      map[cat]  = (map[cat] || 0) + item.price * item.qty;
    }));
    return map;
  }
};
