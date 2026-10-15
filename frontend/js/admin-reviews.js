document.addEventListener('DOMContentLoaded', async () => {
    // Admin check
    const role = localStorage.getItem('role');
    if (role !== 'ADMIN' && role !== 'ROLE_ADMIN') {
        window.location.href = 'index.html';
        return;
    }

    await loadReviews();
});

async function loadReviews() {
    const tbody = document.getElementById('admin-review-list');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">Loading reviews...</td></tr>';
    
    try {
        const reviews = await fetchAPI('/admin/reviews', 'GET');
        renderReviews(reviews);
    } catch (error) {
        console.error('Failed to load reviews:', error);
        tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">Failed to load reviews: ${error.message}</td></tr>`;
    }
}

function renderReviews(reviews) {
    const tbody = document.getElementById('admin-review-list');
    tbody.innerHTML = '';
    
    if (!reviews || reviews.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">No reviews found.</td></tr>';
        return;
    }

    // Sort newest first
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    reviews.forEach(r => {
        const tr = document.createElement('tr');
        const stars = '★'.repeat(r.rating) + '☆'.repeat(5 - r.rating);
        const reviewDate = new Date(r.createdAt).toLocaleString();
        
        tr.innerHTML = `
            <td>#${r.id}</td>
            <td><a href="product.html?id=${r.productId}" target="_blank">#${r.productId}</a></td>
            <td><strong>${r.userName}</strong></td>
            <td><span class="stars-gold" title="${r.rating} Stars">${stars}</span></td>
            <td><div class="review-text">${escapeHTML(r.comment || 'No comment provided.')}</div></td>
            <td>${reviewDate}</td>
            <td>
                <button class="btn btn-danger btn-sm" onclick="deleteReview(${r.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteReview(reviewId) {
    if (!confirm('Are you sure you want to delete this review? It will be permanently removed from the product.')) return;
    
    try {
        await fetchAPI(`/admin/reviews/${reviewId}`, 'DELETE');
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Review deleted successfully.', 'success');
            ShopNovaUI.playSound('success');
        } else {
            alert('Review deleted successfully.');
        }
        await loadReviews();
    } catch (error) {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast(error.message || 'Failed to delete review', 'error');
            ShopNovaUI.playSound('error');
        } else {
            alert(error.message || 'Failed to delete review');
        }
    }
}

function escapeHTML(str) {
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}
