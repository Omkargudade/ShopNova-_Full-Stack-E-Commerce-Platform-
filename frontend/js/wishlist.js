
async function toggleWishlist(productId, heartBtn) {
    const role = localStorage.getItem('role');
    if (role === 'ADMIN' || role === 'ROLE_ADMIN') {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Administrators are not permitted to use customer shopping features.', 'warning');
            ShopNovaUI.playSound('warning');
        } else {
            alert('Administrators are not permitted to use customer shopping features.');
        }
        return;
    }

    const userId = localStorage.getItem('userId');
    if (!userId) {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Please login to add to wishlist', 'warning');
            ShopNovaUI.playSound('warning');
        } else {
            alert('Please login to add to wishlist.');
        }
        setTimeout(() => {
            window.location.href = 'login.html';
        }, 1500);
        return;
    }

    const isActive = heartBtn.classList.contains('active');

    try {
        if (isActive) {
            // Remove from wishlist
            await fetchAPI(`/wishlist/remove/${userId}/${productId}`, 'DELETE');
            heartBtn.classList.remove('active');
            if (window.ShopNovaUI) {
                ShopNovaUI.showToast('💔 Removed from Wishlist', 'info');
                ShopNovaUI.playSound('ping');
            }
        } else {
            // Add to wishlist
            await fetchAPI('/wishlist/add', 'POST', { userId: parseInt(userId), productId: parseInt(productId) });
            heartBtn.classList.add('active');
            if (window.ShopNovaUI) {
                ShopNovaUI.showToast('❤️ Added to Wishlist', 'success');
                ShopNovaUI.playSound('success');
            }
        }
        updateWishlistCount();
    } catch (err) {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast(err.message || 'Action failed', 'error');
            ShopNovaUI.playSound('error');
        } else {
            alert(err.message || 'Action failed');
        }
    }
}

async function initProductCardWishlist(productId, heartBtn) {
    const userId = localStorage.getItem('userId');
    if (!userId || !heartBtn) return;

    try {
        const res = await fetchAPI(`/wishlist/check/${userId}/${productId}`, 'GET');
        if (res && res.inWishlist) {
            heartBtn.classList.add('active');
        } else {
            heartBtn.classList.remove('active');
        }
    } catch (err) {
        console.error('Failed to check wishlist status', err);
    }
}


