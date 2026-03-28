require("dotenv").config();
const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Production-ready database path for Render.com persistent disks
const dbDir = process.env.DATABASE_PATH ? path.dirname(process.env.DATABASE_PATH) : __dirname;
if (dbDir !== __dirname && !fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, "romeo-grill.db");

// Auto-seed: If production database doesn't exist, copy from the local one
const localDbPath = path.join(__dirname, "romeo-grill.db");
if (dbPath !== localDbPath && !fs.existsSync(dbPath)) {
  console.log(`First-time setup: Seeding production database from ${localDbPath}...`);
  try {
    fs.copyFileSync(localDbPath, dbPath);
    console.log("Database seeded successfully!");
  } catch (err) {
    console.error("CRITICAL: Failed to seed production database:", err);
  }
}

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

const uploadDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const safeName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "-")}`;
    cb(null, safeName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.mimetype)) {
      return cb(new Error("Only image uploads are allowed."));
    }
    cb(null, true);
  }
});

const defaultSiteData = {
  brandTitle: "Romeo Grill",
  brandSub: "Korce, Albania",
  heroBadge: "Fast Food • Grill • Gjiro",
  heroTitle: "Romeo Grill",
  heroDescription: "Grill, gjiro dhe pjata te nxehta ne zemer te Korces. Zgjidhni me te miren per vaktin tuaj dhe shijoni freskine e mjeshtrine ne cdo kafshate.",
  heroImage: "images/hero_ultimate.jpg",
  aboutTag: "Tradite dhe Shije",
  aboutTitle: "Shija e vertete e zgares, e pergatitur me mjeshtri cdo dite.",
  aboutLead: "Te Romeo Grill, ne nuk sherbejme thjesht ushqim — ne ofrojme nje pervoje. Nga xiroja e ngrohte dhe plot shije, te pjatat e bollshme te zgares me mishra te perzgjedhur, cdo porosi pergatitet me kujdes e pasion.",
  aboutDescription: "Ne besojme te cilesia e larte dhe perberesit gjithmone te fresket. Qofsh ne kerkim te nje vakti te shpejte gjate pushimit, apo nje darke te bollshme familjare, Romeo Grill ne zemer te Korces eshte ndalesa juaj ideale.",
  contactAddress: "Korce, Albania",
  contactPhone: "0696930010",
  contactHours: "09:00 - 23:00",
  contactInstagram: "@romeogrill2024",
  contactFacebook: "Romeo Grill",
  mapLink: "https://maps.app.goo.gl/T1pQtM8KqkLht8pB6",
  instagramLink: "https://www.instagram.com/romeogrill2024/",
  facebookLink: "https://www.facebook.com/romeo.grill.3/",
  whatsappNumber: "0696472338",
  menuPageTitle: "Menuja e Romeo Grill",
  menuPageDescription: "Eksploroni menune tone te pasur. Zgjidhni kategorine tuaj te preferuar dhe zbuloni pjatat tona te pergatitura me dashuri.",
  storyImages: [
    "images/dish-4.jpeg",
    "images/dish-5.jpeg",
    "images/dish-6.jpeg",
    "images/dish-7.jpeg"
  ],
  featuredDishes: [],
  menuCategories: []
};


// --- Validation helpers ---

function isNonEmptyString(value, min = 1, max = 255) {
  return typeof value === "string" && value.trim().length >= min && value.trim().length <= max;
}

function isSafePhone(value) {
  return typeof value === "string" && /^[+0-9\s()-]{6,20}$/.test(value.trim());
}

function isSafeImagePath(value) {
  return typeof value === "string" && /^\/?(images|uploads)\/[a-zA-Z0-9._\-\/]+$/.test(value.trim());
}

function normalizeSiteData(data) {
  return {
    ...data,
    featuredDishes: Array.isArray(data.featuredDishes) ? data.featuredDishes : [],
    menuCategories: Array.isArray(data.menuCategories) ? data.menuCategories : [],
    storyImages: Array.isArray(data.storyImages) ? data.storyImages : []
  };
}

function validateDish(item, context = "dish") {
  if (!item || typeof item !== "object") return `${context}: invalid object`;
  if (!isNonEmptyString(item.id, 1, 80)) return `${context}: invalid id`;
  if (!isNonEmptyString(item.name, 2, 120)) return `${context}: invalid name`;
  if (!isNonEmptyString(item.name_en, 0, 120)) return `${context}: invalid name_en`;
  if (!Number.isFinite(Number(item.price)) || Number(item.price) < 0) return `${context}: invalid price`;
  if (!isNonEmptyString(item.description, 0, 1000)) return `${context}: invalid description`;
  if (!isNonEmptyString(item.description_en, 0, 1000)) return `${context}: invalid description_en`;
  if (item.ingredients !== undefined && !isNonEmptyString(item.ingredients, 0, 1000)) return `${context}: invalid ingredients`;
  if (item.ingredients_en !== undefined && !isNonEmptyString(item.ingredients_en, 0, 1000)) return `${context}: invalid ingredients_en`;
  if (!isSafeImagePath(item.image)) return `${context}: invalid image path`;

  if (item.gallery && Array.isArray(item.gallery)) {
    if (item.gallery.length > 20) return `${context}: max 20 gallery photos`;
    for (let p of item.gallery) if (p && !isSafeImagePath(p)) return `${context}: invalid gallery path`;
  }
  return null;
}

function resolveAssetPath(src, req) {
  if (!src) return "";
  if (src.startsWith('http') || src.startsWith('data:')) return src;
  const protocol = req.protocol || 'http';
  const host = req.get('host') || 'localhost:3000';
  let cleanPath = src.replace(/^\.\.\//, ''); // Remove leading ../
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
  return `${protocol}://${host}${cleanPath}`;
}


