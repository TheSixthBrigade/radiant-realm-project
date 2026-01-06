-- Simple test module that returns a value
local MyModule = {}

function MyModule.add(a, b)
    return a + b
end

function MyModule.greet(name)
    return "Hello, " .. name
end

return MyModule
