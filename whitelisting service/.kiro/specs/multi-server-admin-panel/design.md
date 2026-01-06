# Design Document: Multi-Server Admin Panel

## Overview

This feature extends the Discord Roblox Whitelist Bot to support multiple Discord servers with per-server product configurations. Each Discord server can have multiple products configured, where each product has its own Payhip license API key and Roblox group ID. The bot uses a master Roblox Open Cloud API key that has access to multiple groups.

## Architecture

```mermaid
graph TB
    subgraph Discord
        U[User] --> RC[/redeem Command]
        A[Admin] --> AC[Admin Commands]
    end
    
    subgraph Bot
        RC --> PS[Product Selector]
        AC --> PM[Product Manager]
        PS --> KM[Key Manager]
        PM --> SC[Server Config Service]
        KM --> SC
        SC --> DB[(Server Config DB)]
    end
    
    subgraph External APIs
        KM --> PA[Payhip API]
        KM --> RA[Roblox API]
    end
```

## Components and Interfaces

### 1. ServerConfigService

Manages server-specific product configurations.

```javascript
class ServerConfigService {
  // Get all products for a server
  async getProducts(guildId: string): Promise<Product[]>
  
  // Get a specific product by name
  async getProduct(guildId: string, productName: string): Promise<Product | null>
  
  // Add a new product to a server
  async addProduct(guildId: string, product: ProductInput): Promise<Result>
  
  // Remove a product from a server
  async removeProduct(guildId: string, productName: string): Promise<Result>
  
  // Update an existing product
  async updateProduct(guildId: string, productName: string, updates: Partial<ProductInput>): Promise<Result>
  
  // Validate product input
  validateProductInput(input: ProductInput): ValidationResult
}
```

### 2. Admin Commands

New slash commands for product management:

- `/admin-product-add` - Add a new product
  - `name` (required): Product display name
  - `payhip_key` (required): Payhip license API key (prod_sk_*)
  - `group_id` (required): Roblox group ID

- `/admin-product-remove` - Remove a product
  - `name` (required): Product name to remove

- `/admin-product-list` - List all products for the server

- `/admin-product-edit` - Edit an existing product
  - `name` (required): Product name to edit
  - `new_name` (optional): New product name
  - `payhip_key` (optional): New Payhip license API key
  - `group_id` (optional): New Roblox group ID

### 3. Updated Redeem Command

The `/redeem` command will be updated to:
1. Check how many products are configured for the server
2. If one product: use it automatically
3. If multiple products: show a select menu for product selection
4. If no products: show error message

### 4. Permission Middleware

```javascript
function requireAdmin(interaction) {
  return interaction.member.permissions.has(PermissionFlagsBits.Administrator);
}
```

## Data Models

### Product

```javascript
{
  name: string,           // Display name (unique per server)
  payhipApiKey: string,   // Payhip license API key (encrypted)
  robloxGroupId: string,  // Roblox group ID
  createdAt: Date,
  updatedAt: Date
}
```

### ServerConfig

```javascript
{
  guildId: string,        // Discord server ID (primary key)
  products: Product[],    // Array of products
  createdAt: Date,
  updatedAt: Date
}
```

### Database Schema (JSON file structure)

```javascript
{
  servers: {
    [guildId: string]: {
      products: Product[],
      createdAt: string,
      updatedAt: string
    }
  }
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Product CRUD Round Trip
*For any* valid product configuration, adding it to a server, then retrieving it, should return an equivalent product with the same name, group ID, and API key.
**Validates: Requirements 1.1, 7.1**

### Property 2: Input Validation Consistency
*For any* string input for Payhip API key, the validation should return true if and only if the string starts with "prod_sk_". *For any* string input for Roblox group ID, the validation should return true if and only if the string contains only numeric characters.
**Validates: Requirements 1.2, 1.3, 4.2**

### Property 3: Product Name Uniqueness
*For any* server and product name, attempting to add a second product with the same name should fail, and the original product should remain unchanged.
**Validates: Requirements 1.4**

### Property 4: Remove Then Query Returns Empty
*For any* product that exists in a server, removing it and then querying for it should return null/not found.
**Validates: Requirements 2.1**

### Property 5: List Returns All Products
*For any* set of products added to a server, listing products should return all of them with correct names and group IDs.
**Validates: Requirements 3.1, 3.3**

### Property 6: Edit Preserves Unmodified Fields
*For any* existing product, editing only some fields should preserve the values of unmodified fields.
**Validates: Requirements 4.1**

### Property 7: Product Selection Uses Correct Credentials
*For any* redemption with a selected product, the system should use that product's Payhip API key and Roblox group ID for the redemption process.
**Validates: Requirements 5.3**

### Property 8: Permission Check Consistency
*For any* user and admin command, the command should execute if and only if the user has Administrator permission in that server.
**Validates: Requirements 6.1, 6.2**

## Error Handling

| Error Condition | Response |
|----------------|----------|
| Invalid Payhip API key format | "Invalid Payhip API key. Must start with 'prod_sk_'" |
| Invalid Roblox group ID | "Invalid Roblox group ID. Must be a numeric value" |
| Duplicate product name | "A product with this name already exists" |
| Product not found | "Product '{name}' not found" |
| No products configured | "No products configured for this server. Ask an admin to set up products." |
| Permission denied | "You need Administrator permission to use this command" |
| Database error | "Failed to save configuration. Please try again." |

## Testing Strategy

### Unit Tests
- Validation functions for API key and group ID formats
- Product CRUD operations on ServerConfigService
- Permission checking logic

### Property-Based Tests
Using fast-check library for JavaScript:

1. **Product Round Trip Test** - Generate random valid products, add them, retrieve them, verify equality
2. **Validation Test** - Generate random strings, verify validation matches expected rules
3. **Uniqueness Test** - Generate products with same names, verify second add fails
4. **List Completeness Test** - Generate random product sets, verify list returns all

### Integration Tests
- Full flow: add product → redeem with product → verify correct group used
- Multi-product selection flow
- Permission denial for non-admins
