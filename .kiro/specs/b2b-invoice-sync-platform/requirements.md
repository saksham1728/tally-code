# Requirements Document

## Introduction

The B2B Invoice Sync Platform is a middleware dashboard that connects with Tally accounting software to facilitate invoice synchronization between seller and buyer companies. The system pulls invoices from a seller's Tally instance, matches them with buyer companies in the portal, and enables buyers to push invoices into their own Tally instance with one click. This is an MVP focused on data-sharing between Tally systems, not a full accounting replacement.

## Glossary

- **Portal**: The B2B Invoice Sync Platform web application
- **Tally**: Third-party accounting software used by sellers and buyers
- **Seller_Company**: A company that creates and sends invoices through the Portal
- **Buyer_Company**: A company that receives invoices and pushes them to their Tally
- **GSTIN**: Goods and Services Tax Identification Number used in India for company identification
- **Invoice**: A commercial document representing a transaction with line items, amounts, and tax details
- **Sync_Log**: A record of all synchronization events and status changes for invoices
- **Company_Admin**: A user with administrative privileges for their company
- **Super_Admin**: A user with system-wide administrative privileges
- **Tally_Connector**: Service module responsible for communicating with Tally API
- **Authentication_Service**: Service responsible for user login and JWT token management
- **Matching_Engine**: Component that identifies buyer companies using GSTIN or company name

## Requirements

### Requirement 1: User Authentication

**User Story:** As a company admin, I want to log in securely to the Portal, so that I can access my company's invoice data.

#### Acceptance Criteria

1. WHEN a user submits valid credentials, THE Authentication_Service SHALL generate a JWT token within 2 seconds
2. WHEN a user submits invalid credentials, THE Authentication_Service SHALL return an authentication error message
3. THE Authentication_Service SHALL include user role and company ID in the JWT token payload
4. WHEN a JWT token expires, THE Portal SHALL require the user to re-authenticate
5. THE Portal SHALL support three user roles: Seller_Company admin, Buyer_Company admin, and Super_Admin

### Requirement 2: Company Registration and Profile Management

**User Story:** As a company admin, I want to register my company with the Portal, so that I can participate in invoice synchronization.

#### Acceptance Criteria

1. WHEN a new company registers, THE Portal SHALL store company name, GSTIN, email, phone, and company type
2. THE Portal SHALL validate GSTIN format before storing company data
3. THE Portal SHALL support company types: seller, buyer, or both
4. WHEN a company admin views their profile, THE Portal SHALL display all company details including Tally connection status
5. THE Portal SHALL allow company admins to update company contact details

### Requirement 3: Tally Connection Configuration

**User Story:** As a company admin, I want to configure my Tally connection details, so that the Portal can import or export invoices.

#### Acceptance Criteria

1. WHEN a company admin provides Tally connection credentials, THE Portal SHALL store the configuration securely
2. THE Portal SHALL not store credentials in plain text
3. WHEN testing a Tally connection, THE Tally_Connector SHALL verify connectivity within 10 seconds
4. THE Portal SHALL indicate connection status as connected, disconnected, or error
5. WHERE a company has not configured Tally connection, THE Portal SHALL display a setup prompt

### Requirement 4: Invoice Import from Tally

**User Story:** As a seller company admin, I want to import invoices from my Tally system into the Portal, so that they can be shared with buyers.

#### Acceptance Criteria

1. WHEN a seller initiates import, THE Tally_Connector SHALL fetch invoices from the Tally API
2. THE Portal SHALL store invoice number, invoice date, seller company, buyer company name, buyer GSTIN, line items, taxable amount, tax amount, total amount, status, source reference ID, and raw payload
3. WHEN the Tally_Connector receives invoice data, THE Portal SHALL create Invoice and InvoiceLineItem records within 5 seconds
4. IF the Tally API is unavailable, THEN THE Portal SHALL log the error and notify the seller
5. THE Portal SHALL prevent duplicate imports by checking source reference ID
6. WHEN an invoice is imported, THE Portal SHALL trigger the Matching_Engine to identify the buyer

