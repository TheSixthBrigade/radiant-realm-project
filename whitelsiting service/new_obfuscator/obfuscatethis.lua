-- �������+������+���+�������+�����+�������+�������+��������+��+�����+��������+�������+��+�����������+�
-- ��+----+��+--��+�������������������+----+��+----++--��+--+���������+--��+--+��+----+����������+--��+
-- +�����+��������������������������+�����+������+����������������������������+������������������
-- �+---��+��+--���������������������+---��+��+--+�������������������������+--+������������+--���
-- ������++���������������++������++������++�������+���������+������++����������������+�������+��������
-- +-----+�+-+��+-++------+�+-----+�+-----+�+------+���+-+����+-----+����+-+���+------++------++-+��+-+
-- SALUSETUTELA ANTI-TAMPER PROTECTION SYSTEM

-- REMOVED ANTI-DECOMPILER DETECTION TO PREVENT TIMEOUTS

-- REMOVED ANTI-HOOK PROTECTION TO PREVENT TIMEOUTS

-- REMOVED MEMORY INTEGRITY PROTECTION TO PREVENT TIMEOUTS

-- REMOVED ENVIRONMENT VALIDATION TO PREVENT TIMEOUTS

-- REMOVED RUNTIME PROTECTION TO PREVENT TIMEOUTS

-- REMOVED ANTI-DEBUG PROTECTION TO PREVENT TIMEOUTS

-- REMOVED PROTECTION INITIALIZATION TO PREVENT TIMEOUTS

-- Original references to core Roblox globals
local originalGame = game
local originalGetService = game.GetService
local originalGetmetatable = getmetatable
local originalPcall = pcall

local HttpService = originalGame:GetService("HttpService")

-- Load Configuration from ReplicatedStorage
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local WLConfig = require(ReplicatedStorage.WLConfig)

-- Whitelist System
local PROXY_URL = "https://whitelistapiendpoint.thecheesemanatyou.workers.dev/"
local STORE_NAME = WLConfig.StoreName
local PRODUCT_NAME = WLConfig.ProductName
local WEBHOOK_URL = "https://webhook.lewisakura.moe/api/webhooks/1398975752602517594/rzkUJiv9QcI5i0kHkoFGYLjZFEWBQRoRpefo9s-mvMBWnwx8sAAdCCnrHypTmqE9CVvd"

-- Regen System Configuration from WLConfig (with safety checks)
local REGEN_ENABLED = false
local REGEN_AUTHORIZED_USERS = {}

if WLConfig.RegenSystem then
	REGEN_ENABLED = WLConfig.RegenSystem.Enabled or false
	REGEN_AUTHORIZED_USERS = WLConfig.RegenSystem.AuthorizedUsers or {}
else
	warn("Warning: RegenSystem configuration not found in WLConfig, regen system disabled")
end

local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
local Debris = game:GetService("Debris")
local GroupService = game:GetService("GroupService")
local MarketplaceService = game:GetService("MarketplaceService")

local CACHE_DURATION = 10
local lastCacheTime = 0
local cachedData = nil
local MAX_RETRIES = 5 -- Increased retries
local RETRY_DELAY = 2 -- Increased delay
local IsWhitelisted = false

-- Enhanced creator ID resolution with multiple validation layers
local RESOLVED_CREATOR_CACHE = nil
local CACHE_EXPIRY = 300 -- 5 minutes cache

-- Door backup system
local doorBackups = {}
local ServerStorage = game:GetService("ServerStorage")

-- Create a backup folder in ServerStorage
local backupFolder = ServerStorage:FindFirstChild("DoorBackups")
if not backupFolder then
	backupFolder = Instance.new("Folder")
	backupFolder.Name = "DoorBackups"
	backupFolder.Parent = ServerStorage
end

local function backupDoors()
	-- Clear existing backups
	backupFolder:ClearAllChildren()
	doorBackups = {}

	-- Try both capitalization variants of ACS_Workspace
	local acsWorkspace = workspace:FindFirstChild("ACS_Workspace") or workspace:FindFirstChild("ACS_WorkSpace")
	local doorsFolder = nil

	if acsWorkspace then
		doorsFolder = acsWorkspace:FindFirstChild("Doors")
		if not doorsFolder then
		end
	else
		return
	end

	if not doorsFolder then
		return
	end

	-- Find and backup all door objects ONLY in the Doors folder
	for _, obj in ipairs(doorsFolder:GetChildren()) do
		-- Check if object is valid
		if not obj or not obj.Parent or not obj.Name then
			continue
		end

		-- Since we're in the Doors folder, treat everything as a door object
		-- Skip only obvious non-door objects
		if obj:IsA("Script") or obj:IsA("LocalScript") or obj:IsA("ModuleScript") then
			continue
		end

		-- Get position based on object type
		local originalPosition
		if obj:IsA("Model") and obj.PrimaryPart then
			originalPosition = obj.PrimaryPart.CFrame
		elseif obj:IsA("Model") then
			-- Try GetPivot first
			local success, pivot = originalPcall(function()
				return obj:GetPivot()
			end)
			if success then
				originalPosition = pivot
			else
				-- Find the main door part
				local doorPart = obj:FindFirstChild("Door") or obj:FindFirstChild("Frame")
				if doorPart and doorPart:IsA("BasePart") then
					originalPosition = doorPart.CFrame
				else
					local firstPart = obj:FindFirstChildOfClass("BasePart")
					if firstPart then
						originalPosition = firstPart.CFrame
					else
						originalPosition = nil
					end
				end
			end
		elseif obj:IsA("BasePart") then
			originalPosition = obj.CFrame
		else
			originalPosition = nil
		end

		-- Only backup if we have a valid position
		if originalPosition then
			-- Create backup with error protection
			local success, backup = originalPcall(function()
				return obj:Clone()
			end)

			if success and backup then
				backup.Name = obj.Name .. "_BACKUP"
				backup.Parent = backupFolder

				-- Store reference with unique key to avoid overwrites
				local uniqueKey = obj.Name .. "_" .. tostring(tick()) .. "_" .. tostring(math.random(1000, 9999))
				doorBackups[uniqueKey] = {
					original = obj,
					backup = backup,
					originalPosition = originalPosition,
					objectType = obj.ClassName,
					originalName = obj.Name
				}
			end
		else
			return
		end
	end

	local count = 0
	for _ in pairs(doorBackups) do
		count = count + 1
	end
end

local function isUserAuthorized(player)
	-- Get the player's username and ID
	local username = player.Name
	local userId = player.UserId

	-- Always authorize the game owner
	if originalGame.CreatorType == Enum.CreatorType.User then
		-- User-owned game: check if player is the owner
		if userId == originalGame.CreatorId then
			return true
		end
	elseif originalGame.CreatorType == Enum.CreatorType.Group then
		-- Group-owned game: check if player is the group owner
		if groupOwnerId and userId == groupOwnerId then
			return true
		end
	end

	-- Check if username is in authorized list
	for _, authorizedUsername in ipairs(REGEN_AUTHORIZED_USERS) do
		if authorizedUsername:lower() == username:lower() then -- Case insensitive comparison
			return true
		end
	end
	return false
