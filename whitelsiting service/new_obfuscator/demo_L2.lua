--[[
	Universal Animation System - Proper Weld Method
	Uses welds to override Motor6Ds and point arms at steering wheel
	Based on working example - this is the correct way!
]]

local RunService = game:GetService("RunService")
local Players = game:GetService("Players")

local car = script.Parent.Car.Value
local _Tune = require(car["A-Chassis Tune"])
local UniversalDetection = require(script.Parent.UniversalDetection)

local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()
local humanoid = character:WaitForChild("Humanoid")

local AnimationState = {
	isInitialized = false,
	isDriver = false,
	steeringWheel = nil,

	-- Hand grip parts on wheel
	leftGrip = nil,
	rightGrip = nil,

	-- Arm parts
	leftHand = nil,
	rightHand = nil,
	leftLowerArm = nil,
	rightLowerArm = nil,
	leftUpperArm = nil,
	rightUpperArm = nil,

	-- Original arm sizes
	originalArmSizes = {},

	-- Shoulder welds (override Motor6Ds)
	rightShoulderWeld = nil,
	leftShoulderWeld = nil,

	-- Render stepped connection
	steppedEvent = nil,

	currentSteerAngle = 0
}

-- Arm thickness scale when driving (0.6 = 60% thickness, length stays same)
local HAND_SCALE = 0.6

-- Angles for character lean and head position
local characterLeanAngle = math.rad(10) -- Character leans forward (reduced from 20)
local neckAngle = math.rad(-8) -- Head looks up (reduced from -15)

local function detectComponents()
	local components = UniversalDetection:ScanVehicle(car)
	if components then
		AnimationState.steeringWheel = components.steeringWheel
		return true
	end
	return false
end

-- Create welds to override Motor6Ds
function configureJointsForSteering()
	-- Wait for arm parts
	local rightUpperArm = character:WaitForChild("RightUpperArm", 2)
	local leftUpperArm = character:WaitForChild("LeftUpperArm", 2)
	local rightLowerArm = character:WaitForChild("RightLowerArm", 2)
	local leftLowerArm = character:WaitForChild("LeftLowerArm", 2)
	local upperTorso = character:WaitForChild("UpperTorso", 2)
	local head = character:WaitForChild("Head", 2)

	if not rightUpperArm or not leftUpperArm then
		warn("[UniversalAnimations] Could not find arm parts!")
		return nil, nil
	end

	local rightShoulder = rightUpperArm:FindFirstChild("RightShoulder")
	local leftShoulder = leftUpperArm:FindFirstChild("LeftShoulder")
	local rightElbow = rightLowerArm and rightLowerArm:FindFirstChild("RightElbow")
	local leftElbow = leftLowerArm and leftLowerArm:FindFirstChild("LeftElbow")

	if not rightShoulder or not leftShoulder then
		warn("[UniversalAnimations] Could not find shoulder Motor6Ds!")
		return nil, nil
	end

	-- Torso weld - lean character forward
	if upperTorso and upperTorso:FindFirstChild("Waist") then
		local waist = upperTorso.Waist
		local torsoWeld = Instance.new("Weld")
		torsoWeld.Part0 = waist.Part0
		torsoWeld.Part1 = waist.Part1
		torsoWeld.C0 = waist.C0 * CFrame.Angles(-characterLeanAngle, 0, 0)
		torsoWeld.C1 = waist.C1
		torsoWeld.Name = "WaistWeld"
		torsoWeld.Parent = upperTorso
		print("[UniversalAnimations] ✓ Created waist weld (lean forward)")
	end

	-- Neck weld - make head look up
	if head and head:FindFirstChild("Neck") then
		local neck = head.Neck
		local neckWeld = Instance.new("Weld")
		neckWeld.Part0 = neck.Part0
		neckWeld.Part1 = neck.Part1
		neckWeld.C0 = neck.C0 * CFrame.Angles(-neckAngle, 0, 0)
		neckWeld.C1 = neck.C1
		neckWeld.Name = "NeckWeld"
		neckWeld.Parent = head
		print("[UniversalAnimations] ✓ Created neck weld (look up)")
	end

	-- Right shoulder weld
	local rightShoulderWeld = Instance.new("Weld")
	rightShoulderWeld.Part0 = rightShoulder.Part0
	rightShoulderWeld.Part1 = rightShoulder.Part1
	rightShoulderWeld.C0 = rightShoulder.C0
	rightShoulderWeld.C1 = rightShoulder.C1
	rightShoulderWeld.Parent = rightShoulder.Parent
	rightShoulderWeld.Name = "RightShoulderWeld"
	print("[UniversalAnimations] ✓ Created right shoulder weld")

	-- Left shoulder weld
	local leftShoulderWeld = Instance.new("Weld")
	leftShoulderWeld.Part0 = leftShoulder.Part0
	leftShoulderWeld.Part1 = leftShoulder.Part1
	leftShoulderWeld.C0 = leftShoulder.C0
	leftShoulderWeld.C1 = leftShoulder.C1
	leftShoulderWeld.Parent = leftShoulder.Parent
	leftShoulderWeld.Name = "LeftShoulderWeld"
	print("[UniversalAnimations] ✓ Created left shoulder weld")

	-- Elbow welds - keep arms straight
	if rightElbow and rightLowerArm then
		local rightElbowWeld = Instance.new("Weld")
		rightElbowWeld.Part0 = rightShoulderWeld.Part1
		rightElbowWeld.Part1 = rightLowerArm
		rightElbowWeld.C0 = CFrame.new(0, -rightLowerArm.Size.Y/2, 0)
		rightElbowWeld.Name = "RightElbowWeld"
		rightElbowWeld.Parent = rightLowerArm
		print("[UniversalAnimations] ✓ Created right elbow weld")
	end

	if leftElbow and leftLowerArm then
		local leftElbowWeld = Instance.new("Weld")
		leftElbowWeld.Part0 = leftShoulderWeld.Part1
		leftElbowWeld.Part1 = leftLowerArm
		leftElbowWeld.C0 = CFrame.new(0, -leftLowerArm.Size.Y/2, 0)
		leftElbowWeld.Name = "LeftElbowWeld"
		leftElbowWeld.Parent = leftLowerArm
		print("[UniversalAnimations] ✓ Created left elbow weld")
	end

	return rightShoulderWeld, leftShoulderWeld
