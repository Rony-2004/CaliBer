import { db } from './src/config/drizzle.js';

async function testConnection() {
    try {
        console.log('🔍 Testing database connection...');

        // Simple query to test connection
        const result = await db.execute('SELECT NOW() as current_time');
        console.log('✅ Database connection successful!');
        console.log('⏰ Current time:', result.rows[0].current_time);

    } catch (error) {
        console.error('❌ Database connection failed:', error);
    } finally {
        process.exit(0);
    }
}

testConnection(); 