document.addEventListener('DOMContentLoaded', async () => {
    // Admin check
    const role = localStorage.getItem('role');
    if (role !== 'ADMIN' && role !== 'ROLE_ADMIN') {
        window.location.href = 'index.html';
        return;
    }

    await loadDashboardStats();
});

async function loadDashboardStats() {
    try {
        const stats = await fetchAPI('/admin/dashboard/stats', 'GET');
        
        document.getElementById('stat-revenue').textContent = `Rs. ${stats.totalRevenue.toLocaleString()}`;
        document.getElementById('stat-orders').textContent = stats.totalOrders;
        document.getElementById('stat-products').textContent = stats.totalProducts;
        document.getElementById('stat-users').textContent = stats.totalUsers;

        initCharts(stats);
        renderRecentOrders(stats.recentOrders);
        renderLowStockProducts(stats.lowStockProducts);
    } catch (error) {
        console.error('Failed to load dashboard stats:', error);
    }
}

function renderRecentOrders(recentOrders) {
    const tbody = document.getElementById('recent-orders-list');
    tbody.innerHTML = '';
    
    if (!recentOrders || recentOrders.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No recent orders.</td></tr>';
        return;
    }

    recentOrders.forEach(o => {
        const tr = document.createElement('tr');
        const currentStatus = o.order.status ? o.order.status.toUpperCase() : 'PENDING';
        let badgeClass = 'badge-pending';
        if (currentStatus === 'DELIVERED') badgeClass = 'badge-delivered';
        else if (currentStatus === 'SHIPPED') badgeClass = 'badge-shipped';
        else if (currentStatus === 'CANCELLED') badgeClass = 'badge-cancelled';

        tr.innerHTML = `
            <td>#${o.order.id}</td>
            <td>User #${o.order.userId}</td>
            <td>Rs. ${o.order.totalAmount.toLocaleString()}</td>
            <td><span class="badge ${badgeClass}">${currentStatus}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderLowStockProducts(lowStockProducts) {
    const listDiv = document.getElementById('low-stock-list');
    listDiv.innerHTML = '';
    
    if (!lowStockProducts || lowStockProducts.length === 0) {
        listDiv.innerHTML = '<p class="text-muted text-center" style="margin-top: 1rem;">All products are well stocked! 👍</p>';
        return;
    }

    lowStockProducts.forEach(p => {
        const item = document.createElement('div');
        item.style = 'display: flex; align-items: center; justify-content: space-between; padding: 0.6rem; border-radius: 8px; border: 1px solid rgba(220, 53, 69, 0.2); background: rgba(220, 53, 69, 0.05);';
        
        item.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.6rem;">
                <img src="${p.imageUrl || 'https://via.placeholder.com/40'}" onerror="this.onerror=null;this.src='https://via.placeholder.com/40';" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">
                <div>
                    <h4 style="font-size: 0.9rem; font-weight: 600; margin: 0; color: var(--text-color);">${p.name}</h4>
                    <span style="font-size: 0.8rem; color: #888;">Category: ${p.category}</span>
                </div>
            </div>
            <div style="text-align: right;">
                <span class="badge badge-cancelled" style="font-size: 0.75rem; font-weight: bold;">${p.stock} Left</span>
            </div>
        `;
        listDiv.appendChild(item);
    });
}

function initCharts(stats) {
    const isDark = document.body.getAttribute('data-theme') === 'dark' || document.documentElement.getAttribute('data-theme') === 'dark';
    if (window.Chart) {
        Chart.defaults.color = isDark ? '#e4e6eb' : '#666';
        Chart.defaults.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    }

    // Sales Chart
    const salesCtx = document.getElementById('salesChart').getContext('2d');
    
    const monthLabels = Object.keys(stats.monthlySales);
    const monthData = Object.values(stats.monthlySales);

    new Chart(salesCtx, {
        type: 'line',
        data: {
            labels: monthLabels,
            datasets: [{
                label: 'Revenue (Rs.)',
                data: monthData,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                }
            },
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });

    // Status Chart
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    
    const statusLabels = Object.keys(stats.orderStatusBreakdown);
    const statusData = Object.values(stats.orderStatusBreakdown);

    new Chart(statusCtx, {
        type: 'doughnut',
        data: {
            labels: statusLabels,
            datasets: [{
                data: statusData,
                backgroundColor: [
                    '#28a745', // Delivered
                    '#ffc107', // Pending
                    '#17a2b8', // Shipped
                    '#dc3545'  // Cancelled
                ],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'right'
                }
            }
        }
    });
}