end

function cleanupJoints()
	print("[UniversalAnimations] Cleaning up joints...")

	local waistWeld = character.UpperTorso and character.UpperTorso:FindFirstChild("WaistWeld")
	local neckWeld = character.Head and character.Head:FindFirstChild("NeckWeld")
	local rs = character.RightUpperArm and character.RightUpperArm:FindFirstChild("RightShoulderWeld")
	local ls = character.LeftUpperArm and character.LeftUpperArm:FindFirstChild("LeftShoulderWeld")
	local re = character.RightLowerArm and character.RightLowerArm:FindFirstChild("RightElbowWeld")
	local le = character.LeftLowerArm and character.LeftLowerArm:FindFirstChild("LeftElbowWeld")

	if waistWeld then waistWeld:Destroy() end
	if neckWeld then neckWeld:Destroy() end
	if rs then rs:Destroy() end
	if ls then ls:Destroy() end
	if re then re:Destroy() end
	if le then le:Destroy() end

	print("[UniversalAnimations] ✓ Joints cleaned up")
end

-- Point hands at wheel grips
function handsOnWheel(rightShoulder, leftShoulder)
	if not AnimationState.leftGrip or not AnimationState.rightGrip then return end
	if not rightShoulder or not leftShoulder then return end

	-- Find the positions on the wheel we want the hands to point to
	local rightTargetPosition = CFrame.new(rightShoulder.Part0.CFrame:PointToObjectSpace(AnimationState.rightGrip.Position)) * (rightShoulder.C0 - rightShoulder.C0.p)
	local leftTargetPosition = CFrame.new(leftShoulder.Part0.CFrame:PointToObjectSpace(AnimationState.leftGrip.Position)) * (leftShoulder.C0 - leftShoulder.C0.p)

	-- Adjust target positions so center of hand points to target
	rightTargetPosition = rightTargetPosition * CFrame.new(-rightShoulder.Part1.Size.X/2, -rightShoulder.Part1.Size.Y/2, 0)
	leftTargetPosition = leftTargetPosition * CFrame.new(leftShoulder.Part1.Size.X/2, -leftShoulder.Part1.Size.Y/2, 0)

	-- Rotate arms 90 degrees downward so end of hand points to target
	local rightC0 = CFrame.new(rightShoulder.C0.p, rightTargetPosition.p) * CFrame.Angles(math.rad(90), 0, 0)
	local leftC0 = CFrame.new(leftShoulder.C0.p, leftTargetPosition.p) * CFrame.Angles(math.rad(90), 0, 0)

	rightShoulder.C0 = rightC0
	leftShoulder.C0 = leftC0
