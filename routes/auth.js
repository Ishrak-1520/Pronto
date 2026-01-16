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

// Google Auth - REMOVED for Local Login Bypass


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
router.post('/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            console.error('Passport auth error:', err);
            return next(err);
        }
        if (!user) {
            return res.render('login', {
                title: 'Login | Pronto',
                error: info ? info.message : 'Invalid credentials'
            });
        }
        req.logIn(user, (err) => {
            if (err) {
                console.error('Login error:', err);
                return next(err);
            }
            return res.redirect('/dashboard');
        });
    })(req, res, next);
});

// GET /logout
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        res.redirect('/');
    });
});

module.exports = router;

