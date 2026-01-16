const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const db = require('./db'); // Ensure this points to your actual db connection file
const bcrypt = require('bcryptjs');
require('dotenv').config(); // Ensures local .env is loaded

// --- 🔍 DEBUGGING BLOCK ---
// This prints the status to Vercel logs so you know EXACTLY what is failing
console.log("--- PASSPORT CONFIGURATION ---");
console.log("GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID ? "✅ LOADED" : "❌ MISSING");
console.log("GOOGLE_CLIENT_SECRET:", process.env.GOOGLE_CLIENT_SECRET ? "✅ LOADED" : "❌ MISSING");
console.log("GOOGLE_CALLBACK_URL:", process.env.GOOGLE_CALLBACK_URL || "⚠️ Using relative path (Might fail in Prod)");
// ---------------------------

passport.use(new GoogleStrategy({
    // PREVENT CRASH: If env var is missing, use a dummy string so app starts anyway
    clientID: process.env.GOOGLE_CLIENT_ID || "MISSING_GOOGLE_CLIENT_ID",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "MISSING_GOOGLE_CLIENT_SECRET",

    // PRODUCTION FIX: Google requires an absolute URL (e.g., https://site.com/auth/...)
    callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback"
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user exists with this google_id
            const [users] = await db.query('SELECT * FROM users WHERE google_id = ?', [profile.id]);

            if (users.length > 0) {
                // User exists, log them in
                return done(null, users[0]);
            } else {
                // Check if user exists with this email
                // FIX: Added optional chaining (?) just in case email is missing from profile
                const email = profile.emails?.[0]?.value;
                if (!email) return done(new Error("No email found in Google Profile"), null);

                const [emailUsers] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

                if (emailUsers.length > 0) {
                    // Update existing user with google_id and avatar
                    await db.query('UPDATE users SET google_id = ?, avatar_url = ? WHERE id = ?',
                        [profile.id, profile.photos?.[0]?.value, emailUsers[0].id]);

                    const [updatedUser] = await db.query('SELECT * FROM users WHERE id = ?', [emailUsers[0].id]);
                    return done(null, updatedUser[0]);
                } else {
                    // Create new user
                    const dummyPassword = await bcrypt.hash(Math.random().toString(36).slice(-8), 10);

                    const [result] = await db.query(
                        'INSERT INTO users (name, email, password_hash, google_id, avatar_url) VALUES (?, ?, ?, ?, ?)',
                        [profile.displayName, email, dummyPassword, profile.id, profile.photos?.[0]?.value]
                    );

                    const [newUser] = await db.query('SELECT * FROM users WHERE id = ?', [result.insertId]);
                    return done(null, newUser[0]);
                }
            }
        } catch (err) {
            console.error("Passport Error:", err);
            return done(err, null);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
        if (users.length > 0) {
            done(null, users[0]);
        } else {
            done(null, null);
        }
    } catch (err) {
        done(err, null);
    }
});

module.exports = passport;