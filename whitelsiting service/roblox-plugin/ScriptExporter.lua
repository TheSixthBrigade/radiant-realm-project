--[[
	Script Exporter Plugin
	Exports selected scripts to local filesystem via HTTP server
	Can also import secured scripts back into Studio
	
	Server must be running on localhost:3847
]]

local HttpService = game:GetService("HttpService")
local Selection = game:GetService("Selection")

local SERVER_URL = "http://127.0.0.1:3847"
local SCRIPT_CLASSES = {
	Script = true,
	LocalScript = true,
	ModuleScript = true
}

-- Create plugin toolbar and button
local toolbar = plugin:CreateToolbar("Script Exporter")
local toggleButton = toolbar:CreateButton(
	"Script Exporter",
	"Export selected scripts to local drive",
	"rbxassetid://6031071053"
)

-- Create widget
local widgetInfo = DockWidgetPluginGuiInfo.new(
	Enum.InitialDockState.Float,
	false,
	false,
	300,
	450,
	200,
	350
)

local widget = plugin:CreateDockWidgetPluginGui("ScriptExporter", widgetInfo)
widget.Title = "Script Exporter"

-- UI Elements
local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(1, 0, 1, 0)
mainFrame.BackgroundColor3 = Color3.fromRGB(46, 46, 46)
mainFrame.BorderSizePixel = 0
mainFrame.Parent = widget

local layout = Instance.new("UIListLayout")
layout.SortOrder = Enum.SortOrder.LayoutOrder
layout.Padding = UDim.new(0, 8)
layout.Parent = mainFrame

local padding = Instance.new("UIPadding")
padding.PaddingTop = UDim.new(0, 10)
padding.PaddingBottom = UDim.new(0, 10)
padding.PaddingLeft = UDim.new(0, 10)
padding.PaddingRight = UDim.new(0, 10)
padding.Parent = mainFrame

-- Status indicator
local statusFrame = Instance.new("Frame")
statusFrame.Size = UDim2.new(1, 0, 0, 30)
statusFrame.BackgroundTransparency = 1
statusFrame.LayoutOrder = 1
statusFrame.Parent = mainFrame

local statusDot = Instance.new("Frame")
statusDot.Size = UDim2.new(0, 12, 0, 12)
statusDot.Position = UDim2.new(0, 0, 0.5, -6)
statusDot.BackgroundColor3 = Color3.fromRGB(255, 100, 100)
statusDot.Parent = statusFrame

local statusCorner = Instance.new("UICorner")
statusCorner.CornerRadius = UDim.new(1, 0)
statusCorner.Parent = statusDot

local statusLabel = Instance.new("TextLabel")
statusLabel.Size = UDim2.new(1, -20, 1, 0)
statusLabel.Position = UDim2.new(0, 20, 0, 0)
statusLabel.BackgroundTransparency = 1
statusLabel.Text = "Server: Disconnected"
statusLabel.TextColor3 = Color3.fromRGB(200, 200, 200)
statusLabel.TextXAlignment = Enum.TextXAlignment.Left
statusLabel.Font = Enum.Font.SourceSans
statusLabel.TextSize = 14
statusLabel.Parent = statusFrame

-- Selection info
local selectionLabel = Instance.new("TextLabel")
selectionLabel.Size = UDim2.new(1, 0, 0, 20)
selectionLabel.BackgroundTransparency = 1
selectionLabel.Text = "No scripts selected"
selectionLabel.TextColor3 = Color3.fromRGB(180, 180, 180)
selectionLabel.TextXAlignment = Enum.TextXAlignment.Left
selectionLabel.Font = Enum.Font.SourceSans
selectionLabel.TextSize = 14
selectionLabel.LayoutOrder = 2
selectionLabel.Parent = mainFrame

-- Script list
local listFrame = Instance.new("ScrollingFrame")
listFrame.Size = UDim2.new(1, 0, 1, -180)
listFrame.BackgroundColor3 = Color3.fromRGB(35, 35, 35)
listFrame.BorderSizePixel = 0
listFrame.ScrollBarThickness = 6
listFrame.LayoutOrder = 3
listFrame.Parent = mainFrame

