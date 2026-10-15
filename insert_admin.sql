-- Default Admin Account (Email: admin@shopnova.com / Password: admin123)
INSERT INTO users (name, email, password, role, blocked)
VALUES ('Admin', 'admin@shopnova.com', '$2a$10$pJqB3tQvDnpiaq5nMs/Bxuzopo8yfPcvhhs5XDmwz/6hBgmzSkwg.', 'ADMIN', 0)
ON DUPLICATE KEY UPDATE password = VALUES(password), role = 'ADMIN', blocked = 0;
