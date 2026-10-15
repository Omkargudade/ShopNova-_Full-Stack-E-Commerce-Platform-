document.addEventListener('DOMContentLoaded', () => {
    initSearchPage();
});

let currentPage = 0;
const pageSize = 12;

function initSearchPage() {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';
    
    // Set search bar value
    const globalInput = document.getElementById('global-search-input');
    if(globalInput) globalInput.value = query;

    // Update query text
    const queryText = document.getElementById('search-query-text');
    if (query) {
        queryText.textContent = `Showing results for "${query}"`;
    } else {
        queryText.textContent = 'Showing all products';
    }

    // Set initial filters from URL if present (Optional but good for shareable links)
    if (urlParams.has('sort')) {
        document.getElementById('sort-select').value = urlParams.get('sort');
    }

    // Mobile Filter Toggle Behavior
    const filterToggle = document.getElementById('mobile-filter-toggle');
    const sidebar = document.querySelector('.search-sidebar');
    if (filterToggle && sidebar) {
        filterToggle.addEventListener('click', () => {
            sidebar.classList.toggle('active');
            const isActive = sidebar.classList.contains('active');
            filterToggle.textContent = isActive ? 'Hide Filters 🔍' : 'Show Filters 🔍';
            filterToggle.classList.toggle('btn-primary', isActive);
            filterToggle.classList.toggle('btn-outline', !isActive);
        });
    }

    // Bind event listeners
    document.getElementById('apply-filters-btn').addEventListener('click', () => {
        currentPage = 0; // Reset to page 0 on filter apply
        // Hide sidebar after applying filters on mobile
        if (sidebar && window.innerWidth <= 768) {
            sidebar.classList.remove('active');
            if (filterToggle) {
                filterToggle.textContent = 'Show Filters 🔍';
                filterToggle.classList.remove('btn-primary');
                filterToggle.classList.add('btn-outline');
            }
        }
        performSearch();
    });

    document.getElementById('sort-select').addEventListener('change', () => {
        currentPage = 0;
        performSearch();
    });

    // Initial load
    performSearch();
}

async function performSearch() {
    const container = document.getElementById('search-results-container');
    const paginationBox = document.getElementById('pagination-controls');
    container.innerHTML = '<div class="loading-spinner"></div>';
    paginationBox.innerHTML = '';

    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q') || '';

    // Gather filters
    const minPrice = document.getElementById('filter-min-price').value;
    const maxPrice = document.getElementById('filter-max-price').value;
    const sort = document.getElementById('sort-select').value;
    
    const categories = Array.from(document.querySelectorAll('#filter-categories input:checked')).map(el => el.value);
    const brands = Array.from(document.querySelectorAll('#filter-brands input:checked')).map(el => el.value);
    
    // Invert logic: UI says "Include Out of Stock" (default unchecked means inStock=true)
    const includeOutOfStock = document.getElementById('filter-instock').checked;
    const inStock = includeOutOfStock ? '' : 'true';

    const discountRadio = document.querySelector('input[name="discount"]:checked');
    const minDiscount = discountRadio ? discountRadio.value : '';

    // Build API URL
    let apiUrl = `/products/search?page=${currentPage}&size=${pageSize}&sort=${sort}`;
    if (query) apiUrl += `&q=${encodeURIComponent(query)}`;
    if (minPrice) apiUrl += `&minPrice=${minPrice}`;
    if (maxPrice) apiUrl += `&maxPrice=${maxPrice}`;
    if (inStock) apiUrl += `&inStock=${inStock}`;
    if (minDiscount) apiUrl += `&minDiscount=${minDiscount}`;
    
    categories.forEach(c => apiUrl += `&category=${encodeURIComponent(c)}`);
    brands.forEach(b => apiUrl += `&brand=${encodeURIComponent(b)}`);

    try {
        const response = await fetchAPI(apiUrl, 'GET');
        renderSearchResults(response.content, container);
        renderPagination(response, paginationBox);
    } catch (err) {
        console.error("Search failed", err);
        container.innerHTML = '<p class="text-center w-100 mt-3 text-muted">Failed to load search results. Please try again later.</p>';
    }
}

