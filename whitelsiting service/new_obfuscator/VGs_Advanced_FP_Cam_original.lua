--[[
	VG's Advanced First Person V2.0
	written by VG3O_J in partnership with Avxnturador
]]

local Max_Lateral_Look_Rotation = 360 -- when using look around, this specifies the max lateral angle you can rotate to
local Max_Vertical_Look_Rotation = 270 -- when using look around, this specifies the max vertical angle you can rotate to

local Hide_Parts = true -- Hide body parts except arms
local Hide_Decals = true
local Hide_Head = true -- Hide head and accessories in first person
local Show_Arms = true -- Keep arms visible for steering animations


local keybinds = {
	["Activate First Person"] = Enum.KeyCode.V, -- activates the camera
	["Activate Mouse Look"] = Enum.KeyCode.B, -- activates mouse look (camera looks towards your mouse)
	["Left"] = Enum.KeyCode.KeypadFour, -- looks to the left
	["Right"] = Enum.KeyCode.KeypadSix, -- looks to the right
	["Back"] = Enum.KeyCode.KeypadTwo -- looks behind you
}

-- dont touch below

local RunService = game:GetService("RunService")
local UserInputService = game:GetService("UserInputService")
local Players = game:GetService("Players")
local car = script.Parent.Car.Value
local DriveSeat = car.DriveSeat

-- player variables
local player = Players.LocalPlayer
local char = player.Character

local Connections = {}

-- mouse variables
local mouse = game.Players.LocalPlayer:GetMouse()
local mouseLook = true -- Enable mouse look by default for free camera movement

-- camera variables
local camera = workspace.CurrentCamera
local cameraObj = car.Body.Cam
local viewportS = camera.ViewportSize
local camActive = true -- Start with first person enabled by default

-- gforce
local Spring = require(script.Spring)
local VectorSpring = Spring.new(Vector3.zero)
local LookXSpring = Spring.new(0)
local LookYSpring = Spring.new(0)

VectorSpring.Speed = 5
LookXSpring.Speed = 8
LookYSpring.Speed = 8

VectorSpring.Damper = 0.5
LookXSpring.Damper = 1
LookYSpring.Damper = 1

local LastChange = DriveSeat.CFrame:VectorToObjectSpace(DriveSeat.AssemblyLinearVelocity)

local function GetGForces()
	local change = LastChange - DriveSeat.CFrame:VectorToObjectSpace(DriveSeat.AssemblyLinearVelocity)
	return change
end

local Invisibility = {}

-- Add head to invisibility list
if Hide_Head == true then
	table.insert(Invisibility, char.Head)
	
	-- Also hide all accessories (hats, hair, etc.)
	for _, accessory in ipairs(char:GetChildren()) do
		if accessory:IsA("Accessory") then
			local handle = accessory:FindFirstChild("Handle")
			if handle then
				table.insert(Invisibility, handle)
			end
		end
	end
end

-- Helper function to check if a part is an arm
local function isArmPart(part)
	if not Show_Arms then return false end
	
	local armNames = {
		"LeftUpperArm", "LeftLowerArm", "LeftHand",
		"RightUpperArm", "RightLowerArm", "RightHand",
		"Left Arm", "Right Arm" -- R6 compatibility
	}
	
	for _, name in ipairs(armNames) do
		if part.Name == name then
			return true
		end
	end
	return false
end

-- Force arms to be fully visible
local function forceArmVisibility()
	for _, part in ipairs(char:GetDescendants()) do
		if part:IsA("BasePart") and isArmPart(part) then
			part.LocalTransparencyModifier = 0
		end
	end
end

for i, v in pairs(char:GetDescendants()) do
	if v:IsA("BasePart") and Hide_Parts == true and not isArmPart(v) then
		table.insert(Invisibility, v)
	elseif v:IsA("Decal") and Hide_Decals == true then
		table.insert(Invisibility, v)
	end
end