local listCorner = Instance.new("UICorner")
listCorner.CornerRadius = UDim.new(0, 4)
listCorner.Parent = listFrame

local listLayout = Instance.new("UIListLayout")
listLayout.SortOrder = Enum.SortOrder.LayoutOrder
listLayout.Padding = UDim.new(0, 2)
listLayout.Parent = listFrame

local listPadding = Instance.new("UIPadding")
listPadding.PaddingTop = UDim.new(0, 4)
listPadding.PaddingBottom = UDim.new(0, 4)
listPadding.PaddingLeft = UDim.new(0, 4)
listPadding.PaddingRight = UDim.new(0, 4)
listPadding.Parent = listFrame

-- Export button
local exportButton = Instance.new("TextButton")
exportButton.Size = UDim2.new(1, 0, 0, 36)
exportButton.BackgroundColor3 = Color3.fromRGB(0, 120, 215)
exportButton.Text = "Export Selected"
exportButton.TextColor3 = Color3.fromRGB(255, 255, 255)
exportButton.Font = Enum.Font.SourceSansBold
exportButton.TextSize = 16
exportButton.LayoutOrder = 4
exportButton.Parent = mainFrame

local exportCorner = Instance.new("UICorner")
exportCorner.CornerRadius = UDim.new(0, 4)
exportCorner.Parent = exportButton

-- Import button
local importButton = Instance.new("TextButton")
importButton.Size = UDim2.new(1, 0, 0, 36)
importButton.BackgroundColor3 = Color3.fromRGB(50, 150, 50)
importButton.Text = "Import Secured Scripts"
importButton.TextColor3 = Color3.fromRGB(255, 255, 255)
importButton.Font = Enum.Font.SourceSansBold
importButton.TextSize = 16
importButton.LayoutOrder = 5
importButton.Parent = mainFrame

local importCorner = Instance.new("UICorner")
importCorner.CornerRadius = UDim.new(0, 4)
importCorner.Parent = importButton

-- Result label
local resultLabel = Instance.new("TextLabel")
resultLabel.Size = UDim2.new(1, 0, 0, 20)
resultLabel.BackgroundTransparency = 1
resultLabel.Text = ""
resultLabel.TextColor3 = Color3.fromRGB(100, 200, 100)
resultLabel.TextXAlignment = Enum.TextXAlignment.Left
resultLabel.Font = Enum.Font.SourceSans
resultLabel.TextSize = 12
resultLabel.LayoutOrder = 6
resultLabel.Parent = mainFrame

-- State
local serverConnected = false
local selectedScripts = {}
local exportedScriptMap = {} -- Maps script name to script instance

-- Helper: Check if instance is a script
local function isScript(instance)
	return SCRIPT_CLASSES[instance.ClassName] == true
end

-- Helper: Get full path of an instance (for display only)
local function getFullPath(instance)
	local parts = {}
	local current = instance
	while current and current ~= game do
		table.insert(parts, 1, current.Name)
		current = current.Parent
	end
	return table.concat(parts, ".")
end

-- Helper: Recursively find all scripts in an instance
local function findScriptsRecursive(instance, results)
	results = results or {}
	if isScript(instance) then
		table.insert(results, instance)
	end
	for _, child in ipairs(instance:GetChildren()) do
		findScriptsRecursive(child, results)
	end
	return results
end

