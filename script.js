/* =====================================================
   NOVA VIBE — script.js (Vanilla JS)
   ===================================================== */
'use strict';

/* ---------- CONFIGURAÇÃO ----------
   >>> Coloque aqui o número real de WhatsApp, só dígitos, com indicativo.
   >>> Exemplo: '244900000000'. Enquanto estiver vazio, nenhuma encomenda é enviada. */
const WHATSAPP_NUMBER = '';

/* ---------- DADOS (ilustrativos) ----------
   `image`: ficheiro de imagem na mesma pasta do index.html (pode trocar por fotos próprias/geradas por IA,
   mantendo o nome). `badge`: etiqueta opcional. Se a imagem não existir, mostra-se um quadro neutro. */
const PRODUCTS = [
  { id: 1, badge: 'Mais vendido', name: 'Vestido Elegance',  category: 'Vestuário',  price: 35000, image: 'vestido-elegance.jpg',
    desc: 'Vestido midi preto com decote quadrado e saia cruzada. Um clássico versátil para o dia e para a noite.' },
  { id: 2, badge: 'Novo', name: 'Bolsa Nova Classic', category: 'Bolsas',     price: 28000, image: 'bolsa-nova-classic.jpg',
    desc: 'Bolsa estruturada em tom bege com fecho dourado e duas alças. Elegância discreta para todas as ocasiões.' },
  { id: 3, name: 'Sapatilha Urban',   category: 'Calçados',   price: 42000, image: 'sapatilha-urban.jpg',
    desc: 'Sapatilha branca minimalista, confortável e fácil de combinar com qualquer visual.' },
  { id: 4, name: 'Relógio Vibe Gold', category: 'Acessórios', price: 25000, image: 'relogio-vibe-gold.jpg',
    desc: 'Relógio dourado com mostrador branco e bracelete em aço. Um toque de brilho no pulso.' },
  { id: 5, name: 'Óculos Milano',     category: 'Acessórios', price: 18000, image: 'oculos-milano.jpg',
    desc: 'Óculos de sol ovais com lentes esverdeadas e hastes douradas. Estilo e proteção.' },
  { id: 6, name: 'Carteira Classic',  category: 'Bolsas',     price: 15000, image: 'carteira-classic.jpg',
    desc: 'Carteira compacta preta com fecho dourado, ideal para o essencial.' },
  { id: 7, name: 'Relógio Dragon Gold', category: 'Acessórios', price: 48000, image: 'dragon-gold.jpg', badge: 'Destaque',
    desc: 'Relógio automático dourado com mostrador esculpido e detalhes brilhantes. Uma peça de afirmação.' },
  { id: 8, name: 'Sapatilha Cream Lux', category: 'Calçados', price: 46000, image: 'sapatilha-cream.jpg', badge: 'Novo',
    desc: 'Sapatilha em tom creme com sola alta e pormenores dourados. Conforto com um toque sofisticado.' }
];
const CATEGORIES = ['Vestuário', 'Calçados', 'Bolsas', 'Acessórios'];
const CATEGORY_SAMPLE = { 'Vestuário': 1, 'Calçados': 3, 'Bolsas': 2, 'Acessórios': 4 };

/* ---------- UTILITÁRIOS ---------- */
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const formatKz = n => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' Kz';
const normalize = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const svgUri = svg => 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);

/* ---------- IMAGENS ---------- */
const HERO_SOURCES = ['hero.jpg'];

