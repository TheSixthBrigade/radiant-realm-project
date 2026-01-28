
import { Pool } from 'pg';
import path from 'path';

const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
});

const query = (text: string, params?: any[]) => pool.query(text, params);

async function deployFunction(projectId: number, name: string, code: string) {
    const slug = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    console.log(`Deploying function "${name}" to project ${projectId}...`);

    await query(`
        INSERT INTO edge_functions (project_id, name, slug, code, updated_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (project_id, slug) DO UPDATE SET code = EXCLUDED.code, updated_at = NOW()
    `, [projectId, name, slug, code]);

    console.log(`SUCCESS: Function "${name}" deployed. Accessible at /api/v1/functions/${slug}/invoke`);
}

const complexCode = `
const { body } = event;
console.log("--- DATA PROCESSOR START ---");
console.log("Input:", JSON.stringify(body));

// 1. Validation
if (!body.text || typeof body.text !== 'string') {
    console.error("Validation Failed: 'text' field is missing or invalid");
    throw new Error("Invalid Input");
}

// 2. Data Transformation
const wordCount = body.text.split(/\\s+/).filter(w => w.length > 0).length;
const charCount = body.text.length;
const isVocal = body.text.includes("!");

// 3. Mock Sentiment Analysis
const positiveKeywords = ['good', 'great', 'awesome', 'excellent', 'amazing'];
const lowerText = body.text.toLowerCase();
const score = positiveKeywords.filter(k => lowerText.includes(k)).length;
const sentiment = score > 1 ? 'POSITIVE' : score > 0 ? 'NEUTRAL' : 'UNCLEAR';

console.log("Processing complete. Analytics:", { wordCount, sentiment });
console.log("--- DATA PROCESSOR END ---");

return {
    status: "PROCESSED",
    analytics: {
        wordCount,
        charCount,
        isVocal,
        sentimentScore: score,
        sentimentLabel: sentiment
    },
    originalText: body.text
};
`;

async function main() {
    try {
        const args = process.argv.slice(2);
        const projectId = parseInt(args[0]) || 5; // Default to Web Test project

        await deployFunction(projectId, 'Data Processor', complexCode);
    } catch (e) {
        console.error('Deployment failed:', e);
    } finally {
        await pool.end();
    }
}

main();
