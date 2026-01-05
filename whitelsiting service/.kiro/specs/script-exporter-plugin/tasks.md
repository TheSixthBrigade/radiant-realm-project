# Implementation Plan

- [x] 1. Create Local Export Server




  - [ ] 1.1 Set up Express.js server with basic structure
    - Create `src/export-server/index.js` with Express app
    - Configure server to listen on port 3847, localhost only


    - Add CORS headers for Roblox HttpService compatibility
    - _Requirements: 6.1_
  - [ ] 1.2 Implement path sanitization utility
    - Create `src/export-server/utils/pathSanitizer.js`
    - Replace invalid Windows filename characters (\ / : * ? " < > |) with underscores
    - Convert dot-separated paths to underscore-separated filenames


    - _Requirements: 3.1, 3.2_
  - [ ]* 1.3 Write property test for path sanitization
    - **Property 4: Invalid character replacement**
    - **Validates: Requirements 3.2**
  - [ ] 1.4 Implement file writer utility
    - Create `src/export-server/utils/fileWriter.js`


    - Write script content to E:\ directory
    - Handle file overwrite
    - _Requirements: 1.2, 3.3_
  - [ ]* 1.5 Write property test for export round-trip
    - **Property 1: Export request round-trip**
    - **Validates: Requirements 1.1, 1.2**
  - [ ] 1.6 Implement POST /export endpoint
    - Validate request body (name, path, source required)
    - Sanitize path and generate filename


    - Write file and return success response
    - _Requirements: 1.1, 1.2, 6.2, 6.3_
  - [ ]* 1.7 Write property test for valid request response
    - **Property 5: Valid request response format**




    - **Validates: Requirements 6.2**
  - [ ]* 1.8 Write property test for invalid request handling
    - **Property 6: Invalid request error handling**


    - **Validates: Requirements 6.3**
  - [ ] 1.9 Implement GET /health endpoint
    - Return simple JSON status for plugin connectivity check


    - _Requirements: 4.1_



- [ ] 2. Checkpoint - Ensure all server tests pass
  - Ensure all tests pass, ask the user if questions arise.



- [ ] 3. Create Roblox Studio Plugin
  - [ ] 3.1 Create plugin structure and widget UI
    - Create `roblox-plugin/ScriptExporter.lua`


    - Set up DockWidgetPluginGui with basic layout
    - Add status indicator, script list, and export button
    - _Requirements: 2.1, 4.2_





  - [ ] 3.2 Implement selection manager
    - Listen to Selection.SelectionChanged event
    - Filter for Script, LocalScript, ModuleScript instances
    - Recursively find scripts in selected folders
    - _Requirements: 2.2, 2.3, 2.4, 5.1_
  - [ ] 3.3 Implement path generator
    - Generate full hierarchy path for each script
    - Format as dot-separated string (e.g., "ServerScriptService.Folder.Script")
    - _Requirements: 3.1, 5.2_
  - [ ] 3.4 Implement export handler
    - Use HttpService to POST to localhost:3847/export
    - Handle success and error responses
    - Update UI with export results
    - _Requirements: 1.1, 1.3, 1.4_
  - [ ] 3.5 Implement server status checker
    - Ping /health endpoint on plugin open
    - Show warning if server unreachable
    - Poll status periodically
    - _Requirements: 4.1, 4.2, 4.3_
  - [ ] 3.6 Add folder export support
    - Detect when folder is selected
    - Recursively collect all scripts
    - Show count of scripts found
    - _Requirements: 5.1, 5.2, 5.3_

- [ ] 4. Create startup script for server
  - [ ] 4.1 Add npm script to start export server
    - Add "export-server" script to package.json
    - Create simple startup with console logging
    - _Requirements: 6.1, 6.4_

- [ ] 5. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
