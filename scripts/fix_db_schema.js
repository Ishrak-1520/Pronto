const db = require('../config/db');

async function fixSchema() {
    try {
        console.log('Starting schema fix...');

        // 1. Check/Add concept_data column
        try {
            await db.query(`ALTER TABLE campaigns ADD COLUMN concept_data JSON`);
            console.log('✅ Added column: concept_data');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Column concept_data already exists');
            } else {
                throw err;
            }
        }

        // 2. Check/Add goal column
        try {
            await db.query(`ALTER TABLE campaigns ADD COLUMN goal VARCHAR(255)`);
            console.log('✅ Added column: goal');
        } catch (err) {
            if (err.code === 'ER_DUP_FIELDNAME') {
                console.log('ℹ️ Column goal already exists');
            } else {
                throw err;
            }
        }

        console.log('Schema fix completed successfully.');
        process.exit(0);

    } catch (error) {
        console.error('❌ Schema fix failed:', error);
        process.exit(1);
    }
}

fixSchema();