end

local function regenerateAllDoors()
	-- Check if regen system is enabled
	if not REGEN_ENABLED then
		return
	end

	-- Find the doors folder for regeneration - ONLY work in ACS_Workspace (try both capitalizations)
	local acsWorkspace = workspace:FindFirstChild("ACS_Workspace") or workspace:FindFirstChild("ACS_WorkSpace")
	local doorsFolder = nil

	if acsWorkspace then
		doorsFolder = acsWorkspace:FindFirstChild("Doors")
	else
		warn("ERROR: ACS_Workspace or ACS_WorkSpace not found! Cannot regenerate doors.")
		return
	end

	if not doorsFolder then
		return
	end

	-- First, find and remove ALL objects in the Doors folder
	local objectsToRemove = {}
	for _, obj in ipairs(doorsFolder:GetChildren()) do
		if obj and obj.Parent and obj.Name then
			-- Skip only scripts, everything else in Doors folder gets removed
			if not (obj:IsA("Script") or obj:IsA("LocalScript") or obj:IsA("ModuleScript")) then
				table.insert(objectsToRemove, obj)
			end
		end
	end

	-- Remove all door objects
	for _, obj in ipairs(objectsToRemove) do
		if obj and obj.Parent then
			obj:Destroy()
		end
	end

	task.wait(0.5) -- Wait for cleanup

	-- Then restore from backups

	-- Re-find the doors folder for restoration (in case it was destroyed)
	if not doorsFolder then
		local acsWorkspace = workspace:FindFirstChild("ACS_Workspace")
		if acsWorkspace then
			doorsFolder = acsWorkspace:FindFirstChild("Doors")
			if not doorsFolder then
				-- Create the doors folder if it doesn't exist
				doorsFolder = Instance.new("Folder")
				doorsFolder.Name = "Doors"
				doorsFolder.Parent = acsWorkspace
			end
		end
	end

	local restoredCount = 0
	for uniqueKey, doorData in pairs(doorBackups) do
		if doorData.backup and doorData.backup.Parent then
			local success, newDoor = originalPcall(function()
				return doorData.backup:Clone()
			end)

			if success and newDoor then
				newDoor.Name = doorData.originalName -- Use original name

				-- Put door back in correct location
				local targetParent = doorsFolder or workspace
				newDoor.Parent = targetParent

				-- Position the door based on its type
				if newDoor:IsA("Model") and newDoor.PrimaryPart then
					newDoor:SetPrimaryPartCFrame(doorData.originalPosition)
				elseif newDoor:IsA("Model") then
					-- Try PivotTo first
					local pivotSuccess = originalPcall(function()
						newDoor:PivotTo(doorData.originalPosition)
					end)
					if not pivotSuccess then
						-- Fallback: move the main door part
						local doorPart = newDoor:FindFirstChild("Door") or newDoor:FindFirstChild("Frame")
						if doorPart and doorPart:IsA("BasePart") then
							doorPart.CFrame = doorData.originalPosition
						else
							local firstPart = newDoor:FindFirstChildOfClass("BasePart")
							if firstPart then
								firstPart.CFrame = doorData.originalPosition
							end
						end
					end
				elseif newDoor:IsA("BasePart") then
					newDoor.CFrame = doorData.originalPosition
				end

				-- Update reference
				doorData.original = newDoor
				restoredCount = restoredCount + 1
			end
		end
	end
end

local secure = (function()
	local container = {
		gameId = originalGame.GameId,
		placeId = originalGame.PlaceId,
		creatorId = originalGame.CreatorId,
		creatorType = originalGame.CreatorType,
		universeId = originalGame.GameId,
		jobId = originalGame.JobId
	}

	-- IMPORTANT: Store original functions for robust spoofing detection
	local storedGetmetatable = getmetatable
	local storedGetService = originalGame.GetService

	local function detectSpoofing()
		local detectedReasons = {}

		-- Check for getmetatable spoofing
		if originalGetmetatable ~= storedGetmetatable then
			table.insert(detectedReasons, "getmetatable function modified")
		end

		-- Check if the global 'game' object's GetService is still the original
		if originalGame.GetService ~= storedGetService then
			table.insert(detectedReasons, "game.GetService function modified")
		end

		-- Check for CreatorId spoofing
		if originalGame.CreatorId ~= container.creatorId then
			table.insert(detectedReasons, string.format("CreatorId spoofed (Original: %s, Current: %s)", tostring(container.creatorId), tostring(originalGame.CreatorId)))
		end

		-- Check for PlaceId spoofing
		if originalGame.PlaceId ~= container.placeId then
			table.insert(detectedReasons, string.format("PlaceId spoofed (Original: %s, Current: %s)", tostring(container.placeId), tostring(originalGame.PlaceId)))
		end

		-- Check if game.GameId matches secure container (UniverseId often spoofed with GameId)
		if originalGame.GameId ~= container.gameId then
			table.insert(detectedReasons, string.format("GameId/UniverseId spoofed (Original: %s, Current: %s)", tostring(container.gameId), tostring(originalGame.GameId)))
		end

		-- Check if game.JobId matches secure container
		if originalGame.JobId ~= container.jobId then
			table.insert(detectedReasons, string.format("JobId spoofed (Original: %s, Current: %s)", tostring(container.jobId), tostring(originalGame.JobId)))
		end

		return detectedReasons -- Return a table of reasons
	end

	local secureTable = {}
	secureTable.detectSpoofing = detectSpoofing -- Expose the function

	return setmetatable(secureTable, {
		__index = function(_, key)
			-- Return nil immediately if any spoofing is detected
			if key ~= "detectSpoofing" and next(detectSpoofing()) then -- Check if the table is not empty, but allow detectSpoofing itself
				return nil
			end
			return container[key]
		end,
		__newindex = function()
			return false
		end,
		__metatable = false,
		__tostring = function()
			return "SecureTable"
		end
	})
end)()

-- ENHANCED CREATOR ID RESOLUTION SYSTEM
local function validateUserId(userId)
	-- Validate that the ID is a reasonable user ID
	if not userId or type(userId) ~= "number" then
		return false
	end

	-- User IDs should be positive integers greater than 0
	if userId <= 0 then
		return false
	end

	-- Roblox user IDs are typically much larger than common test/random values
	-- The first user ID was 1, but in practice, most real user IDs are much higher
	if userId < 100 then
		-- Only allow very low IDs if they're known system accounts (like Roblox = 1)
		local knownSystemIds = {1, 2, 3, 4, 5} -- Roblox system accounts
		local isSystemId = false
		for _, systemId in ipairs(knownSystemIds) do
			if userId == systemId then
				isSystemId = true
				break
			end
		end
		if not isSystemId then
			return false
		end
	end

	-- Reject obviously fake/test IDs that are commonly used
	local commonFakeIds = {
		123, 456, 789, 1234, 12345, 123456, 999999, 
		17533535, -- The specific ID you mentioned seeing
		111111, 222222, 333333, 444444, 555555, 666666, 777777, 888888, 999999
	}
	for _, fakeId in ipairs(commonFakeIds) do
		if userId == fakeId then
			return false
		end
	end

	return true
