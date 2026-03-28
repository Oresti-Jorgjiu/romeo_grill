# Romeo Grill 🥩✨

A premium, full-stack restaurant website featuring a dynamic menu, 4K realistic food visuals, and an integrated admin dashboard.

## 🚀 Features
- **Super-Realistic Visuals**: 4K imagery for all major food categories.
- **Dynamic Product Pages**: Each of the 77 menu items has a dedicated SEO-optimized page.
- **Premium Dark Theme**: Sleek, high-contrast mobile-friendly design with glassmorphism.
- **Admin Dashboard**: Effortlessly manage categories, dishes, and site content.
- **One-Click Ordering**: Integrated WhatsApp ordering with a professional "Black Mode" UI.

## 🛠 Setup (Local)
1. Install dependencies: `npm install`
2. Configure `.env` (use `.env.example` as a template).
3. Start the server: `npm start`
4. Visit: `http://localhost:3000`

## 🌍 Deployment (Render.com)
Since this app uses **Node.js** and **SQLite**, follow these 3 steps to go live:

1. **Create Web Service**: Connect your GitHub repository to [Render](https://render.com).
2. **Environment Variables**: Add `SESSION_SECRET` (any long random string) in the "Environment" tab.
3. **Storage Mount (Critical)**: 
   - Go to **Discard / Disks** and create a new Disk.
   - **Mount Path**: `/opt/render/project/src/data`
   - **Update Server.js**: Ensure your database path points to this mount in production.

---
*Created for Romeo Grill, Korçë.*
