# AI-Driven Intelligent E-Commerce Web Application Plan

This document outlines the architecture, database schema, project structure, and implementation steps for building the AI-driven e-commerce application.

## User Review Required

> [!IMPORTANT]
> **OpenAI API Key**: To make the AI features fully functional, an OpenAI API key is required. If you do not have one or do not wish to provide one during development, I will implement **mock AI services** that simulate the behavior (e.g., returning predefined helpful responses or dummy generated descriptions). Please confirm if you'd like to use a real API key or mock services.
> 
> **Project Structure**: I plan to create two top-level directories: `backend` (for the Spring Boot app) and `frontend` (for the Vanilla HTML/CSS/JS app). This provides clean separation. The backend will have CORS enabled so the frontend can communicate with it. Please confirm if this structure is acceptable.

## Architecture

### Backend (Spring Boot)
- **Language**: Java 17+
- **Framework**: Spring Boot 3.x
- **Database**: MySQL (using Spring Data JPA / Hibernate)
- **Security**: Spring Security with JWT for Authentication
- **Build Tool**: Maven

### Frontend (HTML/CSS/JS)
- **Structure**: Modular Vanilla JavaScript, separate HTML pages for key views.
- **Styling**: Vanilla CSS with modern, minimalistic design (CSS Variables for theming, Flexbox/Grid for layout, smooth animations).
- **Communication**: Fetch API to communicate with the Spring Boot REST endpoints.

## Database Schema (MySQL)

```sql
CREATE TABLE users (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'USER'
);

CREATE TABLE products (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    description TEXT,
    image VARCHAR(255),
    category VARCHAR(100)
);

CREATE TABLE cart (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE orders (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    order_id BIGINT NOT NULL,
    product_id BIGINT NOT NULL,
    quantity INT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE user_activity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    product_id BIGINT,
    action VARCHAR(100) NOT NULL, -- e.g., 'VIEW', 'ADD_TO_CART', 'PURCHASE'
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (product_id) REFERENCES products(id)
);
```

## AI Features Design

1. **AI Chatbot**: A chat UI component in the frontend. Backend endpoint `/api/ai/chat` processes user queries, attempts to parse intent (e.g., price filtering) using a service, and queries the DB to respond with product suggestions.
2. **Personalized Recommendations**: Endpoint `/api/products/recommendations` retrieves user's most viewed categories from `user_activity` and suggests products in those categories.
3. **Smart Search**: Endpoint `/api/products/search?q={query}` implemented with a smart keyword matching service.
4. **AI Product Description Generator**: Admin product creation endpoint will call an AI service to auto-generate a description based on the product `name` and `category` if left blank.
5. **Analytics Dashboard**: `/api/admin/analytics` groups sales data, calculates active users, and identifies VIP users based on order total.

## Implementation Steps

### Phase 1: Backend Foundation
1. Setup Spring Boot project structure with required dependencies (Web, JPA, MySQL, Security, JWT).
2. Configure `application.properties` for MySQL connection.
3. Create JPA Entities matching the database schema.

### Phase 2: Core APIs & Security
1. Implement User Auth (Signup, Login) with JWT token generation.
2. Implement Product CRUD APIs.
3. Implement Cart and Order APIs.

### Phase 3: AI & Advanced Features
1. Create `AiService` (either connecting to OpenAI API or using sophisticated mocks).
2. Implement Analytics endpoints.
3. Implement Recommendation logic based on activity tracking.

### Phase 4: Frontend Development
1. Create `index.css` with a premium, modern design system (variables, typography, glassmorphism, animations).
2. Build UI Pages: `index.html` (Home/Products), `login.html`, `cart.html`, `admin.html`.
3. Implement modular JS files for API integration (`api.js`, `auth.js`, `cart.js`, `ai-chat.js`).
4. Integrate the AI Chatbot widget globally across pages.

## Verification Plan
- **Backend Tests**: Start Spring Boot server, verify endpoints via Postman or Curl.
- **Frontend Tests**: Open HTML files in browser, verify UI components.
- **Integration**: Perform an end-to-end flow: Signup -> Browse -> Add to Cart -> Checkout -> Check Admin Analytics -> Use AI Chatbot.