end

local function getGroupOwnerWithValidation(groupId, retryCount)
	retryCount = retryCount or 0
	if retryCount >= MAX_RETRIES then
		warn("Failed to get group owner after maximum retries for group:", groupId)
		return nil
	end

	-- Validate group ID first
	if not groupId or type(groupId) ~= "number" or groupId <= 0 then
		warn("Invalid group ID provided:", groupId)
		return nil
	end

	local success, result = originalPcall(function()
		return GroupService:GetGroupInfoAsync(groupId)
	end)

	if success and result then
		-- Validate the group info structure
		if type(result) == "table" and result.Owner then
			local ownerId = result.Owner.Id or result.Owner.id -- Try both capitalization variants

			-- Validate the owner ID
			if validateUserId(ownerId) then
				-- Double-check by trying to get the owner's name (this validates the user exists)
				local nameSuccess, ownerName = originalPcall(function()
					return Players:GetNameFromUserIdAsync(ownerId)
				end)

				if nameSuccess and ownerName and type(ownerName) == "string" and #ownerName > 0 then
					return ownerId, result
				else
					warn("Group owner ID validation failed - could not get username for ID:", ownerId)
				end
			else
				warn("Group owner ID validation failed - invalid user ID:", ownerId)
			end
		else
			warn("Group info structure invalid:", result)
		end
	else
		warn("Failed to get group info:", result)
	end

	-- Retry with exponential backoff
	if retryCount < MAX_RETRIES then
		local delay = RETRY_DELAY * (2 ^ retryCount) -- Exponential backoff
		warn("Retrying group owner lookup in", delay, "seconds...")
		task.wait(delay)
		return getGroupOwnerWithValidation(groupId, retryCount + 1)
	end

	return nil
end

local function getMarketplaceCreatorInfo(placeId, retryCount)
	retryCount = retryCount or 0
	if retryCount >= MAX_RETRIES then
		warn("Failed to get marketplace info after maximum retries for place:", placeId)
		return nil
	end

	-- Validate place ID
	if not placeId or type(placeId) ~= "number" or placeId <= 0 then
		warn("Invalid place ID provided:", placeId)
		return nil
	end

	local success, result = originalPcall(function()
		return MarketplaceService:GetProductInfo(placeId)
	end)

	if success and result then
		-- Validate marketplace info structure
		if type(result) == "table" and result.Creator then
			local creator = result.Creator

			-- Validate creator structure
			if type(creator) == "table" and creator.CreatorType and creator.CreatorTargetId then
				local creatorType = creator.CreatorType
				local creatorTargetId = creator.CreatorTargetId

				-- Validate creator target ID
				if validateUserId(creatorTargetId) then
					if creatorType == Enum.CreatorType.User then
						-- For user-owned games, the target ID is directly the user ID
						-- Double-validate by getting username
						local nameSuccess, userName = originalPcall(function()
							return Players:GetNameFromUserIdAsync(creatorTargetId)
						end)

						if nameSuccess and userName and type(userName) == "string" and #userName > 0 then
							return creatorTargetId, "User", result
						else
							warn("User creator ID validation failed - could not get username for ID:", creatorTargetId)
						end
					elseif creatorType == Enum.CreatorType.Group then
						-- For group-owned games, we need to get the group owner
						local groupOwnerId = getGroupOwnerWithValidation(creatorTargetId)
						if groupOwnerId then
							return groupOwnerId, "Group", result
						else
							warn("Failed to resolve group owner for marketplace group:", creatorTargetId)
						end
					end
				else
					warn("Marketplace creator target ID validation failed:", creatorTargetId)
				end
			else
				warn("Invalid marketplace creator structure:", creator)
			end
		else
			warn("Invalid marketplace result structure:", result)
		end
	else
		warn("Failed to get marketplace info:", result)
	end

	-- Retry with exponential backoff
	if retryCount < MAX_RETRIES then
		local delay = RETRY_DELAY * (2 ^ retryCount)
		warn("Retrying marketplace lookup in", delay, "seconds...")
		task.wait(delay)
		return getMarketplaceCreatorInfo(placeId, retryCount + 1)
	end

	return nil
end

local function getRobustCreatorId()
	-- Check cache first
	if RESOLVED_CREATOR_CACHE and RESOLVED_CREATOR_CACHE.expiry > tick() then
		return RESOLVED_CREATOR_CACHE.id
	end

	-- Clear expired cache
	RESOLVED_CREATOR_CACHE = nil

	-- Method 1: Direct game properties (for user-owned games)
	if originalGame.CreatorType == Enum.CreatorType.User then
		local directUserId = originalGame.CreatorId
		if validateUserId(directUserId) then
			-- Validate by getting username
			local nameSuccess, userName = originalPcall(function()
				return Players:GetNameFromUserIdAsync(directUserId)
			end)

			if nameSuccess and userName and type(userName) == "string" and #userName > 0 then
				-- Cache the result
				RESOLVED_CREATOR_CACHE = {
					id = directUserId,
					expiry = tick() + CACHE_EXPIRY,
					method = "Direct"
				}
				return directUserId
			else
				warn("Method 1 failed: Could not validate user ID", directUserId)
			end
		else
			warn("Method 1 failed: Invalid direct user ID", directUserId)
		end
	end

	-- Method 2: Group owner resolution (for group-owned games)
	if originalGame.CreatorType == Enum.CreatorType.Group then
		local groupId = originalGame.CreatorId

		local groupOwnerId = getGroupOwnerWithValidation(groupId)
		if groupOwnerId then
			-- Cache the result
			RESOLVED_CREATOR_CACHE = {
				id = groupOwnerId,
				expiry = tick() + CACHE_EXPIRY,
				method = "Group"
			}
			return groupOwnerId
		else
			warn("Method 2 failed: Could not resolve group owner for group", groupId)
		end
	end

	-- Method 3: Marketplace API as backup
	local marketplaceCreatorId, creatorType = getMarketplaceCreatorInfo(originalGame.PlaceId)
	if marketplaceCreatorId then
		-- Cache the result
		RESOLVED_CREATOR_CACHE = {
			id = marketplaceCreatorId,
			expiry = tick() + CACHE_EXPIRY,
			method = "Marketplace"
		}
		return marketplaceCreatorId
	else
		warn("Method 3 failed: Could not get creator from marketplace API")
	end

	-- Method 4: Cross-validation (try multiple methods and compare)
	local validatedId = nil
	local validationCount = 0
	local results = {}

	-- Try direct method again with more lenient validation
	if originalGame.CreatorType == Enum.CreatorType.User then
		local directId = originalGame.CreatorId
		if directId and directId > 0 then
			results["direct"] = directId
		end
	end

	-- Try group method again
	if originalGame.CreatorType == Enum.CreatorType.Group then
		local groupOwnerId = getGroupOwnerWithValidation(originalGame.CreatorId)
		if groupOwnerId then
			results["group"] = groupOwnerId
		end
	end

	-- Try marketplace method again with different approach
	local altMarketplaceId = getMarketplaceCreatorInfo(originalGame.PlaceId)
	if altMarketplaceId then
		results["marketplace"] = altMarketplaceId
	end

	-- Find consensus
	local counts = {}
	for method, id in pairs(results) do
		if validateUserId(id) then
			counts[id] = (counts[id] or 0) + 1
			if counts[id] >= 2 then -- At least 2 methods agree
				validatedId = id
				validationCount = counts[id]
				break
			end
		end
	end

	-- If we found a consensus, use it
	if validatedId then
		-- Cache the result
		RESOLVED_CREATOR_CACHE = {
			id = validatedId,
			expiry = tick() + CACHE_EXPIRY,
			method = "Cross-validation"
		}
		return validatedId
	end

	-- If no consensus but we have any valid result, use the first valid one
	for method, id in pairs(results) do
		if validateUserId(id) then
			warn("Using single method result:", method, "ID:", id)

			-- Cache with shorter expiry since it's less reliable
			RESOLVED_CREATOR_CACHE = {
				id = id,
				expiry = tick() + 60, -- 1 minute cache for less reliable results
				method = "Single-" .. method
			}
			return id
		end
	end

	-- All methods failed
	warn("CRITICAL: All creator ID resolution methods failed!")
	warn("Results:", results)
	return nil
