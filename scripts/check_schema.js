const db = require('../config/db');

(async () => {
    try {
        const [rows] = await db.query('DESCRIBE campaigns');
        console.log(JSON.stringify(rows, null, 2));
    } catch (err) {
        console.error(err);
    } finally {
        process.exit();
    }
})();
