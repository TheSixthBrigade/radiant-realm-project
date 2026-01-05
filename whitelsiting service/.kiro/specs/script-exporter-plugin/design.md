# Design Document: Script Exporter Plugin

## Overview

This feature provides a two-component system for exporting Roblox scripts to the local filesystem:

1. **Roblox Studio Plugin** - A Lua plugin that runs inside Roblox Studio, providing a widget UI for selecting scripts and triggering exports via HTTP requests to localhost.

2. **Local Export Server** - A Node.js HTTP server that runs on the developer's machine, receives script data from the plugin, and writes .lua files to the specified directory (E:\).

The plugin communicates with the server using Roblox's HttpService, which allows HTTP requests to localhost when HttpService is enabled in Studio.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Roblox Studio                            │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Script Exporter Plugin                    │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐  │  │
│  │  │ Selection   │  │   Export    │  │   Status     │  │  │
│  │  │ Manager     │  │   Handler   │  │   Checker    │  │  │
│  │  └─────────────┘  └─────────────┘  └──────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
│                           │                                  │
│                           │ HTTP POST (localhost:3847)       │
└───────────────────────────│─────────────────────────────────┘
                            │
                            ▼
┌───────────────────────────────────────────────────────────┐
│                  Local Export Server                       │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────────────┐  │
│  │   HTTP      │  │   File      │  │   Path           │  │
│  │   Handler   │──│   Writer    │──│   Sanitizer      │  │
│  └─────────────┘  └─────────────┘  └──────────────────┘  │
│                           │                                │
│                           ▼                                │
│                    E:\ (filesystem)                        │
└───────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### Roblox Studio Plugin Components

#### SelectionManager
Handles script selection from Roblox Studio's Explorer.

```lua
-- Listens to Selection.SelectionChanged
-- Filters for Script, LocalScript, ModuleScript
-- Recursively finds scripts in selected folders

function getSelectedScripts(): {Instance}
function getScriptPath(script: Instance): string
function isScriptInstance(instance: Instance): boolean
```

#### ExportHandler
Manages HTTP communication with the local server.

```lua
-- Sends script data to localhost:3847
-- Handles responses and errors

function exportScript(name: string, path: string, source: string): boolean
function exportMultiple(scripts: {Instance}): {success: number, failed: number}
```

#### StatusChecker
Monitors connection to the local server.

```lua
-- Pings server health endpoint
-- Updates UI status indicator

function checkServerStatus(): boolean
function startStatusPolling(interval: number): void
```

### Local Export Server Components

#### HTTP Handler
Express.js routes for receiving export requests.

```javascript
// POST /export - Receives script data
// GET /health - Returns server status
// GET /status - Returns detailed status with export directory

interface ExportRequest {
  name: string;      // Script name
  path: string;      // Full hierarchy path (e.g., "ServerScriptService.Folder.Script")
  source: string;    // Script source code
}

interface ExportResponse {
  success: boolean;
  filePath?: string;
  error?: string;
}
```

#### FileWriter
Handles filesystem operations.

```javascript
// Writes script content to .lua files
// Creates directories if needed

function writeScript(name: string, path: string, source: string): Promise<string>
function ensureDirectory(dir: string): Promise<void>
```

#### PathSanitizer
Sanitizes paths for filesystem compatibility.

```javascript
// Replaces invalid characters
// Generates safe filenames

function sanitizePath(path: string): string
function generateFilename(scriptPath: string): string
```

## Data Models

### Export Request (Plugin → Server)
```json
{
  "name": "MainScript",
  "path": "ServerScriptService.GameLogic.MainScript",
  "source": "-- Script content here\nprint('Hello')"
}
```

### Export Response (Server → Plugin)
```json
{
  "success": true,
  "filePath": "E:\\ServerScriptService_GameLogic_MainScript.lua"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Missing required field: source"
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Export request round-trip
*For any* valid export request containing name, path, and source, sending it to the server and reading the resulting file should return the exact same source content.
**Validates: Requirements 1.1, 1.2**

### Property 2: Script filtering correctness
*For any* list of Roblox instance class names, the filter function should return only instances where ClassName is "Script", "LocalScript", or "ModuleScript".
**Validates: Requirements 2.4**

### Property 3: Path sanitization preserves hierarchy
*For any* script path string, the sanitized filename should contain all path segments separated by underscores, with invalid characters replaced.
**Validates: Requirements 3.1, 3.2**

### Property 4: Invalid character replacement
*For any* string containing characters invalid for Windows filenames (\ / : * ? " < > |), the sanitization function should replace all such characters with underscores.
**Validates: Requirements 3.2**

### Property 5: Valid request response format
*For any* valid export request, the server response should be JSON with success=true and a non-empty filePath string.
**Validates: Requirements 6.2**

### Property 6: Invalid request error handling
*For any* request missing required fields (name, path, or source), the server should respond with success=false and a non-empty error message.
**Validates: Requirements 6.3**

## Error Handling

### Plugin Errors
- **Server unreachable**: Display warning in widget, disable export button
- **Export failed**: Show error message with details, continue with remaining scripts
- **HttpService disabled**: Show instructions to enable HttpService in game settings

### Server Errors
- **Invalid request**: Return 400 with JSON error message
- **File write failed**: Return 500 with error details
- **Directory creation failed**: Return 500 with error details

## Testing Strategy

### Property-Based Testing
Using **fast-check** for JavaScript property-based tests on the server components:

- Path sanitization properties
- Request validation properties
- Response format properties

### Unit Tests
- PathSanitizer: Test specific edge cases (empty strings, special characters)
- FileWriter: Test file creation and overwrite behavior
- HTTP routes: Test request/response handling

### Integration Tests
- Full export flow: Send request → verify file written
- Error scenarios: Invalid requests, filesystem errors

### Manual Testing
- Roblox plugin UI (requires Studio environment)
- Selection handling
- Multi-script export
