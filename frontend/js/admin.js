document.addEventListener('DOMContentLoaded', () => {
    // Basic Admin Check
    const role = localStorage.getItem('role');
    if (role !== 'ADMIN' && role !== 'ROLE_ADMIN') {
        alert("Unauthorized access. Please login as an administrator.");
        window.location.href = 'index.html';
        return;
    }

    loadAdminProducts();
    
    document.getElementById('pImageFile').addEventListener('change', function(e) {
        if (this.files && this.files[0]) {
            const reader = new FileReader();
            reader.onload = function(e) {
                document.getElementById('imagePreview').src = e.target.result;
            };
            reader.readAsDataURL(this.files[0]);
        }
    });

    const productForm = document.getElementById('productForm');
    productForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const id = document.getElementById('productId').value;
        const product = {
            name: document.getElementById('pName').value,
            price: parseFloat(document.getElementById('pPrice').value),
            category: document.getElementById('pCategory').value,
            stock: parseInt(document.getElementById('pStock').value),
            imageUrl: document.getElementById('pImageUrl').value,
            description: document.getElementById('pDescription').value
        };

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';

        try {
            const fileInput = document.getElementById('pImageFile');
            if (fileInput.files.length > 0) {
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                
                const token = localStorage.getItem('jwtToken');
                const uploadRes = await fetch(`${API_BASE_URL}/upload`, {
                    method: 'POST',
                    headers: { 'Authorization': 'Bearer ' + token },
                    body: formData
                });
                
                if (!uploadRes.ok) {
                    throw new Error('Image upload failed');
                }
                
                const uploadData = await uploadRes.json();
                product.imageUrl = uploadData.url;
            }

            if (id) {
                await fetchAPI(`/products/${id}`, 'PUT', product);
                if (window.ShopNovaUI) ShopNovaUI.showToast('Product updated successfully!', 'success');
                else alert('Product updated successfully!');
            } else {
                await fetchAPI('/products', 'POST', product);
                if (window.ShopNovaUI) ShopNovaUI.showToast('Product added successfully!', 'success');
                else alert('Product added successfully!');
            }
            if (window.ShopNovaUI) ShopNovaUI.playSound('success');
            resetForm();
            loadAdminProducts();
        } catch (err) {
            if (window.ShopNovaUI) {
                ShopNovaUI.showToast('Failed to save product: ' + err.message, 'error');
                ShopNovaUI.playSound('error');
            } else {
                alert('Failed to save product: ' + err.message);
            }
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save Product';
        }
    });
});


function editProduct(product) {
    document.getElementById('form-title').textContent = 'Edit Product';
    document.getElementById('productId').value = product.id;
    document.getElementById('pName').value = product.name;
    document.getElementById('pPrice').value = product.price;
    document.getElementById('pCategory').value = product.category;
    document.getElementById('pStock').value = product.stock;
    document.getElementById('pImageUrl').value = product.imageUrl || '';
    document.getElementById('imagePreview').src = product.imageUrl || 'https://via.placeholder.com/150';
    document.getElementById('pDescription').value = product.description || '';
    
    document.getElementById('cancelBtn').classList.remove('hidden');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
    document.getElementById('productForm').reset();
    document.getElementById('imagePreview').src = 'https://via.placeholder.com/150';
    document.getElementById('form-title').textContent = 'Add New Product';
    document.getElementById('productId').value = '';
    document.getElementById('cancelBtn').classList.add('hidden');
}

async function deleteProduct(id) {
    if (!confirm('Are you sure you want to delete this product?')) return;
    
    try {
        await fetchAPI(`/products/${id}`, 'DELETE');
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Product deleted!', 'success');
            ShopNovaUI.playSound('success');
        } else {
            alert('Product deleted!');
        }
        loadAdminProducts();
    } catch (err) {
        if (window.ShopNovaUI) {
            ShopNovaUI.showToast('Failed to delete product: ' + err.message, 'error');
            ShopNovaUI.playSound('error');
        } else {
            alert('Failed to delete product: ' + err.message);
        }
    }
}

async function handleBulkUpload() {
    const imagesInput = document.getElementById('bulkImages');
    const csvInput = document.getElementById('bulkCsv');
    const statusDiv = document.getElementById('bulkStatus');
    
    if (imagesInput.files.length === 0 || csvInput.files.length === 0) {
        alert("Please select both image files and a CSV file.");
        return;
    }

    try {
        statusDiv.textContent = "Uploading images...";
        statusDiv.style.color = "blue";
        
        // 1. Upload Images
        const imageFormData = new FormData();
        for (let i = 0; i < imagesInput.files.length; i++) {
            imageFormData.append('files', imagesInput.files[i]);
        }
        
        const imgRes = await fetch(`${API_BASE_URL}/products/upload-images`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwtToken') },
            body: imageFormData
        });

        if (!imgRes.ok) throw new Error('Image upload failed');
        const uploadedImages = await imgRes.json();

        statusDiv.textContent = `Successfully saved ${uploadedImages.length} images. Processing CSV...`;
        
        // 2. Upload CSV
        const csvFormData = new FormData();
        csvFormData.append('file', csvInput.files[0]);
        
        const csvRes = await fetch(`${API_BASE_URL}/products/bulk-upload`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer ' + localStorage.getItem('jwtToken') },
            body: csvFormData
        });

        if (!csvRes.ok) throw new Error('CSV upload failed');
        
        const result = await csvRes.json();
        statusDiv.textContent = `Successfully uploaded ${result.length} products!`;
        statusDiv.style.color = "green";
        
        // Clear inputs and refresh list
        imagesInput.value = '';
        csvInput.value = '';
        loadAdminProducts();
        
    } catch (error) {
        console.error(error);
        statusDiv.textContent = "Error: " + error.message;
        statusDiv.style.color = "red";
    }
}

let allAdminProducts = [];
async function loadAdminProducts() {
    const tbody = document.getElementById('admin-product-list');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    
    try {
        allAdminProducts = await fetchAPI('/products', 'GET');
        renderAdminProducts(allAdminProducts);
    } catch (err) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center" style="color: red;">Failed to load products.</td></tr>';
    }
}

function renderAdminProducts(products) {
    const tbody = document.getElementById('admin-product-list');
    tbody.innerHTML = '';
    
    if(!products || products.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">No products found.</td></tr>';
        return;
    }

    products.forEach(p => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><img src="${p.imageUrl || 'https://via.placeholder.com/50'}" onerror="this.onerror=null;this.src='https://via.placeholder.com/50';" style="width: 50px; height: 50px; object-fit: cover; border-radius: 4px;"></td>
            <td>${p.name}</td>
            <td>Rs. ${p.price.toLocaleString()}</td>
            <td>${p.stock}</td>
            <td class="action-btns">
                <button class="btn btn-outline btn-sm" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "&apos;")})'>Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteProduct(${p.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function filterProducts() {
    const query = document.getElementById('productSearch').value.toLowerCase();
    const filtered = allAdminProducts.filter(p => 
        p.name.toLowerCase().includes(query) || 
        (p.category && p.category.toLowerCase().includes(query))
    );
    renderAdminProducts(filtered);
}