-- Update script list UI
local function updateScriptList()
	-- Clear existing items
	for _, child in ipairs(listFrame:GetChildren()) do
		if child:IsA("TextLabel") then
			child:Destroy()
		end
	end
	
	-- Add script items
	for i, script in ipairs(selectedScripts) do
		local item = Instance.new("TextLabel")
		item.Size = UDim2.new(1, -8, 0, 20)
		item.BackgroundTransparency = 1
		item.Text = script.Name
		item.TextColor3 = Color3.fromRGB(200, 200, 200)
		item.TextXAlignment = Enum.TextXAlignment.Left
		item.TextTruncate = Enum.TextTruncate.AtEnd
		item.Font = Enum.Font.SourceSans
		item.TextSize = 12
		item.LayoutOrder = i
		item.Parent = listFrame
	end
	
	-- Update canvas size
	listFrame.CanvasSize = UDim2.new(0, 0, 0, #selectedScripts * 22 + 8)
	
	-- Update selection label
	if #selectedScripts == 0 then
		selectionLabel.Text = "No scripts selected"
	else
		selectionLabel.Text = string.format("%d script(s) selected", #selectedScripts)
	end
end

-- Handle selection change
local function onSelectionChanged()
	selectedScripts = {}
	
	for _, instance in ipairs(Selection:Get()) do
		if isScript(instance) then
			table.insert(selectedScripts, instance)
		else
			-- Check for scripts in folders/models
			findScriptsRecursive(instance, selectedScripts)
		end
	end
	
	-- Remove duplicates
	local seen = {}
	local unique = {}
	for _, script in ipairs(selectedScripts) do
		if not seen[script] then
			seen[script] = true
			table.insert(unique, script)
		end
	end
	selectedScripts = unique
	
	updateScriptList()
end

-- Check server status
local function checkServerStatus()
	local success, result = pcall(function()
		return HttpService:GetAsync(SERVER_URL .. "/health")
	end)
	
	if success then
		serverConnected = true
		statusDot.BackgroundColor3 = Color3.fromRGB(100, 200, 100)
		statusLabel.Text = "Server: Connected"
	else
		serverConnected = false
		statusDot.BackgroundColor3 = Color3.fromRGB(255, 100, 100)
		statusLabel.Text = "Server: Disconnected"
	end
end

-- Export a single script (uses just script name for filename)
local function exportScript(script)
	local source = script.Source
	
	local data = HttpService:JSONEncode({
		name = script.Name,
		path = script.Name, -- Just use script name, not full path
		source = source
	})
	
	local success, result = pcall(function()
		return HttpService:PostAsync(
			SERVER_URL .. "/export",
			data,
			Enum.HttpContentType.ApplicationJson
		)
	end)
	
	if success then
		local response = HttpService:JSONDecode(result)
		return response.success, response.filePath or response.error
	else
		return false, result
	end
end

-- Export all selected scripts
local function exportAll()
	if not serverConnected then
		resultLabel.Text = "Server not connected. Start the export server first."
		resultLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
		return
	end
	
	if #selectedScripts == 0 then
		resultLabel.Text = "No scripts selected"
		resultLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
		return
	end
	
	exportButton.Text = "Exporting..."
	exportButton.BackgroundColor3 = Color3.fromRGB(100, 100, 100)
	
	local successCount = 0
	local failCount = 0
	
	-- Clear and rebuild export map
	exportedScriptMap = {}
	
	for _, script in ipairs(selectedScripts) do
		local success, result = exportScript(script)
		if success then
			successCount = successCount + 1
			exportedScriptMap[script.Name] = script
		else
			failCount = failCount + 1
			warn("[ScriptExporter] Failed to export " .. script.Name .. ": " .. tostring(result))
		end
	end
	
	exportButton.Text = "Export Selected"
	exportButton.BackgroundColor3 = Color3.fromRGB(0, 120, 215)
	
	if failCount == 0 then
		resultLabel.Text = string.format("Exported %d script(s). Run /securefolder then Import.", successCount)
		resultLabel.TextColor3 = Color3.fromRGB(100, 200, 100)
	else
		resultLabel.Text = string.format("Exported %d, Failed %d", successCount, failCount)
		resultLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
	end
end

-- Roblox script source limit
local MAX_SOURCE_LENGTH = 199999

-- Import secured scripts back into Studio
local function importSecured()
	if not serverConnected then
		resultLabel.Text = "Server not connected."
		resultLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
		return
	end
	
	if next(exportedScriptMap) == nil then
		resultLabel.Text = "Export scripts first, then run /securefolder"
		resultLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
		return
	end
	
	importButton.Text = "Importing..."
	importButton.BackgroundColor3 = Color3.fromRGB(100, 100, 100)
	
	local successCount = 0
	local failCount = 0
	local skippedCount = 0
	local skippedScripts = {}
	
	for scriptName, scriptInstance in pairs(exportedScriptMap) do
		-- Request the secured file content from server
		local success, result = pcall(function()
			return HttpService:GetAsync(SERVER_URL .. "/read/" .. HttpService:UrlEncode(scriptName .. ".lua"))
		end)
		
		if success then
			local response = HttpService:JSONDecode(result)
			if response.success then
				local sourceToSet = response.source
				local sourceLength = sourceToSet and #sourceToSet or 0
				
				-- Check if it's chunked (too large)
				if response.chunked then
					-- Calculate total size
					local totalSize = 0
					for _, chunk in ipairs(response.chunks) do
						totalSize = totalSize + #chunk
					end
					
					-- Skip scripts over the limit
					skippedCount = skippedCount + 1
					table.insert(skippedScripts, scriptName .. " (" .. math.floor(totalSize/1000) .. "k chars)")
					warn("[ScriptExporter] SKIPPED " .. scriptName .. " - Too large: " .. totalSize .. " chars (limit: " .. MAX_SOURCE_LENGTH .. ")")
				elseif sourceLength > MAX_SOURCE_LENGTH then
					-- Single response but still too large
					skippedCount = skippedCount + 1
					table.insert(skippedScripts, scriptName .. " (" .. math.floor(sourceLength/1000) .. "k chars)")
					warn("[ScriptExporter] SKIPPED " .. scriptName .. " - Too large: " .. sourceLength .. " chars (limit: " .. MAX_SOURCE_LENGTH .. ")")
				else
					-- Normal sized script - import it
					scriptInstance.Source = sourceToSet
					successCount = successCount + 1
					print("[ScriptExporter] Imported: " .. scriptName .. " (" .. sourceLength .. " chars)")
				end
			else
				failCount = failCount + 1
				warn("[ScriptExporter] No secured file for: " .. scriptName)
			end
		else
			failCount = failCount + 1
			warn("[ScriptExporter] Failed to import " .. scriptName .. ": " .. tostring(result))
		end
	end
	
	importButton.Text = "Import Secured Scripts"
	importButton.BackgroundColor3 = Color3.fromRGB(50, 150, 50)
	
	-- Build result message
	if skippedCount > 0 then
		-- Print skipped scripts to output
		print("[ScriptExporter] === SKIPPED SCRIPTS (over 200k limit) ===")
		for _, name in ipairs(skippedScripts) do
			print("  - " .. name)
		end
		print("[ScriptExporter] =========================================")
		
		if successCount > 0 then
			resultLabel.Text = string.format("Imported %d, Skipped %d (too large)", successCount, skippedCount)
			resultLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
		else
			resultLabel.Text = string.format("All %d script(s) too large (>200k)", skippedCount)
			resultLabel.TextColor3 = Color3.fromRGB(255, 100, 100)
		end
	elseif failCount == 0 then
		resultLabel.Text = string.format("Imported %d secured script(s)!", successCount)
		resultLabel.TextColor3 = Color3.fromRGB(100, 200, 100)
	else
		resultLabel.Text = string.format("Imported %d, Failed %d", successCount, failCount)
		resultLabel.TextColor3 = Color3.fromRGB(255, 200, 100)
	end
	
	-- Clear the map after import
	exportedScriptMap = {}
end

-- Connect events
Selection.SelectionChanged:Connect(onSelectionChanged)
exportButton.MouseButton1Click:Connect(exportAll)
importButton.MouseButton1Click:Connect(importSecured)

toggleButton.Click:Connect(function()
	widget.Enabled = not widget.Enabled
	if widget.Enabled then
		checkServerStatus()
		onSelectionChanged()
	end
end)

-- Initial setup
onSelectionChanged()

-- Status polling
spawn(function()
	while true do
		if widget.Enabled then
			checkServerStatus()
		end
		wait(5)
	end
end)

print("[ScriptExporter] Plugin loaded. Click the toolbar button to open.")