### Requirement 5: Buyer Company Matching

**User Story:** As the system, I want to automatically match imported invoices with buyer companies, so that invoices appear in the correct buyer dashboard.

#### Acceptance Criteria

1. WHEN an invoice is imported, THE Matching_Engine SHALL first attempt to match by buyer GSTIN
2. IF GSTIN match fails, THEN THE Matching_Engine SHALL attempt to match by company name
3. IF both matching attempts fail, THEN THE Portal SHALL mark the invoice status as "unmatched"
4. WHEN a buyer company is successfully matched, THE Portal SHALL update the invoice with the matched Buyer_Company ID
5. THE Portal SHALL use case-insensitive comparison for company name matching
6. WHEN an invoice is matched, THE Portal SHALL create a Sync_Log entry recording the match result

### Requirement 6: Seller Dashboard

**User Story:** As a seller company admin, I want to view all my invoices and their synchronization status, so that I can track which invoices have been shared with buyers.

#### Acceptance Criteria

1. WHEN a seller accesses the dashboard, THE Portal SHALL display all invoices belonging to their company
2. THE Portal SHALL show invoice number, date, buyer name, total amount, match status, and push status for each invoice
3. THE Portal SHALL filter invoices to show only those belonging to the logged-in seller company
4. THE Portal SHALL display unmatched invoices with a distinct visual indicator
5. WHEN a seller clicks on an invoice, THE Portal SHALL display detailed invoice information including line items and sync logs
6. THE Portal SHALL provide an import button that triggers invoice import from Tally

### Requirement 7: Buyer Dashboard

**User Story:** As a buyer company admin, I want to view invoices shared with me, so that I can review and push them to my Tally system.

#### Acceptance Criteria

1. WHEN a buyer accesses the dashboard, THE Portal SHALL display all invoices matched to their company
2. THE Portal SHALL show invoice number, date, seller name, total amount, and status for each invoice
3. THE Portal SHALL filter invoices to show only those matched to the logged-in buyer company
4. THE Portal SHALL support invoice status values: New, Accepted, Rejected, Pushed_to_Tally, and Failed
5. WHEN a buyer clicks on an invoice, THE Portal SHALL display detailed invoice information including all line items and tax breakdowns

### Requirement 8: Invoice Detail View

**User Story:** As a company admin, I want to view complete invoice details, so that I can verify the accuracy before taking action.

#### Acceptance Criteria

1. WHEN a user views invoice details, THE Portal SHALL display invoice header information and all line items
2. THE Portal SHALL display seller company name, buyer company name, GSTIN, invoice date, and invoice number
3. THE Portal SHALL display each line item with description, quantity, rate, taxable amount, and tax amount
4. THE Portal SHALL calculate and display subtotal, total tax, and grand total
5. THE Portal SHALL display current invoice status and timestamp of last status change

### Requirement 9: Push Invoice to Buyer Tally

**User Story:** As a buyer company admin, I want to push an invoice to my Tally system with one click, so that I can import the invoice data without manual entry.

#### Acceptance Criteria

1. WHEN a buyer clicks "Push to Tally", THE Tally_Connector SHALL send invoice data to the buyer's Tally API
2. IF the push succeeds, THEN THE Portal SHALL update invoice status to "Pushed_to_Tally"
3. IF the push fails, THEN THE Portal SHALL update invoice status to "Failed" and log the error message
4. THE Portal SHALL create a Sync_Log entry recording the push attempt and result
5. WHEN the push operation completes, THE Portal SHALL display a success or failure message to the buyer within 3 seconds
6. THE Portal SHALL disable the "Push to Tally" button after a successful push to prevent duplicate entries

### Requirement 10: Sync Log and Audit Trail

**User Story:** As a company admin, I want to view a complete log of synchronization events, so that I can audit invoice processing and troubleshoot issues.

#### Acceptance Criteria

