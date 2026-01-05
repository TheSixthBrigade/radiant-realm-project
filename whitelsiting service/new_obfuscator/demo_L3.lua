--[[
	Universal Component Detection System
	Automatically detects vehicle components for any A-Chassis vehicle
	Part of Universal A-Chassis Enhancement System
]]

local UniversalDetection = {}

-- Detection patterns for common component names
local DetectionPatterns = {
	steeringWheel = {"SW", "SteeringWheel", "Wheel", "Steering", "SteerWheel"},
	shifter = {"Shifter", "GearShift", "Gear", "SN", "ShifterH", "Shift"},
	gasPedal = {"GP", "GasPedal", "Throttle", "Accelerator", "Gas"},
	brakePedal = {"BP", "BrakePedal", "Brake", "BrakeP"},
	clutchPedal = {"CP", "ClutchPedal", "Clutch", "ClutchP"},
	driveSeat = {"DriveSeat", "Seat", "VehicleSeat", "Driver"}
}

-- Find component by searching for name patterns
function UniversalDetection:FindComponent(parent, patterns, className)
	if not parent then return nil end

	-- Search direct children first
	for _, pattern in ipairs(patterns) do
		local found = parent:FindFirstChild(pattern)
		if found then
			if not className or found:IsA(className) then
				return found
			end
		end
	end

	-- Deep search if not found in direct children
	for _, pattern in ipairs(patterns) do
		for _, descendant in ipairs(parent:GetDescendants()) do
			if descendant.Name == pattern or descendant.Name:match(pattern) then
				if not className or descendant:IsA(className) then
					return descendant
				end
			end
		end
	end

	return nil
end

-- Find all wheels in the vehicle
function UniversalDetection:FindWheels(vehicle)
	local wheels = {}
	local wheelsFolder = vehicle:FindFirstChild("Wheels")

	if wheelsFolder then
		for _, wheel in ipairs(wheelsFolder:GetChildren()) do
			if wheel:IsA("BasePart") then
				table.insert(wheels, wheel)
			end
		end
	end

	return wheels
end

-- Calculate vehicle scale relative to standard car
function UniversalDetection:GetVehicleScale(vehicle)
	local wheelsFolder = vehicle:FindFirstChild("Wheels")
	if wheelsFolder then
		local wheelCount = #wheelsFolder:GetChildren()
		if wheelCount > 0 then
			return 1.0 -- Default scale
		end
	end
	return 1.0
end

-- Main scan function - detects all components
function UniversalDetection:ScanVehicle(vehicle)
	if not vehicle then
		warn("[UniversalDetection] No vehicle provided")
		return nil
	end

	local components = {
		vehicle = vehicle,
		detected = true
	}

	-- Find core components
	components.driveSeat = self:FindComponent(vehicle, DetectionPatterns.driveSeat, "VehicleSeat")
	components.body = vehicle:FindFirstChild("Body")
	components.wheels = self:FindWheels(vehicle)

	-- Find optional visual components
	local miscFolder = vehicle:FindFirstChild("Misc")
	local bodyFolder = vehicle:FindFirstChild("Body")

	components.steeringWheel = self:FindComponent(miscFolder or bodyFolder or vehicle, DetectionPatterns.steeringWheel)
	components.shifter = self:FindComponent(miscFolder or bodyFolder or vehicle, DetectionPatterns.shifter)
	components.gasPedal = self:FindComponent(miscFolder or bodyFolder or vehicle, DetectionPatterns.gasPedal)
	components.brakePedal = self:FindComponent(miscFolder or bodyFolder or vehicle, DetectionPatterns.brakePedal)
	components.clutchPedal = self:FindComponent(miscFolder or bodyFolder or vehicle, DetectionPatterns.clutchPedal)

	-- Calculate vehicle properties
	components.scale = self:GetVehicleScale(vehicle)

	-- Log detection results
	print("[UniversalDetection] Vehicle scan complete:")
	print("  - Drive Seat:", components.driveSeat and "✓" or "✗")
	print("  - Wheels:", #components.wheels)
	print("  - Steering Wheel:", components.steeringWheel and "✓" or "✗")
	print("  - Shifter:", components.shifter and "✓" or "✗")
	print("  - Gas Pedal:", components.gasPedal and "✓" or "✗")
	print("  - Brake Pedal:", components.brakePedal and "✓" or "✗")
	print("  - Clutch Pedal:", components.clutchPedal and "✓" or "✗")

	return components
end

return UniversalDetection
