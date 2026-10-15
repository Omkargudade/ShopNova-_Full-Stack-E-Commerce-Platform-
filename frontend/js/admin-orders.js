let allOrders = [];

document.addEventListener('DOMContentLoaded', async () => {
    // Admin check
    const role = localStorage.getItem('role');
    if (role !== 'ADMIN' && role !== 'ROLE_ADMIN') {
        window.location.href = 'index.html';
        return;
    }

    await loadAdminOrders();
});

async function loadAdminOrders() {
    const tbody = document.getElementById('admin-order-list');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading orders...</td></tr>';
    
    try {
        allOrders = await fetchAPI('/orders/admin/all', 'GET');
        renderOrders(allOrders);
    } catch (error) {
        console.error('Failed to load orders:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load orders: ${error.message}</td></tr>`;
    }
}

function renderOrders(orders) {
    const tbody = document.getElementById('admin-order-list');
    tbody.innerHTML = '';
    
    if(!orders || orders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No orders found.</td></tr>';
        return;
    }

    // Sort newest first
    orders.sort((a, b) => new Date(b.order.orderDate) - new Date(a.order.orderDate));

    orders.forEach(o => {
        const tr = document.createElement('tr');
        const orderDate = new Date(o.order.orderDate).toLocaleString();
        const currentStatus = o.order.status ? o.order.status.toUpperCase() : 'PENDING';
        
        // Address fallback
        const shippingAddress = o.order.shippingAddress || 'No Address Provided';
        const phone = o.order.customerPhone || 'No Phone';
        
        tr.innerHTML = `
            <td>#${o.order.id}</td>
            <td>${orderDate}</td>
            <td>
                <div style="font-size: 0.9em;">
                    <strong>User ID:</strong> ${o.order.userId}<br>
                    <strong>Addr:</strong> ${shippingAddress}<br>
                    <strong>Phone:</strong> ${phone}
                </div>
            </td>
            <td>Rs. ${o.order.totalAmount.toLocaleString()}</td>
            <td>
                <span class="status-badge status-${currentStatus.toLowerCase()}">${currentStatus}</span>
            </td>
            <td>
                <select class="status-select" onchange="updateOrderStatus(${o.order.id}, this.value)">
                    <option value="PENDING" ${currentStatus === 'PENDING' ? 'selected' : ''}>Pending</option>
                    <option value="SHIPPED" ${currentStatus === 'SHIPPED' ? 'selected' : ''}>Shipped</option>
                    <option value="DELIVERED" ${currentStatus === 'DELIVERED' ? 'selected' : ''}>Delivered</option>
                    <option value="CANCELLED" ${currentStatus === 'CANCELLED' ? 'selected' : ''}>Cancelled</option>
                </select>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateOrderStatus(orderId, newStatus) {
    try {
        await fetchAPI(`/orders/admin/${orderId}/status?status=${newStatus}`, 'PUT');
        if (window.ShopNovaUI) ShopNovaUI.showToast(`Order #${orderId} marked as ${newStatus}`, 'success');
        else alert(`Order #${orderId} marked as ${newStatus}`);
        loadAdminOrders(); // Refresh table to update badge colors
    } catch (error) {
        if (window.ShopNovaUI) ShopNovaUI.showToast('Failed to update status', 'error');
        else alert('Failed to update status');
        console.error(error);
        loadAdminOrders(); // Revert select dropdown
    }
}
