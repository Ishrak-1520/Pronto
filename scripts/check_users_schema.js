const db = require('../config/db');

(async () => {
    try {
        const [rows] = await db.query('DESCRIBE users');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
