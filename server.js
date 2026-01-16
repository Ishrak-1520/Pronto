const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const session = require('express-session');
// const passport = require('./config/passport'); // DISABLED - Auth bypass

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session Middleware
app.use(session({
    secret: process.env.SESSION_SECRET || 'pronto-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// DISABLED - Passport Middleware
// app.use(passport.initialize());
// app.use(passport.session());

// Auth bypass - inject dummy user for all requests
const { ensureAuth } = require('./middleware/auth');
app.use((req, res, next) => {
    // Inject dummy user globally
    req.user = {
        id: 1,
        name: "Guest User",
        displayName: "Guest User",
        email: "guest@pronto.com",
        avatar_url: "https://via.placeholder.com/150",
        company_name: "Pronto Demo"
    };
    req.session = req.session || {};
    req.session.user = req.user;
    res.locals.user = req.user;
    next();
});

// View Engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Landing Page
app.get('/', (req, res) => {
    res.render('landing', { user: req.session?.user || null });
});

// DISABLED - Auth Routes
// const authRoutes = require('./routes/auth');
// app.use('/auth', authRoutes);

const dnaRoutes = require('./routes/dna');
app.use('/dna', dnaRoutes);

const campaignRoutes = require('./routes/campaigns');
app.use('/campaign', campaignRoutes);

const dashboardRoutes = require('./routes/dashboard');
app.use('/dashboard', dashboardRoutes);

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