1. WHEN any invoice synchronization event occurs, THE Portal SHALL create a Sync_Log record
2. THE Portal SHALL log events for: import from Tally, buyer match attempt, buyer match result, invoice shared to buyer, push to Tally attempt, and push to Tally result
3. THE Sync_Log SHALL include timestamp, event type, invoice ID, company ID, status, and error message if applicable
4. WHEN a user views sync logs, THE Portal SHALL display logs in reverse chronological order
5. THE Portal SHALL allow filtering logs by invoice ID, company, event type, and date range
6. THE Portal SHALL retain sync logs for audit purposes

### Requirement 11: Invoice Status Management

**User Story:** As the system, I want to maintain accurate invoice status throughout the synchronization lifecycle, so that users can track invoice progress.

#### Acceptance Criteria

1. WHEN an invoice is imported, THE Portal SHALL set initial status to "New"
2. WHEN a buyer views an invoice, THE Portal SHALL allow status change to "Accepted" or "Rejected"
3. WHEN an invoice is successfully pushed to Tally, THE Portal SHALL set status to "Pushed_to_Tally"
4. IF a push to Tally fails, THEN THE Portal SHALL set status to "Failed"
5. THE Portal SHALL record timestamp for each status change
6. WHEN invoice status changes, THE Portal SHALL make the updated status visible in both seller and buyer dashboards

### Requirement 12: API Endpoints for Frontend Integration

**User Story:** As a frontend developer, I want well-defined REST APIs, so that I can build the Portal user interface.

#### Acceptance Criteria

1. THE Portal SHALL provide POST /api/auth/login endpoint that returns JWT token on successful authentication
2. THE Portal SHALL provide POST /api/auth/register endpoint for new user registration
3. THE Portal SHALL provide GET /api/invoices endpoint that returns filtered invoices based on user role and company
4. THE Portal SHALL provide GET /api/invoices/:id endpoint that returns complete invoice details including line items
5. THE Portal SHALL provide POST /api/invoices/import-from-tally endpoint that triggers invoice import
6. THE Portal SHALL provide POST /api/invoices/:id/push-to-tally endpoint that pushes invoice to buyer Tally
7. THE Portal SHALL provide GET /api/logs endpoint that returns sync log entries
8. THE Portal SHALL provide GET /api/company/me endpoint that returns current user's company details
9. THE Portal SHALL validate authentication token for all protected endpoints
10. THE Portal SHALL return appropriate HTTP status codes and error messages for invalid requests

### Requirement 13: Frontend User Interface

**User Story:** As a company admin, I want a clean and responsive user interface, so that I can efficiently manage invoices on any device.

#### Acceptance Criteria

1. THE Portal SHALL provide a login page with email and password fields
2. THE Portal SHALL provide a seller dashboard page displaying invoice table with status badges
3. THE Portal SHALL provide a buyer dashboard page displaying matched invoices with action buttons
4. THE Portal SHALL provide an invoice detail view as a modal or drawer component
5. THE Portal SHALL provide a company profile page showing company details and Tally connection status
6. THE Portal SHALL provide a sync logs page with filtering options
7. THE Portal SHALL use responsive layout that adapts to mobile, tablet, and desktop screen sizes
8. THE Portal SHALL display loading indicators during API calls
9. THE Portal SHALL display success and error notifications for user actions

### Requirement 14: Data Validation

**User Story:** As a developer, I want comprehensive data validation, so that the system maintains data integrity.

#### Acceptance Criteria

1. THE Portal SHALL validate GSTIN format as 15 alphanumeric characters
2. THE Portal SHALL validate email format before storing user or company data
3. THE Portal SHALL validate that invoice total amount matches the sum of line item amounts plus taxes
4. THE Portal SHALL validate that invoice date is not in the future
5. THE Portal SHALL reject API requests with missing required fields and return validation error messages
6. THE Portal SHALL sanitize user input to prevent injection attacks

### Requirement 15: Error Handling and Resilience

**User Story:** As a system administrator, I want robust error handling, so that the system remains stable during failures.

