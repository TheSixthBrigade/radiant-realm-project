# Bot Dashboard Feature Specification

## Overview
The Bot Dashboard provides Vectabase users with a web interface to manage their Discord whitelist bot across multiple servers. It enables server configuration, product management, and command permission customization.

## User Stories

### US-1: Server Management
**As a** Vectabase user with the bot in my Discord server  
**I want to** view and manage all my Discord servers from a single dashboard  
**So that** I can configure the whitelist bot for each server

#### Acceptance Criteria
- [ ] User can see a list of all Discord servers where they've added the bot
- [ ] Each server displays: name, icon, member count, product count, configuration status
- [ ] User can select a server to view/edit its configuration
- [ ] Empty state shown when no servers are linked with option to add bot
- [ ] Refresh button to reload server data

### US-2: Product Configuration
**As a** server owner  
**I want to** add, edit, and remove products for my whitelist bot  
**So that** users can redeem license keys for my Roblox products

#### Acceptance Criteria
- [ ] User can add a new product with: name, Roblox Group ID, Payhip API Key
- [ ] Optional fields: Discord Role ID (assigned on redemption), custom redemption message
- [ ] User can view all products for a server with whitelisted user counts
- [ ] User can delete products (with confirmation)
- [ ] Validation: required fields must be filled before saving

### US-3: Command Permissions
**As a** server owner  
**I want to** configure which roles can use admin commands  
**So that** I can delegate bot management to trusted staff

#### Acceptance Criteria
- [ ] User can view all configurable admin commands
- [ ] User can enable/disable individual commands per server
- [ ] User can set "Require Admin" flag for each command
- [ ] User can specify allowed role IDs when "Require Admin" is unchecked
- [ ] Owner-only commands (obfuscate, whitelist, fullsecurity, bulksecurity, securefolder) are clearly marked and cannot be configured
- [ ] Permissions are saved to database and enforced by the bot

### US-4: Bot Invite Flow
**As a** new user  
**I want to** easily add the bot to my Discord server  
**So that** I can start using the whitelist system

#### Acceptance Criteria
- [ ] "Add Bot to Server" button visible in header
- [ ] Button opens Discord OAuth2 authorization page with correct permissions
- [ ] Bot invite URL: `https://discord.com/oauth2/authorize?client_id=1452697259463540816&permissions=402688000&integration_type=0&scope=bot`

### US-5: Dashboard Statistics
**As a** server owner  
**I want to** see key metrics for my server  
**So that** I can understand my whitelist usage

#### Acceptance Criteria
- [ ] Display: member count, product count, total whitelisted users
- [ ] Quick access to permissions configuration
- [ ] All data is real (fetched from Supabase, no fake data)

## Technical Requirements

### Database Schema
The following tables are required in Supabase:

1. **discord_servers** - Stores server configurations
   - Links Discord guild to Vectabase user account
   - Tracks guild metadata (name, icon, member count)

2. **bot_products** - Products per server
   - Stores Roblox Group ID, Payhip API Key
   - Optional role assignment and custom messages

3. **bot_whitelisted_users** - Whitelisted users per product
   - Tracks Discord ID, Roblox ID, license key, redemption time

4. **bot_command_permissions** - Command permissions per server
   - Configurable allowed roles and admin requirements

### Row Level Security (RLS)
- Users can only view/edit servers they own (linked via user_id)
- Products and permissions inherit access from parent server
- Whitelisted users are read-only for server owners

### Bot Integration
- Bot middleware (`adminCheck.js`) must check Supabase permissions
- `requireCommandPermission()` async function for permission checks
- Owner-only commands use `isBotOwner()` check (ID: 1431385498214994040)

## Design Requirements

### Brand Guidelines
- Primary color: Green (HSL 152 69% 40%)
- Secondary: Grey tones
- NO blue colors
- Brand name: **Vectabase** (correct spelling)

### UI Components
- Animated gradient background (green/grey tones)
- Glass-morphism cards with backdrop blur
- Consistent with existing Vectabase design system

## Current Status

### Completed
- [x] Dashboard UI implementation (`DeveloperBotDashboard.tsx`)
- [x] Database migration file (`20260104130000_bot_dashboard.sql`)
- [x] Bot middleware with permission checking (`adminCheck.js`)
- [x] Admin commands updated to use `requireCommandPermission`

### Pending
- [ ] **Apply database migration to Supabase** - Tables don't exist yet
- [ ] Add graceful error handling when tables don't exist
- [ ] Test end-to-end flow with real Discord server

## Migration Instructions

To apply the database migration:
1. Go to Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/20260104130000_bot_dashboard.sql`
3. Run the SQL to create tables and policies

## Related Files
- #[[file:src/pages/DeveloperBotDashboard.tsx]]
- #[[file:supabase/migrations/20260104130000_bot_dashboard.sql]]
- #[[file:whitelsiting service/src/bot/middleware/adminCheck.js]]
