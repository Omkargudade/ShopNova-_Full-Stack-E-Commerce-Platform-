# ⚡ ShopNova E-Commerce: Unified VS Code Production-Ready Project

Welcome to your professionally structured, dual-stack **ShopNova E-Commerce** VS Code workspace! This workspace has been fully engineered to support both your **Java Spring Boot / Hibernate** stack and a **Node.js / Express.js** drop-in backend stack, complete with advanced visual verification, zero-error hot-reloads, and integrated debugging compounds.

---

## 📂 Production Folder Structure Overview

```
ShopNova-ECommerce/
│
├── .vscode/                       # VS Code Automation & Configurations
│   ├── launch.json                # F5 Debugging Compounds (Java, Express, Chrome)
│   ├── tasks.json                 # Terminal Automation Tasks (Installer, Dev-Servers)
│   └── settings.json              # Java Compiler & Language Server Prefs
│
├── backend/                       # Spring Boot REST API Service (Port 8080)
│   ├── src/main/java/...          # Java Controllers, Models, Repositories, Services
│   ├── src/main/resources/        # application.properties (MySQL, JWT, OpenAI Config)
│   └── mvnw.cmd                   # Maven Wrapper Executable (Optimized -Xmx Limits)
│
├── express-backend/               # Node.js / Express.js Drop-in Service (Port 8080)
│   ├── server.js                  # Express API Server (Same Endpoint Schema + Mock Failback)
│   └── package.json               # Backend Node Modules & Scripts (Nodemon, JWT, MySQL2)
│
├── frontend/                      # Web Client Storefront (Port 3000)
│   ├── admin-*.html               # Premium Fixed-Sidebar Admin Dashboards
│   ├── index.html / product.html  # Storefront & Interactive Product Details
│   ├── js/ (app.js, api.js)       # JWT & AJAX REST Client Pipelines
│   └── package.json               # BrowserSync Dev Server configurations
│
└── package.json                   # Root orchestrator with concurrently scripts
```

---

## 🚀 Getting Started in VS Code

We have automated the package installations and launching scripts. Follow these three quick steps to get running:

### 1️⃣ Automatic Dependencies Installation
Open your terminal inside VS Code and run the master installer command:
```bash
npm run install-all
```
*This will automatically resolve, download, and install all required modules in the root, `frontend`, and `express-backend` directories.*

---

### 2️⃣ Run the Stack in VS Code (F5 Hotkey)
Go to the **Run & Debug** panel (`Ctrl+Shift+D`) in VS Code. You will find professional configurations and compounds in the dropdown:

*   **🎮 Run Full Stack (Java Backend + Frontend)**: Spins up the **Spring Boot Java Backend** (safely restricted to 512MB RAM using Parallel GC) and opens the storefront in Chrome.
*   **⚡ Run Full Stack (Node/Express Backend + Frontend)**: Spins up the **Express.js Backend** and opens the storefront in Chrome. Perfect for lightweight, fast Node.js development!
*   **Launch E-Commerce Storefront (Chrome)**: Launches BrowserSync storefront independently on `http://localhost:3000`.

*Select your preferred stack and press **F5** or click the green Play icon!*

---

### 3️⃣ Running manually via CLI Scripts
If you prefer standard CLI execution, use these unified root-level scripts:

#### Run with Java Backend & Frontend:
```bash
npm run dev:java
```

#### Run with Node.js/Express Backend & Frontend:
```bash
npm run dev:node
```

---

## 🛡️ Robust Architecture Details

### ⚡ Dual-Stack Drop-in Backends
- Both the **Java Spring Boot** and **Express.js** backends bind to **Port 8080** and share the exact same JSON response schemas.
- They both read/write to the same **MySQL** database (`ecommerce_db` at `localhost:3306`).
- **Bulletproof Mock Fallback**: If MySQL is offline or loading, the Express server gracefully switches to a mock database state in-memory so you can continue testing all features with **zero database connection errors**.

### 🌟 Premium Storefront Features
1. **Admin Panel Fixed Left Sidebar**: Fully height-fixed (`100vh`), scroll-stabilized sidebar layout with hover micro-animations and flexible bottom-anchored logout.
2. **AI Smart Chatbot**: Conversational AI shopping assistant integrated directly into the storefront.
3. **Cart & Checkout Grid**: Interactive, modern cart with real-time total calculator and safe order logs.
4. **Responsive Flow**: Seamless fluid layouts from wide 4K screens down to mobile viewport sizes.

---

## 🔒 Environment Properties (`application.properties` & `express-backend/server.js`)
*   **MySQL Server**: Port `3306` (Database: `ecommerce_db`, User: `root`, Pass: `root`)
*   **JWT Encryption**: 256-bit secure secret key
*   **API Base Path**: `http://localhost:8080/api`
