const API_BASE_URL = 'http://localhost:8080/api';

async function testProducts() {
    try {
        const res = await fetch(`${API_BASE_URL}/products`);
        const products = await res.json();
        console.log(`Testing ${products.length} products...`);
        
        for (const p of products) {
            const detailRes = await fetch(`${API_BASE_URL}/products/${p.id}`);
            if (!detailRes.ok) {
                console.error(`FAILED: Product ID ${p.id} (${p.name}) returned ${detailRes.status}`);
            } else {
                const detail = await detailRes.json();
                if (!detail || !detail.name) {
                    console.error(`FAILED: Product ID ${p.id} (${p.name}) returned invalid data`);
                }
            }
        }
        console.log('Test complete.');
    } catch (err) {
        console.error('Test failed:', err.message);
    }
}

testProducts();