function renderSearchResults(products, container) {
    container.innerHTML = '';
    
    if (!products || products.length === 0) {
        container.innerHTML = `
            <div class="text-center w-100" style="padding: 3rem 0; grid-column: 1/-1;">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="#ccc" style="margin-bottom: 1rem;"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <h3 style="color: var(--dark-gray);">No Products Found</h3>
                <p class="text-muted">Try adjusting your filters or search query.</p>
            </div>
        `;
        return;
    }

    products.forEach(p => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.addEventListener('click', () => {
            window.location.href = `product.html?id=${p.id}`;
        });

        // Calculate discount badge if applicable
        let discountBadge = '';
        if (p.discount && p.discount > 0) {
            discountBadge = `<div style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">${p.discount}% OFF</div>`;
        }

        const renderStars = (rating) => {
            const rounded = Math.round(Number(rating) || 0);
            return `<span class="stars">${'★'.repeat(rounded)}${'☆'.repeat(5 - rounded)}</span>`;
        };

        const outOfStockOverlay = p.stock <= 0 ? 
            `<div style="position: absolute; top: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold;">OUT OF STOCK</div>` : '';

        card.innerHTML = `
            <div style="position: relative;">
                ${outOfStockOverlay}
                ${discountBadge}
                <button class="wishlist-btn" type="button" aria-label="Add to Wishlist">
                    <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                </button>
                <img src="${p.imageUrl || 'https://via.placeholder.com/250x200'}" onerror="this.onerror=null;this.src='https://via.placeholder.com/250x200';" alt="${p.name}" class="product-img" style="${p.stock <= 0 ? 'opacity: 0.6;' : ''}">
            </div>
            <div class="product-category">${p.brand ? p.brand + ' - ' : ''}${p.category || 'General'}</div>
            <h3 class="product-title">${p.name}</h3>
            <div class="product-rating">
                ${renderStars(p.averageRating)}
                <span class="rating-count">(${p.reviewCount || 0})</span>
            </div>
            <div class="product-price">Rs. ${Number(p.price).toLocaleString()}</div>
            <button type="button" class="btn btn-primary mt-auto btn-view-details" ${p.stock <= 0 ? 'disabled' : ''}>${p.stock <= 0 ? 'Out of Stock' : 'View Details'}</button>
        `;

        const heartBtn = card.querySelector('.wishlist-btn');
        if (window.initProductCardWishlist) {
            initProductCardWishlist(p.id, heartBtn);
        }

        heartBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (window.toggleWishlist) {
                toggleWishlist(p.id, heartBtn);
            }
        });

        const btn = card.querySelector('.btn-view-details');
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (p.stock > 0) window.location.href = `product.html?id=${p.id}`;
        });

        container.appendChild(card);
    });
}

function renderPagination(pageData, container) {
    if (pageData.totalPages <= 1) return;

    // Previous Button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.textContent = 'Prev';
    prevBtn.disabled = pageData.first;
    prevBtn.addEventListener('click', () => {
        currentPage--;
        performSearch();
    });
    container.appendChild(prevBtn);

    // Page Numbers
    for (let i = 0; i < pageData.totalPages; i++) {
        // Simple logic: show first, last, and +/- 2 from current
        if (i === 0 || i === pageData.totalPages - 1 || Math.abs(i - currentPage) <= 2) {
            const pageBtn = document.createElement('button');
            pageBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pageBtn.textContent = i + 1;
            pageBtn.addEventListener('click', () => {
                currentPage = i;
                performSearch();
            });
            container.appendChild(pageBtn);
        } else if (Math.abs(i - currentPage) === 3) {
            const dots = document.createElement('span');
            dots.textContent = '...';
            dots.style.alignSelf = 'flex-end';
            container.appendChild(dots);
        }
    }

    // Next Button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.textContent = 'Next';
    nextBtn.disabled = pageData.last;
    nextBtn.addEventListener('click', () => {
        currentPage++;
        performSearch();
    });
    container.appendChild(nextBtn);
}
