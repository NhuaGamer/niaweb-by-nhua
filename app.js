require('dotenv').config(); // ใช้ dotenv เพื่อเก็บข้อมูลสำคัญ
const express = require("express");
const session = require("express-session");
const ejs = require("ejs");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");
const MySQLStore = require("express-mysql-session")(session); // ใช้ MySQL สำหรับจัดเก็บ Session
const { body, validationResult } = require('express-validator'); // ใช้ express-validator สำหรับ Validation
const NodeCache = require('node-cache');

// สร้างแอป Express
const app = express();

// การตั้งค่าฐานข้อมูล
const dbConfig = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  ssl: { rejectUnauthorized: false },
};

const pool = mysql.createPool(dbConfig);

// ตรวจสอบการเชื่อมต่อ MySQL
async function checkMySQLConnection() {
  try {
    const [rows] = await pool.query("SELECT 1");
    console.log("Successfully connected to MySQL database!");
  } catch (err) {
    console.error("Error connecting to MySQL database:", err.message);
  }
}
checkMySQLConnection();

// กำหนด Session Storage
const sessionStore = new MySQLStore({}, pool);
app.use(session({
  key: 'NodeJs',
  secret: process.env.SESSION_SECRET || 'node', // เปลี่ยน Secret ให้เป็นค่าที่ปลอดภัย
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}));

// Middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res, next) => {
  if (req.session) {
    req.session.cookie.expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
  next();
});

// กำหนด Template Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Cache สำหรับวิดีโอ
const cache = new NodeCache();

// Middleware สำหรับตรวจสอบการเข้าสู่ระบบและสิทธิ์
function IfLoggedIn(req, res, next) {
  if (req.session.user) {
    return res.redirect('/');
  }
  next();
}

function IfAdmin(req, res, next) {
  if (req.session.user && req.session.user.role === 'admin') {
    next();
  } else {
    res.redirect('/');
  }
}

// Routes
app.get('/', async (req, res) => {
  let data = cache.get('videos');
  if (!data) {
    const [rows] = await pool.query("SELECT * FROM urlvideo");
    cache.set('videos', rows, 3600); // Cache 1 ชั่วโมง
    data = rows;
  }
  res.render('index', { videos: data, user: req.session.user });
});

app.get('/login', IfLoggedIn, (req, res) => {
  res.render('login', { user: req.session.user });
});

app.get('/sign-up', IfLoggedIn, (req, res) => {
  res.render('sign-up', { user: req.session.user });
});

app.get('/sign-out', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/about', (req, res) => {
  res.render('about', { user: req.session.user });
});

app.get('/contact', (req, res) => {
  res.render('contact', { user: req.session.user });
});

app.get('/admin', IfAdmin, async (req, res) => {
  res.render('admin/index', { admin: req.session.user });
});

app.get('/admin/addvideo', IfAdmin, (req, res) => {
  res.render('admin/addvideo', { admin: req.session.user });
});

// เพิ่มวิดีโอใหม่
app.post('/admin/addvideo', IfAdmin, async (req, res) => {
  const { title, url, comment, Tlink1, Tlink2, Tlink3, link1, link2, link3 } = req.body;
  const insertVideo = "INSERT INTO urlvideo(title, url, comment, link1, link2, link3, Tlink1, Tlink2, Tlink3) VALUES(?,?,?,?,?,?,?,?,?)";
  try {
    await pool.query(insertVideo, [title, url, comment, link1, link2, link3, Tlink1, Tlink2, Tlink3]);
    res.redirect('/admin/addvideo');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding video");
  }
});

// ลบวิดีโอ
app.post('/deleteName', IfAdmin, async (req, res) => {
  const { titleD } = req.body;
  const deleteName = "DELETE FROM urlvideo WHERE title = ?";
  try {
    await pool.query(deleteName, [titleD]);
    res.redirect('/admin/addvideo');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting video");
  }
});

app.post('/deleteAll', IfAdmin, async (req, res) => {
  const deleteQuery = "DELETE FROM urlvideo";
  const resetAutoIncrementQuery = "ALTER TABLE urlvideo AUTO_INCREMENT = 1";
  try {
    await pool.query(deleteQuery);
    await pool.query(resetAutoIncrementQuery);
    res.redirect('/admin/addvideo');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting all videos");
  }
});

// ลงทะเบียน
app.post('/sign-up', [
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('ConfirmPassword').custom((value, { req }) => value === req.body.password).withMessage('Passwords do not match'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.render('sign-up', { errors: errors.array(), old_data: req.body });
  }

  const { name, email, password } = req.body;
  const hashPass = bcrypt.hashSync(password);
  const insertUser = "INSERT INTO users(role, name, email, password) VALUES('user', ?, ?, ?)";
  try {
    await pool.query(insertUser, [name, email, hashPass]);
    res.redirect('/login?success=true');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error signing up");
  }
});

// เข้าสู่ระบบ
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const sql = "SELECT * FROM users WHERE email = ?";
  try {
    const [result] = await pool.query(sql, [email]);
    if (result.length > 0) {
      const user = result[0];
      if (bcrypt.compareSync(password, user.password)) {
        req.session.user = user;
        return res.redirect('/?success=true');
      } else {
        return res.redirect('/login?errorPasswordNotMatch=true');
      }
    }
    res.redirect('/login?errorUserNotFound=true');
  } catch (err) {
    console.error(err);
    res.status(500).send("Error logging in");
  }
});

// จัดการ 404 Error
app.use((req, res) => {
  res.status(404).render('err/404', { user: req.session.user });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('err/500', { user: req.session.user });
});

// เริ่มเซิร์ฟเวอร์
app.listen(4000, () => {
  console.log('Server is running on port 4000...');
});
