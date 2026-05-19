// ═══════════════════════════════════════════════════════════
//  IREME CREATIONS — script.js
//  Enhanced GSAP · Cart · Sidebar · WhatsApp · PWA · Analytics
// ═══════════════════════════════════════════════════════════
gsap.registerPlugin(ScrollTrigger, TextPlugin, CustomEase);
CustomEase.create("bouncy",
  "M0,0 C0.14,0 0.242,0.438 0.272,0.561 0.313,0.728 0.354,0.963 0.362,1 " +
  "0.37,1.037 0.414,1.1 0.454,1.1 0.494,1.1 0.502,1.042 0.502,1.042 " +
  "0.502,1.042 0.575,0.85 0.617,0.85 0.659,0.85 0.726,1 0.726,1 " +
  "0.726,1 0.788,1.075 0.83,1.075 0.872,1.075 0.918,1.018 0.918,1.018 " +
  "0.918,1.018 0.934,0.969 0.96,0.969 0.986,0.969 1,1 1,1");

// ═══════════════════════════════════════
//  SIMULATED API / DATABASE LAYER
//  (localStorage-backed — mirrors a real
//   REST API so the code is drop-in ready)
// ═══════════════════════════════════════
const DB = {
  _key: k => 'ireme_' + k,

  get(key) {
    try { return JSON.parse(localStorage.getItem(this._key(key))); }
    catch { return null; }
  },
  set(key, val) {
    try { localStorage.setItem(this._key(key), JSON.stringify(val)); return true; }
    catch { return false; }
  },

  // Simulate POST /api/orders
  async saveOrder(order) {
    const orders = this.get('orders') || [];
    order.id   = 'ORD-' + Date.now();
    order.date = new Date().toISOString();
    orders.unshift(order);
    this.set('orders', orders.slice(0, 100)); // keep last 100
    console.log('[DB] Order saved:', order.id);
    return order;
  },

  // Simulate GET /api/wishlist
  getWishlist() { return this.get('wishlist') || []; },
  toggleWishlist(name) {
    let wl = this.getWishlist();
    const idx = wl.indexOf(name);
    if (idx > -1) wl.splice(idx, 1); else wl.push(name);
    this.set('wishlist', wl);
    return wl.includes(name);
  },

  // Simulate GET /api/user
  getUser()        { return this.get('user'); },
  saveUser(user)   { return this.set('user', user); },
  clearUser()      { localStorage.removeItem(this._key('user')); },

  // Simulate GET /api/analytics
  trackEvent(ev, data = {}) {
    const log = this.get('analytics') || [];
    log.unshift({ event: ev, data, ts: Date.now() });
    this.set('analytics', log.slice(0, 200));
  }
};

// ═══════════════════════════════════════
//  CART STATE
// ═══════════════════════════════════════
let cart        = DB.get('cart') || [];
let currentUser = DB.getUser();
const SELLER_WHATSAPP   = '250791720024';
const SHIPPING_THRESHOLD = 50;
const SHIPPING_COST      = 5.00;

function getShipping(sub) { return sub >= SHIPPING_THRESHOLD ? 0 : SHIPPING_COST; }
function persistCart()    { DB.set('cart', cart); }

// ── Cart count badge ─────────────────────────────
function updateCartCount() {
  const total = cart.reduce((s, i) => s + i.qty, 0);
  const el    = document.getElementById('cartCount');
  if (!el) return;
  el.textContent = total;
  if (total > 0) {
    el.style.display = 'inline-flex';
    gsap.timeline()
      .to(el, { scale: 1.9, backgroundColor: '#ff6b00', duration: 0.15, ease: 'power2.out' })
      .to(el, { scale: 1,   backgroundColor: '#e07b2a', duration: 0.35, ease: 'bouncy' });
  } else {
    el.style.display = 'none';
  }
}

// ── Render cart items ────────────────────────────
function renderCart() {
  const c = document.getElementById('cartItems');
  if (!c) return;

  if (cart.length === 0) {
    c.innerHTML = `
      <div style="text-align:center;padding:60px 20px">
        <div style="font-size:48px;margin-bottom:14px">🛒</div>
        <p style="color:#bbb;font-size:17px">Your cart is empty</p>
        <p style="color:#ccc;font-size:14px;margin-top:6px">Add some beautiful items!</p>
      </div>`;
    ['cartSubtotal','cartShipping','cartTotal'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '$0.00';
    });
    return;
  }

  c.innerHTML = cart.map((item, idx) => `
    <div class="cart-item" id="cart-item-${idx}">
      <img src="${item.img}" alt="${item.name}" class="cart-item-img"
           onerror="this.style.background='#f0ede8';this.removeAttribute('src')">
      <div class="cart-item-info">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">$${item.price.toFixed(2)} each</p>
        <div class="qty-row">
          <button class="qty-btn" onclick="changeQty(${idx},-1)">−</button>
          <span class="qty-num">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty(${idx},+1)">+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <p class="cart-item-total">$${(item.price * item.qty).toFixed(2)}</p>
        <button class="remove-btn" onclick="removeItem(${idx})" aria-label="Remove">🗑</button>
      </div>
    </div>`).join('');

  gsap.fromTo('.cart-item',
    { x: 40, opacity: 0 },
    { x: 0,  opacity: 1, duration: 0.35, stagger: 0.06, ease: 'power2.out' });

  const sub  = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const ship = getShipping(sub);
  document.getElementById('cartSubtotal').textContent = '$' + sub.toFixed(2);
  document.getElementById('cartShipping').textContent = ship === 0 ? '🎉 Free!' : '$' + ship.toFixed(2);

  // Animate total number counting up
  const totalEl = document.getElementById('cartTotal');
  const newTotal = sub + ship;
  let current = 0;
  gsap.to({ val: current }, {
    val: newTotal, duration: 0.6, ease: 'power2.out',
    onUpdate: function() { totalEl.textContent = '$' + this.targets()[0].val.toFixed(2); }
  });
}