local charAdded = char.ChildAdded:Connect(function(v)
	if v:IsA("BasePart") and Hide_Parts == true and not isArmPart(v) then
		table.insert(Invisibility, v)
	elseif v:IsA("Decal") and Hide_Decals == true then
		table.insert(Invisibility, v)
	elseif v:IsA("Accessory") and Hide_Head == true then
		-- Hide accessories (hats, hair, etc.)
		local handle = v:FindFirstChild("Handle")
		if handle then
			table.insert(Invisibility, handle)
			-- If camera is active, hide it immediately
			if camActive then
				handle.LocalTransparencyModifier = 1
			end
		end
	end
end)

table.insert(Connections, charAdded)

local function SetTransparency(state)
	for _, Item in pairs(Invisibility) do
		Item.LocalTransparencyModifier = state and 1 or 0
	end
	-- Always keep arms visible
	if state then
		forceArmVisibility()
	end
end

local ticke = Random.new():NextNumber(-100, 100)

local function cS(dt)
	if not (DriveSeat.Velocity.Magnitude > 75) then return CFrame.new(0,0,0) end
	local _tick = ticke 
	local pos = Vector3.new(); rot = Vector3.new()
	local of = Vector3.new(math.noise(_tick, 0) * 0.5, math.noise(0, _tick) * 0.5, math.noise(_tick, _tick) * 0.5)
	ticke =	_tick + (dt * 5)
	local shake = of * (0.5 * (DriveSeat.Velocity.Magnitude * 0.0125))
	pos = pos + (shake*Vector3.new(0,0,0))
	rot = rot + (shake*Vector3.new(0.15,0.4,0.4))
	return CFrame.new(pos) * CFrame.Angles(0, math.rad(rot.Y), 0) * CFrame.Angles(math.rad(rot.X), 0, math.rad(rot.Z))
end 

local function update(dt)
	-- Force arms to stay visible every frame
	forceArmVisibility()
	
	-- Force head and accessories to stay hidden
	if Hide_Head and char.Head then
		char.Head.LocalTransparencyModifier = 1
	end
	for _, accessory in ipairs(char:GetChildren()) do
		if accessory:IsA("Accessory") then
			local handle = accessory:FindFirstChild("Handle")
			if handle then
				handle.LocalTransparencyModifier = 1
			end
		end
	end
	
	if mouseLook then
		LookXSpring.Target = 130 * (mouse.X / viewportS.X - 0.5)
		LookYSpring.Target = -60 * (mouse.Y / viewportS.Y - 0.5)
	end
	
	local LookXPosition = LookXSpring.Position
	
	local leanfactor = 0
	
	if math.abs(LookXPosition) >= 102 then
		local leansign = math.sign(LookXPosition)
		local leandirection = leansign == -1 and "Left" or leansign == 0 and "None" or leansign == 1 and "Right"
		
		if leandirection ~= "None" then
			leanfactor = math.clamp((math.abs(LookXPosition) - 102) / 68, 0, 1) * leansign
		end
	end
	VectorSpring.Target = Vector3.new(math.clamp(GetGForces().X / 3, -0.165, 0.165), math.clamp(GetGForces().Y / 3, -0.165, 0.165), math.clamp(GetGForces().Z / 3, -0.165, 0.165))
	local CameraVector = VectorSpring.Position + Vector3.new(1.55 * leanfactor, 0, 0)
	local CameraCFrame = cameraObj.CFrame:ToWorldSpace(CFrame.new(CameraVector) * CFrame.Angles(0, math.rad(-LookXPosition), 0))
	local IdealRotation = CFrame.Angles(math.rad(LookYSpring.Position), 0, 0)
	camera.CFrame = CameraCFrame * IdealRotation * cS(dt)
	camera.FieldOfView = 70 + (DriveSeat.Velocity.Magnitude * 0.03)
	LastChange = DriveSeat.CFrame:VectorToObjectSpace(DriveSeat.AssemblyLinearVelocity)
end

