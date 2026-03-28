// Detect if we're on the English version (/en/)
const isEnglish = window.location.pathname.startsWith('/en');
const imgPrefix = isEnglish ? '/images/' : 'images/';

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

async function fetchSiteData() {
  const res = await fetch('/api/site-data');
  if (!res.ok) throw new Error('Failed to load site data');
  return res.json();
}

function createDishCard(item) {
  const name = escapeHtml(item.name);
  const desc = escapeHtml(item.description);
  const img = escapeHtml(item.image);
  const price = Number(item.price) || 0;
  return `
    <article class="dish-card">
      <img src="${img}" alt="${name}">
      <div class="dish-body">
        <div class="dish-top">
          <h3>${name}</h3>
          <span>${price} L</span>
        </div>
        <p>${desc}</p>
      </div>
    </article>
  `;
}

function applyText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function openMenuModal(item) {
  if (!item || !item.id) return;
  window.location.href = `product.html?id=${item.id}`;
}

function closeMenuModal() {
  // Deprecated: Modal replaced by dedicated product pages.
}

function renderMenuCategories(siteData) {
  const tabsContainer = document.getElementById('categoryTabsContainer');
  const menuContainer = document.getElementById('fullMenuContainer');
  if (!tabsContainer || !menuContainer) return;

  const categories = siteData.menuCategories || [];
  
  tabsContainer.innerHTML = categories.map((cat, index) => {
    const catName = escapeHtml(isEnglish && cat.name_en ? cat.name_en : cat.name);
    const catId = `category-${index}`;
    return `<a href="#${catId}" class="category-chip" data-category-link>${catName}</a>`;
  }).join('');

  menuContainer.innerHTML = categories.map((cat, index) => {
    const catName = escapeHtml(isEnglish && cat.name_en ? cat.name_en : cat.name);
    const catId = `category-${index}`;
    
    const itemsHtml = (cat.items || []).map(item => {
      const itemName = escapeHtml(isEnglish && item.name_en ? item.name_en : item.name);
      const itemDesc = escapeHtml(isEnglish && item.description_en ? item.description_en : item.description) || (isEnglish ? 'No description' : 'Pa pershkrim');
      const itemPrice = Number(item.price) || 0;
      const safeJson = escapeHtml(JSON.stringify(item));
      const imgSrc = escapeHtml((item.image || '').replace(/^images\//, imgPrefix));
      
      return `
        <article class="modern-dish-card" data-menu-item="${safeJson}">
            <div class="modern-dish-img-wrap">
                <img src="${imgSrc}" alt="${itemName}">
            </div>
            <div class="modern-dish-content">
                <h4>${itemName}</h4>
                <p class="modern-dish-desc">${itemDesc}</p>
                <div class="modern-dish-footer">
                    <span class="modern-dish-price">${itemPrice} L</span>
                </div>
            </div>
        </article>
      `;
    }).join('');

    return `
      <div class="menu-section-block" id="${catId}">
        <h2 class="menu-section-title">${catName}</h2>
        <div class="modern-menu-grid">
          ${itemsHtml}
        </div>
      </div>
    `;
  }).join('');

  menuContainer.querySelectorAll('[data-menu-item]').forEach(node => {
    node.addEventListener('click', () => {
      try {
        const raw = node.getAttribute('data-menu-item')
          .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
        openMenuModal(JSON.parse(raw));
      } catch (e) {
        console.error('Failed to parse menu item data');
      }
    });
  });

  observeCategoriesForChips();
}

function observeCategoriesForChips() {
  const chips = document.querySelectorAll('.category-chip');
  const sections = document.querySelectorAll('.menu-section-block');
  
  if (chips.length === 0 || sections.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        chips.forEach(c => c.classList.remove('active'));
        const activeChip = document.querySelector(`.category-chip[href="#${entry.target.id}"]`);
        if (activeChip) {
            activeChip.classList.add('active');
            activeChip.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      }
    });
  }, { rootMargin: '-30% 0px -60% 0px' });

  sections.forEach(sec => observer.observe(sec));
}

