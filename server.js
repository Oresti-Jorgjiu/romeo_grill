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
const nodemailer = require("nodemailer");
const twilio = require("twilio");

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database(path.join(__dirname, "romeo-grill.db"));
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

function createMailer() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

const mailer = createMailer();

function createSmsClient() {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return twilio(sid, token);
}

const smsClient = createSmsClient();


const defaultSiteData = {
  brandTitle: "Romeo Grill",
  brandSub: "Korce, Albania",
  heroBadge: "Fast Food • Grill • Gjiro",
  heroTitle: "Romeo Grill",
  heroDescription: "Grill, gjiro dhe pjata te nxehta ne zemer te Korces. Menu e ndare qarte me cmime te hapura — zgjedh kategorine, kliko produktin dhe shiko perberesit e plote.",
  heroImage: "images/storefront.jpeg",
  aboutTag: "Menu e qarte, jo rremuje",
  aboutTitle: "Kategorite hapen thjesht, artikujt shihen qarte, detajet dalin me nje klikim.",
  aboutLead: "Tek Romeo Grill gjeni gjiro, pjata grilli dhe shtesa me cmime te dukshme. Zgjidhni kategorine, shikoni artikujt dhe klikoni produktin per te pare foton, perberesit dhe detajet e plota.",
  aboutDescription: "Jemi te hapur cdo dite 09:00 – 23:00. Mund te kontaktoni direkt ne WhatsApp ose telefon per informacion shtese. Lokacioni yne eshte lehtesisht i arritshem ne qender te Korces.",
  contactAddress: "Korce, Albania",
  contactPhone: "0696930010",
  contactHours: "09:00 - 23:00",
  contactInstagram: "@romeogrill2024",
  contactFacebook: "Romeo Grill",
  mapLink: "https://maps.app.goo.gl/T1pQtM8KqkLht8pB6",
  instagramLink: "https://www.instagram.com/romeogrill2024/",
  facebookLink: "https://www.facebook.com/romeo.grill.3/",
  whatsappNumber: "0696472338",
  hotelDiscountRules: [],
  menuPageTitle: "Menuja e Romeo Grill — Gjiro, Grill & Fast Food",
  menuPageDescription: "Zgjidhni kategorine, shikoni artikujt me cmimet e tyre dhe klikoni produktin per te pare foton, perberesit dhe detajet e plota.",
  storyImages: [
    "images/dish-4.jpeg",
    "images/dish-5.jpeg",
    "images/dish-6.jpeg",
    "images/dish-7.jpeg"
  ],
  featuredDishes: [
    {
      id: "gjiro-mish-pule",
      name: "Gjiro me Mish Pule",
      price: 450,
      description: "Nje nga zgjedhjet me te kerkuara, me strukture te qarte dhe perberes te dukshem.",
      image: "images/dish-1.jpeg"
    },
    {
      id: "gjiro-me-qofte",
      name: "Gjiro me Qofte",
      price: 450,
      description: "Opsion klasik per klientet qe duan shije me te forte dhe kombinim te plote.",
      image: "images/dish-2.jpeg"
    },
    {
      id: "gjiro-mish-derri",
      name: "Gjiro me Mish Derri",
      price: 450,
      description: "Produkt baze i menuse qe duhet te gjendet shpejt dhe te shfaqe qarte perberesit.",
      image: "images/dish-8.jpeg"
    }
  ],
  menuCategories: [
    {
      name: "Gjiro",
      items: [
        {
          id: "gjiro-patate",
          name: "Gjiro me Patate",
          price: 350,
          description: "Zgjedhje e thjeshte dhe e shpejte.",
          ingredients: "Patate, salce kosi, domate, qepe, pite.",
          image: "images/dish-6.jpeg"
        },
        {
          id: "gjiro-me-qofte",
          name: "Gjiro me Qofte",
          price: 450,
          description: "Kombinim klasik me qofte dhe garnitura baze.",
          ingredients: "Qofte, patate, salce kosi, domate, qepe, pite.",
          image: "images/dish-2.jpeg"
        },
        {
          id: "gjiro-mish-pule",
          name: "Gjiro me Mish Pule",
          price: 450,
          description: "Produkt i qarte dhe i forte per menune kryesore.",
          ingredients: "Mish pule, patate, salce kosi, domate, qepe, pite.",
          image: "images/dish-1.jpeg"
        },
        {
          id: "gjiro-mish-derri",
          name: "Gjiro me Mish Derri",
          price: 450,
          description: "Variant klasik me mish derri dhe perberes baze.",
          ingredients: "Mish derri, patate, salce kosi, domate, qepe, pite.",
          image: "images/dish-3.jpeg"
        }
      ]
    },
    {
      name: "Pjata",
      items: [
        {
          id: "pjate-pule",
          name: "Pjate me Mish Pule",
          price: 650,
          description: "Pjate e plote per dreke ose darke.",
          ingredients: "Mish pule, patate, sallate, salce, buke ose pite.",
          image: "images/dish-4.jpeg"
        },
        {
          id: "pjate-qofte",
          name: "Pjate me Qofte",
          price: 650,
          description: "Pjate e bollshme me strukture te qarte.",
          ingredients: "Qofte, patate, sallate, salce, buke ose pite.",
          image: "images/dish-5.jpeg"
        },
        {
          id: "pjate-mix",
          name: "Pjate Mix",
          price: 750,
          description: "Opsion i kombinuar per klientet qe duan me shume.",
          ingredients: "Mish pule, qofte, patate, sallate, salce, buke ose pite.",
          image: "images/dish-7.jpeg"
        }
      ]
    },
    {
      name: "Shtesa",
      items: [
        {
          id: "pite-shtese",
          name: "Pite Shtese",
          price: 30,
          description: "Shtese per cdo produkt kryesor.",
          ingredients: "Pite.",
          image: "images/menu-1.jpeg"
        },
        {
          id: "patate-shtese",
          name: "Patate Shtese",
          price: 50,
          description: "Shtese e shpejte per gjiro ose pjate.",
          ingredients: "Patate te skuqura.",
          image: "images/menu-2.jpeg"
        },
        {
          id: "salce-shtese",
          name: "Salce Shtese",
          price: 30,
          description: "Shtese per shije dhe kombinim.",
          ingredients: "Salce sipas zgjedhjes.",
          image: "images/menu-3.jpeg"
        }
      ]
    },
    {
      name: "Pije",
      items: [
        {
          id: "uje",
          name: "Uje",
          price: 80,
          description: "Pije baze.",
          ingredients: "Uje.",
          image: "images/menu-4.jpeg"
        },
        {
          id: "coca-cola",
          name: "Coca-Cola",
          price: 150,
          description: "Pije freskuese.",
          ingredients: "Pije e gazuar.",
          image: "images/menu-5.jpeg"
        },
        {
          id: "fanta",
          name: "Fanta",
          price: 150,
          description: "Pije freskuese me gaz.",
          ingredients: "Pije e gazuar.",
          image: "images/menu-6.jpeg"
        }
      ]
    }
  ]
};



function getTodayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function getActiveHotelDiscountPercent(siteData, dateStr = getTodayDateString()) {
  const rules = Array.isArray(siteData.hotelDiscountRules) ? siteData.hotelDiscountRules : [];
  const activeRule = rules.find(rule =>
    rule &&
    rule.active === true &&
    Number(rule.percent) > 0 &&
    typeof rule.startDate === "string" &&
    typeof rule.endDate === "string" &&
    rule.startDate <= dateStr &&
    dateStr <= rule.endDate
  );
  return activeRule ? Number(activeRule.percent) : 0;
}


function hasDiscountRuleOverlap(rules) {
  const normalized = (Array.isArray(rules) ? rules : [])
    .filter(rule => rule && rule.active === true && rule.startDate && rule.endDate)
    .map(rule => ({
      id: rule.id,
      startDate: rule.startDate,
      endDate: rule.endDate
    }))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  for (let i = 0; i < normalized.length - 1; i++) {
    const current = normalized[i];
    const next = normalized[i + 1];
    if (current.endDate >= next.startDate) {
      return {
        hasOverlap: true,
        firstRuleId: current.id || "",
        secondRuleId: next.id || ""
      };
    }
  }

  return { hasOverlap: false };
}

function validateSiteData(siteData) {
  if (!siteData || typeof siteData !== "object") {
    return { ok: false, error: "Invalid site data payload." };
  }

  const overlap = hasDiscountRuleOverlap(siteData.hotelDiscountRules);
  if (overlap.hasOverlap) {
    return {
      ok: false,
      error: `Hotel discount date overlap detected between rules "${overlap.firstRuleId}" and "${overlap.secondRuleId}".`
    };
  }

  return { ok: true };
}

