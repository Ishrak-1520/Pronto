const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const db = require('./db');
const bcrypt = require('bcryptjs');

// Mock User for Auth Bypass / Local Login
const mockUser = {
    id: 1,
    google_id: "mock_admin_id",
    displayName: "Admin User",
    email: "admin@pronto.com",
    avatar_url: "https://via.placeholder.com/150",
    name: "Admin User",
    company_name: "Pronto Admin"
};

passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            // Simple check for admin/admin
            if (username === "admin" && password === "admin") {
                console.log("Local Auth Success: admin logged in");
                return done(null, mockUser);
            }

            console.log("Local Auth Failed: Invalid credentials");
            return done(null, false, { message: 'Invalid username or password' });
        } catch (err) {
            console.error("Local Auth Error:", err);
            return done(err);
        }
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    // In this simple mock, we just return the mock user if ID matches
    if (id === 1) {
        return done(null, mockUser);
    }

    // Fallback to DB if needed for other users
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


module.exports = passport;