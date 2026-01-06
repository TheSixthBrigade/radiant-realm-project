# Bot Dashboard - Technical Design

## Architecture Overview

The Bot Dashboard integrates the existing Discord whitelist bot with a web-based management interface, using Supabase as the shared data layer.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Dashboard │────▶│    Supabase     │◀────│  Discord Bot    │
│  (React + TS)   │     │   (Postgres)    │     │   (Node.js)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Database Schema

### Table: discord_servers
Stores Discord server configurations linked to Vectabase users.

```sql
CREATE TABLE discord_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  guild_id TEXT NOT NULL UNIQUE,
  guild_name TEXT NOT NULL,
  guild_icon TEXT,
  member_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: bot_products
Products configured per server for whitelist redemption.

```sql
CREATE TABLE bot_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES discord_servers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  roblox_group_id TEXT NOT NULL,
  payhip_api_key TEXT NOT NULL,
  discord_role_id TEXT,
  custom_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: bot_whitelisted_users
Tracks users who have redeemed license keys.

```sql
CREATE TABLE bot_whitelisted_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID REFERENCES bot_products(id) ON DELETE CASCADE,
  discord_id TEXT NOT NULL,
  roblox_id TEXT NOT NULL,
  license_key TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Table: bot_command_permissions
Configurable command permissions per server.

```sql
CREATE TABLE bot_command_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  server_id UUID REFERENCES discord_servers(id) ON DELETE CASCADE,
  command_name TEXT NOT NULL,
  enabled BOOLEAN DEFAULT true,
  require_admin BOOLEAN DEFAULT true,
  allowed_role_ids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(server_id, command_name)
);
```

## Row Level Security (RLS)

### discord_servers
- SELECT: `user_id = auth.uid()`
- INSERT: `user_id = auth.uid()`
- UPDATE: `user_id = auth.uid()`
- DELETE: `user_id = auth.uid()`

### bot_products
- All operations: Server must belong to current user
- `EXISTS (SELECT 1 FROM discord_servers WHERE id = server_id AND user_id = auth.uid())`

### bot_whitelisted_users
- SELECT only: Product's server must belong to current user
- No INSERT/UPDATE/DELETE from dashboard (bot manages this)

### bot_command_permissions
- All operations: Server must belong to current user

## Component Architecture

### DeveloperBotDashboard.tsx
Main dashboard page with server selection and management tabs.

```typescript
interface DashboardState {
  servers: DiscordServer[];
  selectedServer: DiscordServer | null;
  activeTab: 'overview' | 'products' | 'permissions';
  loading: boolean;
}
```

### Key Components
1. **ServerSelector** - Dropdown to select active server
2. **ServerOverview** - Stats cards (members, products, whitelisted)
3. **ProductManager** - CRUD for bot products
4. **PermissionEditor** - Command permission configuration

## Bot Integration

### Permission Check Flow
```
1. User runs command in Discord
2. Bot middleware calls requireCommandPermission(guildId, commandName, member)
3. Middleware queries Supabase for permission config
4. If require_admin: check member.permissions.has('Administrator')
5. If allowed_role_ids: check member.roles.cache.some(r => allowed_role_ids.includes(r.id))
6. Return true/false to allow/deny command
```

### Owner-Only Commands
These commands bypass permission checks and require bot owner:
- `obfuscate`
- `whitelist`
- `fullsecurity`
- `bulksecurity`
- `securefolder`

## API Endpoints

All data access is via Supabase client with RLS:

```typescript
// Fetch user's servers
const { data: servers } = await supabase
  .from('discord_servers')
  .select('*, bot_products(count)')
  .eq('user_id', user.id);

// Fetch products for server
const { data: products } = await supabase
  .from('bot_products')
  .select('*, bot_whitelisted_users(count)')
  .eq('server_id', serverId);

// Update command permission
await supabase
  .from('bot_command_permissions')
  .upsert({
    server_id: serverId,
    command_name: 'redeem',
    enabled: true,
    require_admin: false,
    allowed_role_ids: ['123456789']
  });
```

## Error Handling

### Table Not Found
When tables don't exist yet, show helpful message:
```typescript
if (error?.code === '42P01') {
  return <MigrationRequired />;
}
```

### No Servers Linked
Empty state with "Add Bot to Server" CTA.

## Security Considerations

1. **RLS enforced** - Users can only access their own data
2. **Service role for bot** - Bot uses service role key for cross-user operations
3. **No sensitive data exposed** - Payhip API keys stored but not returned to frontend
4. **Rate limiting** - Supabase handles rate limiting

## Dependencies

- `@supabase/supabase-js` - Database client
- `discord.js` - Bot framework (existing)
- React Query - Data fetching and caching
- Existing UI components (Card, Button, Input, etc.)