function validateSiteData(data) {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Invalid site data payload." };
  }

  const siteData = normalizeSiteData(data);

  const basicFields = [
    ["brandTitle", 0, 100],
    ["brandTitle_en", 0, 100],
    ["brandSub", 0, 150],
    ["heroBadge", 0, 150],
    ["heroTitle", 0, 150],
    ["heroDescription", 0, 1000],
    ["aboutTag", 0, 150],
    ["aboutTitle", 0, 200],
    ["aboutLead", 0, 2000],
    ["aboutDescription", 0, 2000],
    ["contactPhone", 0, 50],
    ["contactAddress", 0, 500],
    ["contactHours", 0, 300],
    ["whatsappNumber", 0, 50],
    ["googleMapsUrl", 0, 2000],
    ["contactInstagram", 0, 200],
    ["contactFacebook", 0, 200]
  ];

  for (const [field, min, max] of basicFields) {
    const val = siteData[field];
    if (val !== undefined && !isNonEmptyString(val, min, max)) {
      return { ok: false, error: `Invalid field: ${field}` };
    }
  }

  if (!isSafeImagePath(siteData.heroImage)) {
    return { ok: false, error: "Invalid hero image path." };
  }

  for (let i = 0; i < siteData.storyImages.length; i++) {
    if (!isSafeImagePath(siteData.storyImages[i])) {
      return { ok: false, error: `Invalid story image path at position ${i + 1}.` };
    }
  }

  for (let i = 0; i < siteData.featuredDishes.length; i++) {
    const err = validateDish(siteData.featuredDishes[i], `featured dish #${i + 1}`);
    if (err) return { ok: false, error: err };
  }

  for (let i = 0; i < siteData.menuCategories.length; i++) {
    const category = siteData.menuCategories[i];
    if (!category || !isNonEmptyString(category.name, 2, 120)) {
      return { ok: false, error: `Invalid menu category at position ${i + 1}.` };
    }
    if (!isNonEmptyString(category.name_en, 0, 120)) {
      return { ok: false, error: `Invalid English name for category "${category.name}".` };
    }
    if (!Array.isArray(category.items) || category.items.length === 0) {
      return { ok: false, error: `Menu category "${category.name}" must have at least one item.` };
    }
    for (let j = 0; j < category.items.length; j++) {
      const err = validateDish(category.items[j], `menu item "${category.name}" #${j + 1}`);
      if (err) return { ok: false, error: err };
    }
  }

  return { ok: true };
}