#### Acceptance Criteria

1. IF the Tally API is unavailable, THEN THE Portal SHALL log the error and notify the user without crashing
2. IF database connection fails, THEN THE Portal SHALL return an appropriate error message to the user
3. THE Portal SHALL log all errors with timestamp, error type, and stack trace for debugging
4. WHEN an API endpoint encounters an error, THE Portal SHALL return an error response with appropriate HTTP status code
5. THE Portal SHALL implement retry logic with exponential backoff for transient Tally API failures

### Requirement 16: Modular Architecture for Integration Extension

**User Story:** As a developer, I want modular integration architecture, so that the system can support additional accounting software beyond Tally in the future.

#### Acceptance Criteria

1. THE Tally_Connector SHALL implement a standard integration interface
2. THE Portal SHALL allow swapping Tally_Connector with mock connector for development and testing
3. THE Portal SHALL define clear interfaces for import invoice and export invoice operations
4. THE Portal SHALL separate integration logic from business logic in the codebase
5. THE Portal SHALL store integration configuration separately from application code

### Requirement 17: Security and Credential Management

**User Story:** As a security-conscious admin, I want credentials and sensitive data protected, so that the system remains secure.

#### Acceptance Criteria

1. THE Portal SHALL not store API credentials or passwords in plain text
2. THE Portal SHALL use environment variables for sensitive configuration values
3. THE Portal SHALL encrypt Tally connection credentials before storing in the database
4. THE Portal SHALL use HTTPS for all API communications in production
5. THE Portal SHALL validate JWT token signature and expiration for all protected endpoints
6. THE Portal SHALL implement password hashing using bcrypt or similar algorithm with minimum 10 rounds

### Requirement 18: Super Admin Functionality

**User Story:** As a super admin, I want system-wide visibility and management capabilities, so that I can monitor platform health and assist users.

#### Acceptance Criteria

1. WHEN a super admin logs in, THE Portal SHALL provide access to all companies and invoices
2. THE Portal SHALL provide an admin page displaying integration status for all companies
3. THE Portal SHALL allow super admin to view sync logs across all companies
4. THE Portal SHALL display system-wide statistics including total invoices, active companies, and sync success rate
5. THE Portal SHALL allow super admin to manually trigger buyer matching for unmatched invoices

### Requirement 19: Database Schema Design

**User Story:** As a backend developer, I want well-structured database models, so that data relationships are clear and queries are efficient.

#### Acceptance Criteria

1. THE Portal SHALL implement a User model with fields: userId, email, password hash, role, company ID, created timestamp
2. THE Portal SHALL implement a Company model with fields: companyId, name, GSTIN, email, phone, company type, created timestamp
3. THE Portal SHALL implement an Invoice model with fields: invoiceId, invoice number, invoice date, seller company ID, buyer company ID, buyer company name, buyer GSTIN, taxable amount, tax amount, total amount, status, source reference ID, raw payload, created timestamp
4. THE Portal SHALL implement an InvoiceLineItem model with fields: lineItemId, invoice ID, description, quantity, rate, taxable amount, tax amount
5. THE Portal SHALL implement a SyncLog model with fields: logId, timestamp, event type, invoice ID, company ID, status, error message
6. THE Portal SHALL implement a TallyConnection model with fields: connectionId, company ID, API endpoint, encrypted credentials, connection status, last tested timestamp
7. THE Portal SHALL establish foreign key relationships between models for referential integrity

### Requirement 20: MVP Scope and Limitations

**User Story:** As a product manager, I want clear scope boundaries for the MVP, so that development focuses on core functionality.

#### Acceptance Criteria

1. THE Portal SHALL focus exclusively on invoice synchronization between Tally systems
2. THE Portal SHALL not implement accounting features such as ledger management, payment tracking, or financial reporting
3. THE Portal SHALL not replace or replicate Tally functionality
4. THE Portal SHALL serve as a data-sharing layer between seller and buyer Tally instances
5. THE Portal SHALL not include automated test cases in the MVP release