/** Quadro neutro (sem desenhos) quando nenhuma imagem carrega. */
function missingImage(label) {
  const t = String(label).replace(/[<>&"]/g, '');
  return svgUri(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><rect width="400" height="500" fill="#efe7da"/><text x="200" y="245" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#7a7266">Imagem em falta</text><text x="200" y="278" text-anchor="middle" font-family="sans-serif" font-size="16" fill="#7a7266">${t}</text></svg>`);
}

/** Tenta cada fonte por ordem; se todas falharem, usa o quadro neutro. */
function setImage(img, sources, fallback) {
  const list = Array.isArray(sources) ? sources.slice() : [sources];
  const next = () => {
    if (!list.length) { img.onerror = null; img.src = fallback; return; }
    img.src = list.shift();
  };
  img.onerror = next;
  next();
}

/* ---------- ESTADO ---------- */
let activeFilter = 'Todos';
let sortBy = 'default';
let onlyFavs = false;
let favs = [];
try { favs = JSON.parse(localStorage.getItem('novaVibeFavs')); } catch (e) { favs = []; }
if (!Array.isArray(favs)) favs = [];
favs = favs.filter(id => PRODUCTS.some(p => p.id === id));
let searchTerm = '';
let cart = [];            // [{ id, qty }]
try { cart = JSON.parse(localStorage.getItem('novaVibeCart')); } catch (e) { cart = []; }
if (!Array.isArray(cart)) cart = [];
cart = cart.filter(i => i && PRODUCTS.some(p => p.id === i.id) && Number.isInteger(i.qty) && i.qty > 0);
let lastFocus = null;

/* Bloqueia o scroll da página quando modal/carrinho estão abertos */
const syncScrollLock = () => document.body.classList.toggle('no-scroll',
  !$('#product-modal').hidden || $('#cart-drawer').classList.contains('is-open'));

/* Mantém o foco do teclado dentro do modal ou do carrinho */
function trapFocus(e, container) {
  if (e.key !== 'Tab') return;
  const f = $$('button, input, a[href]', container).filter(el => !el.disabled && el.offsetParent !== null);
  if (!f.length) return;
  const first = f[0], last = f[f.length - 1];
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
}

const saveCart = () => { try { localStorage.setItem('novaVibeCart', JSON.stringify(cart)); } catch (e) { /* ignorar */ } };


/* ---------- FAVORITOS ---------- */
const HEART = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-8-4.8-8-11A4.5 4.5 0 0 1 12 6.8 4.5 4.5 0 0 1 20 9.5c0 6.2-8 11-8 11z"/></svg>';
const saveFavs = () => { try { localStorage.setItem('novaVibeFavs', JSON.stringify(favs)); } catch (e) { /* ignorar */ } };

/** Atualiza o aspeto de um botão de favorito. */
function syncFav(btn, id) {
  const on = favs.includes(id);
  btn.dataset.favId = id;
  btn.innerHTML = HEART;
  btn.classList.toggle('is-fav', on);
  btn.setAttribute('aria-pressed', on);
  btn.setAttribute('aria-label', on ? 'Remover dos favoritos' : 'Adicionar aos favoritos');
}
function updateFavUI() {
  const t = $('#fav-toggle');
  t.textContent = `♥ Favoritos (${favs.length})`;
  t.classList.toggle('is-active', onlyFavs);
  t.setAttribute('aria-pressed', onlyFavs);
  $$('[data-fav-id]').forEach(b => syncFav(b, Number(b.dataset.favId)));
}
function toggleFav(id) {
  favs = favs.includes(id) ? favs.filter(x => x !== id) : [...favs, id];
  saveFavs(); updateFavUI();
  if (onlyFavs) renderProducts();
}

/* ---------- CATEGORIAS ---------- */
function renderCategories() {
  const grid = $('#category-grid');
  CATEGORIES.forEach(cat => {
    const sample = PRODUCTS.find(p => p.id === CATEGORY_SAMPLE[cat]);
    const card = document.createElement('article');
    card.className = 'category-card';
    card.innerHTML = '<div class="art"><img alt="" loading="lazy"></div><h3></h3><button class="btn btn-outline btn-small">Ver peças</button>';
    setImage($('img', card), sample.image, missingImage(sample.name));
    $('h3', card).textContent = cat;
    $('button', card).addEventListener('click', () => {
      setFilter(cat);
      $('#produtos').scrollIntoView({ behavior: 'smooth' });
    });
    grid.appendChild(card);
  });
}

/* ---------- CATÁLOGO ---------- */
function setFilter(cat) {
  activeFilter = cat;
  $$('.chip[data-filter]').forEach(c => c.classList.toggle('is-active', c.dataset.filter === cat));
  renderProducts();
}

function renderProducts() {
  const grid = $('#product-grid');
  const term = normalize(searchTerm.trim());
  const list = PRODUCTS.filter(p =>
    (activeFilter === 'Todos' || p.category === activeFilter) &&
    (!onlyFavs || favs.includes(p.id)) &&
    normalize(p.name).includes(term));
  if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
  else if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
  else if (sortBy === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  grid.innerHTML = '';
  list.forEach(p => {
    const card = document.createElement('article');
    card.className = 'product-card';
    card.innerHTML = `
      <div class="thumb"><img alt="" loading="lazy"><button class="fav"></button></div>
      <p class="cat"></p><h3></h3><p class="price"></p>
      <button class="btn btn-outline js-view">Ver produto</button>
      <button class="btn btn-dark js-add">+ Adicionar</button>`;
    const img = $('img', card);
    img.alt = p.name;
    setImage(img, p.image, missingImage(p.name));
    $('.cat', card).textContent = p.category;
    $('h3', card).textContent = p.name;
    $('.price', card).textContent = formatKz(p.price);
    syncFav($('.fav', card), p.id);
    if (p.badge) {
      const tag = document.createElement('span');
      tag.className = 'tag'; tag.textContent = p.badge;
      $('.thumb', card).appendChild(tag);
    }
    $('.js-view', card).addEventListener('click', () => openModal(p));
    $('.js-add', card).addEventListener('click', () => addToCart(p.id));
    grid.appendChild(card);
  });
  $('#result-count').textContent = list.length === 1 ? '1 produto encontrado' : `${list.length} produtos encontrados`;
  $('#empty-msg').textContent = onlyFavs && !favs.length
    ? 'Ainda não tem favoritos. Toque no coração de um produto para o guardar.'
    : 'Nenhum produto encontrado. Tente outra pesquisa ou filtro.';
  $('#empty-msg').hidden = list.length > 0;
}

/* ---------- MODAL ---------- */
let modalProduct = null;
function openModal(p) {
  modalProduct = p;
  lastFocus = document.activeElement;
  const img = $('#modal-img');
  img.alt = p.name;
  setImage(img, p.image, missingImage(p.name));
  $('#modal-cat').textContent = p.category;
  $('#modal-title').textContent = p.name;
  $('#modal-price').textContent = formatKz(p.price);
  $('#modal-desc').textContent = p.desc;
  syncFav($('#modal-fav'), p.id);
  $('#modal-overlay').hidden = false;
  $('#product-modal').hidden = false;
  syncScrollLock();
  $('#modal-close').focus();
}
function closeModal() {
  $('#modal-overlay').hidden = true;
  $('#product-modal').hidden = true;
  syncScrollLock();
  if (lastFocus) lastFocus.focus();
}

/* ---------- CARRINHO ---------- */
function addToCart(id) {
  const item = cart.find(i => i.id === id);
  if (item) item.qty += 1; else cart.push({ id, qty: 1 });
  saveCart(); renderCart();
  showToast(PRODUCTS.find(p => p.id === id));
}
function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) cart = cart.filter(i => i.id !== id);
  saveCart(); renderCart();
}
function removeItem(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart(); renderCart();
}
const cartTotal = () => cart.reduce((s, i) => s + i.qty * PRODUCTS.find(p => p.id === i.id).price, 0);

function renderCart() {
  const box = $('#cart-items');
  box.innerHTML = '';
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const badge = $('#cart-count');
  badge.textContent = count; badge.hidden = count === 0;

  if (!cart.length) {
    box.innerHTML = '<p class="cart-empty">O seu carrinho está vazio.</p>';
  }
  cart.forEach(({ id, qty }) => {
    const p = PRODUCTS.find(x => x.id === id);
    const row = document.createElement('div');
    row.className = 'cart-item';
    row.innerHTML = `
      <div class="thumb"><img alt=""></div>
      <div>
        <div class="ci-top"><h4></h4>
          <button class="trash" aria-label="Remover"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6"/></svg></button></div>
        <p class="ci-unit"></p>
        <div class="ci-bottom">
          <div class="qty"><button class="js-minus" aria-label="Diminuir quantidade">−</button><span></span><button class="js-plus" aria-label="Aumentar quantidade">+</button></div>
          <span class="ci-sub"></span>
        </div>
      </div>`;
    const img = $('img', row);
    img.alt = p.name;
    setImage(img, p.image, missingImage(p.name));
    $('h4', row).textContent = p.name;
    $('.ci-unit', row).textContent = formatKz(p.price) + ' / un.';
    $('.qty span', row).textContent = qty;
    $('.ci-sub', row).textContent = formatKz(p.price * qty);
    $('.trash', row).addEventListener('click', () => removeItem(id));
    $('.js-minus', row).addEventListener('click', () => changeQty(id, -1));
    $('.js-plus', row).addEventListener('click', () => changeQty(id, 1));
    box.appendChild(row);
  });
  $('#cart-total').textContent = formatKz(cartTotal());
}

function openCart() {
  lastFocus = document.activeElement;
  $('#cart-overlay').hidden = false;
  const d = $('#cart-drawer');
  d.classList.add('is-open'); d.setAttribute('aria-hidden', 'false');
  syncScrollLock();
  $('#cart-close').focus();
}
function closeCart() {
  $('#cart-overlay').hidden = true;
  const d = $('#cart-drawer');
  d.classList.remove('is-open'); d.setAttribute('aria-hidden', 'true');
  syncScrollLock();
  if (lastFocus) lastFocus.focus();
}

function showToast(p) {
  const wrap = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = '<div><strong>Produto adicionado ao carrinho ✓</strong><small></small></div><button>Ver carrinho</button>';
  $('small', t).textContent = `1 × ${p.name}`;
  $('button', t).addEventListener('click', () => { t.remove(); openCart(); });
  wrap.appendChild(t);
  while (wrap.children.length > 3) wrap.firstChild.remove();
  setTimeout(() => t.remove(), 3500);
}
function showNotice(msg) {
  const wrap = $('#toasts');
  const t = document.createElement('div');
  t.className = 'toast notice';
  t.setAttribute('role', 'alert');
  t.textContent = msg;
  wrap.appendChild(t);
  setTimeout(() => t.remove(), 5000);
}

/* ---------- ENCOMENDA POR WHATSAPP ---------- */
function showCartError(msg) {
  const e = $('#cart-error');
  e.textContent = msg; e.hidden = !msg;
}
function checkout() {
  const name = $('#customer-name').value.trim();
  // Validações antes de gerar a encomenda
  if (!cart.length) return showCartError('Adicione pelo menos um produto ao carrinho.');
  if (name.length < 2) { $('#customer-name').focus(); return showCartError('Indique o seu nome para continuar.'); }
  if (!/^\d{8,15}$/.test(WHATSAPP_NUMBER)) {
    return showCartError('O número de WhatsApp da loja ainda não foi configurado (variável WHATSAPP_NUMBER em script.js).');
  }
  showCartError('');
  const lines = cart.map(({ id, qty }) => {
    const p = PRODUCTS.find(x => x.id === id);
    return `• ${qty} × ${p.name} — ${formatKz(p.price * qty)}`;
  });
  const text = `Olá! Gostaria de fazer a seguinte encomenda na Nova Vibe:\n\n${lines.join('\n')}\n\nTotal: ${formatKz(cartTotal())}\nNome: ${name}`;
  // Apenas abre o WhatsApp com a mensagem preparada. A encomenda só é enviada quando o cliente carregar em "Enviar" no WhatsApp.
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

/* ---------- PERGUNTAR SOBRE UM PRODUTO ---------- */
function askAboutProduct(p) {
  if (!/^\d{8,15}$/.test(WHATSAPP_NUMBER)) {
    return showNotice('O número de WhatsApp ainda não foi configurado. Edite a variável WHATSAPP_NUMBER em script.js.');
  }
  const text = `Olá! Tenho interesse em: ${p.name} (${formatKz(p.price)}). Pode dar-me mais informações?`;
  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank', 'noopener');
}

/* ---------- ANIMAÇÃO SUAVE AO ROLAR (respeita "reduzir movimento") ---------- */
function setupReveal() {
  if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const io = new IntersectionObserver(entries => entries.forEach(en => {
    if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
  }), { threshold: 0.05 });
  $$('.benefits-grid, .category-grid, .product-grid, .reviews-grid, .faq-list, .contact-grid, .about-inner').forEach(el => {
    el.classList.add('reveal'); io.observe(el);
  });
}

/* ---------- LIGAÇÕES GERAIS DE WHATSAPP ---------- */
function setupWhatsAppLinks() {
  const valid = /^\d{8,15}$/.test(WHATSAPP_NUMBER);
  $$('.js-whatsapp').forEach(a => {
    if (valid) {
      a.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent('Olá! Gostaria de saber mais sobre a Nova Vibe.')}`;
    } else {
      a.addEventListener('click', e => {
        e.preventDefault();
        showNotice('O número de WhatsApp ainda não foi configurado. Edite a variável WHATSAPP_NUMBER em script.js.');
      });
    }
  });
}

/* ---------- MENU MÓVEL ---------- */
function setupMenu() {
  const btn = $('#menu-toggle'), nav = $('#main-nav');
  const setOpen = open => { nav.classList.toggle('is-open', open); btn.setAttribute('aria-expanded', open); };
  btn.addEventListener('click', () => setOpen(!nav.classList.contains('is-open')));
  $$('a', nav).forEach(a => a.addEventListener('click', () => setOpen(false)));
  document.addEventListener('click', e => { if (!nav.contains(e.target) && !btn.contains(e.target)) setOpen(false); });
}

/* ---------- INICIALIZAÇÃO ---------- */
document.addEventListener('DOMContentLoaded', () => {
  setImage($('#hero-img'), HERO_SOURCES, missingImage('Imagem principal'));
  renderCategories();
  renderProducts();
  renderCart();
  setupMenu();
  setupWhatsAppLinks();
  setupReveal();
  updateFavUI();

  $('#search').addEventListener('input', e => { searchTerm = e.target.value; renderProducts(); });
  $$('.chip[data-filter]').forEach(c => c.addEventListener('click', () => setFilter(c.dataset.filter)));
  $('#sort').addEventListener('change', e => { sortBy = e.target.value; renderProducts(); });
  $('#fav-toggle').addEventListener('click', () => { onlyFavs = !onlyFavs; updateFavUI(); renderProducts(); });
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-fav-id]');
    if (b) toggleFav(Number(b.dataset.favId));
  });
  $('#modal-ask').addEventListener('click', () => askAboutProduct(modalProduct));

  $('#modal-close').addEventListener('click', closeModal);
  $('#modal-overlay').addEventListener('click', closeModal);
  $('#modal-add').addEventListener('click', () => { addToCart(modalProduct.id); closeModal(); });

  $('#cart-toggle').addEventListener('click', openCart);
  $('#cart-close').addEventListener('click', closeCart);
  $('#cart-overlay').addEventListener('click', closeCart);
  $('#checkout-btn').addEventListener('click', checkout);
  $('#customer-name').addEventListener('input', () => showCartError(''));

  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#product-modal').hidden) closeModal();
    else if ($('#cart-drawer').classList.contains('is-open')) closeCart();
  });
  $('#product-modal').addEventListener('keydown', e => trapFocus(e, $('#product-modal')));
  $('#cart-drawer').addEventListener('keydown', e => trapFocus(e, $('#cart-drawer')));

  $('#year').textContent = new Date().getFullYear();
});
