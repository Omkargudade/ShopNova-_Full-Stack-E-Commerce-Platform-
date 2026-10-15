const express = require('express');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 8989;
const JWT_SECRET = process.env.JWT_SECRET || '9a4f2c8d3b7a1e6f45c8a0b3f267d8b1d4e6f3c8a9d2b5f8e3a9c8b5f6v8a3d9';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const cleanName = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9]/g, '_');
    cb(null, `${cleanName}_${Date.now()}${ext}`);
  }
});
const upload = multer({ storage });

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Cache-Control', 'Content-Type'],
  credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// --- DATABASE CONNECTION / MOCK FALLBACK ---
let db = null;
let useMock = false;

// Mock database storage
const mockDb = {
  users: [
    { id: 1, name: 'Admin User', email: 'admin@shopnova.com', password: '', role: 'ADMIN', blocked: false },
    { id: 2, name: 'Demo Customer', email: 'demouser@shopnova.com', password: '', role: 'CUSTOMER', blocked: false }
  ],
  products: [
    { id: 178, name: 'Dell XPS 13', price: 1199.0, description: 'Sleek, powerful ultrabook with infinity edge display.', imageUrl: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=600', image_url: 'https://images.unsplash.com/photo-1593642632823-8f785ba67e45?q=80&w=600', category: 'Electronics', stock: 12, brand: 'Dell', discount: 0, keywords: 'laptop, ultrabook', averageRating: 4.5, reviewCount: 2 },
    { id: 179, name: 'Nike Air Max 270', price: 150.0, description: 'Max Air unit delivers all-day comfort and athletic style.', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600', image_url: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?q=80&w=600', category: 'Fashion', stock: 50, brand: 'Nike', discount: 10, keywords: 'shoes, sneaker', averageRating: 4.8, reviewCount: 5 },
    { id: 180, name: 'Stanley Quencher', price: 45.0, description: 'Iconic large tumbler with handle and straw.', imageUrl: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=600', image_url: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?q=80&w=600', category: 'Lifestyle', stock: 75, brand: 'Stanley', discount: 0, keywords: 'cup, tumbler', averageRating: 4.2, reviewCount: 1 }
  ],
  carts: {},
  wishlists: {},
  orders: [
    { id: 101, userId: 2, customerPhone: '9876543210', shippingAddress: '123 Main St, Tech City', totalAmount: 1199.0, status: 'DELIVERED', paymentStatus: 'PAID', orderDate: new Date('2026-05-10T12:00:00Z'), items: [{ productId: 178, quantity: 1, price: 1199.0 }] },
    { id: 102, userId: 2, customerPhone: '9876543210', shippingAddress: '123 Main St, Tech City', totalAmount: 195.0, status: 'PENDING', paymentStatus: 'PENDING', orderDate: new Date('2026-05-18T08:00:00Z'), items: [{ productId: 179, quantity: 1, price: 150.0 }, { productId: 180, quantity: 1, price: 45.0 }] }
  ],
  reviews: [
    { id: 1, productId: 178, userName: 'Alice Smith', rating: 5, comment: 'Incredible speed and battery life!', createdAt: new Date() },
    { id: 2, productId: 179, userName: 'Bob Johnson', rating: 4, comment: 'Super comfy but runs slightly small.', createdAt: new Date() }
  ],
  activities: []
};

bcrypt.hash('admin123', 10).then(hash => {
  mockDb.users[0].password = hash;
});
bcrypt.hash('password123', 10).then(hash => {
  mockDb.users[1].password = hash;
});

async function initDb() {
  try {
    db = await mysql.createPool({
      host: 'localhost',
      user: 'root',
      password: 'root',
      database: 'ecommerce_db',
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    console.log('⚡ MySQL Database connected successfully.');
  } catch (err) {
    console.warn('⚠️ MySQL connection failed. Falling back to Mock In-Memory Database.', err.message);
    useMock = true;
  }
}
initDb();

// Helper: Normalize product properties
function formatProduct(p) {
  if (!p) return null;
  const img = p.imageUrl || p.image_url || '';
  return {
    ...p,
    id: p.id,
    name: p.name,
    price: Number(p.price),
    description: p.description || '',
    category: p.category || 'General',
    stock: p.stock != null ? Number(p.stock) : 0,
    brand: p.brand || '',
    discount: p.discount != null ? Number(p.discount) : 0,
    keywords: p.keywords || '',
    imageUrl: img,
    image_url: img,
    averageRating: p.averageRating != null ? Number(p.averageRating) : (p.average_rating != null ? Number(p.average_rating) : 4.5),
    reviewCount: p.reviewCount != null ? Number(p.reviewCount) : (p.review_count != null ? Number(p.review_count) : 0)
  };
}

// Helper: Format Order Response (supports both nested .order and flat access)
function formatOrder(o, items = []) {
  if (!o) return null;
  const orderObj = {
    id: o.id,
    userId: o.userId || o.user_id,
    user_id: o.userId || o.user_id,
    customerPhone: o.customerPhone || o.customer_phone || '',
    customer_phone: o.customerPhone || o.customer_phone || '',
    shippingAddress: o.shippingAddress || o.shipping_address || '',
    shipping_address: o.shippingAddress || o.shipping_address || '',
    totalAmount: Number(o.totalAmount || o.total_amount || 0),
    total_amount: Number(o.totalAmount || o.total_amount || 0),
    status: (o.status || 'PENDING').toUpperCase(),
    paymentStatus: (o.paymentStatus || o.payment_status || 'PENDING').toUpperCase(),
    payment_status: (o.paymentStatus || o.payment_status || 'PENDING').toUpperCase(),
    orderDate: o.orderDate || o.order_date || new Date(),
    order_date: o.orderDate || o.order_date || new Date(),
    customerName: o.customerName || o.customer_name || ''
  };
  const formattedItems = (items || []).map(i => ({
    id: i.id,
    orderId: i.orderId || i.order_id,
    order_id: i.orderId || i.order_id,
    productId: i.productId || i.product_id,
    product_id: i.productId || i.product_id,
    quantity: Number(i.quantity),
    price: Number(i.price)
  }));
  return {
    order: orderObj,
    items: formattedItems,
    ...orderObj
  };
}

// --- AUTH MIDDLEWARE ---
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ message: 'Access Token Required' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Invalid or Expired Token' });
    req.user = user;
    next();
  });
}