function buildOrderNotificationText(orderPayload) {
  const itemLines = orderPayload.items.map(item => `- ${item.name} x${item.qty} = ${Number(item.price) * Number(item.qty)} L`).join("\n");
  return `Porosi e re Romeo Grill

Klienti: ${orderPayload.customerName || "-"}
Telefoni: ${orderPayload.phone || "-"}
Klient hoteli: ${orderPayload.isHotelGuest ? "Po" : "Jo"}
Dhoma: ${orderPayload.roomNumber || "-"}
Adresa: ${orderPayload.address || "-"}
Shenime: ${orderPayload.notes || "-"}

Artikujt:
${itemLines}

Nentotali: ${orderPayload.subtotal} L
Ulja: ${orderPayload.discountAmount} L
Totali: ${orderPayload.totalAmount} L`;
}

async function sendOrderNotifications(orderPayload) {
  const text = buildOrderNotificationText(orderPayload);

  const tasks = [];

  if (mailer && process.env.NOTIFY_EMAIL_TO) {
    tasks.push(
      mailer.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to: process.env.NOTIFY_EMAIL_TO,
        subject: `Porosi e re Romeo Grill #${orderPayload.orderId}`,
        text
      }).catch(err => {
        console.error("Email notification failed:", err.message);
      })
    );
  }

  if (smsClient && process.env.TWILIO_FROM_NUMBER && process.env.NOTIFY_SMS_TO) {
    tasks.push(
      smsClient.messages.create({
        body: text.slice(0, 1500),
        from: process.env.TWILIO_FROM_NUMBER,
        to: process.env.NOTIFY_SMS_TO
      }).catch(err => {
        console.error("SMS notification failed:", err.message);
      })
    );
  }

  await Promise.all(tasks);
}


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
    hotelDiscountRules: Array.isArray(data.hotelDiscountRules) ? data.hotelDiscountRules : [],
    storyImages: Array.isArray(data.storyImages) ? data.storyImages : []
  };
}

function validateDish(item, context = "dish") {
  if (!item || typeof item !== "object") return `${context}: invalid object`;
  if (!isNonEmptyString(item.id, 1, 80)) return `${context}: invalid id`;
  if (!isNonEmptyString(item.name, 2, 120)) return `${context}: invalid name`;
  if (!Number.isFinite(Number(item.price)) || Number(item.price) < 0 || Number(item.price) > 100000) return `${context}: invalid price`;
  if (!isNonEmptyString(item.description, 3, 500)) return `${context}: invalid description`;
  if (item.ingredients !== undefined && !(typeof item.ingredients === "string" && item.ingredients.length <= 1000)) return `${context}: invalid ingredients`;
  if (!isSafeImagePath(item.image)) return `${context}: invalid image path`;
  return null;
}

