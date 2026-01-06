# Requirements Document

## Introduction

This feature adds a multi-server admin panel to the Discord Roblox Whitelist Bot. The admin panel allows bot administrators to configure different products for each Discord server the bot is in. Each product has its own Payhip license API key and associated Roblox group ID. The bot uses a master Roblox API key that has access to multiple groups, allowing per-server product configuration.

## Glossary

- **Admin_Panel**: The system of Discord slash commands that allows administrators to manage server-specific product configurations
- **Product**: A purchasable item with a unique Payhip license API key and associated Roblox group ID
- **Server_Configuration**: The stored settings for a specific Discord server including its configured products
- **Master_API_Key**: The Roblox Open Cloud API key with access to multiple groups
- **License_API_Key**: The Payhip product secret key (prod_sk_*) used to validate licenses for a specific product
- **Guild**: Discord's term for a server

## Requirements

### Requirement 1

**User Story:** As a bot administrator, I want to add products to a Discord server, so that users in that server can redeem keys for specific Roblox groups.

#### Acceptance Criteria

1. WHEN an administrator uses the /admin-product-add command with product name, Payhip license API key, and Roblox group ID THEN the Admin_Panel SHALL store the product configuration for that Discord server
2. WHEN a product is added THEN the Admin_Panel SHALL validate that the Payhip license API key format is correct (starts with prod_sk_)
3. WHEN a product is added THEN the Admin_Panel SHALL validate that the Roblox group ID is a valid numeric ID
4. WHEN a duplicate product name is added to the same server THEN the Admin_Panel SHALL reject the addition and notify the administrator
5. WHEN a product is successfully added THEN the Admin_Panel SHALL confirm the addition with product details

### Requirement 2

**User Story:** As a bot administrator, I want to remove products from a Discord server, so that I can manage which products are available for redemption.

#### Acceptance Criteria

1. WHEN an administrator uses the /admin-product-remove command with a product name THEN the Admin_Panel SHALL remove that product from the server configuration
2. WHEN a non-existent product name is provided THEN the Admin_Panel SHALL notify the administrator that the product does not exist
3. WHEN a product is successfully removed THEN the Admin_Panel SHALL confirm the removal

### Requirement 3

**User Story:** As a bot administrator, I want to list all products configured for a Discord server, so that I can see what products are available.

#### Acceptance Criteria

1. WHEN an administrator uses the /admin-product-list command THEN the Admin_Panel SHALL display all products configured for that server
2. WHEN no products are configured THEN the Admin_Panel SHALL display a message indicating no products are set up
3. WHEN listing products THEN the Admin_Panel SHALL show product name, Roblox group ID, and a masked version of the license API key

### Requirement 4

**User Story:** As a bot administrator, I want to edit existing product configurations, so that I can update API keys or group IDs without removing and re-adding products.

#### Acceptance Criteria

1. WHEN an administrator uses the /admin-product-edit command with a product name and new values THEN the Admin_Panel SHALL update the specified fields
2. WHEN editing a product THEN the Admin_Panel SHALL validate new values using the same rules as product addition
3. WHEN a product is successfully edited THEN the Admin_Panel SHALL confirm the changes

### Requirement 5

**User Story:** As a user, I want to select which product to redeem my key for, so that I can join the correct Roblox group.

#### Acceptance Criteria

1. WHEN a user uses the /redeem command in a server with multiple products THEN the System SHALL present a product selection interface
2. WHEN a user uses the /redeem command in a server with one product THEN the System SHALL use that product automatically
3. WHEN a user selects a product THEN the System SHALL use that product's Payhip license API key and Roblox group ID for redemption
4. WHEN no products are configured for a server THEN the System SHALL notify the user that the server is not configured

### Requirement 6

**User Story:** As a bot administrator, I want admin commands to be restricted to users with administrator permissions, so that only authorized users can manage products.

#### Acceptance Criteria

1. WHEN a non-administrator uses an admin command THEN the Admin_Panel SHALL reject the command and notify the user
2. WHEN an administrator uses an admin command THEN the Admin_Panel SHALL execute the command
3. WHEN checking permissions THEN the Admin_Panel SHALL verify the user has the Discord Administrator permission in that server

### Requirement 7

**User Story:** As a bot owner, I want server configurations to persist across bot restarts, so that I don't lose product configurations.

#### Acceptance Criteria

1. WHEN a product configuration is added, edited, or removed THEN the Admin_Panel SHALL persist the change to the database immediately
2. WHEN the bot starts THEN the Admin_Panel SHALL load all server configurations from the database
3. WHEN database operations fail THEN the Admin_Panel SHALL log the error and notify the administrator