end

local function scaleArms(scale)
	-- Find all arm parts
	AnimationState.leftHand = character:FindFirstChild("LeftHand")
	AnimationState.rightHand = character:FindFirstChild("RightHand")
	AnimationState.leftLowerArm = character:FindFirstChild("LeftLowerArm")
	AnimationState.rightLowerArm = character:FindFirstChild("RightLowerArm")
	AnimationState.leftUpperArm = character:FindFirstChild("LeftUpperArm")
	AnimationState.rightUpperArm = character:FindFirstChild("RightUpperArm")

	-- R6 fallback
	if not AnimationState.leftHand then
		AnimationState.leftHand = character:FindFirstChild("Left Arm")
		AnimationState.leftLowerArm = AnimationState.leftHand
		AnimationState.leftUpperArm = AnimationState.leftHand
	end
	if not AnimationState.rightHand then
		AnimationState.rightHand = character:FindFirstChild("Right Arm")
		AnimationState.rightLowerArm = AnimationState.rightHand
		AnimationState.rightUpperArm = AnimationState.rightHand
	end

	-- List of all arm parts to scale
	local armParts = {
		{part = AnimationState.leftHand, name = "LeftHand"},
		{part = AnimationState.rightHand, name = "RightHand"},
		{part = AnimationState.leftLowerArm, name = "LeftLowerArm"},
		{part = AnimationState.rightLowerArm, name = "RightLowerArm"},
		{part = AnimationState.leftUpperArm, name = "LeftUpperArm"},
		{part = AnimationState.rightUpperArm, name = "RightUpperArm"}
	}

	for _, armData in ipairs(armParts) do
		local part = armData.part
		local name = armData.name

		if part then
			-- Save original size if not already saved
			if not AnimationState.originalArmSizes[name] then
				AnimationState.originalArmSizes[name] = part.Size
			end

			local originalSize = AnimationState.originalArmSizes[name]

			-- Scale only thickness (X and Z), keep length (Y) the same
			part.Size = Vector3.new(
				originalSize.X * scale,
				originalSize.Y, -- Keep Y (length) same
				originalSize.Z * scale
			)
		end
	end

	print("[UniversalAnimations] ✓ Arm thickness scaled to " .. (scale * 100) .. "%")
end

local function setupArmSystem()
	if not AnimationState.steeringWheel then return false end

	-- Find the hand grip parts
	local misc = car:FindFirstChild("Misc")
	local sw = misc and misc:FindFirstChild("SW")
	AnimationState.leftGrip = sw and sw:FindFirstChild("LeftHandGrip")
	AnimationState.rightGrip = sw and sw:FindFirstChild("RightHandGrip")

	if not AnimationState.leftGrip or not AnimationState.rightGrip then
		warn("[UniversalAnimations] Could not find hand grips in Misc/SW")
		return false
	end

	print("[UniversalAnimations] ✓ Found hand grips!")

	-- Force arms to be visible
	for _, part in ipairs(character:GetDescendants()) do
		if part:IsA("BasePart") then
			local armNames = {"LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm", "RightLowerArm", "RightHand", "Left Arm", "Right Arm"}
			for _, name in ipairs(armNames) do
				if part.Name == name then
					part.LocalTransparencyModifier = 0
					part.Transparency = 0
				end
			end
		end
	end

	-- Scale arms down (thickness only)
	scaleArms(HAND_SCALE)

	-- Configure joints
	local rightShoulder, leftShoulder = configureJointsForSteering()

	if not rightShoulder or not leftShoulder then
		warn("[UniversalAnimations] Failed to configure joints!")
		return false
	end

	AnimationState.rightShoulderWeld = rightShoulder
	AnimationState.leftShoulderWeld = leftShoulder

	-- Setup event to continuously point hands at wheel and keep arms visible
	AnimationState.steppedEvent = RunService.RenderStepped:Connect(function()
		handsOnWheel(AnimationState.rightShoulderWeld, AnimationState.leftShoulderWeld)

		-- Force arms to stay visible every frame
		for _, part in ipairs(character:GetDescendants()) do
			if part:IsA("BasePart") then
				local armNames = {"LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm", "RightLowerArm", "RightHand", "Left Arm", "Right Arm"}
				for _, name in ipairs(armNames) do
					if part.Name == name then
						part.LocalTransparencyModifier = 0
					end
				end
			end
		end
	end)

	print("[UniversalAnimations] ✓ Arm system ready!")
	return true
end