// ── Add to cart ──────────────────────────────────
function addToCart(name, price, img, btn) {
  const existing = cart.find(i => i.name === name);
  if (existing) {
    existing.qty++;
    showToast(`+1 ${name}`, 'success');
  } else {
    cart.push({ name, price, img, qty: 1 });
    showToast(`"${name}" added to cart!`, 'success');
  }
  persistCart();
  updateCartCount();
  renderCart();
  DB.trackEvent('add_to_cart', { name, price });

  btn.textContent = '✓ Added!';
  btn.classList.add('added');
  gsap.timeline()
    .to(btn, { scale: 0.88, duration: 0.1 })
    .to(btn, { scale: 1.06, duration: 0.2, ease: 'power2.out' })
    .to(btn, { scale: 1,    duration: 0.3, ease: 'bouncy' });

  setTimeout(() => { btn.textContent = 'Add to Cart'; btn.classList.remove('added'); }, 1500);
}

function changeQty(idx, delta) {
  if (!cart[idx]) return;
  cart[idx].qty += delta;
  if (cart[idx].qty <= 0) cart.splice(idx, 1);
  persistCart();
  updateCartCount();
  renderCart();
}

function removeItem(idx) {
  const el = document.getElementById('cart-item-' + idx);
  if (el) {
    gsap.to(el, {
      x: 70, opacity: 0, height: 0, paddingTop: 0, paddingBottom: 0,
      marginBottom: 0, duration: 0.3, ease: 'power2.in',
      onComplete: () => {
        cart.splice(idx, 1);
        persistCart();
        updateCartCount();
        renderCart();
      }
    });
  } else {
    cart.splice(idx, 1);
    persistCart();
    updateCartCount();
    renderCart();
  }
}

// ═══════════════════════════════════════
//  WHATSAPP ORDER  (seller notification)
// ═══════════════════════════════════════
async function sendOrderToWhatsApp(custName, custPhone, custAddress) {
  const sub   = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const ship  = getShipping(sub);
  const total = (sub + ship).toFixed(2);
  const date  = new Date().toLocaleString('en-US', {
    dateStyle: 'medium', timeStyle: 'short'
  });

  const lines = cart.map(i =>
    `  • ${i.name} ×${i.qty}  →  $${(i.price * i.qty).toFixed(2)}`
  ).join('\n');

  const msg =
`🛍️ *NEW ORDER — Ireme Creations*
📅 ${date}

👤 *Customer:* ${custName  || '—'}
📱 *Phone:*    ${custPhone || '—'}
📍 *Address:*  ${custAddress || '—'}

🛒 *Items:*
${lines}

─────────────────
💵 Subtotal : $${sub.toFixed(2)}
🚚 Shipping : ${ship === 0 ? 'FREE 🎉' : '$' + ship.toFixed(2)}
✅ *TOTAL   : $${total}*
─────────────────
_Sent from IremeCreations.rw_`;

  // Save to DB
  const order = await DB.saveOrder({
    customer: { name: custName, phone: custPhone, address: custAddress },
    items: cart.map(i => ({ name: i.name, price: i.price, qty: i.qty })),
    sub, ship, total: +total
  });

  DB.trackEvent('order_placed', { orderId: order.id, total: +total });

  window.open(`https://wa.me/${SELLER_WHATSAPP}?text=${encodeURIComponent(msg)}`, '_blank');
  return { sub, ship, total, orderId: order.id };
}

// ═══════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════
function showToast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.textContent = msg;
  container.appendChild(t);
  gsap.fromTo(t,
    { x: 60, opacity: 0 },
    { x: 0,  opacity: 1, duration: 0.35, ease: 'power2.out' });
  setTimeout(() => {
    gsap.to(t, { x: 60, opacity: 0, duration: 0.3, ease: 'power2.in',
      onComplete: () => t.remove() });
  }, duration);
}

// ═══════════════════════════════════════
//  FLY-TO-CART PARTICLES
// ═══════════════════════════════════════
function flyToCart(btn) {
  const br = btn.getBoundingClientRect();
  const cr = document.getElementById('cartBtn').getBoundingClientRect();
  const targetX = cr.left + cr.width  / 2;
  const targetY = cr.top  + cr.height / 2;

  for (let i = 0; i < 8; i++) {
    const p = document.createElement('div');
    p.style.cssText = `position:fixed;width:10px;height:10px;
      border-radius:50%;pointer-events:none;z-index:9999;
      background:${i % 2 === 0 ? '#d4a843' : '#13b113'}`;
    document.body.appendChild(p);
    gsap.set(p, {
      x: br.left + br.width  / 2,
      y: br.top  + br.height / 2,
      opacity: 1, scale: gsap.utils.random(0.6, 1.4)
    });
    gsap.to(p, {
      x: targetX + gsap.utils.random(-18, 18),
      y: targetY,
      opacity: 0, scale: 0,
      duration: gsap.utils.random(0.45, 0.75),
      delay:    gsap.utils.random(0, 0.18),
      ease: 'power2.in',
      onComplete: () => p.remove()
    });
  }
}