// --- Database ---

function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS site_content (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS admin_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS page_views (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      ip TEXT,
      user_agent TEXT,
      visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      date_key TEXT NOT NULL
    );
  `);

  const contentExists = db.prepare("SELECT id FROM site_content WHERE id = 1").get();
  if (!contentExists) {
    db.prepare("INSERT INTO site_content (id, data) VALUES (1, ?)").run(JSON.stringify(defaultSiteData));
  }

  const adminExists = db.prepare("SELECT id FROM admin_users WHERE username = ?").get(process.env.ADMIN_USERNAME || "admin");
  if (!adminExists) {
    const rawPassword = process.env.ADMIN_PASSWORD || "admin12345";
    if (rawPassword.length < 10) {
      throw new Error("ADMIN_PASSWORD must be at least 10 characters long.");
    }
    const hash = bcrypt.hashSync(rawPassword, 10);
    db.prepare("INSERT INTO admin_users (username, password_hash) VALUES (?, ?)").run(process.env.ADMIN_USERNAME || "admin", hash);
    console.log("Default admin created.");
    console.log("Username:", process.env.ADMIN_USERNAME || "admin");
    console.log("Password:", rawPassword);
    console.log("Change it immediately in production.");
  }
}

function getSiteData() {
  const row = db.prepare("SELECT data FROM site_content WHERE id = 1").get();
  if (!row) return defaultSiteData;
  try {
    return JSON.parse(row.data);
  } catch {
    return defaultSiteData;
  }
}

function saveSiteData(data) {
  db.prepare("UPDATE site_content SET data = ? WHERE id = 1").run(JSON.stringify(data));
}

function requireAdmin(req, res, next) {
  if (req.session && req.session.adminUser) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

initDb();


// --- Middleware ---

app.set("trust proxy", 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts. Try again later." }
});

const adminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many admin write requests. Try again later." }
});

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: "romeo_grill_admin_sid",
  secret: process.env.SESSION_SECRET || "change-this-secret",
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 1000 * 60 * 60 * 8
  }
}));

// --- SEO Interceptor ---
function renderProductSEO(req, res, next, filepath) {
  const dishId = req.query.id;
  if (!dishId) return next();

  const siteData = getSiteData();
  let foundDish = null;

  if (siteData.featuredDishes) {
    foundDish = siteData.featuredDishes.find(d => d.id === dishId);
  }
  if (!foundDish && siteData.menuCategories) {
    for (const cat of siteData.menuCategories) {
      if (cat.items) {
        const item = cat.items.find(d => d.id === dishId);
        if (item) { foundDish = item; break; }
      }
    }
  }

  if (!foundDish) return next();

  fs.readFile(filepath, 'utf8', (err, html) => {
    if (err) return next();

    const brandName = siteData.brandTitle || 'Romeo Grill';
    const pageTitle = `${brandName} | ${foundDish.name}`;
    const desc = foundDish.description || '';
    const ogImage = resolveAssetPath(foundDish.image, req);

    const ogTags = `
      <meta property="og:title" content="${pageTitle.replace(/"/g, '&quot;')}">
      <meta property="og:description" content="${desc.replace(/"/g, '&quot;')}">
      <meta property="og:image" content="${ogImage}">
      <meta property="og:type" content="product">
      <meta name="twitter:card" content="summary_large_image">
    `;

    // Overwrite the existing generic title and inject OG tags
    let modifiedHtml = html.replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`);
    modifiedHtml = modifiedHtml.replace('</head>', `${ogTags}\n</head>`);
    res.set('Content-Type', 'text/html').send(modifiedHtml);

  });
}

app.get('/product.html', (req, res, next) => renderProductSEO(req, res, next, path.join(__dirname, "public", "product.html")));
app.get('/en/product.html', (req, res, next) => renderProductSEO(req, res, next, path.join(__dirname, "public", "en", "product.html")));

app.use(express.static(path.join(__dirname, "public")));


// --- Visitor tracking middleware ---

