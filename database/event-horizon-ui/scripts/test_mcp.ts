
const MCP_URL = 'http://localhost:3000/api/mcp';
const API_KEY = 'eyJh5._def_.pqc_v1_anon_x6SbJWvxLBeB9PpL-DpskiITLj0RwuTX9zZ73Wo68Ek';

async function testMCP() {
    console.log("🧪 Testing MCP Server Protocol...");

    try {
        // 1. List Tools
        console.log("📡 Calling tools/list...");
        const listRes = await fetch(MCP_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: 'tools/list',
                params: {}
            })
        });
        const listData = await (listRes as any).json();
        console.log("✅ Tools available:", listData.tools.map((t: any) => t.name).join(', '));

        // 2. Call list_tables
        console.log("📦 Calling tools/call -> list_tables...");
        const callRes = await fetch(MCP_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: 'tools/call',
                params: {
                    name: 'list_tables',
                    arguments: {}
                }
            })
        });
        const callData = await (callRes as any).json();
        console.log("✅ Response:", callData.content[0].text);

        // 3. Call query_database
        console.log("🔍 Calling tools/call -> query_database...");
        const queryRes = await fetch(MCP_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                method: 'tools/call',
                params: {
                    name: 'query_database',
                    arguments: {
                        sql: 'SELECT * FROM announcements LIMIT 1'
                    }
                }
            })
        });
        const queryData = await (queryRes as any).json();
        console.log("✅ Data Found:", queryData.content[0].text);

        console.log("\n🎉 MCP PROTOCOL VERIFIED!");
    } catch (e: any) {
        console.error("❌ MCP Test Failed:", e.message);
    }
}

testMCP();