// ═══════════════════════════════════════
//  CURSOR  (tri-layer: glow · trail · dot)
// ═══════════════════════════════════════
function initCursor() {
  const glow  = document.getElementById('cursorGlow');
  const dot   = document.getElementById('cursorDot');
  const trail = document.getElementById('cursorTrail');
  if (!glow || !dot) return;

  let mouseX = 0, mouseY = 0;

  window.addEventListener('mousemove', e => {
    mouseX = e.clientX; mouseY = e.clientY;
    gsap.to(glow,  { x: mouseX, y: mouseY, duration: 0.22, ease: 'power2.out' });
    gsap.to(trail, { x: mouseX, y: mouseY, duration: 0.12, ease: 'power1.out' });
    gsap.to(dot,   { x: mouseX, y: mouseY, duration: 0.04 });
  });

  // Hover expand
  const hoverEls = document.querySelectorAll(
    '.magnetic, button, a, input, textarea, select, .product, .nav-item, .cat-btn'
  );
  hoverEls.forEach(el => {
    el.addEventListener('mouseenter', () => {
      gsap.to(glow,  { scale: 1.8, duration: 0.25, ease: 'power2.out' });
      gsap.to(trail, { scale: 1.5, opacity: 0.7, duration: 0.25 });
    });
    el.addEventListener('mouseleave', () => {
      gsap.to(glow,  { scale: 1, duration: 0.25 });
      gsap.to(trail, { scale: 1, opacity: 1,   duration: 0.25 });
    });
  });

  // Click burst
  window.addEventListener('click', e => {
    const burst = document.createElement('div');
    burst.style.cssText = `position:fixed;width:36px;height:36px;border-radius:50%;
      border:2px solid #d4a843;pointer-events:none;z-index:99998;
      left:${e.clientX}px;top:${e.clientY}px;transform:translate(-50%,-50%)`;
    document.body.appendChild(burst);
    gsap.to(burst, { scale: 2.5, opacity: 0, duration: 0.5, ease: 'power2.out',
      onComplete: () => burst.remove() });
  });
}

// ═══════════════════════════════════════
//  MAGNETIC BUTTONS
// ═══════════════════════════════════════
function initMagnetic() {
  document.querySelectorAll('.magnetic').forEach(el => {
    el.addEventListener('mousemove', function(e) {
      const r  = this.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width  / 2)) * 0.32;
      const dy = (e.clientY - (r.top  + r.height / 2)) * 0.32;
      gsap.to(this, { x: dx, y: dy, duration: 0.3, ease: 'power2.out' });
    });
    el.addEventListener('mouseleave', function() {
      gsap.to(this, { x: 0, y: 0, duration: 0.55, ease: 'elastic.out(1, 0.45)' });
    });
  });
}

// ═══════════════════════════════════════
//  RIPPLE
// ═══════════════════════════════════════
function addRipple(e) {
  const btn  = e.currentTarget;
  const r    = document.createElement('span');
  r.className = 'ripple';
  const size = Math.max(btn.offsetWidth, btn.offsetHeight);
  const rect = btn.getBoundingClientRect();
  r.style.cssText = `width:${size}px;height:${size}px;
    left:${e.clientX - rect.left - size / 2}px;
    top:${e.clientY  - rect.top  - size / 2}px;
    position:absolute;border-radius:50%;
    background:rgba(255,255,255,0.32);transform:scale(0);
    animation:rippleAnim 0.62s linear;pointer-events:none`;
  btn.appendChild(r);
  setTimeout(() => r.remove(), 650);
}

// ═══════════════════════════════════════
//  LOADING SCREEN
// ═══════════════════════════════════════
function initLoadingScreen() {
  const screen = document.getElementById('loadingScreen');
  if (!screen) return;

  const fill = document.getElementById('loaderFill');
  const text = document.getElementById('loaderText');
  const msgs = ['Loading crafts…', 'Weaving magic…', 'Almost ready…', 'Welcome!'];

  let pct = 0;
  const iv = setInterval(() => {
    pct += Math.random() * 22 + 8;
    if (pct > 100) pct = 100;
    if (fill) fill.style.width = pct + '%';
    const mi = Math.min(Math.floor(pct / 25), msgs.length - 1);
    if (text) text.textContent = msgs[mi];
    if (pct >= 100) {
      clearInterval(iv);
      setTimeout(() => {
        gsap.to(screen, {
          opacity: 0, duration: 0.55, ease: 'power2.in',
          onComplete: () => { screen.style.display = 'none'; }
        });
      }, 300);
    }
  }, 80);
}