const trackedPaths = new Set(["/", "/en/"]);

app.use((req, res, next) => {
  if (req.method === "GET" && trackedPaths.has(req.path)) {
    try {
      const dateKey = new Date().toISOString().slice(0, 10);
      const ip = req.ip || req.connection.remoteAddress || "";
      const ua = (req.headers["user-agent"] || "").slice(0, 300);
      db.prepare("INSERT INTO page_views (path, ip, user_agent, date_key) VALUES (?, ?, ?, ?)")
        .run(req.path, ip, ua, dateKey);
    } catch (e) {
      // silent fail — don't break the page for tracking
    }
  }
  next();
});


// --- Public API ---

app.get("/api/site-data", (req, res) => {
  res.json(getSiteData());
});


// --- Admin API ---

app.post("/api/admin/login", loginLimiter, (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare("SELECT * FROM admin_users WHERE username = ?").get(username);

  if (!user || !bcrypt.compareSync(password || "", user.password_hash)) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  req.session.adminUser = { id: user.id, username: user.username };
  res.json({ success: true, username: user.username });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.get("/api/admin/me", (req, res) => {
  if (req.session && req.session.adminUser) {
    return res.json({ authenticated: true, user: req.session.adminUser });
  }
  res.json({ authenticated: false });
});

app.get("/api/admin/site-data", requireAdmin, (req, res) => {
  res.json(getSiteData());
});

app.put("/api/admin/site-data", requireAdmin, adminWriteLimiter, (req, res) => {
  try {
    const data = req.body;
    const validation = validateSiteData(data);
    if (!validation.ok) {
      console.warn("Validation failed for site-data update:", validation.error);
      return res.status(400).json({ error: validation.error });
    }
    saveSiteData(data);
    res.json({ success: true });
  } catch (err) {
    console.error("CRITICAL ERROR in PUT /api/admin/site-data:", err);
    res.status(500).json({ error: "Internal server error during save.", details: err.message });
  }
});

app.post("/api/admin/change-password", requireAdmin, adminWriteLimiter, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Both current and new password are required." });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ error: "New password must be at least 8 characters." });
  }
  const user = db.prepare("SELECT * FROM admin_users WHERE id = ?").get(req.session.adminUser.id);
  if (!user || !bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: "Current password is incorrect." });
  }
  const newHash = bcrypt.hashSync(newPassword, 10);
  db.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?").run(newHash, user.id);
  res.json({ success: true });
});

app.get("/api/admin/analytics", requireAdmin, (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const d7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);

  const totalViews = db.prepare("SELECT COUNT(*) as count FROM page_views").get().count;
  const todayViews = db.prepare("SELECT COUNT(*) as count FROM page_views WHERE date_key = ?").get(today).count;
  const weekViews = db.prepare("SELECT COUNT(*) as count FROM page_views WHERE date_key >= ?").get(d7).count;
  const monthViews = db.prepare("SELECT COUNT(*) as count FROM page_views WHERE date_key >= ?").get(d30).count;

  const dailyData = db.prepare(
    "SELECT date_key as date, COUNT(*) as views FROM page_views WHERE date_key >= ? GROUP BY date_key ORDER BY date_key"
  ).all(d30);

  const topPages = db.prepare(
    "SELECT path, COUNT(*) as views FROM page_views WHERE date_key >= ? GROUP BY path ORDER BY views DESC LIMIT 10"
  ).all(d30);

  res.json({ totalViews, todayViews, weekViews, monthViews, dailyData, topPages });
});

app.post("/api/admin/upload-image", requireAdmin, adminWriteLimiter, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No image uploaded." });
  }
  res.json({
    success: true,
    path: `/uploads/${req.file.filename}`
  });
});


// --- Page routes ---

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-dashboard.html"));
});

app.get("/en/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "en", "index.html"));
});


// --- Error handler ---

app.use((err, _req, res, _next) => {
  if (err && err.message === "Only image uploads are allowed.") {
    return res.status(400).json({ error: err.message });
  }
  if (err && err.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ error: "Image is too large. Maximum size is 5MB." });
  }
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error." });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
