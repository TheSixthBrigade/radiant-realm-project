// Test Edge Function with Secrets
console.log('Test function invoked!');
console.log('Request body:', JSON.stringify(event.body));

// Test secrets access
console.log('Checking secrets...');
if (secrets.TEST_API_KEY) {
    console.log('TEST_API_KEY found:', secrets.TEST_API_KEY.substring(0, 8) + '...');
} else {
    console.log('No TEST_API_KEY secret found');
}

// Test database access
const result = await db.query('SELECT NOW() as time');
console.log('DB time:', result[0]?.time);

return {
    success: true,
    message: 'Hello from test function!',
    hasSecret: !!secrets.TEST_API_KEY,
    timestamp: new Date().toISOString(),
    dbTime: result[0]?.time
};