// ═══════════════════════════════════════
//  INTERACTIVE CRAFT CANVAS
// ═══════════════════════════════════════
function initCraftCanvas() {
  const canvas = document.getElementById('craftCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;

  const items = [
    { emoji:'🧶', x:W*0.20, y:H*0.30, vx:0.55,  vy:0.30,  size:23, angle:0, spin:0.020  },
    { emoji:'🪵', x:W*0.72, y:H*0.50, vx:-0.42,  vy:0.48,  size:21, angle:0, spin:-0.016 },
    { emoji:'🖼️', x:W*0.50, y:H*0.18, vx:0.32,  vy:-0.42, size:23, angle:0, spin:0.018  },
    { emoji:'🔑', x:W*0.82, y:H*0.22, vx:-0.52, vy:0.36,  size:20, angle:0, spin:-0.022 },
    { emoji:'💎', x:W*0.28, y:H*0.72, vx:0.42,  vy:-0.32, size:19, angle:0, spin:0.026  },
    { emoji:'🌿', x:W*0.62, y:H*0.78, vx:-0.34, vy:-0.42, size:22, angle:0, spin:-0.017 },
    { emoji:'🪡', x:W*0.14, y:H*0.58, vx:0.38,  vy:0.22,  size:18, angle:0, spin:0.021  },
  ];

  const sparks = Array.from({ length: 28 }, () => ({
    x: Math.random() * W, y: Math.random() * H,
    r: Math.random() * 1.8 + 0.4,
    phase: Math.random() * Math.PI * 2,
    speed: Math.random() * 0.012 + 0.004,
  }));

  let mouseX = W / 2, mouseY = H / 2, frame = 0;
  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouseX = (e.clientX - r.left) * (W / r.width);
    mouseY = (e.clientY - r.top)  * (H / r.height);
  });

  // Touch support
  canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    mouseX = (e.touches[0].clientX - r.left) * (W / r.width);
    mouseY = (e.touches[0].clientY - r.top)  * (H / r.height);
  }, { passive: false });

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // Radial bg
    const g = ctx.createRadialGradient(W/2, H/2, 8, W/2, H/2, H * 0.85);
    g.addColorStop(0, 'rgba(40,32,10,0.0)');
    g.addColorStop(1, 'rgba(10,8,2,0.62)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);

    // Sparkles
    frame++;
    sparks.forEach(s => {
      const a = 0.35 + 0.55 * Math.sin(frame * s.speed + s.phase);
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,168,67,${a})`;
      ctx.fill();
    });

    // Connection lines
    for (let i = 0; i < items.length; i++) {
      for (let j = i + 1; j < items.length; j++) {
        const dx = items[i].x - items[j].x;
        const dy = items[i].y - items[j].y;
        const d  = Math.sqrt(dx*dx + dy*dy);
        if (d < 95) {
          const alpha = 0.3 * (1 - d / 95);
          ctx.beginPath();
          ctx.moveTo(items[i].x, items[i].y);
          ctx.lineTo(items[j].x, items[j].y);
          ctx.strokeStyle = `rgba(212,168,67,${alpha})`;
          ctx.lineWidth = 0.9;
          ctx.stroke();
        }
      }
    }

    // Mouse cursor glow on canvas
    const mg = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 50);
    mg.addColorStop(0, 'rgba(212,168,67,0.12)');
    mg.addColorStop(1, 'rgba(212,168,67,0)');
    ctx.fillStyle = mg; ctx.fillRect(0, 0, W, H);

    // Emoji items
    items.forEach(item => {
      const mdx = item.x - mouseX, mdy = item.y - mouseY;
      const md  = Math.sqrt(mdx*mdx + mdy*mdy);
      if (md < 65) {
        item.vx += (mdx / md) * 0.35;
        item.vy += (mdy / md) * 0.35;
      }

      item.x += item.vx; item.y += item.vy;
      item.angle += item.spin;
      item.vx *= 0.994; item.vy *= 0.994;

      const spd = Math.sqrt(item.vx*item.vx + item.vy*item.vy);
      if (spd < 0.18) { item.vx *= 1.6; item.vy *= 1.6; }

      if (item.x < item.size)     { item.x = item.size;     item.vx =  Math.abs(item.vx); }
      if (item.x > W - item.size) { item.x = W - item.size; item.vx = -Math.abs(item.vx); }
      if (item.y < item.size)     { item.y = item.size;     item.vy =  Math.abs(item.vy); }
      if (item.y > H - item.size) { item.y = H - item.size; item.vy = -Math.abs(item.vy); }

      // Drop shadow glow
      ctx.save();
      ctx.shadowColor = 'rgba(212,168,67,0.55)';
      ctx.shadowBlur  = 10;
      ctx.translate(item.x, item.y);
      ctx.rotate(item.angle);
      ctx.font = `${item.size}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.globalAlpha = 0.92;
      ctx.fillText(item.emoji, 0, 0);
      ctx.restore();
    });

    requestAnimationFrame(draw);
  }
  draw();

  // Dot indicators
  const dotsEl = document.getElementById('animDots');
  if (dotsEl) {
    items.forEach((_, i) => {
      const d = document.createElement('div');
      d.className = 'anim-dot' + (i === 0 ? ' active' : '');
      d.addEventListener('click', () => {
        dotsEl.querySelectorAll('.anim-dot').forEach((x, j) => x.classList.toggle('active', j === i));
      });
      dotsEl.appendChild(d);
    });
    let ai = 0;
    setInterval(() => {
      dotsEl.querySelectorAll('.anim-dot').forEach((d, i) => d.classList.toggle('active', i === ai));
      ai = (ai + 1) % items.length;
    }, 1300);
  }
}