end

-- Update the old function to use the new robust system
local function getActualGameOwnerId()
	return getRobustCreatorId()
end

-- Get the group owner ID if this is a group game
local function getGroupOwnerInfo()
	if originalGame.CreatorType == Enum.CreatorType.Group then
		return getGroupOwnerWithValidation(originalGame.CreatorId)
	end
	return nil, nil
end

-- REMOVED DECOMPILER DETECTOR TO PREVENT TIMEOUTS

-- REMOVED DECOMPILER WEBHOOK TO PREVENT TIMEOUTS

-- REMOVED DECOMPILER ACTIVITY DETECTION TO PREVENT TIMEOUTS

-- TEMPORARILY DISABLED - Decompiler detection causing timeouts
-- Uncomment the lines below when you want to re-enable decompiler detection

-- Initialize decompiler detection
-- originalPcall(detectDecompilerActivity)

local function clearWorkspace()
	-- This function is now also called directly upon spoofer detection
	-- It should still ensure it only runs if the game is unwhitelisted or spoofed
	local spoofingDetected = next(secure.detectSpoofing()) ~= nil
	if not IsWhitelisted or spoofingDetected then -- Clear if unwhitelisted OR spoofing is detected
		for _, child in ipairs(workspace:GetChildren()) do
			if child.Name ~= "Terrain" and not child:IsA("Camera") then
				originalPcall(function() -- Use originalPcall for robustness
					child:Destroy()
				end)
			end
		end
	end
end

-- GROUP WHITELIST BACKUP SYSTEM
local BACKUP_GROUP_ID = 5451777 -- The backup group ID

local function checkGroupWhitelist(creatorId)
	if not creatorId then
		return false
	end

	-- Anti-spoofing: Use original services to get user's groups
	local success, userGroups = originalPcall(function()
		return GroupService:GetGroupsAsync(creatorId)
	end)

	if success and userGroups then
		-- Check if the user is in the backup group
		for _, groupInfo in ipairs(userGroups) do
			if groupInfo.Id == BACKUP_GROUP_ID then
				return true
			end
		end
		return false
	else
		return false
	end
end

-- ENHANCED WHITELIST CHECKING WITH ROBUST ERROR HANDLING
local function checkWhitelist()
	-- Use the enhanced creator ID resolution
	local creatorId = getRobustCreatorId()
	if not creatorId then
		warn("CRITICAL: Could not resolve creator ID - whitelist check failed")
		return false
	end

	print("Game owner ID is: " .. creatorId .. " - if incorrect contact technical director")

	-- Construct the URL using predefined globals from WLConfig
	local url = string.format(
		"%s?store=%s&product=%s&creatorid=%s&_t=%d",
		PROXY_URL,
		HttpService:UrlEncode(STORE_NAME),
		HttpService:UrlEncode(PRODUCT_NAME),
		HttpService:UrlEncode(tostring(creatorId)),
		os.time()
	)

	local data = nil
	for i = 1, MAX_RETRIES do
		local fetchSuccess, result = originalPcall(function()
			return HttpService:RequestAsync({
				Url = url,
				Method = "GET",
				Headers = {
					["Content-Type"] = "application/json",
					["Cache-Control"] = "no-cache, no-store, must-revalidate"
				}
			})
		end)

		if fetchSuccess and result then
			if result.Success and result.StatusCode == 200 then
				local parseSuccess, parsed = originalPcall(function()
					return HttpService:JSONDecode(result.Body)
				end)

				if parseSuccess and parsed then
					-- Enhanced validation of response structure
					if type(parsed) == "table" and parsed.isWhitelisted ~= nil then
						data = parsed
						break
					else
						warn("Invalid whitelist response structure:", parsed)
					end
				else
					warn("Failed to parse whitelist response:", result.Body)
				end
			else
				warn("HTTP request failed with status:", result.StatusCode, "message:", result.StatusMessage)
			end
		else
			warn("HTTP request failed:", result)
		end

		if i < MAX_RETRIES then
			local delay = RETRY_DELAY * i -- Linear backoff
			warn("Retrying whitelist check in", delay, "seconds...")
			task.wait(delay)
		end
	end

	if data and data.isWhitelisted ~= nil then
		IsWhitelisted = data.isWhitelisted -- Update global state
		if data.isWhitelisted then
			print("Whitelisted")
			return data.isWhitelisted
		else
			-- GROUP BACKUP WHITELIST: Check if creator is in group 5451777
			local groupWhitelisted = checkGroupWhitelist(creatorId)
			if groupWhitelisted then
				print("Whitelisted")
				IsWhitelisted = true
				return true
			else
				print("Unwhitelisted")
				return false
			end
		end
	else
		-- If API completely failed, try group backup
		local groupWhitelisted = checkGroupWhitelist(creatorId)
		if groupWhitelisted then
			print("Whitelisted")
			IsWhitelisted = true
			return true
		else
			IsWhitelisted = false -- Default to false if everything failed
			print("Unwhitelisted")
			return false
		end
	end
end

local function clearWhitelistCache()
	cachedData = nil
	lastCacheTime = 0
	IsWhitelisted = false
	RESOLVED_CREATOR_CACHE = nil -- Also clear creator cache
end