local function initialize()
	if AnimationState.isInitialized then return end

	print("[UniversalAnimations] Initializing...")

	if not detectComponents() then return end

	local driveSeat = car:FindFirstChild("DriveSeat", true)
	if driveSeat and driveSeat.Occupant == humanoid then
		AnimationState.isDriver = true
		if setupArmSystem() then
			AnimationState.isInitialized = true
			print("[UniversalAnimations] ✓ Initialization complete!")
		end
	end
end

local function cleanup()
	print("[UniversalAnimations] Cleaning up...")

	-- Disconnect render stepped event
	if AnimationState.steppedEvent then
		AnimationState.steppedEvent:Disconnect()
		AnimationState.steppedEvent = nil
	end

	-- Restore arm sizes to normal using saved original sizes
	for name, originalSize in pairs(AnimationState.originalArmSizes) do
		local part = character:FindFirstChild(name)
		if part and part:IsA("BasePart") then
			part.Size = originalSize
			print("[UniversalAnimations] Restored " .. name .. " to size: " .. tostring(originalSize))
		end
	end

	-- Also try direct restoration for R6
	local leftArm = character:FindFirstChild("Left Arm")
	local rightArm = character:FindFirstChild("Right Arm")
	if leftArm and AnimationState.originalArmSizes["Left Arm"] then
		leftArm.Size = AnimationState.originalArmSizes["Left Arm"]
	end
	if rightArm and AnimationState.originalArmSizes["Right Arm"] then
		rightArm.Size = AnimationState.originalArmSizes["Right Arm"]
	end

	-- Restore arm transparency to normal
	for _, part in ipairs(character:GetDescendants()) do
		if part:IsA("BasePart") then
			local armNames = {"LeftUpperArm", "LeftLowerArm", "LeftHand", "RightUpperArm", "RightLowerArm", "RightHand", "Left Arm", "Right Arm"}
			for _, name in ipairs(armNames) do
				if part.Name == name then
					part.LocalTransparencyModifier = 0
					part.Transparency = 0
				end
			end
		end
	end

	-- Clean up joints
	cleanupJoints()

	-- Clear saved sizes
	AnimationState.originalArmSizes = {}

	AnimationState.isInitialized = false
	AnimationState.isDriver = false

	print("[UniversalAnimations] ✓ Cleanup complete")
end

local function updateSteering(deltaTime)
	if not AnimationState.isDriver or not AnimationState.steeringWheel then return end

	local steerValue = script.Parent.Values.SteerC.Value
	AnimationState.currentSteerAngle = AnimationState.currentSteerAngle + (steerValue - AnimationState.currentSteerAngle) * 0.15

	-- Rotate the steering wheel
	local wheelPart = AnimationState.steeringWheel
	if AnimationState.steeringWheel:IsA("Model") then
		wheelPart = AnimationState.steeringWheel:FindFirstChildWhichIsA("BasePart", true)
	end

	if wheelPart then
		local steerMotor = wheelPart:FindFirstChild("SS") or AnimationState.steeringWheel:FindFirstChild("SS", true)
		if steerMotor and steerMotor:IsA("Motor6D") then
			local ex = AnimationState.currentSteerAngle < 0 and -1 or 1
			steerMotor.DesiredAngle = AnimationState.currentSteerAngle^2 * math.rad(-400) * ex
		end
	end
end

RunService.RenderStepped:Connect(updateSteering)

-- Monitor for leaving vehicle
local function monitorOccupancy()
	local driveSeat = car:FindFirstChild("DriveSeat", true)
	if not driveSeat then return end

	local lastOccupant = driveSeat.Occupant

	RunService.Heartbeat:Connect(function()
		local currentOccupant = driveSeat.Occupant

		-- Entering vehicle
		if currentOccupant == humanoid and lastOccupant ~= humanoid then
			wait(0.1)
			initialize()
		end

		-- Leaving vehicle
		if lastOccupant == humanoid and currentOccupant ~= humanoid then
			cleanup()
		end

		lastOccupant = currentOccupant
	end)

	-- Initialize if already in seat
	if driveSeat.Occupant == humanoid then
		wait(0.1)
		initialize()
	end
end

-- Also restore on character death/respawn
if humanoid then
	humanoid.Died:Connect(function()
		if AnimationState.isInitialized then
			cleanup()
		end
	end)
end

-- Start monitoring
monitorOccupancy()

script.Destroying:Connect(cleanup)

print("[UniversalAnimations] Plugin loaded - Proper weld method ready!")