// ═══════════════════════════════════════
//  HERO ENTRANCE + FLOATING PARTICLES
// ═══════════════════════════════════════
function initHero() {
  // Background floating blobs
  const bg = document.getElementById('heroBg');
  if (bg) {
    for (let i = 0; i < 24; i++) {
      const p = document.createElement('div');
      const sz = Math.random() * 70 + 10;
      p.style.cssText = `position:absolute;border-radius:50%;
        background:rgba(212,168,67,${Math.random() * 0.09 + 0.02});
        width:${sz}px;height:${sz}px;
        left:${Math.random() * 100}%;top:${Math.random() * 100}%;`;
      bg.appendChild(p);
      gsap.to(p, {
        y: gsap.utils.random(-35, 35),
        x: gsap.utils.random(-22, 22),
        duration: gsap.utils.random(3.5, 8),
        repeat: -1, yoyo: true, ease: 'sine.inOut',
        delay: gsap.utils.random(0, 4)
      });
    }
  }

  // Floating emoji decorations
  const floaters = document.getElementById('heroFloaters');
  if (floaters) {
    ['🛍','✨','🎀','💎','🌟','🔑','🖼','🏡'].forEach((em, i) => {
      const d = document.createElement('div');
      d.className = 'floater';
      d.textContent = em;
      d.style.cssText = `left:${56 + i * 4.5}%;top:${8 + (i % 3) * 30}%;animation-delay:${i * 0.6}s`;
      floaters.appendChild(d);
    });
  }

  // Main entrance timeline
  gsap.set(['#heroTag','#heroTitle','#heroSub','.hero-cta-row','#heroStats'], { y: 32, opacity: 0 });
  gsap.set('#heroAnimBox', { x: 50, opacity: 0 });
  gsap.set('#sectionBar',  { opacity: 0 });
  gsap.set('.section-bar-line', { scaleX: 0 });
  gsap.set('.cat-bar',     { opacity: 0, y: 16 });

  const tl = gsap.timeline({ delay: 0.1 });
  tl.from('#mainHeader', { y: -80, opacity: 0, duration: 0.7, ease: 'power3.out' })
    .to('#heroTag',       { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },  '-=0.25')
    .to('#heroTitle',     { y: 0, opacity: 1, duration: 0.75, ease: 'power3.out' }, '-=0.2')
    .to('#heroSub',       { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },  '-=0.4')
    .to('.hero-cta-row',  { y: 0, opacity: 1, duration: 0.5, ease: 'bouncy' },      '-=0.25')
    .to('#heroStats',     { y: 0, opacity: 1, duration: 0.5, ease: 'power2.out' },  '-=0.2')
    .to('#heroAnimBox',   { x: 0, opacity: 1, duration: 0.7, ease: 'power3.out' },  '-=0.45')
    .to('#sectionBar',    { opacity: 1, duration: 0.4 },                             '-=0.1')
    .to('.section-bar-line', { scaleX: 1, duration: 0.85, ease: 'power2.out' },     '-=0.3')
    .to('.cat-bar',       { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' },  '-=0.4');

  // Animate stat numbers counting up
  setTimeout(() => animateStatNumbers(), 1200);
}

function animateStatNumbers() {
  const stats = [
    { id: 'statProducts', end: 21,  suffix: ''   },
    { id: 'statOrders',   end: 340, suffix: '+'  },
    { id: 'statRating',   end: 4.9, suffix: '★', decimals: 1 },
  ];
  stats.forEach(s => {
    const el = document.getElementById(s.id);
    if (!el) return;
    gsap.fromTo({ val: 0 }, { val: s.end },
      { duration: 1.4, ease: 'power2.out',
        onUpdate: function() {
          const v = this.targets()[0].val;
          el.textContent = (s.decimals ? v.toFixed(s.decimals) : Math.round(v)) + s.suffix;
        }
      });
  });
}

// ═══════════════════════════════════════
//  SCROLL-TRIGGERED CARDS + 3D TILT
// ═══════════════════════════════════════
function initScrollAnimations() {
  gsap.utils.toArray('.product').forEach((card, i) => {
    gsap.to(card, {
      opacity: 1, y: 0, duration: 0.65, ease: 'power3.out',
      delay: (i % 4) * 0.085,
      scrollTrigger: {
        trigger: card, start: 'top 89%',
        toggleActions: 'play none none none',
      }
    });

    card.addEventListener('mousemove', function(e) {
      const r  = this.getBoundingClientRect();
      const cx = (e.clientX - r.left) / r.width  - 0.5;
      const cy = (e.clientY - r.top)  / r.height - 0.5;
      gsap.to(this, {
        rotateY: cx * 12, rotateX: -cy * 12, scale: 1.03,
        boxShadow: '0 20px 48px rgba(212,168,67,0.22)',
        duration: 0.28, ease: 'power2.out', transformPerspective: 650,
      });
    });
    card.addEventListener('mouseleave', function() {
      gsap.to(this, {
        rotateY: 0, rotateX: 0, scale: 1,
        boxShadow: '0 4px 24px rgba(0,0,0,0.09)',
        duration: 0.55, ease: 'elastic.out(1, 0.5)',
      });
    });
  });

  // Footer
  gsap.set('.footer-inner', { y: 32, opacity: 0 });
  ScrollTrigger.create({
    trigger: '.footer', start: 'top 90%',
    onEnter: () => gsap.to('.footer-inner', { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' })
  });
}

// ═══════════════════════════════════════
//  HEADER HIDE/SHOW ON SCROLL
// ═══════════════════════════════════════
function initHeaderScroll() {
  let lastY = 0;
  ScrollTrigger.create({
    start: 'top -80',
    onUpdate: self => {
      const y = self.scroll();
      if (y > lastY + 5 && y > 100)
        gsap.to('#mainHeader', { y: -78, duration: 0.28, ease: 'power2.in' });
      else if (y < lastY - 5)
        gsap.to('#mainHeader', { y: 0,   duration: 0.38, ease: 'power2.out' });
      lastY = y;

      // Show/hide back-to-top
      const btn = document.getElementById('backToTop');
      if (btn) btn.classList.toggle('visible', y > 300);
    }
  });
}

// ═══════════════════════════════════════
//  CATEGORY FILTER  (with GSAP crossfade)
// ═══════════════════════════════════════
function initCategoryFilter() {
  document.querySelectorAll('.cat-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      const cat = this.dataset.cat;

      // Update section title
      const title = document.getElementById('sectionBarTitle');
      if (title) {
        gsap.to(title, { opacity: 0, y: -8, duration: 0.2, onComplete: () => {
          title.textContent = cat === 'all' ? '🛍️ All Products' : `${this.textContent.split(' ').slice(0,2).join(' ')} Collection`;
          gsap.to(title, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' });
        }});
      }

      const all  = Array.from(document.querySelectorAll('.product'));
      const show = all.filter(p => cat === 'all' || p.dataset.cat === cat);
      const hide = all.filter(p => cat !== 'all' && p.dataset.cat !== cat);

      gsap.to(hide, { opacity: 0, scale: 0.9, y: 20, duration: 0.22, stagger: 0.025, ease: 'power1.in',
        onComplete: () => hide.forEach(p => p.style.display = 'none') });

      show.forEach(p => { p.style.display = ''; });
      gsap.fromTo(show, { opacity: 0, scale: 0.92, y: 18 },
        { opacity: 1, scale: 1, y: 0, duration: 0.38, stagger: 0.045, ease: 'power2.out', delay: 0.15 });

      DB.trackEvent('category_filter', { cat });
    });
  });
}

// ═══════════════════════════════════════
//  SORT
// ═══════════════════════════════════════
function initSort() {
  const sel = document.getElementById('sortSelect');
  if (!sel) return;
  sel.addEventListener('change', function() {
    const grid  = document.getElementById('productsGrid');
    const cards = Array.from(document.querySelectorAll('.product'));
    const sorted = cards.sort((a, b) => {
      const pa = parseFloat(a.dataset.price);
      const pb = parseFloat(b.dataset.price);
      const na = a.querySelector('h2').textContent;
      const nb = b.querySelector('h2').textContent;
      if (this.value === 'price-asc')  return pa - pb;
      if (this.value === 'price-desc') return pb - pa;
      if (this.value === 'name')       return na.localeCompare(nb);
      return 0;
    });
    gsap.to(cards, { opacity: 0, scale: 0.94, duration: 0.2, stagger: 0.02, ease: 'power1.in',
      onComplete: () => {
        sorted.forEach(c => grid.appendChild(c));
        gsap.fromTo(sorted, { opacity: 0, y: 22 },
          { opacity: 1, y: 0, duration: 0.35, stagger: 0.04, ease: 'power2.out' });
      }
    });
  });
}

// ═══════════════════════════════════════
//  LIVE SEARCH  with dropdown
// ═══════════════════════════════════════
function initSearch() {
  const input    = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchDropdown');
  if (!input) return;

  input.addEventListener('input', function() {
    const val  = this.value.toLowerCase().trim();
    const all  = Array.from(document.querySelectorAll('.product'));

    // Dropdown suggestions
    if (dropdown) {
      if (!val) { dropdown.innerHTML = ''; dropdown.classList.remove('open'); }
      else {
        const matches = all.filter(p =>
          p.querySelector('h2').textContent.toLowerCase().includes(val)
        ).slice(0, 5);
        dropdown.innerHTML = matches.map(p => `
          <div class="search-result-item" data-name="${p.dataset.name}">
            <span>${p.querySelector('h2').textContent}</span>
            <span class="sr-price">$${parseFloat(p.dataset.price).toFixed(2)}</span>
          </div>`).join('');
        dropdown.classList.toggle('open', matches.length > 0);

        // Click on suggestion → scroll to product
        dropdown.querySelectorAll('.search-result-item').forEach(row => {
          row.addEventListener('click', () => {
            const target = all.find(p => p.dataset.name === row.dataset.name);
            if (target) {
              target.scrollIntoView({ behavior: 'smooth', block: 'center' });
              gsap.fromTo(target,
                { boxShadow: '0 0 0 4px #d4a843' },
                { boxShadow: '0 4px 24px rgba(0,0,0,0.09)', duration: 1.5, ease: 'power2.out' });
            }
            dropdown.innerHTML = ''; dropdown.classList.remove('open');
            input.value = '';
          });
        });
      }
    }

    // Grid filter
    const show = all.filter(p => !val || p.querySelector('h2').textContent.toLowerCase().includes(val));
    const hide = all.filter(p =>  val && !p.querySelector('h2').textContent.toLowerCase().includes(val));
    hide.forEach(p => { gsap.to(p, { opacity: 0.2, scale: 0.97, duration: 0.2 }); });
    show.forEach(p => { gsap.to(p, { opacity: 1,   scale: 1,    duration: 0.25, ease: 'power2.out' }); });
  });

  // Close dropdown on outside click
  document.addEventListener('click', e => {
    if (dropdown && !e.target.closest('#searchBox')) {
      dropdown.innerHTML = ''; dropdown.classList.remove('open');
    }
  });
}

// ═══════════════════════════════════════
//  SIDEBAR  (FIXED: x=280 off-screen right)
// ═══════════════════════════════════════
function openSidebar() {
  document.getElementById('overlay').classList.add('show');
  gsap.to('#slideNav', { x: 0, duration: 0.45, ease: 'power3.out' });
  gsap.fromTo('.nav-item',
    { x: 28, opacity: 0 },
    { x: 0,  opacity: 1, duration: 0.3, stagger: 0.06, ease: 'power2.out', delay: 0.2 });
}
function closeSidebar() {
  document.getElementById('overlay').classList.remove('show');
  gsap.to('#slideNav', { x: 280, duration: 0.4, ease: 'power2.in' });
}

// ═══════════════════════════════════════
//  CART DRAWER  (FIXED: x=420 off-screen right)
// ═══════════════════════════════════════
function openCartDrawer() {
  document.getElementById('cartOverlay').classList.add('show');
  gsap.to('#cartDrawer', { x: 0, duration: 0.45, ease: 'power3.out' });
  renderCart();
}
function closeCartDrawer() {
  document.getElementById('cartOverlay').classList.remove('show');
  gsap.to('#cartDrawer', { x: 420, duration: 0.4, ease: 'power2.in' });
}

// ═══════════════════════════════════════
//  MODALS
// ═══════════════════════════════════════
function openModal(overlayId, boxId) {
  const ov = document.getElementById(overlayId);
  if (!ov) return;
  ov.style.display = 'flex';
  gsap.fromTo('#' + boxId,
    { scale: 0.72, opacity: 0, y: 36 },
    { scale: 1,    opacity: 1, y: 0,  duration: 0.45, ease: 'bouncy' });
}
function closeModal(overlayId, boxId) {
  gsap.to('#' + boxId, {
    scale: 0.84, opacity: 0, y: 18, duration: 0.28, ease: 'power2.in',
    onComplete: () => {
      const ov = document.getElementById(overlayId);
      if (ov) ov.style.display = 'none';
    }
  });
}

// ═══════════════════════════════════════
//  CONFETTI
// ═══════════════════════════════════════
function launchConfetti() {
  const cols = ['#d4a843','#e07b2a','#fff','#13b113','#ff6b6b','#6bc5ff'];
  for (let i = 0; i < 70; i++) {
    const p = document.createElement('div');
    p.style.cssText = `position:fixed;pointer-events:none;z-index:9999;
      width:${gsap.utils.random(6,14)}px;height:${gsap.utils.random(6,14)}px;
      border-radius:${Math.random() > 0.4 ? '50%' : '2px'};
      background:${cols[Math.floor(Math.random() * cols.length)]};
      left:50%;top:45%;`;
    document.body.appendChild(p);
    gsap.to(p, {
      x: gsap.utils.random(-innerWidth/2, innerWidth/2),
      y: gsap.utils.random(-340, 340),
      rotation: gsap.utils.random(-360, 360),
      opacity: 0, duration: gsap.utils.random(0.9, 1.8),
      ease: 'power2.out', onComplete: () => p.remove()
    });
  }
}

// ═══════════════════════════════════════
//  AUTH HELPERS
// ═══════════════════════════════════════
function switchTab(tab) {
  const isL      = tab === 'login';
  const showForm = document.getElementById(isL ? 'loginForm'    : 'registerForm');
  const hideForm = document.getElementById(isL ? 'registerForm' : 'loginForm');
  document.getElementById('tabLogin').classList.toggle('active', isL);
  document.getElementById('tabRegister').classList.toggle('active', !isL);
  gsap.to(hideForm, { opacity: 0, x: -18, duration: 0.2, onComplete: () => {
    hideForm.classList.add('hidden');
    showForm.classList.remove('hidden');
    gsap.fromTo(showForm, { opacity: 0, x: 18 }, { opacity: 1, x: 0, duration: 0.3, ease: 'power2.out' });
  }});
  document.querySelectorAll('.form-error').forEach(e => e.remove());
}

function shakeForm(id) {
  gsap.fromTo('#' + id, { x: -10 },
    { x: 0, duration: 0.5, ease: 'elastic.out(1,0.3)',
      keyframes: { x: [-10, 10, -8, 8, -5, 5, 0] } });
}

function onLoggedIn() {
  closeModal('authModal', 'authModalBox');
  const link = document.getElementById('authLink');
  if (!link) return;
  gsap.to(link, { opacity: 0, y: -10, duration: 0.2, onComplete: () => {
    link.textContent = '👋 ' + currentUser.name;
    gsap.to(link, { opacity: 1, y: 0, duration: 0.3, ease: 'bouncy' });
  }});
  showToast('Welcome back, ' + currentUser.name + '!', 'success');
}

// ═══════════════════════════════════════
//  PWA MANIFEST (generated on-the-fly)
// ═══════════════════════════════════════
function injectManifest() {
  const manifest = {
    name: 'Ireme Creations',
    short_name: 'Ireme',
    description: 'Handcrafted Rwandan artisan products',
    start_url: './',
    display: 'standalone',
    background_color: '#1e1e1f',
    theme_color: '#d4a843',
    icons: [{ src: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y="80" font-size="80">🌿</text></svg>', sizes: '192x192', type: 'image/svg+xml' }]
  };
  const blob = new Blob([JSON.stringify(manifest)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const link = document.createElement('link');
  link.rel = 'manifest'; link.href = url;
  document.head.appendChild(link);
}

// ═══════════════════════════════════════
//  DOM READY
// ═══════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {

  // ── GSAP initial positions (CRITICAL — sidebar+cart start off-screen right)
  gsap.set('#slideNav',   { x: 280 });   // starts off-screen to the right
  gsap.set('#cartDrawer', { x: 420 });   // starts off-screen to the right

  // ── PWA
  injectManifest();

  // ── Loading screen
  initLoadingScreen();

  // ── Core systems
  initHero();
  initCraftCanvas();
  initCursor();
  initMagnetic();
  initScrollAnimations();
  initHeaderScroll();
  initCategoryFilter();
  initSort();
  initSearch();

  // ── Ripple on all buttons
  document.querySelectorAll('button').forEach(b => b.addEventListener('click', addRipple));

  // ── Add to cart
  document.querySelectorAll('.add-to-cart').forEach(btn => {
    btn.addEventListener('click', function() {
      const card = this.closest('.product');
      flyToCart(this);
      addToCart(card.dataset.name, parseFloat(card.dataset.price), card.dataset.img, this);
    });
  });

  // ── Cart drawer
  document.getElementById('cartBtn').addEventListener('click', openCartDrawer);
  document.getElementById('closeCart').addEventListener('click', closeCartDrawer);
  document.getElementById('cartOverlay').addEventListener('click', closeCartDrawer);

  // ── Clear cart
  document.getElementById('clearCart').addEventListener('click', () => {
    if (!cart.length) return;
    gsap.to('.cart-item', {
      x: 65, opacity: 0, stagger: 0.05, duration: 0.25, ease: 'power2.in',
      onComplete: () => { cart = []; persistCart(); updateCartCount(); renderCart(); }
    });
  });

  // ── Place order via WhatsApp
  document.getElementById('orderBtn').addEventListener('click', async () => {
    if (cart.length === 0) {
      gsap.fromTo('#orderBtn', { x: -9 }, { x: 0, duration: 0.45, ease: 'elastic.out(1,0.3)' });
      showToast('Your cart is empty!', 'error');
      return;
    }
    const custName    = document.getElementById('custName')?.value.trim()    || '';
    const custPhone   = document.getElementById('custPhone')?.value.trim()   || '';
    const custAddress = document.getElementById('custAddress')?.value.trim() || '';

    const sub   = cart.reduce((s, i) => s + i.price * i.qty, 0);
    const ship  = getShipping(sub);
    const lines = cart.map(i => `• ${i.name} ×${i.qty} — $${(i.price * i.qty).toFixed(2)}`).join('<br>');
    const el    = document.getElementById('orderSummaryText');
    if (el) el.innerHTML = lines + `<br><br><strong>Total: $${(sub+ship).toFixed(2)}</strong>`;

    const result = await sendOrderToWhatsApp(custName, custPhone, custAddress);

    closeCartDrawer();
    setTimeout(() => { openModal('orderModal','orderModalBox'); launchConfetti(); }, 450);

    cart = []; persistCart(); updateCartCount(); renderCart();
    ['custName','custPhone','custAddress'].forEach(id => {
      const f = document.getElementById(id);
      if (f) f.value = '';
    });
  });

  document.getElementById('closeOrder').addEventListener('click', () => closeModal('orderModal','orderModalBox'));
  document.getElementById('orderModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal('orderModal','orderModalBox');
  });

  // ── Auth
  document.getElementById('authLink').addEventListener('click', () => {
    if (currentUser) { showToast('Already logged in as ' + currentUser.name); return; }
    openModal('authModal','authModalBox');
  });
  document.getElementById('closeAuth').addEventListener('click', () => closeModal('authModal','authModalBox'));
  document.getElementById('authModal').addEventListener('click', function(e) {
    if (e.target === this) closeModal('authModal','authModalBox');
  });
  document.getElementById('tabLogin').addEventListener('click',    () => switchTab('login'));
  document.getElementById('tabRegister').addEventListener('click', () => switchTab('register'));

  document.getElementById('loginBtn').addEventListener('click', () => {
    const email = document.getElementById('loginEmail').value.trim();
    const pass  = document.getElementById('loginPassword').value.trim();
    if (!email || !pass) { shakeForm('loginForm'); return; }
    currentUser = { name: email.split('@')[0], email };
    DB.saveUser(currentUser);
    onLoggedIn();
  });

  document.getElementById('registerBtn').addEventListener('click', () => {
    const name  = document.getElementById('regName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const pass  = document.getElementById('regPassword').value.trim();
    if (!name || !email || !pass) { shakeForm('registerForm'); return; }
    currentUser = { name, email };
    DB.saveUser(currentUser);
    onLoggedIn();
  });

  // ── Sidebar
  document.getElementById('hamburgerBtn').addEventListener('click', openSidebar);
  document.getElementById('closeBtn').addEventListener('click', closeSidebar);
  document.getElementById('overlay').addEventListener('click', closeSidebar);

  // ── Hero buttons
  document.getElementById('heroBtn')?.addEventListener('click', () => {
    document.getElementById('productsGrid').scrollIntoView({ behavior: 'smooth' });
  });
  document.getElementById('heroBtnGhost')?.addEventListener('click', () => {
    document.getElementById('footer').scrollIntoView({ behavior: 'smooth' });
  });

  // ── Back to top
  document.getElementById('backToTop')?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ── Restore user session
  if (currentUser) {
    const link = document.getElementById('authLink');
    if (link) link.textContent = '👋 ' + currentUser.name;
  }

  // ── Track page view
  DB.trackEvent('page_view', { url: location.href });

  updateCartCount();
});