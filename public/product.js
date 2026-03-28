document.addEventListener('DOMContentLoaded', async () => {
  const isEnglish = window.location.pathname.startsWith('/en/');
  
  // Parse URL
  const params = new URLSearchParams(window.location.search);
  const dishId = params.get('id');
  if (!dishId) {
    alert(isEnglish ? "Product not found!" : "Pjata nuk u gjet!");
    window.location.href = isEnglish ? '/en/#menu' : '/#menu';
    return;
  }

  // Fetch data
  try {
    const res = await fetch('/api/site-data');
    if (!res.ok) throw new Error('Network error');
    const data = await res.json();
    
    // Build flattened menu for prev/next navigation
    let allDishes = [];
    if (data.featuredDishes) {
      allDishes.push(...data.featuredDishes);
    }
    if (data.menuCategories) {
      for (const cat of data.menuCategories) {
        if (cat.items) allDishes.push(...cat.items);
      }
    }
    // De-duplicate in case featured dish is also in categories
    allDishes = Array.from(new Map(allDishes.map(item => [item.id, item])).values());
    
    const dishIndex = allDishes.findIndex(d => d.id === dishId);
    let foundDish = dishIndex !== -1 ? allDishes[dishIndex] : null;
    
    if (!foundDish) {
      alert(isEnglish ? "Product not found!" : "Pjata nuk u gjet!");
      window.location.href = isEnglish ? '/en/#menu' : '/#menu';
      return;
    }
    
    // Setup Adjacent Product Navigation
    const prevDish = dishIndex > 0 ? allDishes[dishIndex - 1] : null;
    const nextDish = dishIndex < allDishes.length - 1 ? allDishes[dishIndex + 1] : null;
    
    const prevBtn = document.getElementById('prevDishBtn');
    if (prevBtn) {
      if (prevDish) {
        prevBtn.addEventListener('click', () => { window.location.href = `?id=${prevDish.id}`; });
      } else {
        prevBtn.style.opacity = '0.3';
        prevBtn.style.cursor = 'not-allowed';
      }
    }
    
    const nextBtn = document.getElementById('nextDishBtn');
    if (nextBtn) {
      if (nextDish) {
        nextBtn.addEventListener('click', () => { window.location.href = `?id=${nextDish.id}`; });
      } else {
        nextBtn.style.opacity = '0.3';
        nextBtn.style.cursor = 'not-allowed';
      }
    }

    // Populate generic UI
    document.getElementById('brandTitle').textContent = data.brandTitle || 'ROMEO GRILL';
    if (data.contactPhone) {
      document.getElementById('fixedPhoneLink').href = `tel:${data.contactPhone}`;
    }
    if (data.whatsappNumber) {
      const msg = isEnglish ? `Hello! I would like to order: ${foundDish.name} (${foundDish.price} Lek)` : `Pershendetje! Deshiroj te porosis: ${foundDish.name} (${foundDish.price} Leke)`;
      const waUrl = `https://wa.me/${data.whatsappNumber.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(msg)}`;
      document.getElementById('fixedWaLink').href = waUrl;
      document.getElementById('productOrderBtn').href = waUrl;
    } else {
      document.getElementById('productOrderBtn').style.display = 'none';
    }

    // Populate Dish Info
    document.title = `${data.brandTitle || 'Romeo Grill'} | ${foundDish.name}`;
    document.getElementById('productName').textContent = foundDish.name;
    document.getElementById('productPrice').textContent = `${foundDish.price} ${isEnglish ? 'Lek' : 'Leke'}`;
    
    if (foundDish.description) {
      document.getElementById('productDesc').textContent = foundDish.description;
    } else {
      document.getElementById('productDesc').style.display = 'none';
    }
    
    const resolvePath = (src) => {
      if (!src) return isEnglish ? '../images/placeholder.jpg' : 'images/placeholder.jpg';
      if (src.startsWith('http') || src.startsWith('data:')) return src;
      return isEnglish ? '../' + src.replace(/^\.\.\//, '') : src.replace(/^\.\.\//, '');
    };


    // Ingredients
    if (foundDish.ingredients) {
      const container = document.getElementById('ingredientsContainer');
      const list = document.getElementById('productIngredients');
      container.style.display = 'block';
      const arr = foundDish.ingredients.split(',').map(s => s.trim()).filter(Boolean);
      list.innerHTML = arr.map(ing => `<span class="ingredient-chip">${ing}</span>`).join('');
    }
    
    // Gallery Logic
    const galleryItems = [foundDish.image, ...(foundDish.gallery || [])].filter(Boolean);
    const mainImg = document.getElementById('productMainImage');
    
    if (galleryItems.length === 0) {
       mainImg.src = resolvePath('');
    } else if (galleryItems.length === 1) {
       mainImg.src = resolvePath(galleryItems[0]);
    } else {
      document.getElementById('galleryNav').style.display = 'flex';
      const thumbContainer = document.getElementById('galleryThumbContainer');
      thumbContainer.style.display = 'flex';
      
      let currentIndex = 0;
      
      const updateGallery = (idx) => {
        currentIndex = idx;
        mainImg.src = resolvePath(galleryItems[currentIndex]);
        
        document.querySelectorAll('.gal-thumb').forEach((t, i) => {
          t.classList.toggle('active', i === currentIndex);
        });
      };
      
      thumbContainer.innerHTML = galleryItems.map((src, idx) => {
        return `<img src="${resolvePath(src)}" class="gal-thumb ${idx===0?'active':''}" data-index="${idx}">`;
      }).join('');
      
      thumbContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('gal-thumb')) {
          updateGallery(parseInt(e.target.dataset.index, 10));
        }
      });
      
      document.getElementById('prevBtn').addEventListener('click', () => {
        if (currentIndex > 0) updateGallery(currentIndex - 1);
        else updateGallery(galleryItems.length - 1);
      });
      
      document.getElementById('nextBtn').addEventListener('click', () => {
        if (currentIndex < galleryItems.length - 1) updateGallery(currentIndex + 1);
        else updateGallery(0);
      });
      
      updateGallery(0);
    }

  } catch (err) {
    console.error(err);
    alert(isEnglish ? "Error loading details." : "Gabim në ngarkim.");
  }
});
