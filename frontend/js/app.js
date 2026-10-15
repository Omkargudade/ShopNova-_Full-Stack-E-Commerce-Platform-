document.addEventListener('DOMContentLoaded', () => {
    // Prevent administrators from using customer shopping pages
    const role = localStorage.getItem('role');
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    if ((role === 'ADMIN' || role === 'ROLE_ADMIN') && 
        (path.endsWith('cart.html') || path.endsWith('/cart') || path.endsWith('wishlist.html') || path.endsWith('/wishlist'))) {
        alert("Administrators are not permitted to use customer shopping features.");
        window.location.href = 'admin-dashboard.html';
        return;
    }

    updateNavbar();
    updateWishlistCount();
    if (window.ShopNovaUI) {
        window.ShopNovaUI.init();
    }
});

function updateNavbar() {
    const token = localStorage.getItem('jwtToken');
    const role = localStorage.getItem('role');
    const authLinks = document.getElementById('auth-links');
    
    if (token) {
        if (role === 'ADMIN' || role === 'ROLE_ADMIN') {
            authLinks.innerHTML = `
                <a href="admin-dashboard.html" style="color: var(--primary-color); font-weight: 700;">Admin Dashboard</a>
                <button onclick="logout()" class="btn btn-outline">Logout</button>
            `;
        } else {
            authLinks.innerHTML = `
                <a href="wishlist.html" class="nav-badge-container">
                    Wishlist
                    <span id="nav-wishlist-count" class="nav-badge" style="display: none;">0</span>
                </a>
                <a href="cart.html">Cart</a>
                <a href="orders.html">Orders</a>
                <button onclick="logout()" class="btn btn-outline">Logout</button>
            `;
        }
    } else {
        authLinks.innerHTML = `
            <a href="login.html" class="btn btn-outline">Login</a>
            <a href="signup.html" class="btn btn-primary">Sign Up</a>
        `;
    }

    // Inject Search Bar if it doesn't exist
    const navbar = document.querySelector('.navbar');
    if (navbar && !document.getElementById('global-search-container')) {
        const searchContainer = document.createElement('div');
        searchContainer.id = 'global-search-container';
        searchContainer.className = 'nav-search';
        searchContainer.innerHTML = `
            <form id="global-search-form" action="search.html" method="GET">
                <svg class="search-icon" viewBox="0 0 24 24"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                <input type="text" name="q" id="global-search-input" class="search-input" placeholder="Search for products, brands and more..." autocomplete="off">
                <div id="search-suggestions" class="search-suggestions"></div>
            </form>
        `;
        // Insert after brand, before auth-links
        navbar.insertBefore(searchContainer, authLinks);

        setupSearchBehavior();
    }

    // Inject Hamburger button if it doesn't exist
    if (navbar && !document.getElementById('nav-toggle-btn')) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'nav-toggle-btn';
        toggleBtn.className = 'nav-toggle';
        toggleBtn.setAttribute('aria-label', 'Toggle Navigation');
        toggleBtn.innerHTML = `
            <span></span>
            <span></span>
            <span></span>
        `;
        navbar.appendChild(toggleBtn);

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            if (authLinks) {
                authLinks.classList.toggle('active');
                toggleBtn.classList.toggle('active');
            }
        });

        // Close menu on link click
        authLinks.querySelectorAll('a, button').forEach(el => {
            el.addEventListener('click', () => {
                authLinks.classList.remove('active');
                toggleBtn.classList.remove('active');
            });
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (authLinks && authLinks.classList.contains('active')) {
                if (!authLinks.contains(e.target) && !toggleBtn.contains(e.target)) {
                    authLinks.classList.remove('active');
                    toggleBtn.classList.remove('active');
                }
            }
        });
    }
}

