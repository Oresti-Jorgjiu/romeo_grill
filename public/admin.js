let currentSiteData = null;

const defaultSiteData = {
  brandTitle: "Romeo Grill",
  brandSub: "Korce, Albania",
  heroBadge: "Fast Food • Grill • Gjiro",
  heroTitle: "Romeo Grill",
  heroDescription: "",
  heroImage: "images/storefront.jpeg",
  aboutTag: "",
  aboutTitle: "",
  aboutLead: "",
  aboutDescription: "",
  contactAddress: "Korce, Albania",
  contactPhone: "0696930010",
  contactHours: "09:00 - 23:00",
  contactInstagram: "@romeogrill2024",
  contactFacebook: "Romeo Grill",
  mapLink: "",
  instagramLink: "",
  facebookLink: "",
  whatsappNumber: "0696472338",
  menuPageTitle: "",
  menuPageDescription: "",
  storyImages: [],
  featuredDishes: [],
  menuCategories: []
};


// --- Helpers ---

function byId(id) {
  return document.getElementById(id);
}


// --- API ---

async function fetchMe() {
  const res = await fetch('/api/admin/me');
  return res.json();
}

async function fetchSiteData() {
  const res = await fetch('/api/admin/site-data');
  if (!res.ok) throw new Error('Failed to fetch site data');
  return res.json();
}

async function fetchAnalytics() {
  const res = await fetch('/api/admin/analytics');
  if (!res.ok) throw new Error('Failed to fetch analytics');
  return res.json();
}

async function login(username, password) {
  const res = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  });
  return { ok: res.ok, data: await res.json() };
}

async function logout() {
  await fetch('/api/admin/logout', { method: 'POST' });
  location.href = '/admin';
}

async function saveSiteData(data) {
  const res = await fetch('/api/admin/site-data', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  return { ok: res.ok, data: await res.json() };
}

async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);
  const res = await fetch('/api/admin/upload-image', {
    method: 'POST',
    body: formData
  });
  return { ok: res.ok, data: await res.json() };
}

async function changePassword(currentPassword, newPassword) {
  const res = await fetch('/api/admin/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  });
  return { ok: res.ok, data: await res.json() };
}


// --- Tab Navigation ---

function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      const target = document.getElementById(`tab-${tab.dataset.tab}`);
      if (target) target.classList.add('active');
    });
  });
}


// --- Analytics ---

function renderAnalytics(data) {
  byId('statToday').textContent = data.todayViews.toLocaleString();
  byId('statWeek').textContent = data.weekViews.toLocaleString();
  byId('statMonth').textContent = data.monthViews.toLocaleString();
  byId('statTotal').textContent = data.totalViews.toLocaleString();

  // Bar chart
  const chartContainer = byId('dailyChart');
  if (chartContainer && data.dailyData.length > 0) {
    const maxViews = Math.max(...data.dailyData.map(d => d.views), 1);
    chartContainer.innerHTML = data.dailyData.map(d => {
      const height = Math.max((d.views / maxViews) * 180, 2);
      const dateLabel = d.date.slice(5); // MM-DD
      return `
        <div class="chart-bar-wrap" title="${d.date}: ${d.views} views">
          <div class="chart-bar" style="height:${height}px"></div>
          <span class="chart-date">${dateLabel}</span>
        </div>
      `;
    }).join('');
  } else if (chartContainer) {
    chartContainer.innerHTML = '<p class="muted" style="margin:auto;">No data yet. Views will appear here once visitors start browsing.</p>';
  }

  // Top pages
  const topPagesEl = byId('topPages');
  if (topPagesEl && data.topPages.length > 0) {
    topPagesEl.innerHTML = data.topPages.map(p => `
      <div class="top-page-row">
        <span>${p.path}</span>
        <span>${p.views} views</span>
      </div>
    `).join('');
  } else if (topPagesEl) {
    topPagesEl.innerHTML = '<p class="muted">No page data yet.</p>';
  }
}


// --- Form rendering ---

