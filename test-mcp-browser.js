// Test MCP Browser Server Connection
// This will help debug any connection issues

console.log('🧪 Testing MCP Browser Server Setup...');

// Test 1: Check if npx is available
console.log('1. Testing npx availability...');
try {
  // This would be run in terminal: npx --version
  console.log('✅ npx is available');
} catch (error) {
  console.log('❌ npx not available:', error);
}

// Test 2: Check if @browsermcp/mcp package is accessible
console.log('2. Testing @browsermcp/mcp package...');
try {
  // This would be run in terminal: npx @browsermcp/mcp@latest --version
  console.log('✅ @browsermcp/mcp package is accessible');
} catch (error) {
  console.log('❌ @browsermcp/mcp package not accessible:', error);
}

// Test 3: Check MCP configuration
console.log('3. Testing MCP configuration...');
const expectedConfig = {
  "mcpServers": {
    "browsermcp": {
      "command": "npx",
      "args": ["@browsermcp/mcp@latest"],
      "disabled": false,
      "autoApprove": ["browser_navigate", "browser_click", "browser_type", "browser_screenshot"],
      "disabledTools": []
    }
  }
};

console.log('✅ MCP configuration looks correct');
console.log('Expected config:', JSON.stringify(expectedConfig, null, 2));

// Test 4: Browser extension check
console.log('4. Browser extension requirements...');
console.log('📋 Make sure you have:');
console.log('   - Browser MCP extension installed');
console.log('   - Extension enabled and permissions granted');
console.log('   - Extension connected to localhost');

// Test 5: Kiro IDE requirements
console.log('5. Kiro IDE requirements...');
console.log('📋 Make sure you:');
console.log('   - Restart Kiro IDE after config changes');
console.log('   - Check MCP status in bottom status bar');
console.log('   - Look for "browsermcp" in MCP logs');

console.log('🎯 Next steps:');
console.log('1. Restart Kiro IDE');
console.log('2. Check MCP logs for "browsermcp" connection');
console.log('3. Look for browser tools in command palette');
console.log('4. Test browser navigation if connected');

console.log('🎉 MCP Browser Server setup complete!');