function requireAdmin(req, res, next) {
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'ROLE_ADMIN')) {
    return res.status(403).json({ message: 'Requires Administrator Role' });
  }
  next();
}

// ==========================================
// 1. AUTHENTICATION
// ==========================================
app.post('/api/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  if (useMock) {
    const exists = mockDb.users.some(u => u.email === email);
    if (exists) return res.status(400).json({ message: 'Error: Email is already in use!' });
    
    const newUser = {
      id: mockDb.users.length + 1,
      name,
      email,
      password: hashedPassword,
      role: 'CUSTOMER',
      blocked: false
    };
    mockDb.users.push(newUser);
    return res.status(201).json({ message: 'User registered successfully!' });
  } else {
    try {
      const [exists] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
      if (exists.length > 0) return res.status(400).json({ message: 'Error: Email is already in use!' });

      await db.query(
        'INSERT INTO users (name, email, password, role, blocked) VALUES (?, ?, ?, ?, ?)', 
        [name, email, hashedPassword, 'CUSTOMER', 0]
      );
      return res.status(201).json({ message: 'User registered successfully!' });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Missing email or password' });
  }

  if (useMock) {
    const user = mockDb.users.find(u => u.email === email);
    if (!user) return res.status(400).json({ message: 'Bad credentials' });
    if (user.blocked) return res.status(403).json({ message: 'User is blocked' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ message: 'Bad credentials' });

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
    return res.json({ token, id: user.id, name: user.name, email: user.email, role: user.role });
  } else {
    try {
      const [rows] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
      if (rows.length === 0) return res.status(400).json({ message: 'Bad credentials' });
      const user = rows[0];

      // Handle MySQL BIT(1) Buffer
      const isBlocked = Buffer.isBuffer(user.blocked) ? user.blocked[0] === 1 : Boolean(user.blocked);
      if (isBlocked) return res.status(403).json({ message: 'User is blocked' });

      const match = await bcrypt.compare(password, user.password);
      if (!match) return res.status(400).json({ message: 'Bad credentials' });

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '1d' });
      return res.json({ token, id: user.id, name: user.name, email: user.email, role: user.role });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// ==========================================
// 2. PRODUCTS & SEARCH
// ==========================================
app.get('/api/products/categories', async (req, res) => {
  if (useMock) {
    const cats = [...new Set(mockDb.products.map(p => p.category))];
    return res.json(cats);
  } else {
    try {
      const [rows] = await db.query('SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND category != ""');
      return res.json(rows.map(r => r.category));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.get('/api/products/suggestions', async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (!q) return res.json([]);

  if (useMock) {
    const suggestions = mockDb.products
      .filter(p => p.name.toLowerCase().includes(q) || (p.keywords && p.keywords.toLowerCase().includes(q)))
      .map(p => p.name)
      .slice(0, 8);
    return res.json(suggestions);
  } else {
    try {
      const [rows] = await db.query(
        'SELECT name FROM products WHERE LOWER(name) LIKE ? OR LOWER(keywords) LIKE ? LIMIT 8',
        [`%${q}%`, `%${q}%`]
      );
      return res.json(rows.map(r => r.name));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.get('/api/products/search', async (req, res) => {
  const {
    q,
    category,
    brand,
    minPrice,
    maxPrice,
    inStock,
    minDiscount,
    sort = 'id,desc',
    page = 0,
    size = 12
  } = req.query;

  const pageNum = Math.max(0, parseInt(page) || 0);
  const pageSize = Math.max(1, parseInt(size) || 12);

  if (useMock) {
    let list = mockDb.products.map(formatProduct);
    if (q) {
      const term = q.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(term) || (p.description && p.description.toLowerCase().includes(term)));
    }
    if (category) {
      const cats = Array.isArray(category) ? category : [category];
      list = list.filter(p => cats.some(c => p.category && p.category.toLowerCase() === c.toLowerCase()));
    }
    if (brand) {
      const brands = Array.isArray(brand) ? brand : [brand];
      list = list.filter(p => brands.some(b => p.brand && p.brand.toLowerCase() === b.toLowerCase()));
    }
    if (minPrice) list = list.filter(p => p.price >= parseFloat(minPrice));
    if (maxPrice) list = list.filter(p => p.price <= parseFloat(maxPrice));
    if (inStock === 'true' || inStock === true) list = list.filter(p => p.stock > 0);
    if (minDiscount) list = list.filter(p => (p.discount || 0) >= parseFloat(minDiscount));

    const totalElements = list.length;
    const totalPages = Math.ceil(totalElements / pageSize) || 1;
    const content = list.slice(pageNum * pageSize, (pageNum + 1) * pageSize);

    return res.json({ content, totalPages, totalElements, number: pageNum, size: pageSize });
  } else {
    try {
      let whereClauses = [];
      let params = [];

      if (q) {
        whereClauses.push('(LOWER(name) LIKE ? OR LOWER(description) LIKE ? OR LOWER(keywords) LIKE ?)');
        params.push(`%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`, `%${q.toLowerCase()}%`);
      }
      if (category) {
        const cats = Array.isArray(category) ? category : [category];
        whereClauses.push(`category IN (${cats.map(() => '?').join(',')})`);
        params.push(...cats);
      }
      if (brand) {
        const brands = Array.isArray(brand) ? brand : [brand];
        whereClauses.push(`brand IN (${brands.map(() => '?').join(',')})`);
        params.push(...brands);
      }
      if (minPrice) {
        whereClauses.push('price >= ?');
        params.push(parseFloat(minPrice));
      }
      if (maxPrice) {
        whereClauses.push('price <= ?');
        params.push(parseFloat(maxPrice));
      }
      if (inStock === 'true' || inStock === true) {
        whereClauses.push('stock > 0');
      }
      if (minDiscount) {
        whereClauses.push('discount >= ?');
        params.push(parseFloat(minDiscount));
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      // Count query
      const [[{ total }]] = await db.query(`SELECT COUNT(*) as total FROM products ${whereSql}`, params);

      // Order By
      let orderBy = 'ORDER BY id DESC';
      if (sort) {
        const [field, dir] = sort.split(',');
        const safeDir = (dir && dir.toLowerCase() === 'asc') ? 'ASC' : 'DESC';
        if (field === 'price') orderBy = `ORDER BY price ${safeDir}`;
        else if (field === 'name') orderBy = `ORDER BY name ${safeDir}`;
        else orderBy = `ORDER BY id ${safeDir}`;
      }

      // Pagination
      const offset = pageNum * pageSize;
      const dataSql = `SELECT * FROM products ${whereSql} ${orderBy} LIMIT ? OFFSET ?`;
      const [rows] = await db.query(dataSql, [...params, pageSize, offset]);

      const content = rows.map(formatProduct);
      const totalPages = Math.ceil(total / pageSize) || 1;

      return res.json({ content, totalPages, totalElements: total, number: pageNum, size: pageSize });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.get('/api/products', async (req, res) => {
  const category = req.query.category;
  if (useMock) {
    let list = mockDb.products.map(formatProduct);
    if (category) list = list.filter(p => p.category && p.category.toLowerCase() === category.toLowerCase());
    return res.json(list);
  } else {
    try {
      let query = 'SELECT * FROM products';
      const params = [];
      if (category) {
        query += ' WHERE LOWER(category) = LOWER(?)';
        params.push(category);
      }
      query += ' ORDER BY id DESC';
      const [rows] = await db.query(query, params);
      return res.json(rows.map(formatProduct));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.get('/api/products/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid product ID' });

  if (useMock) {
    const prod = mockDb.products.find(p => p.id === id);
    if (!prod) return res.status(404).json({ message: 'Product not found' });
    return res.json(formatProduct(prod));
  } else {
    try {
      const [rows] = await db.query('SELECT * FROM products WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ message: 'Product not found' });
      return res.json(formatProduct(rows[0]));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.post('/api/products', authenticateToken, requireAdmin, async (req, res) => {
  const { name, price, description, imageUrl, category, stock, brand, discount, keywords } = req.body;
  if (!name || price == null) return res.status(400).json({ message: 'Name and price are required' });

  const finalImg = imageUrl || req.body.image_url || '';
  const finalStock = parseInt(stock) || 0;
  const finalDiscount = parseFloat(discount) || 0;

  if (useMock) {
    const newP = formatProduct({
      id: mockDb.products.length + 100,
      name,
      price: parseFloat(price),
      description: description || '',
      imageUrl: finalImg,
      image_url: finalImg,
      category: category || 'General',
      stock: finalStock,
      brand: brand || '',
      discount: finalDiscount,
      keywords: keywords || ''
    });
    mockDb.products.push(newP);
    return res.status(201).json(newP);
  } else {
    try {
      const [result] = await db.query(
        'INSERT INTO products (name, price, description, image_url, category, stock, brand, discount, keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, price, description, finalImg, category, finalStock, brand || '', finalDiscount, keywords || '']
      );
      return res.status(201).json(formatProduct({
        id: result.insertId,
        name,
        price,
        description,
        imageUrl: finalImg,
        category,
        stock: finalStock,
        brand,
        discount: finalDiscount,
        keywords
      }));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.put('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid product ID' });

  const { name, price, description, imageUrl, category, stock, brand, discount, keywords } = req.body;
  const finalImg = imageUrl || req.body.image_url || '';
  const finalStock = stock != null ? parseInt(stock) : 0;
  const finalDiscount = discount != null ? parseFloat(discount) : 0;

  if (useMock) {
    const idx = mockDb.products.findIndex(p => p.id === id);
    if (idx === -1) return res.status(404).json({ message: 'Product not found' });
    mockDb.products[idx] = formatProduct({
      ...mockDb.products[idx],
      name,
      price: parseFloat(price),
      description,
      imageUrl: finalImg,
      image_url: finalImg,
      category,
      stock: finalStock,
      brand: brand || '',
      discount: finalDiscount,
      keywords: keywords || ''
    });
    return res.json(mockDb.products[idx]);
  } else {
    try {
      await db.query(
        'UPDATE products SET name=?, price=?, description=?, image_url=?, category=?, stock=?, brand=?, discount=?, keywords=? WHERE id=?',
        [name, price, description, finalImg, category, finalStock, brand || '', finalDiscount, keywords || '', id]
      );
      return res.json(formatProduct({
        id,
        name,
        price,
        description,
        imageUrl: finalImg,
        category,
        stock: finalStock,
        brand,
        discount: finalDiscount,
        keywords
      }));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.delete('/api/products/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid product ID' });

  if (useMock) {
    mockDb.products = mockDb.products.filter(p => p.id !== id);
    return res.status(204).send();
  } else {
    try {
      await db.query('DELETE FROM products WHERE id = ?', [id]);
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// File Uploads
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
  return res.json({ url: `/uploads/${req.file.filename}` });
});

app.post('/api/products/upload-images', upload.array('files'), (req, res) => {
  if (!req.files || req.files.length === 0) return res.json([]);
  return res.json(req.files.map(f => `/uploads/${f.filename}`));
});

app.post('/api/products/bulk-upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'No CSV file provided' });
  try {
    const content = fs.readFileSync(req.file.path, 'utf8');
    const lines = content.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length <= 1) return res.json([]);

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
    const inserted = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, idx) => row[h] = values[idx] || '');

      const name = row['name'] || row['product_name'];
      const price = parseFloat(row['price']) || 0;
      if (!name) continue;

      const description = row['description'] || '';
      const category = row['category'] || 'General';
      const imageUrl = row['image_url'] || row['imageurl'] || '';
      const stock = parseInt(row['stock']) || 10;
      const brand = row['brand'] || '';
      const discount = parseFloat(row['discount']) || 0;
      const keywords = row['keywords'] || '';

      if (!useMock && db) {
        const [result] = await db.query(
          'INSERT INTO products (name, price, description, image_url, category, stock, brand, discount, keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [name, price, description, imageUrl, category, stock, brand, discount, keywords]
        );
        inserted.push({ id: result.insertId, name, price, description, imageUrl, category, stock, brand, discount, keywords });
      } else {
        const newProd = formatProduct({ id: mockDb.products.length + 100, name, price, description, imageUrl, category, stock, brand, discount, keywords });
        mockDb.products.push(newProd);
        inserted.push(newProd);
      }
    }
    return res.json(inserted);
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// ==========================================
// 3. CART
// ==========================================
app.post('/api/cart/add', async (req, res) => {
  const { userId, productId, quantity = 1 } = req.body;
  if (!userId || !productId) return res.status(400).json({ message: 'Missing userId or productId' });

  const q = parseInt(quantity) || 1;

  if (useMock) {
    if (!mockDb.carts[userId]) mockDb.carts[userId] = [];
    const existing = mockDb.carts[userId].find(i => i.productId === productId);
    if (existing) {
      existing.quantity += q;
    } else {
      mockDb.carts[userId].push({
        id: mockDb.carts[userId].length + 1,
        userId: parseInt(userId),
        productId: parseInt(productId),
        quantity: q
      });
    }
    return res.status(201).json({ message: 'Item added to cart' });
  } else {
    try {
      const [existing] = await db.query('SELECT id, quantity FROM cart WHERE user_id = ? AND product_id = ?', [userId, productId]);
      if (existing.length > 0) {
        await db.query('UPDATE cart SET quantity = quantity + ? WHERE id = ?', [q, existing[0].id]);
      } else {
        await db.query('INSERT INTO cart (user_id, product_id, quantity) VALUES (?, ?, ?)', [userId, productId, q]);
      }
      return res.status(201).json({ message: 'Item added to cart' });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// Generic add-to-cart alias
app.post('/api/cart', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { productId, quantity = 1 } = req.body;
  req.body.userId = userId;
  return app._router.handle({ ...req, url: '/api/cart/add', method: 'POST' }, res);
});

app.get('/api/cart/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });

  if (useMock) {
    const userCart = mockDb.carts[userId] || [];
    const items = userCart.map(c => {
      const prod = mockDb.products.find(p => p.id === c.productId) || {};
      return {
        id: c.id,
        productId: c.productId,
        quantity: c.quantity,
        name: prod.name || 'Product',
        price: prod.price || 0,
        imageUrl: prod.imageUrl || prod.image_url || ''
      };
    });
    return res.json(items);
  } else {
    try {
      const [rows] = await db.query(
        'SELECT c.id, c.quantity, c.product_id as productId, p.name, p.price, p.image_url as imageUrl FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?',
        [userId]
      );
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// Authenticated current-user cart alias
app.get('/api/cart', authenticateToken, async (req, res) => {
  req.params.userId = req.user.id;
  return app._router.handle({ ...req, url: `/api/cart/${req.user.id}`, method: 'GET' }, res);
});

app.put('/api/cart/update/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  const { quantity } = req.body;
  const q = Math.max(1, parseInt(quantity) || 1);

  if (useMock) {
    for (let u in mockDb.carts) {
      const item = mockDb.carts[u].find(i => i.id === id);
      if (item) item.quantity = q;
    }
    return res.json({ id, quantity: q });
  } else {
    try {
      await db.query('UPDATE cart SET quantity = ? WHERE id = ?', [q, id]);
      return res.json({ id, quantity: q });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.delete('/api/cart/remove/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  if (useMock) {
    for (let u in mockDb.carts) {
      mockDb.carts[u] = mockDb.carts[u].filter(i => i.id !== id);
    }
    return res.status(204).send();
  } else {
    try {
      await db.query('DELETE FROM cart WHERE id = ?', [id]);
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.delete('/api/cart/items/:itemId', authenticateToken, async (req, res) => {
  req.params.id = req.params.itemId;
  return app._router.handle({ ...req, url: `/api/cart/remove/${req.params.id}`, method: 'DELETE' }, res);
});

// ==========================================
// 4. WISHLIST
// ==========================================
app.post('/api/wishlist/add', async (req, res) => {
  const { userId, productId } = req.body;
  if (!userId || !productId) return res.status(400).json({ message: 'User ID and Product ID are required' });

  if (useMock) {
    if (!mockDb.wishlists[userId]) mockDb.wishlists[userId] = [];
    if (!mockDb.wishlists[userId].some(pId => pId === productId)) {
      mockDb.wishlists[userId].push(productId);
    }
    return res.json({ message: 'Added to wishlist successfully' });
  } else {
    try {
      const [existing] = await db.query('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);
      if (existing.length === 0) {
        await db.query('INSERT INTO wishlists (user_id, product_id) VALUES (?, ?)', [userId, productId]);
      }
      return res.json({ message: 'Added to wishlist successfully' });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.delete('/api/wishlist/remove/:userId/:productId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const productId = parseInt(req.params.productId);

  if (useMock) {
    if (mockDb.wishlists[userId]) {
      mockDb.wishlists[userId] = mockDb.wishlists[userId].filter(pId => pId !== productId);
    }
    return res.json({ message: 'Removed from wishlist successfully' });
  } else {
    try {
      await db.query('DELETE FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);
      return res.json({ message: 'Removed from wishlist successfully' });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.get('/api/wishlist/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });

  if (useMock) {
    const pIds = mockDb.wishlists[userId] || [];
    const prods = mockDb.products.filter(p => pIds.includes(p.id)).map(formatProduct);
    return res.json(prods);
  } else {
    try {
      const [rows] = await db.query(
        'SELECT p.* FROM wishlists w JOIN products p ON w.product_id = p.id WHERE w.user_id = ? ORDER BY w.id DESC',
        [userId]
      );
      return res.json(rows.map(formatProduct));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.get('/api/wishlist/count/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.json({ count: 0 });

  if (useMock) {
    return res.json({ count: (mockDb.wishlists[userId] || []).length });
  } else {
    try {
      const [[{ count }]] = await db.query('SELECT COUNT(*) as count FROM wishlists WHERE user_id = ?', [userId]);
      return res.json({ count });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.get('/api/wishlist/check/:userId/:productId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  const productId = parseInt(req.params.productId);

  if (useMock) {
    const inWishlist = (mockDb.wishlists[userId] || []).includes(productId);
    return res.json({ inWishlist });
  } else {
    try {
      const [rows] = await db.query('SELECT id FROM wishlists WHERE user_id = ? AND product_id = ?', [userId, productId]);
      return res.json({ inWishlist: rows.length > 0 });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// Backward-compatible auth-based wishlist endpoints
app.get('/api/wishlist', authenticateToken, async (req, res) => {
  req.params.userId = req.user.id;
  return app._router.handle({ ...req, url: `/api/wishlist/${req.user.id}`, method: 'GET' }, res);
});

app.post('/api/wishlist', authenticateToken, async (req, res) => {
  req.body.userId = req.user.id;
  return app._router.handle({ ...req, url: '/api/wishlist/add', method: 'POST' }, res);
});

app.delete('/api/wishlist/:productId', authenticateToken, async (req, res) => {
  req.params.userId = req.user.id;
  return app._router.handle({ ...req, url: `/api/wishlist/remove/${req.user.id}/${req.params.productId}`, method: 'DELETE' }, res);
});

// ==========================================
// 5. ORDERS
// ==========================================
async function placeOrderForUser(userId, customerPhone, shippingAddress) {
  if (useMock) {
    const userCart = mockDb.carts[userId] || [];
    if (userCart.length === 0) throw new Error('Cart is empty');
    
    const totalAmount = userCart.reduce((sum, item) => {
      const p = mockDb.products.find(x => x.id === item.productId);
      return sum + ((p ? p.price : 100) * item.quantity);
    }, 0);

    const newOrder = {
      id: mockDb.orders.length + 101,
      userId,
      customerPhone: customerPhone || '9876543210',
      shippingAddress: shippingAddress || 'Default Address',
      totalAmount,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      orderDate: new Date(),
      items: userCart.map(c => ({
        productId: c.productId,
        quantity: c.quantity,
        price: (mockDb.products.find(p => p.id === c.productId) || {}).price || 100
      }))
    };
    mockDb.orders.push(newOrder);
    mockDb.carts[userId] = [];
    return formatOrder(newOrder, newOrder.items);
  } else {
    // 1. Fetch user's cart items joined with products
    const [cartRows] = await db.query(
      'SELECT c.id as cartItemId, c.product_id, c.quantity, p.price FROM cart c JOIN products p ON c.product_id = p.id WHERE c.user_id = ?',
      [userId]
    );

    if (cartRows.length === 0) {
      throw new Error('Your cart is empty');
    }

    const totalAmount = cartRows.reduce((sum, item) => sum + (Number(item.price) * item.quantity), 0);
    const orderDate = new Date();

    const [orderResult] = await db.query(
      'INSERT INTO orders (user_id, customer_phone, shipping_address, total_amount, status, payment_status, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [userId, customerPhone || '9876543210', shippingAddress || 'Main Street, City', totalAmount, 'PENDING', 'PENDING', orderDate]
    );
    const orderId = orderResult.insertId;

    const orderItems = [];
    for (const item of cartRows) {
      const [itemResult] = await db.query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );
      orderItems.push({
        id: itemResult.insertId,
        orderId,
        productId: item.product_id,
        quantity: item.quantity,
        price: item.price
      });
    }

    // 2. Clear user's cart
    await db.query('DELETE FROM cart WHERE user_id = ?', [userId]);

    return formatOrder({
      id: orderId,
      userId,
      customerPhone: customerPhone || '9876543210',
      shippingAddress: shippingAddress || 'Main Street, City',
      totalAmount,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      orderDate
    }, orderItems);
  }
}

app.post('/api/orders/place', async (req, res) => {
  const { userId, customerPhone, shippingAddress } = req.body;
  const uid = parseInt(userId);
  if (!uid) return res.status(400).json({ message: 'User ID is required' });

  try {
    const orderResponse = await placeOrderForUser(uid, customerPhone, shippingAddress);
    return res.status(201).json(orderResponse);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

// Direct orders POST
app.post('/api/orders', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const { customerPhone, shippingAddress, items } = req.body;

  if (items && Array.isArray(items) && items.length > 0) {
    // If client supplied custom items directly
    const totalAmount = items.reduce((acc, i) => acc + (Number(i.price) * i.quantity), 0);
    if (!useMock && db) {
      try {
        const [orderResult] = await db.query(
          'INSERT INTO orders (user_id, customer_phone, shipping_address, total_amount, status, payment_status, order_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [userId, customerPhone || '', shippingAddress || '', totalAmount, 'PENDING', 'PENDING', new Date()]
        );
        const orderId = orderResult.insertId;
        for (const item of items) {
          await db.query(
            'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
            [orderId, item.productId || item.product_id, item.quantity, item.price]
          );
        }
        await db.query('DELETE FROM cart WHERE user_id = ?', [userId]);
        return res.status(201).json({ id: orderId, totalAmount, status: 'PENDING' });
      } catch (err) {
        return res.status(500).json({ message: err.message });
      }
    }
  }

  // Fallback to place from cart
  try {
    const orderResponse = await placeOrderForUser(userId, customerPhone, shippingAddress);
    return res.status(201).json(orderResponse);
  } catch (err) {
    return res.status(400).json({ message: err.message });
  }
});

app.get('/api/orders/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);
  if (isNaN(userId)) return res.status(400).json({ message: 'Invalid user ID' });

  if (useMock) {
    const userOrders = mockDb.orders.filter(o => o.userId === userId);
    return res.json(userOrders.map(o => formatOrder(o, o.items)));
  } else {
    try {
      const [orders] = await db.query('SELECT * FROM orders WHERE user_id = ? ORDER BY order_date DESC', [userId]);
      const responses = [];
      for (const o of orders) {
        const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
        responses.push(formatOrder(o, items));
      }
      return res.json(responses);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.get('/api/orders/details/:orderId', async (req, res) => {
  const orderId = parseInt(req.params.orderId);
  if (isNaN(orderId)) return res.status(400).json({ message: 'Invalid order ID' });

  if (useMock) {
    const o = mockDb.orders.find(x => x.id === orderId);
    if (!o) return res.status(404).json({ message: 'Order not found' });
    return res.json(formatOrder(o, o.items));
  } else {
    try {
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [orderId]);
      if (orders.length === 0) return res.status(404).json({ message: 'Order not found' });
      const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [orderId]);
      return res.json(formatOrder(orders[0], items));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// Authenticated current-user orders alias
app.get('/api/orders', authenticateToken, async (req, res) => {
  req.params.userId = req.user.id;
  return app._router.handle({ ...req, url: `/api/orders/${req.user.id}`, method: 'GET' }, res);
});

// Admin Orders API
async function getAllOrdersAdmin(req, res) {
  if (useMock) {
    return res.json(mockDb.orders.map(o => formatOrder(o, o.items)));
  } else {
    try {
      const [orders] = await db.query(
        'SELECT o.*, u.name as customerName FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.order_date DESC'
      );
      const responses = [];
      for (const o of orders) {
        const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
        responses.push(formatOrder(o, items));
      }
      return res.json(responses);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
}

app.get('/api/orders/admin/all', authenticateToken, requireAdmin, getAllOrdersAdmin);
app.get('/api/orders/admin', authenticateToken, requireAdmin, getAllOrdersAdmin);

app.put('/api/orders/admin/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  const status = (req.query.status || (req.body && req.body.status) || 'PENDING').toUpperCase();

  if (useMock) {
    const o = mockDb.orders.find(o => o.id === id);
    if (!o) return res.status(404).json({ message: 'Order not found' });
    o.status = status;
    return res.json(formatOrder(o, o.items));
  } else {
    try {
      await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
      const [orders] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
      if (orders.length === 0) return res.status(404).json({ message: 'Order not found' });
      const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [id]);
      return res.json(formatOrder(orders[0], items));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// ==========================================
// 6. REVIEWS
// ==========================================
app.get('/api/reviews/:productId', async (req, res) => {
  const productId = parseInt(req.params.productId);
  if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID' });

  if (useMock) {
    return res.json(mockDb.reviews.filter(r => r.productId === productId));
  } else {
    try {
      const [rows] = await db.query(
        'SELECT id, product_id as productId, user_name as userName, rating, comment, created_at as createdAt FROM reviews WHERE product_id = ? ORDER BY created_at DESC',
        [productId]
      );
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.get('/api/reviews/product/:productId', async (req, res) => {
  req.params.productId = req.params.productId;
  return app._router.handle({ ...req, url: `/api/reviews/${req.params.productId}`, method: 'GET' }, res);
});

app.get('/api/reviews/average/:productId', async (req, res) => {
  const productId = parseInt(req.params.productId);
  if (isNaN(productId)) return res.status(400).json({ message: 'Invalid product ID' });

  if (useMock) {
    const revs = mockDb.reviews.filter(r => r.productId === productId);
    const avg = revs.length > 0 ? (revs.reduce((sum, r) => sum + r.rating, 0) / revs.length) : 0;
    return res.json({ averageRating: avg });
  } else {
    try {
      const [[{ avgRating }]] = await db.query(
        'SELECT AVG(rating) as avgRating FROM reviews WHERE product_id = ?',
        [productId]
      );
      return res.json({ averageRating: avgRating ? parseFloat(avgRating) : 0.0 });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.post('/api/reviews', authenticateToken, async (req, res) => {
  const { productId, rating, comment } = req.body;
  const userName = req.body.userName || req.user.email.split('@')[0];
  const pId = parseInt(productId);
  const r = parseInt(rating) || 5;

  if (useMock) {
    const newR = { id: mockDb.reviews.length + 1, productId: pId, userName, rating: r, comment, createdAt: new Date() };
    mockDb.reviews.push(newR);
    return res.status(201).json(newR);
  } else {
    try {
      const now = new Date();
      const [result] = await db.query(
        'INSERT INTO reviews (product_id, user_name, rating, comment, created_at) VALUES (?, ?, ?, ?, ?)',
        [pId, userName, r, comment, now]
      );
      return res.status(201).json({ id: result.insertId, productId: pId, userName, rating: r, comment, createdAt: now });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// Admin Review Management
app.get('/api/admin/reviews', authenticateToken, requireAdmin, async (req, res) => {
  if (useMock) {
    return res.json(mockDb.reviews);
  } else {
    try {
      const [rows] = await db.query(
        'SELECT r.id, r.product_id as productId, r.user_name as userName, r.rating, r.comment, r.created_at as createdAt, p.name as productName FROM reviews r LEFT JOIN products p ON r.product_id = p.id ORDER BY r.created_at DESC'
      );
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.delete('/api/admin/reviews/:id', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (useMock) {
    mockDb.reviews = mockDb.reviews.filter(r => r.id !== id);
    return res.status(204).send();
  } else {
    try {
      await db.query('DELETE FROM reviews WHERE id = ?', [id]);
      return res.status(204).send();
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// ==========================================
// 7. ADMIN USER MANAGEMENT
// ==========================================
app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
  if (useMock) {
    return res.json(mockDb.users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, blocked: Boolean(u.blocked) })));
  } else {
    try {
      const [rows] = await db.query('SELECT id, name, email, role, blocked FROM users ORDER BY id ASC');
      const formatted = rows.map(u => ({
        ...u,
        blocked: Buffer.isBuffer(u.blocked) ? u.blocked[0] === 1 : Boolean(u.blocked)
      }));
      return res.json(formatted);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.get('/api/admin/users/search', authenticateToken, requireAdmin, async (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  if (useMock) {
    const list = mockDb.users.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
    return res.json(list.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role, blocked: Boolean(u.blocked) })));
  } else {
    try {
      const [rows] = await db.query(
        'SELECT id, name, email, role, blocked FROM users WHERE LOWER(name) LIKE ? OR LOWER(email) LIKE ? ORDER BY id ASC',
        [`%${q}%`, `%${q}%`]
      );
      const formatted = rows.map(u => ({
        ...u,
        blocked: Buffer.isBuffer(u.blocked) ? u.blocked[0] === 1 : Boolean(u.blocked)
      }));
      return res.json(formatted);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

app.put('/api/admin/users/:id/block', authenticateToken, requireAdmin, async (req, res) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return res.status(400).json({ message: 'Invalid user ID' });

  if (useMock) {
    const user = mockDb.users.find(u => u.id === id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    user.blocked = (req.body && typeof req.body.blocked === 'boolean') ? req.body.blocked : !user.blocked;
    return res.json({ id: user.id, name: user.name, blocked: user.blocked });
  } else {
    try {
      const [rows] = await db.query('SELECT id, name, blocked FROM users WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ message: 'User not found' });

      const currentBlocked = Buffer.isBuffer(rows[0].blocked) ? rows[0].blocked[0] === 1 : Boolean(rows[0].blocked);
      const newBlocked = (req.body && typeof req.body.blocked === 'boolean') ? req.body.blocked : !currentBlocked;

      await db.query('UPDATE users SET blocked = ? WHERE id = ?', [newBlocked ? 1 : 0, id]);
      return res.json({ id, name: rows[0].name, blocked: newBlocked });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// ==========================================
// 8. ADMIN DASHBOARD STATS
// ==========================================
app.get('/api/admin/dashboard/stats', authenticateToken, requireAdmin, async (req, res) => {
  if (useMock) {
    const totalProducts = mockDb.products.length;
    const totalOrders = mockDb.orders.length;
    const totalUsers = mockDb.users.length;
    const totalRevenue = mockDb.orders.filter(o => o.status !== 'CANCELLED').reduce((acc, o) => acc + o.totalAmount, 0);
    
    return res.json({
      totalProducts,
      totalOrders,
      totalUsers,
      totalRevenue,
      recentOrders: mockDb.orders.slice(0, 5).map(o => formatOrder(o, o.items)),
      monthlySales: { Jan: 0, Feb: 0, Mar: 0, Apr: 0, May: totalRevenue, Jun: 0, Jul: 0, Aug: 0, Sep: 0, Oct: 0, Nov: 0, Dec: 0 },
      orderStatusBreakdown: { DELIVERED: 1, PENDING: 1, SHIPPED: 0, CANCELLED: 0 },
      lowStockProducts: mockDb.products.filter(p => p.stock <= 5).map(formatProduct)
    });
  } else {
    try {
      const [[{ count: totalProducts }]] = await db.query('SELECT COUNT(*) as count FROM products');
      const [[{ count: totalOrders }]] = await db.query('SELECT COUNT(*) as count FROM orders');
      const [[{ count: totalUsers }]] = await db.query('SELECT COUNT(*) as count FROM users');
      const [[{ sum: totalRevenue }]] = await db.query('SELECT SUM(total_amount) as sum FROM orders WHERE status != "CANCELLED"');
      
      const [recentOrdersRaw] = await db.query(
        'SELECT o.*, u.name as customerName FROM orders o LEFT JOIN users u ON o.user_id = u.id ORDER BY o.order_date DESC LIMIT 5'
      );
      const recentOrders = [];
      for (const o of recentOrdersRaw) {
        const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [o.id]);
        recentOrders.push(formatOrder(o, items));
      }

      const [lowStock] = await db.query('SELECT * FROM products WHERE stock <= 5 ORDER BY stock ASC LIMIT 10');

      // Calculate monthly sales for current year
      const [monthlyRows] = await db.query(`
        SELECT MONTH(order_date) as monthNum, SUM(total_amount) as monthlyTotal 
        FROM orders 
        WHERE status != "CANCELLED" AND YEAR(order_date) = YEAR(CURDATE())
        GROUP BY MONTH(order_date)
      `);
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthlySales = {};
      monthNames.forEach(m => monthlySales[m] = 0);
      monthlyRows.forEach(r => {
        const mName = monthNames[r.monthNum - 1];
        if (mName) monthlySales[mName] = Number(r.monthlyTotal);
      });

      // Calculate order status breakdown
      const [statusRows] = await db.query('SELECT status, COUNT(*) as count FROM orders GROUP BY status');
      const orderStatusBreakdown = { DELIVERED: 0, PENDING: 0, SHIPPED: 0, CANCELLED: 0 };
      statusRows.forEach(r => {
        const s = (r.status || 'PENDING').toUpperCase();
        orderStatusBreakdown[s] = Number(r.count);
      });

      return res.json({
        totalProducts,
        totalOrders,
        totalUsers,
        totalRevenue: totalRevenue ? Number(totalRevenue) : 0.0,
        recentOrders,
        monthlySales,
        orderStatusBreakdown,
        lowStockProducts: lowStock.map(formatProduct)
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// ==========================================
// 9. ACTIVITY & RECOMMENDATIONS
// ==========================================
app.post('/api/activity', async (req, res) => {
  const { userId, productId, action } = req.body;
  if (!userId || !productId || !action) return res.json({ success: true });

  if (useMock) {
    mockDb.activities.push({ userId, productId, action, timestamp: new Date() });
  } else {
    try {
      await db.query(
        'INSERT INTO user_activity (user_id, product_id, action, timestamp) VALUES (?, ?, ?, ?)',
        [parseInt(userId), parseInt(productId), action, new Date()]
      );
    } catch (err) {
      // Ignored
    }
  }
  return res.json({ success: true });
});

app.get('/api/recommendations/:userId', async (req, res) => {
  const userId = parseInt(req.params.userId);

  if (useMock) {
    return res.json(mockDb.products.slice(0, 4).map(formatProduct));
  } else {
    try {
      // Find top interacted categories by user
      const [topCats] = await db.query(`
        SELECT p.category, COUNT(*) as interactionCount 
        FROM user_activity ua
        JOIN products p ON ua.product_id = p.id
        WHERE ua.user_id = ? AND p.category IS NOT NULL
        GROUP BY p.category
        ORDER BY interactionCount DESC
        LIMIT 2
      `, [userId]);

      if (topCats.length > 0) {
        const categories = topCats.map(c => c.category);
        const [recs] = await db.query(
          `SELECT * FROM products WHERE category IN (${categories.map(() => '?').join(',')}) ORDER BY RAND() LIMIT 4`,
          categories
        );
        if (recs.length > 0) return res.json(recs.map(formatProduct));
      }

      // Fallback: top 4 products
      const [topProds] = await db.query('SELECT * FROM products ORDER BY id DESC LIMIT 4');
      return res.json(topProds.map(formatProduct));
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }
});

// ==========================================
// 10. AI SMART CHATBOT
// ==========================================
app.post('/api/chat', async (req, res) => {
  const message = (req.body && req.body.message ? req.body.message : '').trim();
  const lowerMsg = message.toLowerCase();

  let matchedProducts = [];

  if (!useMock && db) {
    try {
      if (lowerMsg.includes('laptop') || lowerMsg.includes('dell') || lowerMsg.includes('macbook')) {
        const [rows] = await db.query("SELECT * FROM products WHERE LOWER(category) = 'electronics' OR LOWER(name) LIKE '%macbook%' OR LOWER(name) LIKE '%laptop%' LIMIT 3");
        matchedProducts = rows.map(formatProduct);
      } else if (lowerMsg.includes('shoe') || lowerMsg.includes('nike') || lowerMsg.includes('sneaker') || lowerMsg.includes('adidas')) {
        const [rows] = await db.query("SELECT * FROM products WHERE LOWER(category) = 'fashion' OR LOWER(name) LIKE '%shoe%' OR LOWER(name) LIKE '%nike%' LIMIT 3");
        matchedProducts = rows.map(formatProduct);
      } else if (lowerMsg.includes('phone') || lowerMsg.includes('iphone') || lowerMsg.includes('samsung') || lowerMsg.includes('mobile')) {
        const [rows] = await db.query("SELECT * FROM products WHERE LOWER(name) LIKE '%iphone%' OR LOWER(name) LIKE '%samsung%' OR LOWER(category) = 'electronics' LIMIT 3");
        matchedProducts = rows.map(formatProduct);
      }
    } catch (e) {
      // Ignore search error
    }
  }

  let reply = `Hello! I'm your ShopNova AI Assistant. I noticed you asked: "${message}". We have a great catalog of Electronics, Fashion, Home, and Lifestyle items.`;
  if (matchedProducts.length > 0) {
    reply = `I found some top-rated products that match what you're looking for! Check them out below:`;
  } else if (lowerMsg.includes('order') || lowerMsg.includes('shipping') || lowerMsg.includes('delivery')) {
    reply = `All orders come with Standard Free Delivery! You can track your ongoing orders in the Orders tab anytime.`;
  } else if (lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
    reply = `Hi there! 👋 How can I help you find what you need today? Ask me about products, discounts, or recommendations!`;
  }

  return res.json({
    reply,
    response: reply,
    products: matchedProducts
  });
});

// ==========================================
// 11. GLOBAL STATIC UPLOAD & FRONTEND ROUTING
// ==========================================
app.use('/uploads', express.static(uploadsDir));
app.use(express.static(path.join(__dirname, '../frontend'), { extensions: ['html'] }));

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Express drop-in server running at http://localhost:${PORT}`);
});