function fillBasicInputs(data) {
  // Not needed anymore since we removed the Website Content tab.
}

function createFeaturedEditor(item, index) {
  const div = document.createElement('div');
  div.className = 'repeat-card';
  const galStr = (item.gallery || []).join(',');
  div.innerHTML = `
    <div class="repeat-header">
      <h4>Featured Dish ${index + 1}</h4>
      <button type="button" class="btn btn-secondary small-btn remove-featured">Remove</button>
    </div>
    <div class="admin-grid two">
      <input class="featured-id" placeholder="ID" value="${item.id || ''}">
      <input class="featured-name" placeholder="Name" value="${item.name || ''}">
      <input class="featured-price" type="number" placeholder="Price" value="${item.price || 0}">
      <textarea class="featured-description" rows="3" placeholder="Description" style="grid-column: span 2;">${item.description || ''}</textarea>
    </div>
    <div class="inline-gallery" style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
      <h5 style="margin-top:0; margin-bottom: 8px; font-size: 0.85rem; color: #aaa;">Photos (Main & Gallery)</h5>
      <input type="hidden" class="featured-image" value="${item.image || ''}">
      <input type="hidden" class="featured-gallery" value="${galStr}">
      
      <div class="gallery-previews" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; margin-bottom: 8px;">
        ${item.image ? `<div class="preview" style="position:relative; width:80px; height:80px; flex-shrink:0; border-radius:8px; overflow:hidden; border:2px solid #ff8d2a;"><img src="${item.image}" style="width:100%; height:100%; object-fit:cover;"><button type="button" class="rm-img-btn" data-target="main" style="position:absolute; top:4px; right:4px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;" title="Remove Main Photo">x</button><span style="position:absolute; bottom:0; left:0; right:0; background:rgba(255,141,42,0.8); color:#000; font-size:10px; text-align:center; font-weight:bold;">MAIN</span></div>` : ''}
        ${(item.gallery || []).map(g => `<div class="preview" style="position:relative; width:80px; height:80px; flex-shrink:0; border-radius:8px; overflow:hidden;"><img src="${g}" style="width:100%; height:100%; object-fit:cover;"><button type="button" class="rm-img-btn" data-target="gallery" data-src="${g}" style="position:absolute; top:4px; right:4px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;" title="Remove Photo">x</button></div>`).join('')}
      </div>
      
      <div style="display:flex; gap:8px;">
        <input type="file" class="item-file-input" accept="image/*" multiple>
        <button type="button" class="btn btn-primary small-btn upload-inline-btn" style="flex-shrink:0;">Upload Selected</button>
      </div>
    </div>
  `;
  
  div.querySelector('.remove-featured').addEventListener('click', () => div.remove());
  
  const uploadBtn = div.querySelector('.upload-inline-btn');
  const fileInput = div.querySelector('.item-file-input');
  uploadBtn.addEventListener('click', async () => {
    const files = fileInput.files;
    if (!files.length) return alert('Select files first');
    uploadBtn.textContent = 'Uploading...';
    uploadBtn.disabled = true;
    
    let currentMain = div.querySelector('.featured-image').value;
    let currentGalStr = div.querySelector('.featured-gallery').value;
    let currentGal = currentGalStr ? currentGalStr.split(',') : [];
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const res = await uploadImage(file);
      if (res.ok && res.data.path) {
        if (!currentMain) {
          currentMain = res.data.path;
        } else {
          currentGal.push(res.data.path);
        }
      }
    }
    
    div.querySelector('.featured-image').value = currentMain;
    div.querySelector('.featured-gallery').value = currentGal.join(',');
    
    alert('Uploaded! Please hit Save Everything at the bottom to refresh the UI.');
    uploadBtn.textContent = 'Upload Selected';
    uploadBtn.disabled = false;
    fileInput.value = '';
  });
  
  const previews = div.querySelector('.gallery-previews');
  previews.addEventListener('click', (e) => {
    if (e.target.classList.contains('rm-img-btn')) {
      const type = e.target.dataset.target;
      if (type === 'main') {
        div.querySelector('.featured-image').value = '';
        e.target.closest('.preview').remove();
      } else {
        const src = e.target.dataset.src;
        let currentGalStr = div.querySelector('.featured-gallery').value;
        let currentGal = currentGalStr ? currentGalStr.split(',') : [];
        currentGal = currentGal.filter(g => g !== src);
        div.querySelector('.featured-gallery').value = currentGal.join(',');
        e.target.closest('.preview').remove();
      }
    }
  });

  return div;
}

