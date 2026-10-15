let debounceTimer;

document.addEventListener('DOMContentLoaded', async () => {
    // Admin check
    const role = localStorage.getItem('role');
    if (role !== 'ADMIN' && role !== 'ROLE_ADMIN') {
        window.location.href = 'index.html';
        return;
    }

    await loadUsers();
});

async function loadUsers(query = '') {
    const tbody = document.getElementById('admin-user-list');
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">Loading users...</td></tr>';
    
    try {
        let endpoint = '/admin/users';
        if (query) {
            endpoint = `/admin/users/search?q=${encodeURIComponent(query)}`;
        }
        const users = await fetchAPI(endpoint, 'GET');
        renderUsers(users);
    } catch (error) {
        console.error('Failed to load users:', error);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Failed to load users: ${error.message}</td></tr>`;
    }
}

function renderUsers(users) {
    const tbody = document.getElementById('admin-user-list');
    tbody.innerHTML = '';
    
    if (!users || users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users found.</td></tr>';
        return;
    }

    users.forEach(u => {
        const tr = document.createElement('tr');
        const statusText = u.blocked ? '🔴 Blocked' : '🟢 Active';
        const statusClass = u.blocked ? 'status-blocked' : 'status-active';
        const isSelf = u.id === parseInt(localStorage.getItem('userId'));
        
        tr.innerHTML = `
            <td>#${u.id}</td>
            <td><strong>${u.name}</strong> ${isSelf ? '<span class="badge badge-shipped" style="text-transform: none; font-size: 0.7rem; padding: 0.1rem 0.4rem; margin-left: 0.5rem;">You</span>' : ''}</td>
            <td>${u.email}</td>
            <td><span class="badge ${u.role === 'ADMIN' ? 'badge-delivered' : 'badge-pending'}">${u.role}</span></td>
            <td class="user-status ${statusClass}">${statusText}</td>
            <td>
                <button class="btn ${u.blocked ? 'btn-primary' : 'btn-danger'} btn-sm btn-toggle-block" 
                        onclick="toggleUserBlock(${u.id})" 
                        ${u.role === 'ADMIN' ? 'disabled' : ''} 
                        style="${u.role === 'ADMIN' ? 'opacity: 0.5; cursor: not-allowed;' : ''}">
                    ${u.blocked ? 'Unblock' : 'Block'}
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function debounceSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        const query = document.getElementById('userSearch').value;
        loadUsers(query);
    }, 300);
}

async function toggleUserBlock(userId) {
    try {
        const updatedUser = await fetchAPI(`/admin/users/${userId}/block`, 'PUT');
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast(`User ${updatedUser.name} is now ${updatedUser.blocked ? 'blocked' : 'unblocked'}.`, updatedUser.blocked ? 'warning' : 'success');
            ShopNovaUI.playSound('ping');
        } else {
            alert(`User status updated.`);
        }
        // Reload list
        const query = document.getElementById('userSearch').value;
        loadUsers(query);
    } catch (error) {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast(error.message || 'Action failed', 'error');
            ShopNovaUI.playSound('error');
        } else {
            alert(error.message || 'Action failed');
        }
    }
}