function applySiteData(siteData) {
  [
    ['brandTitle', siteData.brandTitle],
    ['brandSub', siteData.brandSub],
    ['heroBadge', siteData.heroBadge],
    ['heroTitle', siteData.heroTitle],
    ['heroDescription', siteData.heroDescription],
    ['aboutTag', siteData.aboutTag],
    ['aboutTitle', siteData.aboutTitle],
    ['aboutLead', siteData.aboutLead],
    ['aboutDescription', siteData.aboutDescription],
    ['contactAddress', siteData.contactAddress],
    ['contactPhone', siteData.contactPhone],
    ['contactHours', siteData.contactHours],
    ['contactInstagram', siteData.contactInstagram],
    ['contactFacebook', siteData.contactFacebook],
    ['contactWhatsapp', siteData.whatsappNumber],
    ['menuPageTitle', siteData.menuPageTitle],
    ['menuPageDescription', siteData.menuPageDescription]
  ].forEach(([id, value]) => applyText(id, value));

  const heroImage = document.getElementById('heroImage');
  if (heroImage && siteData.heroImage) heroImage.src = siteData.heroImage.replace(/^images\//, imgPrefix);

  const mapBtn = document.getElementById('heroMapBtn');
  if (mapBtn) mapBtn.href = siteData.mapLink;

  const mapLinkEl = document.getElementById('mapLinkEl');
  if (mapLinkEl) mapLinkEl.href = siteData.mapLink;

  const instagramLinkEl = document.getElementById('instagramLinkEl');
  if (instagramLinkEl) instagramLinkEl.href = siteData.instagramLink;

  const facebookLinkEl = document.getElementById('facebookLinkEl');
  if (facebookLinkEl) facebookLinkEl.href = siteData.facebookLink;

  const cleanPhone = String(siteData.contactPhone || '').replace(/\D/g, '');
  const fixedPhoneLinks = [document.getElementById('fixedPhoneLink'), document.getElementById('fixedPhoneLinkEN')];
  fixedPhoneLinks.forEach(el => {
    if (el && siteData.contactPhone) el.href = `tel:${cleanPhone}`;
  });

  const whatsappLinkEl = document.getElementById('whatsappLinkEl');
  const cleanWa = String(siteData.whatsappNumber || '').replace(/\D/g, '');
  const fullWa = cleanWa.startsWith('355') ? cleanWa : `355${cleanWa.replace(/^0/, '')}`;
  if (whatsappLinkEl) {
    whatsappLinkEl.href = `https://wa.me/${fullWa}`;
  }
  
  const fixedWaLinks = [document.getElementById('fixedWaLink'), document.getElementById('fixedWaLinkEN')];
  fixedWaLinks.forEach(el => {
    if (el && siteData.whatsappNumber) el.href = `https://wa.me/${fullWa}`;
  });
  const featuredGrid = document.getElementById('featuredGrid');
  if (featuredGrid) {
    featuredGrid.innerHTML = (siteData.featuredDishes || []).map(createDishCard).join('');
  }

  const storyImages = document.getElementById('storyImages');
  if (storyImages) {
    storyImages.innerHTML = (siteData.storyImages || []).map(src => {
      const safeSrc = escapeHtml(src.replace(/^images\//, imgPrefix));
      return `<img src="${safeSrc}" alt="Romeo Grill">`;
    }).join('');
  }

  renderMenuCategories(siteData);
}

function initMenuToggle() {
  const menuToggle = document.getElementById('menuToggle');
  const navLinks = document.getElementById('navLinks');
  if (!menuToggle || !navLinks) return;
  menuToggle.addEventListener('click', () => {
    const isShowing = navLinks.classList.contains('show');
    if (isShowing) {
      navLinks.classList.remove('show');
    } else {
      navLinks.classList.add('show');
    }
  });
  navLinks.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', () => navLinks.classList.remove('show'));
  });
  
  // Close menu when clicking outside on mobile
  document.addEventListener('click', (e) => {
    if (navLinks.classList.contains('show') && !navLinks.contains(e.target) && !menuToggle.contains(e.target)) {
      navLinks.classList.remove('show');
    }
  });
}

function initMenuModal() {
  document.getElementById('menuModalClose')?.addEventListener('click', closeMenuModal);
  document.getElementById('menuModalCloseBtn')?.addEventListener('click', closeMenuModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMenuModal();
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    const siteData = await fetchSiteData();
    applySiteData(siteData);
    initMenuToggle();
    initMenuModal();
    
    // --- Scroll Animations & Interactivity ---
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add("scroll-fade-in-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -50px 0px" });

    // Try observing elements slightly after load so dynamic DOM has time
    setTimeout(() => {
      document.querySelectorAll(".menu-section-title, .modern-dish-card, .glass-card, .split-grid > div").forEach(el => {
        el.classList.add("scroll-fade-in");
        observer.observe(el);
      });
    }, 100);

  } catch (err) {
    console.error(err);
  }
});

