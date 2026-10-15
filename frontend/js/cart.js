let cartItemsData = [];

function isCartPage() {
    const path = window.location.pathname.replace(/\/+$/, '') || '/';
    return path.endsWith('/cart') || path.endsWith('cart.html');
}

async function addToCart(productId, quantity = 1) {
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
            ShopNovaUI.showToast('Please login to add items to your cart', 'warning');
            ShopNovaUI.playSound('warning');
        } else {
            alert('Please login to add items to your cart.');
        }
        window.location.href = 'login.html';
        return;
    }

    try {
        await fetchAPI('/cart/add', 'POST', {
            userId: parseInt(userId),
            productId: parseInt(productId),
            quantity: quantity
        });
        
        // Log activity
        logActivity(productId, 'CLICK');
        
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Product added to cart successfully', 'success');
            ShopNovaUI.playSound('cart');
        } else {
            alert('Item added to cart!');
        }
    } catch (err) {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Failed to add item to cart', 'error');
            ShopNovaUI.playSound('error');
        } else {
            alert('Failed to add item to cart.');
        }
    }
}

async function loadCart() {
    const cartContainer = document.getElementById('cart-items');
    const userId = localStorage.getItem('userId');
    if (!userId) {
        if (cartContainer) {
            cartContainer.innerHTML =
                '<p>Please <a href="login.html">log in</a> to view your cart.</p>';
        }
        return;
    }

    try {
        const cartItems = await fetchAPI(`/cart/${userId}`, 'GET');
        cartItemsData = Array.isArray(cartItems) ? cartItems : [];
        renderCart(cartItemsData);
    } catch (err) {
        console.error('Failed to load cart', err);
        if (cartContainer) {
            cartContainer.innerHTML =
                '<p>Could not load your cart. Check that the server is running and you are logged in.</p>';
        }
    }
}

async function renderCart(items) {
    const cartContainer = document.getElementById('cart-items');
    const orderTotal = document.getElementById('order-total');
    if (!cartContainer) return;

    cartContainer.innerHTML = '';
    let total = 0;

    if (items.length === 0) {
        cartContainer.innerHTML = '<p>Your cart is empty.</p>';
        if(orderTotal) orderTotal.textContent = 'Rs. 0';
        return;
    }

    for (const item of items) {
        try {
            // Fetch product details for each cart item
            const product = await fetchAPI(`/products/${item.productId}`, 'GET');
            total += product.price * item.quantity;

            const itemEl = document.createElement('div');
            itemEl.className = 'cart-item';
            itemEl.innerHTML = `
                <div class="cart-item-info">
                    <img src="${product.imageUrl || 'https://via.placeholder.com/60'}" onerror="this.onerror=null;this.src='https://via.placeholder.com/60';" class="cart-item-img" alt="${product.name}">
                    <div>
                        <h4>${product.name}</h4>
                        <p class="text-muted">Rs. ${product.price.toLocaleString()}</p>
                    </div>
                </div>
                <div>
                    <input type="number" min="1" value="${item.quantity}" onchange="updateCartItem(${item.id}, this.value)" style="width: 60px; padding: 0.3rem;">
                    <button class="btn btn-danger" style="padding: 0.3rem 0.6rem; margin-left: 0.5rem;" onclick="removeCartItem(${item.id})">X</button>
                </div>
            `;
            cartContainer.appendChild(itemEl);
        } catch(e) {
            console.error("Failed fetching product details for cart item");
        }
    }

    if(orderTotal) orderTotal.textContent = `Rs. ${total.toLocaleString()}`;
}

async function updateCartItem(cartItemId, newQuantity) {
    try {
        await fetchAPI(`/cart/update/${cartItemId}`, 'PUT', { quantity: parseInt(newQuantity) });
        loadCart();
    } catch (err) {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Failed to update quantity', 'error');
            ShopNovaUI.playSound('error');
        } else {
            alert('Failed to update quantity');
        }
    }
}

async function removeCartItem(cartItemId) {
    try {
        await fetchAPI(`/cart/remove/${cartItemId}`, 'DELETE');
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Product removed from cart', 'info');
            ShopNovaUI.playSound('ping');
        }
        loadCart();
    } catch (err) {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Failed to remove item', 'error');
            ShopNovaUI.playSound('error');
        } else {
            alert('Failed to remove item');
        }
    }
}

async function placeOrder() {
    const userId = localStorage.getItem('userId');
    if (!userId) {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Please login to place an order', 'warning');
            ShopNovaUI.playSound('warning');
        } else {
            alert('Please login to place an order.');
        }
        setTimeout(() => window.location.href = 'login.html', 1500);
        return;
    }

    if (cartItemsData.length === 0) {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Your cart is empty!', 'warning');
            ShopNovaUI.playSound('warning');
        } else {
            alert('Your cart is empty!');
        }
        return;
    }

    try {
        const response = await fetchAPI('/orders/place', 'POST', {
            userId: parseInt(userId)
        });
        
        // Log purchases
        for(let item of cartItemsData) {
            logActivity(item.productId, 'PURCHASE');
        }

        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('🎉 Your order has been placed successfully', 'success');
            ShopNovaUI.playSound('order_success');
        } else {
            alert('Order placed successfully!');
        }
        
        setTimeout(() => {
            window.location.href = 'orders.html';
        }, 1500);
    } catch (err) {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast(err.message || 'Failed to place order', 'error');
            ShopNovaUI.playSound('error');
        } else {
            alert(err.message || 'Failed to place order.');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    if (isCartPage()) {
        loadCart();
    }
});