function createMenuItemEditor(item, itemIndex) {
  const div = document.createElement('div');
  div.className = 'repeat-card';
  const galStr = (item.gallery || []).join(',');
  div.innerHTML = `
    <div class="repeat-header">
      <h4>Item ${itemIndex + 1}</h4>
      <button type="button" class="btn btn-secondary small-btn remove-item">Remove</button>
    </div>
    <div class="admin-grid two">
      <input class="item-id" placeholder="ID" value="${item.id || ''}">
      <input class="item-name" placeholder="Name" value="${item.name || ''}">
      <input class="item-price" type="number" placeholder="Price" value="${item.price || 0}">
      <textarea class="item-description" rows="3" placeholder="Description">${item.description || ''}</textarea>
      <textarea class="item-ingredients" rows="3" placeholder="Ingredients" style="grid-column: span 2;">${item.ingredients || ''}</textarea>
    </div>
    <div class="inline-gallery" style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 8px;">
      <h5 style="margin-top:0; margin-bottom: 8px; font-size: 0.85rem; color: #aaa;">Photos (Main & Gallery)</h5>
      <input type="hidden" class="item-image" value="${item.image || ''}">
      <input type="hidden" class="item-gallery" value="${galStr}">
      
      <div class="gallery-previews" style="display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; margin-bottom: 8px;">
        ${item.image ? `<div class="preview" style="position:relative; width:80px; height:80px; flex-shrink:0; border-radius:8px; overflow:hidden; border:2px solid #ff8d2a;"><img src="${item.image}" style="width:100%; height:100%; object-fit:cover;"><button type="button" class="rm-img-btn" data-target="main" style="position:absolute; top:4px; right:4px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;" title="Remove Main Photo">x</button><span style="position:absolute; bottom:0; left:0; right:0; background:rgba(255,141,42,0.8); color:#000; font-size:10px; text-align:center; font-weight:bold;">MAIN</span></div>` : ''}
        ${(item.gallery || []).map(g => `<div class="preview" style="position:relative; width:80px; height:80px; flex-shrink:0; border-radius:8px; overflow:hidden;"><img src="${g}" style="width:100%; height:100%; object-fit:cover;"><button type="button" class="rm-img-btn" data-target="gallery" data-src="${g}" style="position:absolute; top:4px; right:4px; background:red; color:white; border:none; border-radius:50%; width:20px; height:20px; cursor:pointer;" title="Remove Photo">x</button></div>`).join('')}
      </div>
      
      <div style="display:flex; gap:8px;">
        <input type="file" class="item-file-input" accept="image/*" multiple>
        <button type="button" class="btn btn-primary small-btn upload-inline-btn" style="flex-shrink:0;">Upload Selected</button>
      </div>
    </div>
  `;
  
  div.querySelector('.remove-item').addEventListener('click', () => div.remove());
  
  const uploadBtn = div.querySelector('.upload-inline-btn');
  const fileInput = div.querySelector('.item-file-input');
  uploadBtn.addEventListener('click', async () => {
    const files = fileInput.files;
    if (!files.length) return alert('Select files first');
    uploadBtn.textContent = 'Uploading...';
    uploadBtn.disabled = true;
    
    let currentMain = div.querySelector('.item-image').value;
    let currentGalStr = div.querySelector('.item-gallery').value;
    let currentGal = currentGalStr ? currentGalStr.split(',') : [];
    
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      const res = await uploadImage(file);
      if (res.ok && res.data.path) {
        if (!currentMain) {
          currentMain = res.data.path;
        } else {
          currentGal.push(res.data.path);
        }
      }
    }
    
    div.querySelector('.item-image').value = currentMain;
    div.querySelector('.item-gallery').value = currentGal.join(',');
    
    alert('Uploaded! Please hit Save Everything at the bottom to refresh the UI.');
    uploadBtn.textContent = 'Upload Selected';
    uploadBtn.disabled = false;
    fileInput.value = '';
  });
  
  const previews = div.querySelector('.gallery-previews');
  previews.addEventListener('click', (e) => {
    if (e.target.classList.contains('rm-img-btn')) {
      const type = e.target.dataset.target;
      if (type === 'main') {
        div.querySelector('.item-image').value = '';
        e.target.closest('.preview').remove();
      } else {
        const src = e.target.dataset.src;
        let currentGalStr = div.querySelector('.item-gallery').value;
        let currentGal = currentGalStr ? currentGalStr.split(',') : [];
        currentGal = currentGal.filter(g => g !== src);
        div.querySelector('.item-gallery').value = currentGal.join(',');
        e.target.closest('.preview').remove();
      }
    }
  });

  return div;
}

