Romeo Grill — Restaurant Website
=================================

A full-stack restaurant website with:
- Public homepage with hero section, about, featured dishes
- Digital menu organized by categories with item details
- Admin dashboard for managing all content
- Image upload from any device
- English version (/en/)
- Mobile responsive design
- SEO optimized (Open Graph, Twitter Card, JSON-LD)

Setup
-----
1. Copy .env.example to .env and set your admin credentials
2. Install dependencies:
   npm install
3. Start the server:
   npm start
4. Open in browser:
   http://localhost:3000

Admin Panel
-----------
- Login: http://localhost:3000/admin
- Default credentials: admin / admin12345
- Change password immediately in .env

Tech Stack
----------
- Node.js + Express
- SQLite (better-sqlite3)
- Vanilla HTML/CSS/JS (no framework needed)
- Helmet security + rate limiting
- bcrypt password hashing
