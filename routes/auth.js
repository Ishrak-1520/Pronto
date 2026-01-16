const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const passport = require('passport');

// GET /login
router.get('/login', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('login', {
        title: 'Login | Pronto',
        error: null
    });
});

// GET /register
router.get('/register', (req, res) => {
    if (req.session && req.session.user) {
        return res.redirect('/dashboard');
    }
    res.render('register', {
        title: 'Register | Pronto',
        error: null
    });
});

// GET /google
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

// GET /google/callback
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/auth/login' }),
    (req, res) => {
        // Successful authentication
        req.session.user = {
            id: req.user.id,
            name: req.user.name,
            email: req.user.email,
            avatar_url: req.user.avatar_url
        };
        res.redirect('/dashboard');
    }
);

// POST /register
router.post('/register', async (req, res) => {
    const { name, email, password, company_name, job_role } = req.body;

    if (!name || !email || !password) {
        return res.render('register', {
            title: 'Register | Pronto',
            error: 'All fields are required.'
        });
    }

    try {
        // Check if user exists
        const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            return res.render('register', {
                title: 'Register | Pronto',
                error: 'Email already registered.'
            });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Insert user
        await db.query(
            'INSERT INTO users (name, email, password_hash, company_name, job_role, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
            [name, email, hashedPassword, company_name || null, job_role || null]
        );

        res.redirect('/auth/login');
    } catch (error) {
        console.error('Registration error:', error);
        res.render('register', {
            title: 'Register | Pronto',
            error: 'Registration failed. Please try again.'
        });
    }
});

// POST /login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render('login', {
            title: 'Login | Pronto',
            error: 'Email and password are required.'
        });
    }

    try {
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length === 0) {
            return res.render('login', {
                title: 'Login | Pronto',
                error: 'Invalid email or password.'
            });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.render('login', {
                title: 'Login | Pronto',
                error: 'Invalid email or password.'
            });
        }

        // Set session
        req.session.user = {
            id: user.id,
            name: user.name,
            email: user.email
        };

        res.redirect('/dashboard');
    } catch (error) {
        console.error('Login error:', error);
        res.render('login', {
            title: 'Login | Pronto',
            error: 'Login failed. Please try again.'
        });
    }
});

// GET /logout
router.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.redirect('/');
    });
});

module.exports = router;
