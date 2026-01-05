# Requirements Document

## Introduction

A Roblox Studio plugin that allows users to select scripts from the Explorer and export them to a local directory (E:\) on their machine. The system consists of two components: a Roblox Studio plugin that provides the UI and script selection, and a local Node.js server that receives the script content via HTTP and saves it to the filesystem.

## Glossary

- **Script_Exporter_Plugin**: The Roblox Studio plugin that provides UI for selecting and exporting scripts
- **Local_Export_Server**: A Node.js HTTP server running on localhost that receives script data and writes files to disk
- **Script_Instance**: A Roblox Script, LocalScript, or ModuleScript object in the game hierarchy
- **Export_Request**: An HTTP POST request containing script name and source code
- **Export_Directory**: The target directory where scripts are saved (default: E:\)

## Requirements

### Requirement 1

**User Story:** As a developer, I want to select scripts in Roblox Studio and export them to my local drive, so that I can back up or process my code outside of Studio.

#### Acceptance Criteria

1. WHEN the user clicks the export button with scripts selected THEN the Script_Exporter_Plugin SHALL send each script's name and source to the Local_Export_Server
2. WHEN the Local_Export_Server receives an export request THEN the Local_Export_Server SHALL save the script content as a .lua file in the Export_Directory
3. WHEN multiple scripts are selected THEN the Script_Exporter_Plugin SHALL export all selected scripts in sequence
4. WHEN a script is exported successfully THEN the Script_Exporter_Plugin SHALL display a success message with the file path

### Requirement 2

**User Story:** As a developer, I want the plugin to show me which scripts are selected, so that I can verify what will be exported before exporting.

#### Acceptance Criteria

1. WHEN the user opens the plugin widget THEN the Script_Exporter_Plugin SHALL display a list of currently selected Script_Instances
2. WHEN the selection changes in Explorer THEN the Script_Exporter_Plugin SHALL update the displayed list within 500 milliseconds
3. WHEN no scripts are selected THEN the Script_Exporter_Plugin SHALL display a message indicating no scripts are selected
4. WHEN non-script instances are selected THEN the Script_Exporter_Plugin SHALL filter and display only Script_Instances

### Requirement 3

**User Story:** As a developer, I want the server to preserve the script hierarchy in the file names, so that I can identify where each script came from.

#### Acceptance Criteria

1. WHEN a script is exported THEN the Local_Export_Server SHALL include the full path in the filename (e.g., ServerScriptService_MainScript.lua)
2. WHEN the filename contains invalid filesystem characters THEN the Local_Export_Server SHALL replace invalid characters with underscores
3. WHEN a file with the same name exists THEN the Local_Export_Server SHALL overwrite the existing file

### Requirement 4

**User Story:** As a developer, I want to know if the local server is running before I try to export, so that I can start it if needed.

#### Acceptance Criteria

1. WHEN the plugin widget opens THEN the Script_Exporter_Plugin SHALL check if the Local_Export_Server is reachable
2. WHEN the Local_Export_Server is not reachable THEN the Script_Exporter_Plugin SHALL display a warning message with instructions
3. WHEN the Local_Export_Server becomes reachable THEN the Script_Exporter_Plugin SHALL update the status indicator to show connected

### Requirement 5

**User Story:** As a developer, I want to export all scripts in a folder at once, so that I can quickly back up entire sections of my game.

#### Acceptance Criteria

1. WHEN a folder is selected THEN the Script_Exporter_Plugin SHALL recursively find all Script_Instances within that folder
2. WHEN exporting a folder THEN the Script_Exporter_Plugin SHALL preserve the folder structure in the exported filenames
3. WHEN a folder contains no scripts THEN the Script_Exporter_Plugin SHALL display a message indicating no scripts were found

### Requirement 6

**User Story:** As a developer, I want the local server to be simple to start and stop, so that I can run it only when needed.

#### Acceptance Criteria

1. WHEN the Local_Export_Server starts THEN the Local_Export_Server SHALL listen on port 3847 on localhost only
2. WHEN the Local_Export_Server receives a valid export request THEN the Local_Export_Server SHALL respond with a JSON success message
3. WHEN the Local_Export_Server receives an invalid request THEN the Local_Export_Server SHALL respond with a JSON error message and appropriate HTTP status code
4. WHEN the Local_Export_Server writes a file THEN the Local_Export_Server SHALL log the operation to the console
