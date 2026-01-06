# Requirements Document

## Introduction

This document specifies the requirements for a Discord bot that manages whitelist access to a Roblox group through Payhip product purchases. The system validates product keys, verifies Roblox group membership status, and automatically accepts pending join requests when valid keys are redeemed.

## Glossary

- **Discord Bot**: The automated system that operates within Discord servers to handle user interactions
- **Payhip**: The e-commerce platform that sells product keys to customers
- **Product Secret Key**: A unique, single-use code provided by Payhip upon purchase that grants whitelist access
- **Roblox Group**: The Roblox community group (ID: 5451777) that users gain access to upon successful key redemption
- **Whitelist System**: The mechanism that controls and validates access to the Roblox group
- **Key Redemption**: The process of validating and consuming a product secret key
- **Pending Status**: The state where a Roblox user has requested to join the group but has not been accepted
- **Roblox API**: The interface used to interact with Roblox services for group management

## Requirements

### Requirement 1

**User Story:** As a customer, I want to redeem my purchased product key in Discord, so that I can gain access to the Roblox group.

#### Acceptance Criteria

1. WHEN a user submits a product secret key and Roblox username THEN the Discord Bot SHALL validate the key format and username format
2. WHEN a valid product secret key is submitted for the first time THEN the Discord Bot SHALL mark the key as redeemed and proceed with verification
3. WHEN a product secret key has already been redeemed THEN the Discord Bot SHALL reject the redemption attempt and notify the user that the key has expired
4. WHEN a user submits an invalid product secret key THEN the Discord Bot SHALL reject the redemption and inform the user
5. WHEN a user successfully redeems a key THEN the Discord Bot SHALL store the redemption record with the key, Roblox username, Discord user ID, and timestamp

### Requirement 2

**User Story:** As a customer, I want the bot to verify my Roblox group membership status, so that I can be accepted into the group automatically.

#### Acceptance Criteria

1. WHEN a valid key is redeemed THEN the Discord Bot SHALL query the Roblox API to check if the provided username has a pending join request for the target group
2. WHEN the Roblox username is not pending to the group THEN the Discord Bot SHALL inform the user to send a join request to the group and halt the process
3. WHEN the Roblox username has a pending join request THEN the Discord Bot SHALL use the Roblox API to accept the join request
4. WHEN the join request is successfully accepted THEN the Discord Bot SHALL notify the user of successful whitelist activation
5. WHEN the Roblox API returns an error during verification or acceptance THEN the Discord Bot SHALL log the error and inform the user to contact support

### Requirement 3

**User Story:** As a system administrator, I want product keys to be single-use only, so that customers cannot share keys or redeem them multiple times.

#### Acceptance Criteria

1. WHEN a product secret key is redeemed THEN the Whitelist System SHALL permanently mark the key as used in persistent storage
2. WHEN checking key validity THEN the Whitelist System SHALL verify the key has not been previously redeemed
3. WHEN a redeemed key is submitted again THEN the Whitelist System SHALL reject the attempt regardless of the Roblox username provided
4. WHEN the system restarts THEN the Whitelist System SHALL retain all key redemption records from persistent storage
5. WHEN storing redemption data THEN the Whitelist System SHALL ensure data integrity and prevent duplicate redemptions through atomic operations

### Requirement 4

**User Story:** As a system administrator, I want the bot to securely interact with the Roblox API, so that group management operations are performed reliably.

#### Acceptance Criteria

1. WHEN making Roblox API requests THEN the Discord Bot SHALL include the configured API key in the authorization header
2. WHEN querying group join requests THEN the Discord Bot SHALL use the Roblox API endpoint for retrieving pending join requests for group ID 5451777
3. WHEN accepting a join request THEN the Discord Bot SHALL use the Roblox API endpoint for accepting group join requests
4. WHEN the Roblox API rate limits requests THEN the Discord Bot SHALL handle rate limit responses and retry with appropriate backoff
5. WHEN the Roblox API returns authentication errors THEN the Discord Bot SHALL log the error and notify administrators of configuration issues

### Requirement 5

**User Story:** As a user, I want clear feedback during the redemption process, so that I understand what actions I need to take.

#### Acceptance Criteria

1. WHEN a user initiates key redemption THEN the Discord Bot SHALL prompt for both the product secret key and Roblox username
2. WHEN the username is not pending to the group THEN the Discord Bot SHALL provide the group URL and instructions to send a join request
3. WHEN a key has already been used THEN the Discord Bot SHALL inform the user that the key has expired and cannot be redeemed again
4. WHEN the redemption is successful THEN the Discord Bot SHALL confirm the user has been accepted to the Roblox group
5. WHEN an error occurs THEN the Discord Bot SHALL provide a user-friendly error message without exposing sensitive system details

### Requirement 6

**User Story:** As a system administrator, I want the bot to log all redemption attempts, so that I can audit usage and troubleshoot issues.

#### Acceptance Criteria

1. WHEN a key redemption is attempted THEN the Discord Bot SHALL log the Discord user ID, Roblox username, product key, timestamp, and outcome
2. WHEN a Roblox API operation fails THEN the Discord Bot SHALL log the error details including API response codes and messages
3. WHEN a duplicate redemption is attempted THEN the Discord Bot SHALL log the attempt with the original redemption timestamp
4. WHEN the bot starts THEN the Discord Bot SHALL log the initialization status and configuration validation results
5. WHEN logging sensitive data THEN the Discord Bot SHALL redact or hash product keys to prevent exposure in log files