local userBegan = UserInputService.InputBegan:Connect(function(i, gp)
	if not gp then
		if i.KeyCode == keybinds["Activate First Person"] then
			camActive = not camActive
			if camActive then
				camera.CameraType = "Scriptable"
				SetTransparency(true)
				RunService:BindToRenderStep("AdvancedFP", Enum.RenderPriority.Camera.Value, update)
			else
				RunService:UnbindFromRenderStep("AdvancedFP")
				SetTransparency(false)
				camera.CameraType = "Custom"
			end
		end
		if camActive then
			if i.KeyCode == keybinds["Activate Mouse Look"] then
				mouseLook = not mouseLook
			end
			if not mouseLook then
				LookXSpring.Target = 0
				LookYSpring.Target = 0
				if i.KeyCode == keybinds.Left then
					LookXSpring.Target = -170
				elseif i.KeyCode == keybinds.Right then
					LookXSpring.Target = 170
				elseif i.KeyCode == keybinds.Back then
					LookXSpring.Target = 180
				end
			end
		end
	end
end)

local userChanged = UserInputService.InputChanged:Connect(function(i, gp)
	if i.UserInputType == Enum.UserInputType.Gamepad1 then
		if i.KeyCode == Enum.KeyCode.Thumbstick2 and camActive then
			if i.Position.X > 0.1 or i.Position.X < -0.1 then
				LookXSpring.Target = 170 * i.Position.X	
			else
				LookXSpring.Target = 0
			end	
			if i.Position.Y > 0.1 or i.Position.Y < -0.1 then
				LookYSpring.Target = 60 * i.Position.Y
			else
				LookYSpring.Target = 0 
			end
		end
	end
end)

local userEnded = UserInputService.InputEnded:Connect(function(i, gp)
	if not gp then
		if camActive then
			if not mouseLook and (i.KeyCode == keybinds.Left or i.KeyCode == keybinds.Right or i.KeyCode == keybinds.Back) then
				LookXSpring.Target = 0
			end
		end
	end
end)

-- Cleanup function to restore camera
local function cleanupCamera()
	print("[VGs Advanced FP] Cleaning up camera...")
	
	-- Unbind render step
	pcall(function()
		RunService:UnbindFromRenderStep("AdvancedFP")
	end)
	
	-- Restore transparency
	SetTransparency(false)
	
	-- Restore camera settings
	camera.CameraType = Enum.CameraType.Custom
	camera.FieldOfView = 70
	
	-- Restore player camera settings
	player.CameraMode = Enum.CameraMode.Classic
	player.CameraMaxZoomDistance = 128
	player.CameraMinZoomDistance = 0.5
	
	camActive = false
	
	-- Disconnect all connections
	for _, Connection in pairs(Connections) do
		pcall(function()
			Connection:Disconnect()
		end)
	end
	
	print("[VGs Advanced FP] Camera fully restored to normal")
end

-- Exit vehicle cleanup
local Removed = DriveSeat.ChildRemoved:Connect(function(c)
	if c.Name == "SeatWeld" then
		cleanupCamera()
	end
end)

-- Death cleanup - restore camera when character dies
local humanoid = char:FindFirstChildOfClass("Humanoid")
if humanoid then
	local deathConnection = humanoid.Died:Connect(function()
		print("[VGs Advanced FP] Player died, restoring camera...")
		cleanupCamera()
	end)
	table.insert(Connections, deathConnection)
end

-- Character respawn cleanup
local charRemoving = char.AncestryChanged:Connect(function(_, parent)
	if not parent then
		print("[VGs Advanced FP] Character removed, restoring camera...")
		cleanupCamera()
	end
end)

table.insert(Connections, userBegan)
table.insert(Connections, userChanged)
table.insert(Connections, userEnded)
table.insert(Connections, Removed)
table.insert(Connections, charRemoving)

-- Auto-enable first person when entering vehicle
if DriveSeat.Occupant then
	wait(0.1) -- Small delay to ensure everything is loaded
	camera.CameraType = "Scriptable"
	SetTransparency(true)
	RunService:BindToRenderStep("AdvancedFP", Enum.RenderPriority.Camera.Value, update)
	print("[VGs Advanced FP] Auto-enabled first person camera")
end

-- Cleanup when script is destroyed
script.Destroying:Connect(function()
	cleanupCamera()
end)