-- Test ModuleScript for obfuscation
local module = {}

function module.add(a, b)
    return a + b
end

function module.multiply(a, b)
    return a * b
end

function module.greet(name)
    return "Hello, " .. name .. "!"
end

return module
