-- Test runner for complex obfuscated module
local module = require("./test_complex_module_obfuscated")

print("Testing complex obfuscated module...")
print("Version: " .. module.getVersion())
print("Config.maxPlayers: " .. tostring(module.Config.maxPlayers))
print("Utils.clamp(150, 0, 100): " .. tostring(module.Utils.clamp(150, 0, 100)))
print("Utils.lerp(0, 10, 0.5): " .. tostring(module.Utils.lerp(0, 10, 0.5)))
print("initialize(): " .. tostring(module:initialize()))
print("SUCCESS: Complex module works correctly!")