function setupSearchBehavior() {
    const input = document.getElementById('global-search-input');
    const suggestionsBox = document.getElementById('search-suggestions');
    const form = document.getElementById('global-search-form');
    let debounceTimer;

    // Load recent searches
    const getRecentSearches = () => JSON.parse(localStorage.getItem('recentSearches') || '[]');
    const saveRecentSearch = (query) => {
        if (!query.trim()) return;
        let recent = getRecentSearches();
        recent = recent.filter(q => q.toLowerCase() !== query.toLowerCase());
        recent.unshift(query);
        if (recent.length > 5) recent.pop();
        localStorage.setItem('recentSearches', JSON.stringify(recent));
    };

    form.addEventListener('submit', (e) => {
        saveRecentSearch(input.value);
    });

    input.addEventListener('focus', () => {
        if (!input.value.trim()) {
            showRecentSearches();
        } else {
            suggestionsBox.classList.add('active');
        }
    });

    input.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        const query = e.target.value.trim();
        
        if (!query) {
            showRecentSearches();
            return;
        }

        debounceTimer = setTimeout(async () => {
            try {
                // Call the new suggestions API
                const suggestions = await fetchAPI('/products/suggestions?q=' + encodeURIComponent(query), 'GET');
                renderSuggestions(suggestions, query);
            } catch (err) {
                console.error("Failed to load suggestions", err);
            }
        }, 300); // 300ms debounce
    });

    // Close suggestions when clicking outside
    document.addEventListener('click', (e) => {
        if (!document.getElementById('global-search-container').contains(e.target)) {
            suggestionsBox.classList.remove('active');
        }
    });

    function showRecentSearches() {
        const recent = getRecentSearches();
        if (recent.length === 0) {
            suggestionsBox.classList.remove('active');
            return;
        }
        
        let html = '<div class="suggestion-header">Recent Searches</div>';
        recent.forEach(q => {
            html += `<div class="suggestion-item" onclick="submitSearch('${q}')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#888"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>
                ${q}
            </div>`;
        });
        suggestionsBox.innerHTML = html;
        suggestionsBox.classList.add('active');
    }

    function renderSuggestions(suggestions, query) {
        if (!suggestions || suggestions.length === 0) {
            suggestionsBox.innerHTML = '<div class="suggestion-item text-muted">No products found</div>';
            suggestionsBox.classList.add('active');
            return;
        }

        let html = `<div class="suggestion-header">Suggestions for "${query}"</div>`;
        suggestions.forEach(s => {
            html += `<div class="suggestion-item" onclick="submitSearch('${s}')">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="#888"><path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/></svg>
                ${s}
            </div>`;
        });
        suggestionsBox.innerHTML = html;
        suggestionsBox.classList.add('active');
    }

    window.submitSearch = function(query) {
        input.value = query;
        saveRecentSearch(query);
        form.submit();
    };
}

function logout() {
    localStorage.removeItem('jwtToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    localStorage.removeItem('role');
    
    // Play sound and show toast if ShopNovaUI is available before redirect
    if (window.ShopNovaUI) {
        ShopNovaUI.showToast('Logged out successfully', 'info');
        ShopNovaUI.playSound('ping');
    }
    
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 500);
}

/* ==========================================================
   ShopNovaUI: Global Notification & Sound Engine
   ========================================================== */