function createCategoryEditor(category, index) {
  const wrap = document.createElement('div');
  wrap.className = 'repeat-card menu-category-card';
  wrap.innerHTML = `
    <div class="repeat-header">
      <h4>Category ${index + 1}</h4>
      <div class="inline-actions">
        <button type="button" class="btn btn-primary small-btn add-item">+ Add Item</button>
        <button type="button" class="btn btn-secondary small-btn remove-category">Remove</button>
      </div>
    </div>
    <input class="category-name" placeholder="Category name" value="${category.name || ''}">
    <div class="category-items-list"></div>
  `;
  const itemList = wrap.querySelector('.category-items-list');
  (category.items || []).forEach((item, itemIndex) => itemList.appendChild(createMenuItemEditor(item, itemIndex)));
  wrap.querySelector('.add-item').addEventListener('click', () => {
    itemList.appendChild(createMenuItemEditor({ id: '', name: '', price: 0, description: '', ingredients: '', image: '' }, itemList.children.length));
  });
  wrap.querySelector('.remove-category').addEventListener('click', () => wrap.remove());
  return wrap;
}

function renderAdminForm(data) {
  fillBasicInputs(data);
  const featuredAdminList = byId('featuredAdminList');
  const menuAdminList = byId('menuAdminList');
  featuredAdminList.innerHTML = '';
  menuAdminList.innerHTML = '';
  (data.featuredDishes || []).forEach((item, index) => featuredAdminList.appendChild(createFeaturedEditor(item, index)));
  (data.menuCategories || []).forEach((category, index) => menuAdminList.appendChild(createCategoryEditor(category, index)));
}


// --- Data collection ---

function collectFeatured() {
  return [...document.querySelectorAll('#featuredAdminList .repeat-card')].map(card => ({
    id: card.querySelector('.featured-id').value.trim(),
    name: card.querySelector('.featured-name').value.trim(),
    price: Number(card.querySelector('.featured-price').value || 0),
    image: card.querySelector('.featured-image').value.trim(),
    description: card.querySelector('.featured-description').value.trim(),
    gallery: (card.querySelector('.featured-gallery').value || '').split(',').map(s => s.trim()).filter(Boolean)
  })).filter(item => item.name);
}

function collectMenuCategories() {
  return [...document.querySelectorAll('#menuAdminList .menu-category-card')].map(categoryCard => ({
    name: categoryCard.querySelector('.category-name').value.trim(),
    items: [...categoryCard.querySelectorAll('.category-items-list > .repeat-card')].map(itemCard => ({
      id: itemCard.querySelector('.item-id').value.trim(),
      name: itemCard.querySelector('.item-name').value.trim(),
      price: Number(itemCard.querySelector('.item-price').value || 0),
      image: itemCard.querySelector('.item-image').value.trim(),
      description: itemCard.querySelector('.item-description').value.trim(),
      ingredients: itemCard.querySelector('.item-ingredients').value.trim(),
      gallery: (itemCard.querySelector('.item-gallery').value || '').split(',').map(s => s.trim()).filter(Boolean)
    })).filter(item => item.name)
  })).filter(category => category.name);
}