function validateSiteData(data) {
  if (!data || typeof data !== "object") {
    return { ok: false, error: "Invalid site data payload." };
  }

  const siteData = normalizeSiteData(data);

  const basicFields = [
    ["brandTitle", 2, 80],
    ["brandSub", 2, 120],
    ["heroBadge", 2, 120],
    ["heroTitle", 2, 120],
    ["heroDescription", 10, 1000],
    ["aboutTag", 2, 120],
    ["aboutTitle", 5, 160],
    ["aboutLead", 10, 1200],
    ["aboutDescription", 10, 1200],
    ["contactAddress", 3, 200],
    ["contactPhone", 6, 30],
    ["contactHours", 3, 120],
    ["contactInstagram", 2, 120],
    ["contactFacebook", 2, 120],
    ["mapLink", 10, 500],
    ["instagramLink", 10, 500],
    ["facebookLink", 10, 500],
    ["whatsappNumber", 6, 20],
    ["menuPageTitle", 2, 120],
    ["menuPageDescription", 10, 500]
  ];

  for (const [field, min, max] of basicFields) {
    if (!isNonEmptyString(siteData[field], min, max)) {
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
    if (!Array.isArray(category.items) || category.items.length === 0) {
      return { ok: false, error: `Menu category "${category.name}" must have at least one item.` };
    }
    for (let j = 0; j < category.items.length; j++) {
      const err = validateDish(category.items[j], `menu item "${category.name}" #${j + 1}`);
      if (err) return { ok: false, error: err };
    }
  }

  const overlap = hasDiscountRuleOverlap(siteData.hotelDiscountRules);
  if (overlap.hasOverlap) {
    return {
      ok: false,
      error: `Hotel discount date overlap detected between rules "${overlap.firstRuleId}" and "${overlap.secondRuleId}".`
    };
  }

  for (let i = 0; i < siteData.hotelDiscountRules.length; i++) {
    const rule = siteData.hotelDiscountRules[i];
    if (!isNonEmptyString(rule.id, 1, 120)) return { ok: false, error: `Invalid hotel discount rule id at position ${i + 1}.` };
    if (!isNonEmptyString(rule.label, 2, 120)) return { ok: false, error: `Invalid hotel discount rule label at position ${i + 1}.` };
    if (!Number.isFinite(Number(rule.percent)) || Number(rule.percent) < 0 || Number(rule.percent) > 100) return { ok: false, error: `Invalid hotel discount percent at position ${i + 1}.` };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rule.startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(rule.endDate)) return { ok: false, error: `Invalid hotel discount dates at position ${i + 1}.` };
    if (rule.startDate > rule.endDate) return { ok: false, error: `Hotel discount rule "${rule.label}" has start date after end date.` };
  }

  return { ok: true };
}

function validateOrderPayload(body, siteData) {
  if (!body || typeof body !== "object") return { ok: false, error: "Invalid order payload." };

  const {
    customerName = "",
    phone = "",
    roomNumber = "",
    address = "",
    notes = "",
    isHotelGuest = false,
    items = []
  } = body;

  if (!isNonEmptyString(customerName, 2, 120)) return { ok: false, error: "Invalid customer name." };
  if (!isSafePhone(phone)) return { ok: false, error: "Invalid phone number." };
  if (!isNonEmptyString(address, 3, 200)) return { ok: false, error: "Invalid address or hotel field." };
  if (typeof notes !== "string" || notes.length > 1000) return { ok: false, error: "Invalid notes." };
  if (isHotelGuest && !isNonEmptyString(roomNumber, 1, 20)) return { ok: false, error: "Room number is required for hotel guests." };
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) return { ok: false, error: "Order items are required." };

  const allowedItems = new Map();
  (siteData.menuCategories || []).forEach(category => {
    (category.items || []).forEach(item => {
      allowedItems.set(item.id, item);
    });
  });

  for (const item of items) {
    if (!item || !isNonEmptyString(item.id, 1, 80)) return { ok: false, error: "Invalid order item id." };
    if (!Number.isInteger(Number(item.qty)) || Number(item.qty) < 1 || Number(item.qty) > 50) return { ok: false, error: `Invalid quantity for item ${item.id}.` };
    const allowed = allowedItems.get(item.id);
    if (!allowed) return { ok: false, error: `Unknown item id: ${item.id}.` };
    if (Number(item.price) !== Number(allowed.price)) return { ok: false, error: `Price mismatch for item ${item.id}.` };
  }

  return { ok: true };
}

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

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT,
      phone TEXT,
      room_number TEXT,
      address TEXT,
      notes TEXT,
      is_hotel_guest INTEGER NOT NULL DEFAULT 0,
      hotel_discount_percent INTEGER NOT NULL DEFAULT 0,
      subtotal INTEGER NOT NULL DEFAULT 0,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      total_amount INTEGER NOT NULL DEFAULT 0,
      items_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'new',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
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
    console.log("Default admin created:");
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

const orderLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many order attempts. Try again later." }
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

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/site-data", (req, res) => {
  res.json(getSiteData());
});


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
  const data = req.body;
  const validation = validateSiteData(data);
  if (!validation.ok) {
    return res.status(400).json({ error: validation.error });
  }
  saveSiteData(data);
  res.json({ success: true });
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

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-login.html"));
});

app.get("/dashboard", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin-dashboard.html"));
});

app.get("/en/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "en", "index.html"));
});


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