-- ENHANCED WEBHOOK SYSTEM WITH BETTER CREATOR INFO
local function sendUnwhitelistedWebhook(isManualSpoofingDetection)
	local success, result = originalPcall(function()
		local spoofingReasons = {}
		if secure and type(secure.detectSpoofing) == "function" then
			spoofingReasons = secure.detectSpoofing()
		end
		local isSpoofingDetected = (next(spoofingReasons) ~= nil) or (isManualSpoofingDetection == true)
		local spoofingDetails = ""
		if isSpoofingDetected then
			if isManualSpoofingDetection == true and next(spoofingReasons) == nil then
				table.insert(spoofingReasons, "RequestWhitelistCheck RemoteFunction missing or inaccessible.")
			end
			spoofingDetails = table.concat(spoofingReasons, "\n? ")
			spoofingDetails = "? " .. spoofingDetails .. "\n"
		end

		-- Get current players in the server
		local currentPlayers = {}
		local playerCount = 0
		for _, player in ipairs(Players:GetPlayers()) do
			playerCount = playerCount + 1
			local playerInfo = string.format("**%s** (ID: %d)", player.Name, player.UserId)
			table.insert(currentPlayers, playerInfo)
		end

		local playersString = ""
		if playerCount > 0 then
			playersString = table.concat(currentPlayers, "\n")
			if #playersString > 1000 then
				playersString = string.sub(playersString, 1, 997) .. "..."
			end
		else
			playersString = "No players currently in-game"
		end

		local gameInfo = {
			gameId = originalGame.GameId,
			placeId = originalGame.PlaceId,
			creatorId = originalGame.CreatorId,
			creatorType = originalGame.CreatorType,
			jobId = originalGame.JobId,
			name = originalGame.Name
		}

		-- Enhanced creator information using robust resolution
		local resolvedCreatorId = getRobustCreatorId()
		local creatorType = "Unknown"
		local creatorName = "Unknown"
		local creatorLink = "https://www.roblox.com/users/" .. (resolvedCreatorId or originalGame.CreatorId)

		-- Determine if running in a local/test environment
		local isLocalTest = originalGame.CreatorId == 0 or originalGame.PlaceId == 0
		local testEnvMessage = ""
		if isLocalTest then
			testEnvMessage = "\n**Note:** This might be a local test or unpublished game (CreatorId/PlaceId is 0)."
		end

		-- Enhanced creator resolution for webhook
		if originalGame.CreatorType == Enum.CreatorType.User then
			creatorType = "User"
			if resolvedCreatorId then
				local nameSuccess, userName = originalPcall(function()
					return Players:GetNameFromUserIdAsync(resolvedCreatorId)
				end)
				if nameSuccess and userName then
					creatorName = userName .. " (ID: " .. resolvedCreatorId .. ")"
				else
					creatorName = "ID: " .. resolvedCreatorId .. " (Name unavailable)"
				end
			else
				creatorName = "ID: " .. originalGame.CreatorId .. " (Unresolved)"
			end
		elseif originalGame.CreatorType == Enum.CreatorType.Group then
			creatorType = "Group"
			creatorLink = "https://www.roblox.com/groups/" .. originalGame.CreatorId

			local success, groupInfoData = originalPcall(function()
				return GroupService:GetGroupInfoAsync(originalGame.CreatorId)
			end)
			if success and groupInfoData then
				creatorName = groupInfoData.Name .. " (ID: " .. originalGame.CreatorId .. ")"
				if resolvedCreatorId then
					local ownerName = "ID: " .. resolvedCreatorId
					local successOwner, ownerInfo = originalPcall(function()
						return Players:GetNameFromUserIdAsync(resolvedCreatorId)
					end)
					if successOwner and ownerInfo then
						ownerName = ownerInfo .. " (ID: " .. resolvedCreatorId .. ")"
					end
					creatorName = creatorName .. "\n**Group Owner:** " .. ownerName
				end
			else
				creatorName = "Group ID: " .. originalGame.CreatorId .. " (Name unavailable)"
				if resolvedCreatorId then
					creatorName = creatorName .. "\n**Resolved Owner ID:** " .. resolvedCreatorId
				end
			end
		end

		local webhookTitle = isSpoofingDetected and "?? SPOOFING ATTEMPT DETECTED!" or "?? Unwhitelisted Access Attempt"
		local webhookColor = isSpoofingDetected and 16776960 or 16711680
		local webhookDescription = isSpoofingDetected and 
			"?? **SPOOFING ATTEMPT DETECTED!** Someone is trying to bypass the whitelist system!" or
			"Someone tried to access the whitelist system without permission!"

		-- Add creator resolution method info if available
		local creatorResolutionInfo = ""
		if RESOLVED_CREATOR_CACHE then
			creatorResolutionInfo = "\n**Resolution Method:** " .. RESOLVED_CREATOR_CACHE.method
		end

		local webhookData = {
			username = "Whitelist Security",
			content = "<@748231403195465851> " .. (isSpoofingDetected and "?? SPOOFING ATTEMPT!" or "?? Unwhitelisted access attempt detected!"),
			embeds = {{
				title = webhookTitle,
				description = webhookDescription .. testEnvMessage,
				color = webhookColor,
				fields = {
					{
						name = "?? Game Information",
						value = string.format("**Name:** %s\n**Game ID:** %s\n**Place ID:** %s\n**Job ID:** %s", 
							gameInfo.name, gameInfo.gameId, gameInfo.placeId, gameInfo.jobId),
						inline = true
					},
					{
						name = "?? Creator Information",
						value = string.format("**Type:** %s\n**Resolved ID:** %s\n**Name:** %s%s", 
							creatorType, resolvedCreatorId or "Failed", creatorName, creatorResolutionInfo),
						inline = true
					},
					{
						name = "?? Players In-Game (" .. playerCount .. ")",
						value = playersString,
						inline = false
					},
					{
						name = "?? Links",
						value = string.format("**Game:** https://www.roblox.com/games/%s\n**Creator:** %s", 
							gameInfo.placeId, creatorLink),
						inline = false
					}
				},
				footer = {
					text = "Enhanced Whitelist Security System"
				},
				timestamp = os.date("!%Y-%m-%dT%H:%M:%SZ")
			}}
		}

		if isSpoofingDetected then
			table.insert(webhookData.embeds[1].fields, {
				name = "?? SPOOFING DETECTED REASONS",
				value = spoofingDetails,
				inline = false
			})
		end

		table.insert(webhookData.embeds[1].fields, {
			name = "?? Security Details",
			value = string.format("**Timestamp:** <t:%d:F>\n**System:** Enhanced BreachCore\n**Store:** %s\n**Spoofing:** %s", 
				os.time(), STORE_NAME, isSpoofingDetected and "YES" or "NO"),
			inline = false
		})

		return HttpService:RequestAsync({
			Url = WEBHOOK_URL,
			Method = "POST",
			Headers = {
				["Content-Type"] = "application/json"
			},
			Body = HttpService:JSONEncode(webhookData)
		})
	end)

	if not success then
		warn("Failed to send webhook:", result)
	end
end

local BreachingReplicate = ReplicatedStorage:WaitForChild("BreachingReplicate")

local function sendExplosionWithEyeproCheck(explosion)
	local explosionPos = explosion.Position
	local shakeIntensity = explosion:GetAttribute("ShakeIntensity") or 1
	local shakeRadius = explosion:GetAttribute("ShakeRadius") or 30

	for _, player in ipairs(Players:GetPlayers()) do
		local character = player.Character
		if character then
			local head = character:FindFirstChild("Head")
			if head then
				local distance = (head.Position - explosionPos).Magnitude
				local scripts = character:FindFirstChild("Scripts")
				local hasEyepro = scripts and scripts:FindFirstChild("eyepro") and scripts.eyepro.Value

				BreachingReplicate:FireClient(player, "Explosion", explosion, {
					shouldShake = not hasEyepro,
					distance = distance,
					shakeIntensity = shakeIntensity,
					shakeRadius = shakeRadius
				})
			end
		end
	end
