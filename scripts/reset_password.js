const bcrypt = require('bcryptjs');
const db = require('../config/db');

(async () => {
    try {
        const hashedPassword = await bcrypt.hash('password123', 10);
        const email = 'empty@example.com';

        // Check if user exists
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (users.length > 0) {
            // Update password
            await db.query('UPDATE users SET password_hash = ? WHERE email = ?', [hashedPassword, email]);
            console.log(`Password updated for ${email}`);
        } else {
            // Create user
            await db.query('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)', ['Empty State User', email, hashedPassword]);
            console.log(`User created: ${email}`);
        }
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
