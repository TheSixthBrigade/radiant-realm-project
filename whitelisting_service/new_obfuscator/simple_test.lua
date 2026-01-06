-- Simple test script to verify obfuscation works
print("Hello from obfuscated code!")
print("Testing numbers: " .. tostring(123 + 456))
print("Testing strings: " .. "abc" .. "def")

local function add(a, b)
    return a + b
end

local result = add(10, 20)
print("Function result: " .. tostring(result))

-- Test table
local t = {1, 2, 3, 4, 5}
local sum = 0
for i, v in ipairs(t) do
    sum = sum + v
end
print("Sum of table: " .. tostring(sum))

print("All tests passed!")
