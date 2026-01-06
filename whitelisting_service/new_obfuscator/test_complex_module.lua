-- Complex ModuleScript test
local Config = {
    version = "1.0.0",
    debug = false,
    maxPlayers = 100
}

local Utils = {}

function Utils.clamp(value, min, max)
    if value < min then return min end
    if value > max then return max end
    return value
end

function Utils.lerp(a, b, t)
    return a + (b - a) * t
end

local module = {
    Config = Config,
    Utils = Utils,
    
    initialize = function(self)
        print("Module initialized!")
        return true
    end,
    
    getVersion = function()
        return Config.version
    end
}

return module