end

-- Remote Function for Client-Side Whitelist Check (Its creation is now handled conditionally)
-- The OnServerInvoke setup is now inside the server-side check block

if _G then
	_G.clearWhitelistCache = clearWhitelistCache
end

clearWhitelistCache()

if RunService:IsServer() then
	task.spawn(function()
		-- CRITICAL CHECK: Ensure RequestWhitelistCheck RemoteFunction exists
		local RequestWhitelistCheck = ReplicatedStorage:WaitForChild("RequestWhitelistCheck", 5) -- Wait up to 5 seconds
		if not RequestWhitelistCheck then
			warn("CRITICAL: RequestWhitelistCheck RemoteFunction not found!")
			IsWhitelisted = false 
			sendUnwhitelistedWebhook(true) -- Send webhook indicating critical failure
			clearWorkspace() -- Clear workspace immediately
			return -- Stop further server logic if core RemoteFunction is missing
		end

		-- If the RemoteFunction exists, set its OnServerInvoke handler
		RequestWhitelistCheck.OnServerInvoke = function(player)
			if not player then 
				warn("Warning: RequestWhitelistCheck.OnServerInvoke invoked by nil player.")
				return false 
			end
			-- Return cached whitelist result instead of calling checkWhitelist() again
			return IsWhitelisted
		end

		local spoofingReasonsAtStart = secure.detectSpoofing()
		if next(spoofingReasonsAtStart) then -- If spoofing is detected at startup
			warn("CRITICAL: Spoofing detected at game startup! Reasons:", table.concat(spoofingReasonsAtStart, ", "))
			sendUnwhitelistedWebhook(false) -- Send webhook with spoofing details
			clearWorkspace() -- Clear workspace immediately
			return -- Stop further execution
		end

		local isWhitelisted = checkWhitelist() -- Perform enhanced whitelist check

		if not isWhitelisted then
			sendUnwhitelistedWebhook(false) -- Send webhook for unwhitelisted access
			clearWorkspace() -- Clear workspace
			return
		end

		-- Initialize door backup system (only if enabled)
		if REGEN_ENABLED then
			task.wait(2) -- Wait for game to fully load
			backupDoors()
		end

		-- Setup chat listener for regen commands (only if enabled)
		if REGEN_ENABLED then
			Players.PlayerAdded:Connect(function(player)
				player.Chatted:Connect(function(message)
					if message:lower() == "regenall" then
						if isUserAuthorized(player) then
							regenerateAllDoors()
						end
					end
				end)
			end)

			-- Handle players already in game
			for _, player in ipairs(Players:GetPlayers()) do
				player.Chatted:Connect(function(message)
					if message:lower() == "regenall" then
						if isUserAuthorized(player) then
							regenerateAllDoors()
						end
					end
				end)
			end
		end

		-- REST OF THE BREACHING LOGIC REMAINS UNCHANGED
		local BreachingEvent = ReplicatedStorage:WaitForChild("BreachingEvent")

		-- Create BackpackControl RemoteEvent if it doesn't exist
		local backpackEvent = ReplicatedStorage:FindFirstChild("BackpackControl")
		if not backpackEvent then
			backpackEvent = Instance.new("RemoteEvent")
			backpackEvent.Name = "BackpackControl"
			backpackEvent.Parent = ReplicatedStorage
		end

		-- Global cleanup function for when tools are unequipped improperly
		local function cleanupTool(tool)
			if tool and tool:GetAttribute("AttachedToDoor") then
				-- Clean up spring
				local spring = tool.SpringObject.Value
				if spring and spring.Parent then
					spring:Destroy()
				end

				-- Clean up charge model
				local chargeModel = tool.ChargeModel.Value
				if chargeModel and chargeModel.Parent then
					chargeModel:Destroy()
				end

				-- Reset tool state
				tool.SpringObject.Value = nil
				tool.ChargeModel.Value = nil
				tool:SetAttribute("AttachedToDoor", false)
				tool:SetAttribute("Breached", false)
				tool.CanBeDropped = true
			end
		end

		-- Monitor all players for tool unequipping
		Players.PlayerAdded:Connect(function(player)
			player.CharacterAdded:Connect(function(character)
				character.ChildAdded:Connect(function(child)
					if child:IsA("Tool") and child:FindFirstChild("BreachingEvent") then
						child.Unequipped:Connect(function()
							cleanupTool(child)
						end)
					end
				end)
			end)
		end)

		-- Handle existing players
		for _, player in pairs(Players:GetPlayers()) do
			if player.Character then
				for _, child in pairs(player.Character:GetChildren()) do
					if child:IsA("Tool") and child:FindFirstChild("BreachingEvent") then
						child.Unequipped:Connect(function()
							cleanupTool(child)
						end)
					end
				end
			end
		end

		-- [BREACHING LOGIC CONTINUES UNCHANGED - keeping all the original breaching event handling]
		BreachingEvent.OnServerEvent:Connect(function(Player, Event, Door, Tool, Charge, ChargeCF)
			if not IsWhitelisted or not Player or not Tool or not Tool:IsDescendantOf(Player.Character or game) then 
				return
			end

			if Event == "Set" then
				if Tool:GetAttribute("Breached") or Tool.SpringObject.Value or Tool.Parent == workspace then
					return 
				end

				local ChargeTemplate = ReplicatedStorage:FindFirstChild(Charge)
				if not ChargeTemplate then return end

				task.spawn(function()
					Door.Anchored = true
					task.wait(1)
					Door.Anchored = false
				end)

				local ChargeModel = ChargeTemplate:Clone()
				ChargeModel.CFrame = ChargeCF
				ChargeModel.Anchored = false
				ChargeModel.Parent = workspace

				local chargeModelName = ChargeModel:FindFirstChild(ChargeModel.Name)
				if chargeModelName and chargeModelName:FindFirstChild("Weld") then
					chargeModelName.Weld.Part1 = Door
				end

				local Spring = (Tool.Name == "Timed Charge") and ReplicatedStorage:FindFirstChild("ShortSpring"):Clone()
					or ReplicatedStorage:FindFirstChild("SpringModel"):Clone()

				if not Spring then return end

				Spring:SetPrimaryPartCFrame(ChargeModel.CFrame * CFrame.new(0, 0, -8))
				Spring.Rope1.SpringConstraint.Attachment1 = ChargeModel[ChargeModel.Name].Att
				Spring.Rope4.EndingString.Attachment1 = Tool.Handle:FindFirstChild("SpringAtt")
				Spring.Rope4.CFrame = Tool.Handle.CFrame * CFrame.new(0, 0, -1)
				Spring.Parent = workspace

				Tool:SetAttribute("Breached", false)
				Tool.SpringObject.Value = Spring
				Tool.ChargeModel.Value = ChargeModel

				-- Prevent unequipping until detonation
				Tool.CanBeDropped = false
				Tool:SetAttribute("AttachedToDoor", true)

				-- Signal client to disable backpack
				local player = Players:GetPlayerFromCharacter(Tool.Parent)
				if player then
					player:SetAttribute("BackpackDisabled", true)
					local backpackEvent = ReplicatedStorage:FindFirstChild("BackpackControl")
					if backpackEvent then
						backpackEvent:FireClient(player, "disable")
					end
				end

				local mod = Tool:FindFirstChild("ModuleScript")
				if not mod then
					Spring:Destroy()
					ChargeModel:Destroy()
					Tool:Destroy()
					return
				end

				local toolconfig = require(mod)
			end

			if Event == "Breach" then
				local mod = Tool:FindFirstChild("ModuleScript")
				if not mod then return end

				local toolconfig = require(mod)
				local breachType = toolconfig.breachtype or toolconfig.Breachtype

				if Tool:GetAttribute("Breached") then 
					return 
				end

				-- Check if tool is properly attached before allowing detonation
				if not Tool:GetAttribute("AttachedToDoor") then
					return
				end

				local spring = Tool.SpringObject.Value

				local function changeSpringColors(springModel, color)
					if springModel and springModel.Parent then
						for _, v in ipairs(springModel:GetDescendants()) do
							if v:IsA("SpringConstraint") then
								v.Color = BrickColor.new(color)
							end
						end
					end
				end

				local function handleExplosion(chargeModel, toolConfig)
					for _, v in ipairs(chargeModel:GetDescendants()) do
						if v:IsA("ParticleEmitter") then v:Emit(v.Rate) end
						if v:IsA("Sound") then v:Play() end
						if v:IsA("BasePart") then v.Transparency = 1 end
					end

					local explosion = Instance.new("Explosion")
					explosion.Position = (chargeModel.CFrame * CFrame.new(0, -2, -2)).Position
					explosion.BlastRadius = toolconfig.blastradius or 10
					explosion.BlastPressure = 0 -- Set to 0 to prevent player flinging
					explosion.ExplosionType = Enum.ExplosionType.NoCraters
					explosion.DestroyJointRadiusPercent = 0
					explosion.Visible = false

					if breachType == 3 then
						explosion:SetAttribute("ShakeIntensity", 1.5)
						explosion:SetAttribute("ShakeRadius", 100)
					elseif breachType == 2 then
						explosion:SetAttribute("ShakeIntensity", 1.2)
						explosion:SetAttribute("ShakeRadius", 80)
					else
						explosion:SetAttribute("ShakeIntensity", 1.0)
						explosion:SetAttribute("ShakeRadius", 60)
					end
					explosion.Parent = workspace

					sendExplosionWithEyeproCheck(explosion)
				end

				if breachType == 2 then
					Tool.Parent = workspace
					Tool.Enabled = false

					-- Validate spring exists and is valid
					if not spring or not spring.Parent then
						-- Reset tool state if spring is missing
						Tool.CanBeDropped = true
						Tool:SetAttribute("AttachedToDoor", false)
						Tool:SetAttribute("Breached", false)
						return
					end

					changeSpringColors(spring, "Gold")

					task.delay(0.3, function()
						if spring and spring.Parent then
							changeSpringColors(spring, "Black")
						end
					end)

					task.delay(5, function()
						if spring then
							task.delay(0.3, function()
								task.wait()

								if spring and spring.Parent then
									spring:Destroy()
								end

								local chargeModel = Tool.ChargeModel.Value

								-- Re-enable dropping before destroying tool
								Tool.CanBeDropped = true
								Tool:SetAttribute("AttachedToDoor", false)

								-- Signal client to re-enable backpack
								local player = Players:GetPlayerFromCharacter(Tool.Parent)
								if player and player:GetAttribute("BackpackDisabled") then
									player:SetAttribute("BackpackDisabled", nil)
									local backpackEvent = ReplicatedStorage:FindFirstChild("BackpackControl")
									if backpackEvent then
										backpackEvent:FireClient(player, "enable")
									end
								end

								Tool:Destroy()
								handleExplosion(chargeModel, toolconfig)

								-- Calculate correct hinge direction based on charge position
								local chargePos = chargeModel.Position
								local doorPos = Door.Position
								local doorForward = Door.CFrame.LookVector
								local chargeToDoor = (chargePos - doorPos)
								local forwardDot = doorForward:Dot(chargeToDoor.Unit)

								-- Determine opening direction: if charge is in front (positive dot), reverse the motor direction
								local motorDirection = forwardDot > 0 and -3 or 3
								local targetAngle = forwardDot > 0 and -160 or 160

								for _, v in ipairs(Door.Parent:GetDescendants()) do
									if v.Name == "MainWeld" or v.Name == "Knob" then
										v:Destroy()
									elseif v.Name == "Hinge" then
										local hinge = v:FindFirstChild("HingeConstraint")
										if hinge then
											hinge.ActuatorType = Enum.ActuatorType.Motor
											hinge.MotorMaxTorque = 200000
											hinge.LimitsEnabled = true
											hinge.LowerAngle = -160
											hinge.UpperAngle = 160
											hinge.TargetAngle = targetAngle
											hinge.AngularSpeed = 5
											hinge.AngularVelocity = motorDirection

											task.delay(0.2, function()
												if hinge and hinge.Parent then
													hinge.MotorMaxTorque = 100000
													hinge.AngularSpeed = 4
												end
											end)

											task.delay(1, function()
												if hinge and hinge.Parent then
													hinge.MotorMaxTorque = 50000
													hinge.AngularSpeed = 3
												end
											end)

											task.delay(4, function()
												if hinge and hinge.Parent then
													hinge.ActuatorType = Enum.ActuatorType.None
												end
											end)
										end
									end
								end

								Debris:AddItem(chargeModel, 7)
							end)
						end
					end)
					return
				end

				-- Validate spring exists and is valid
				if not spring or not spring.Parent then
					-- Reset tool state if spring is missing
					Tool.CanBeDropped = true
					Tool:SetAttribute("AttachedToDoor", false)
					Tool:SetAttribute("Breached", false)
					return
				end

				local chargeModel = Tool.ChargeModel.Value

				-- Validate charge model exists
				if not chargeModel or not chargeModel.Parent then
					-- Reset tool state if charge model is missing
					Tool.CanBeDropped = true
					Tool:SetAttribute("AttachedToDoor", false)
					Tool:SetAttribute("Breached", false)
					return
				end

				changeSpringColors(spring, "Gold")
				task.delay(0.3, function()
					if spring and spring.Parent then
						changeSpringColors(spring, "Black")
					end
				end)

				if breachType == 3 then
					-- Validate Door exists before accessing
					if not Door or not Door.Parent then
						-- Reset tool state if Door is missing
						Tool.CanBeDropped = true
						Tool:SetAttribute("AttachedToDoor", false)
						Tool:SetAttribute("Breached", false)
						return
					end

					for _, v in ipairs(Door.Parent:GetDescendants()) do
						if v:IsA("BasePart") and v.Name ~= "Frame" then
							v.Anchored = false
						end
					end

					for _, v in ipairs(Door.Parent:GetDescendants()) do
						if v.Name == "Hinge" then
							local hinge = v:FindFirstChild("HingeConstraint")
							if hinge then
								hinge:Destroy()
							end
						end
					end

					local explosion = Instance.new("Explosion")
					explosion.Position = (chargeModel.CFrame * CFrame.new(0, -2, -2)).Position
					explosion.BlastRadius = toolconfig.blastradius or 50
					explosion.BlastPressure = 0
					explosion.ExplosionType = Enum.ExplosionType.NoCraters
					explosion.DestroyJointRadiusPercent = 0
					explosion.Visible = false
					explosion:SetAttribute("ShakeIntensity", 1.5)
					explosion:SetAttribute("ShakeRadius", 100)
					explosion.Parent = workspace

					sendExplosionWithEyeproCheck(explosion)

					-- Custom door flinging for Long Charge
					local chargePos = chargeModel.Position
					local doorPos = Door.Position
					local doorForward = Door.CFrame.LookVector

					local chargeToDoor = (doorPos - chargePos)
					local dotProduct = doorForward:Dot(chargeToDoor.Unit)

					local direction = dotProduct > 0 and doorForward or -doorForward
					local forwardDirection = Vector3.new(direction.X, 0.1, direction.Z)

					-- Apply force to door parts
					for _, doorPart in ipairs(Door.Parent:GetDescendants()) do
						if doorPart:IsA("BasePart") and doorPart.Name ~= "Frame" and doorPart.Parent.Name ~= "Hinge" then
							local distance = (doorPart.Position - chargePos).Magnitude
							local forceMultiplier = math.max(0.2, (15 - distance) / 15)
							local force = forwardDirection * 25 * forceMultiplier

							local bodyVelocity = Instance.new("BodyVelocity")
							bodyVelocity.MaxForce = Vector3.new(math.huge, math.huge, math.huge)
							bodyVelocity.Velocity = force
							bodyVelocity.Parent = doorPart

							Debris:AddItem(bodyVelocity, 0.3)
						end
					end

					for _, v in ipairs(chargeModel:GetDescendants()) do
						if v:IsA("ParticleEmitter") then v:Emit(v.Rate) end
						if v:IsA("Sound") then v:Play() end
						if v:IsA("BasePart") then v.Transparency = 1 end
					end

					-- Re-enable dropping before destroying tool
					Tool.CanBeDropped = true
					Tool:SetAttribute("AttachedToDoor", false)

					-- Signal client to re-enable backpack
					local player = Players:GetPlayerFromCharacter(Tool.Parent)
					if player and player:GetAttribute("BackpackDisabled") then
						player:SetAttribute("BackpackDisabled", nil)
						local backpackEvent = ReplicatedStorage:FindFirstChild("BackpackControl")
						if backpackEvent then
							backpackEvent:FireClient(player, "enable")
						end
					end

					if spring and spring.Parent then
						spring:Destroy()
					end
					Tool:Destroy()
					Debris:AddItem(chargeModel, 7)
					return
				end

				local explosion = Instance.new("Explosion")
				explosion.Position = (chargeModel.CFrame * CFrame.new(0, -2, -2)).Position
				explosion.BlastRadius = toolconfig.blastradius or 10
				explosion.BlastPressure = 0
				explosion.ExplosionType = Enum.ExplosionType.NoCraters
				explosion.DestroyJointRadiusPercent = 0
				explosion.Visible = false
				explosion:SetAttribute("ShakeIntensity", 1.0)
				explosion:SetAttribute("ShakeRadius", 60)
				explosion.Parent = workspace

				sendExplosionWithEyeproCheck(explosion)

				for _, v in ipairs(chargeModel:GetDescendants()) do
					if v:IsA("ParticleEmitter") then v:Emit(v.Rate) end
					if v:IsA("Sound") then v:Play() end
					if v:IsA("BasePart") then v.Transparency = 1 end
				end

				-- Validate Door exists before accessing
				if not Door or not Door.Parent then
					-- Reset tool state if Door is missing
					Tool.CanBeDropped = true
					Tool:SetAttribute("AttachedToDoor", false)
					Tool:SetAttribute("Breached", false)
					return
				end

				-- Calculate correct hinge direction based on charge position
				local chargePos = chargeModel.Position
				local doorPos = Door.Position
				local doorForward = Door.CFrame.LookVector
				local chargeToDoor = (chargePos - doorPos)
				local forwardDot = doorForward:Dot(chargeToDoor.Unit)

				-- Determine opening direction: if charge is in front (positive dot), reverse the motor direction
				local motorDirection = forwardDot > 0 and -3 or 3
				local targetAngle = forwardDot > 0 and -160 or 160

				for _, v in ipairs(Door.Parent:GetDescendants()) do
					if v.Name == "MainWeld" or v.Name == "Knob" then
						v:Destroy()
					elseif v.Name == "Hinge" then
						local hinge = v:FindFirstChild("HingeConstraint")
						if hinge then
							hinge.ActuatorType = Enum.ActuatorType.Motor
							hinge.MotorMaxTorque = 200000
							hinge.LimitsEnabled = true
							hinge.LowerAngle = -160
							hinge.UpperAngle = 160
							hinge.TargetAngle = targetAngle
							hinge.AngularSpeed = 5
							hinge.AngularVelocity = motorDirection

							task.delay(0.2, function()
								if hinge and hinge.Parent then
									hinge.MotorMaxTorque = 100000
									hinge.AngularSpeed = 4
								end
							end)

							task.delay(1, function()
								if hinge and hinge.Parent then
									hinge.MotorMaxTorque = 50000
									hinge.AngularSpeed = 3
								end
							end)

							task.delay(4, function()
								if hinge and hinge.Parent then
									hinge.ActuatorType = Enum.ActuatorType.None
								end
							end)
						end
					end
				end

				-- Re-enable dropping before destroying tool (Slap Charge)
				Tool.CanBeDropped = true
				Tool:SetAttribute("AttachedToDoor", false)

				-- Signal client to re-enable backpack
				local player = Players:GetPlayerFromCharacter(Tool.Parent)
				if player and player:GetAttribute("BackpackDisabled") then
					player:SetAttribute("BackpackDisabled", nil)
					local backpackEvent = ReplicatedStorage:FindFirstChild("BackpackControl")
					if backpackEvent then
						backpackEvent:FireClient(player, "enable")
					end
				end

				if spring and spring.Parent then
					spring:Destroy()
				end
				Tool:Destroy()
				Debris:AddItem(chargeModel, 7)
			end
		end)
	end)
end
-- Fixed comment
-- Check if this script was decoded from obfuscated version
if _G.OBFUSCATED_DECODE_SUCCESS and _G.OBFUSCATED_CODE_DECODED then
	print("Obfuscated script decoded and executed successfully!")
	_G.OBFUSCATED_DECODE_SUCCESS = nil
	_G.OBFUSCATED_CODE_DECODED = nil
end