class ShopNovaUIEngine {
    constructor() {
        this.soundEnabled = localStorage.getItem('shopnova_sound_enabled') !== 'false';
        this.darkMode = localStorage.getItem('shopnova_theme') === 'dark';
        this.audioCtx = null;
        this.toastContainer = null;
        
        // Apply theme immediately
        if (this.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        
        this.init();
    }

    init() {
        // Ensure container exists
        if (!document.getElementById('toast-container')) {
            this.toastContainer = document.createElement('div');
            this.toastContainer.id = 'toast-container';
            document.body.appendChild(this.toastContainer);
        } else {
            this.toastContainer = document.getElementById('toast-container');
        }

        const authLinks = document.getElementById('auth-links');
        
        // Add theme toggle to navbar
        if (authLinks && !document.getElementById('theme-toggle-btn')) {
            const themeBtn = document.createElement('button');
            themeBtn.id = 'theme-toggle-btn';
            themeBtn.className = 'sound-toggle-btn';
            themeBtn.title = this.darkMode ? 'Light Mode' : 'Dark Mode';
            themeBtn.innerHTML = this.getThemeIcon();
            themeBtn.addEventListener('click', () => this.toggleTheme(themeBtn));
            authLinks.appendChild(themeBtn);
        }

        // Add sound toggle to navbar
        if (authLinks && !document.getElementById('sound-toggle-btn')) {
            const btn = document.createElement('button');
            btn.id = 'sound-toggle-btn';
            btn.className = 'sound-toggle-btn';
            btn.title = this.soundEnabled ? 'Mute Sounds' : 'Enable Sounds';
            btn.innerHTML = this.getSoundIcon();
            
            btn.addEventListener('click', () => this.toggleSound(btn));
            authLinks.appendChild(btn);
        }
    }

    getThemeIcon() {
        return this.darkMode ? 
            `<svg viewBox="0 0 24 24"><path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5 5-2.24 5-5-2.24-5-5-5zM2 13h2c.55 0 1-.45 1-1s-.45-1-1-1H2c-.55 0-1 .45-1 1s.45 1 1 1zm18 0h2c.55 0 1-.45 1-1s-.45-1-1-1h-2c-.55 0-1 .45-1 1s.45 1 1 1zM11 2v2c0 .55.45 1 1 1s1-.45 1-1V2c0-.55-.45-1-1-1s-1 .45-1 1zm0 18v2c0 .55.45 1 1 1s1-.45 1-1v-2c0-.55-.45-1-1-1s-1 .45-1 1zM5.99 4.58c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41L5.99 4.58zm12.37 12.37c-.39-.39-1.03-.39-1.41 0-.39.39-.39 1.03 0 1.41l1.06 1.06c.39.39 1.03.39 1.41 0 .39-.39.39-1.03 0-1.41l-1.06-1.06zm1.06-10.96c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06zM7.05 18.36c.39-.39.39-1.03 0-1.41-.39-.39-1.03-.39-1.41 0l-1.06 1.06c-.39.39-.39 1.03 0 1.41.39.39 1.03.39 1.41 0l1.06-1.06z"/></svg>` : 
            `<svg viewBox="0 0 24 24"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36-.98 1.37-2.58 2.26-4.4 2.26-2.98 0-5.4-2.42-5.4-5.4 0-1.81.89-3.42 2.26-4.4-.44-.06-.9-.1-1.36-.1z"/></svg>`;
    }

    getSoundIcon() {
        return this.soundEnabled ? 
            `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>` : 
            `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>`;
    }

    toggleTheme(btn) {
        this.darkMode = !this.darkMode;
        localStorage.setItem('shopnova_theme', this.darkMode ? 'dark' : 'light');
        if (this.darkMode) {
            document.documentElement.setAttribute('data-theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
        }
        btn.title = this.darkMode ? 'Light Mode' : 'Dark Mode';
        btn.innerHTML = this.getThemeIcon();
        this.playSound('ping');
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { darkMode: this.darkMode } }));
    }

    toggleSound(btn) {
        this.soundEnabled = !this.soundEnabled;
        localStorage.setItem('shopnova_sound_enabled', this.soundEnabled);
        btn.title = this.soundEnabled ? 'Mute Sounds' : 'Enable Sounds';
        btn.innerHTML = this.getSoundIcon();
        
        if (this.soundEnabled) this.playSound('ping');
    }

    getAudioContext() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }
        return this.audioCtx;
    }

    playOscillator(freq, type, duration, vol, delay = 0) {
        if (!this.soundEnabled) return;
        try {
            const ctx = this.getAudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            
            osc.type = type;
            osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
            
            gain.gain.setValueAtTime(vol, ctx.currentTime + delay);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + duration);
            
            osc.connect(gain);
            gain.connect(ctx.destination);
            
            osc.start(ctx.currentTime + delay);
            osc.stop(ctx.currentTime + delay + duration);
        } catch (e) {
            console.warn("Audio playback failed", e);
        }
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        switch(type) {
            case 'success':
                // Amazon/Flipkart style bright success chime (Ascending major chord)
                this.playOscillator(523.25, 'sine', 0.1, 0.1, 0);      // C5
                this.playOscillator(659.25, 'sine', 0.15, 0.1, 0.1);   // E5
                this.playOscillator(783.99, 'sine', 0.3, 0.1, 0.2);    // G5
                break;
            case 'order_success':
                // A triumphant, longer fanfare (C major arpeggio resolving high)
                this.playOscillator(523.25, 'sine', 0.15, 0.1, 0);       // C5
                this.playOscillator(659.25, 'sine', 0.15, 0.1, 0.15);    // E5
                this.playOscillator(783.99, 'sine', 0.15, 0.1, 0.3);     // G5
                this.playOscillator(1046.50, 'sine', 0.6, 0.15, 0.45);   // C6 (Higher, longer, slightly louder)
                // Add a rich harmony on the final chord
                this.playOscillator(523.25, 'sine', 0.6, 0.05, 0.45);    // C5 lower octave
                this.playOscillator(659.25, 'sine', 0.6, 0.05, 0.45);    // E5 lower octave
                break;
            case 'cart':
                // Smooth quick pop
                this.playOscillator(600, 'sine', 0.1, 0.1, 0);
                this.playOscillator(800, 'sine', 0.15, 0.1, 0.05);
                break;
            case 'error':
                // Low double buzz
                this.playOscillator(150, 'sawtooth', 0.15, 0.1, 0);
                this.playOscillator(150, 'sawtooth', 0.2, 0.1, 0.2);
                break;
            case 'warning':
                // Single mid-pitch alert
                this.playOscillator(300, 'square', 0.2, 0.05, 0);
                break;
            case 'ping':
                // Soft UI ping
                this.playOscillator(880, 'sine', 0.2, 0.05, 0);
                break;
        }
    }

    showToast(message, type = 'success') {
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        const titles = {
            success: 'Success',
            error: 'Error',
            warning: 'Warning',
            info: 'Notice'
        };

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        toast.innerHTML = `
            <div class="toast-icon">${icons[type]}</div>
            <div class="toast-content">
                <div class="toast-title">${titles[type]}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">&times;</button>
        `;

        this.toastContainer.appendChild(toast);

        // Setup auto-dismiss
        const duration = type === 'error' ? 5000 : 3000;
        let timeout = setTimeout(() => dismiss(), duration);

        const dismiss = () => {
            if (toast.parentNode) {
                toast.classList.add('hiding');
                toast.addEventListener('animationend', () => {
                    if (toast.parentNode) toast.parentNode.removeChild(toast);
                });
            }
        };

        toast.querySelector('.toast-close').addEventListener('click', () => {
            clearTimeout(timeout);
            dismiss();
        });
    }
}

// Initialize global UI engine
window.ShopNovaUI = new ShopNovaUIEngine();

async function updateWishlistCount() {
    const userId = localStorage.getItem('userId');
    const badge = document.getElementById('nav-wishlist-count');
    if (!userId || !badge) {
        if (badge) badge.style.display = 'none';
        return;
    }

    try {
        const res = await fetchAPI(`/wishlist/count/${userId}`, 'GET');
        if (res && typeof res.count === 'number') {
            badge.textContent = res.count;
            badge.style.display = res.count > 0 ? 'inline-block' : 'none';
        }
    } catch (err) {
        console.error('Failed to fetch wishlist count', err);
    }
}