function collectAllData() {
  const base = currentSiteData || defaultSiteData;
  return {
    ...base,
    featuredDishes: collectFeatured(),
    menuCategories: collectMenuCategories()
  };
}


// --- Init ---

document.addEventListener('DOMContentLoaded', async () => {
  const body = document.body;

  // LOGIN PAGE
  if (body.dataset.page === 'login') {
    const auth = await fetchMe();
    if (auth.authenticated) {
      location.href = '/dashboard';
      return;
    }

    byId('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const result = await login(byId('username').value.trim(), byId('password').value);
      if (!result.ok) {
        byId('loginError').textContent = result.data.error || 'Login failed.';
        return;
      }
      location.href = '/dashboard';
    });
    return;
  }

  // DASHBOARD PAGE
  if (body.dataset.page === 'dashboard') {
    const auth = await fetchMe();
    if (!auth.authenticated) {
      location.href = '/admin';
      return;
    }

    byId('adminWelcome').textContent = `Admin: ${auth.user.username}`;

    // Init tabs
    initTabs();

    // Load analytics
    try {
      const analytics = await fetchAnalytics();
      renderAnalytics(analytics);
    } catch (e) {
      console.error('Analytics load failed:', e);
    }

    // Load site data
    const data = await fetchSiteData();
    currentSiteData = data;
    renderAdminForm(currentSiteData);

    // Add featured dish
    byId('addFeaturedBtn').addEventListener('click', () => {
      byId('featuredAdminList').appendChild(createFeaturedEditor({ id: '', name: '', price: 0, description: '', image: '' }, byId('featuredAdminList').children.length));
    });

    // Add category
    byId('addCategoryBtn').addEventListener('click', () => {
      byId('menuAdminList').appendChild(createCategoryEditor({ name: '', items: [] }, byId('menuAdminList').children.length));
    });

    // Save
    byId('saveAllBtn').addEventListener('click', async () => {
      const data = collectAllData();
      const result = await saveSiteData(data);
      if (!result.ok) {
        alert(result.data.error || 'Save failed.');
        return;
      }
      currentSiteData = data;
      renderAdminForm(currentSiteData);
      alert('Saved successfully!');
    });

    // Reset
    byId('resetFormBtn').addEventListener('click', async () => {
      const data = await fetchSiteData();
      currentSiteData = data;
      renderAdminForm(data);
      alert('Form reset to saved data.');
    });

    // Logout
    byId('logoutBtn').addEventListener('click', logout);

    // Change password
    byId('changePasswordBtn').addEventListener('click', async () => {
      const currentPw = byId('currentPassword').value;
      const newPw = byId('newPassword').value;
      const confirmPw = byId('confirmPassword').value;

      byId('passwordSuccess').style.display = 'none';
      byId('passwordError').style.display = 'none';

      if (!currentPw || !newPw) {
        byId('passwordError').textContent = 'Please fill in all fields.';
        byId('passwordError').style.display = 'block';
        return;
      }
      if (newPw.length < 8) {
        byId('passwordError').textContent = 'New password must be at least 8 characters.';
        byId('passwordError').style.display = 'block';
        return;
      }
      if (newPw !== confirmPw) {
        byId('passwordError').textContent = 'New passwords do not match.';
        byId('passwordError').style.display = 'block';
        return;
      }

      const result = await changePassword(currentPw, newPw);
      if (!result.ok) {
        byId('passwordError').textContent = result.data.error || 'Password change failed.';
        byId('passwordError').style.display = 'block';
        return;
      }

      byId('currentPassword').value = '';
      byId('newPassword').value = '';
      byId('confirmPassword').value = '';
      byId('passwordSuccess').style.display = 'block';
    });
  }
});
