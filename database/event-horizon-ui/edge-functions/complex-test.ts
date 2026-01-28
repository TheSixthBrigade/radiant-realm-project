
// complex-test.ts
// Handles user audit and secret-authenticated broadcasting

console.log("--- COMPLEX TEST START ---");

// 1. Secret Verification
const appSecret = secrets.INTERNAL_APP_SECRET;
if (!appSecret) {
    console.error("Critical: INTERNAL_APP_SECRET not found in Vault!");
    return { error: "Configuration Error" };
}
console.log("Verified App Secret:", appSecret.substring(0, 4) + "****");

// 2. Data Retrieval (Read from Users)
const users = await db.query("SELECT email, name FROM users LIMIT 5");
console.log(`Found ${users.length} users in system.`);

// 3. Logic: Analyze Engagement
const engagementScore = users.length * 42;

// 4. Data Mutation (Write to Announcements)
const logMessage = `Edge Audit: Found ${users.length} users. Engagement Score: ${engagementScore}. Secret used: ${appSecret.substring(0, 4)}`;

await db.query(
    "INSERT INTO announcements (content, author_email) VALUES ($1, $2)",
    [logMessage, "system@vectabase.edge"]
);

console.log("Audit log written to announcements table.");
console.log("--- COMPLEX TEST END ---");

return {
    success: true,
    userCount: users.length,
    engagementScore,
    auditTrail: "Persisted to DB"
};
