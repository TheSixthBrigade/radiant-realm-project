-- Test that the module returns a value correctly
-- We'll wrap the module in a function and call it

local function test_module()
    -- This is what the obfuscated module should return
    local MyModule = {}
    
    function MyModule.add(a, b)
        return a + b
    end
    
    function MyModule.greet(name)
        return "Hello, " .. name
    end
    
    return MyModule
end

-- Call the module function (simulating require)
local result = test_module()

print("Type of result:", type(result))
print("Result:", result)

if type(result) == "table" then
    print("SUCCESS: Module returned a table")
    print("add(2,3) =", result.add(2, 3))
    print("greet('Test') =", result.greet("Test"))
else
    print("FAIL: Module did not return a table")
end
