-- Test runner for obfuscated module
local module = require("./test_module_test")

print("Testing obfuscated module...")
print("add(5, 3) = " .. tostring(module.add(5, 3)))
print("multiply(4, 7) = " .. tostring(module.multiply(4, 7)))
print("greet('World') = " .. module.greet("World"))
print("SUCCESS: Module works correctly!")
