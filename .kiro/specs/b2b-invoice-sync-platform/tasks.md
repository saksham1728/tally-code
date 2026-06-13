# Implementation Plan: B2B Invoice Sync Platform MVP

## Overview

This plan implements a MERN stack (MongoDB, Express.js, React, Node.js) B2B invoice synchronization platform that serves as middleware between Tally accounting systems. The implementation follows a modular architecture with clear separation between backend API, database models, integration layer, and frontend UI components. The system enables sellers to import invoices from Tally, automatically matches buyers, and allows buyers to push invoices to their Tally with one click.

## Tasks

- [x] 1. Initialize project structure and dependencies
  - Create root directory with separate `backend/` and `frontend/` folders
  - Initialize Node.js project in backend with Express, Mongoose, JWT, bcrypt, crypto-js, axios
  - Initialize React project in frontend with React Router, axios, and Context API
  - Set up `.env` files for environment configuration (DB connection, JWT secret, encryption key)
  - Create `.gitignore` to exclude `node_modules/`, `.env`, and build artifacts
  - _Requirements: 16.5, 17.2_

- [x] 2. Set up backend configuration and utilities
  - [x] 2.1 Create database configuration module (`backend/config/database.js`)
    - Implement MongoDB connection with Mongoose
    - Include connection error handling and retry logic
    - _Requirements: 15.2, 19.1-19.7_

  - [x] 2.2 Create JWT configuration module (`backend/config/jwt.js`)
    - Define JWT secret, expiration time, and token generation utilities
    - _Requirements: 1.1, 1.3, 1.4, 17.5_

  - [x] 2.3 Create encryption utilities (`backend/config/encryption.js`)
    - Implement AES encryption/decryption for Tally credentials using crypto-js
    - _Requirements: 3.2, 17.1, 17.3_

  - [x]* 2.4 Write property test for credential encryption
    - **Property 3: Credential Encryption**
    - **Validates: Requirements 3.2, 17.1, 17.3**
    - Verify encrypted credentials differ from plaintext input
    - _Requirements: 3.2, 17.1, 17.3_

- [x] 3. Implement database models with Mongoose schemas
  - [x] 3.1 Create User model (`backend/models/User.js`)
    - Define schema with email, passwordHash, role, companyId, createdAt, updatedAt
    - Add unique index on email, index on companyId
    - Implement pre-save hook for password hashing with bcrypt (minimum 10 rounds)
    - _Requirements: 19.1, 17.6_

  - [x] 3.2 Create Company model (`backend/models/Company.js`)
    - Define schema with name, gstin, email, phone, companyType, createdAt, updatedAt
    - Add unique index on gstin, text index on name for search
    - Implement GSTIN validation (15 alphanumeric characters, uppercase)
    - _Requirements: 2.1, 2.2, 19.2_

  - [x]* 3.3 Write property test for GSTIN format validation
    - **Property 2: GSTIN Format Validation**
    - **Validates: Requirements 2.2, 14.1**
    - Verify validator accepts exactly 15 alphanumeric characters, rejects all others
    - _Requirements: 2.2, 14.1_

  - [x] 3.4 Create TallyConnection model (`backend/models/TallyConnection.js`)
    - Define schema with companyId, apiEndpoint, encryptedCredentials, connectionStatus, lastTestedAt, lastError
    - Add unique index on companyId
    - _Requirements: 3.1, 19.6_

  - [x] 3.5 Create Invoice model (`backend/models/Invoice.js`)
    - Define schema with all invoice fields including sourceReferenceId
    - Add compound indexes on (sellerCompanyId, invoiceDate) and (buyerCompanyId, invoiceDate)
    - Add unique index on sourceReferenceId for duplicate prevention
    - Add status index
    - _Requirements: 4.2, 4.5, 19.3_

  - [x]* 3.6 Write property test for initial invoice status
    - **Property 12: Initial Invoice Status**
    - **Validates: Requirements 11.1**
    - Verify new invoices have "New" status
    - _Requirements: 11.1_

  - [x] 3.7 Create InvoiceLineItem model (`backend/models/InvoiceLineItem.js`)
    - Define schema with invoiceId, lineNumber, description, quantity, rate, taxableAmount, taxAmount
    - Add index on invoiceId
    - _Requirements: 19.4_

  - [x] 3.8 Create SyncLog model (`backend/models/SyncLog.js`)
    - Define schema with timestamp, eventType, invoiceId, companyId, status, errorMessage, metadata
    - Add descending index on timestamp, indexes on invoiceId, companyId, eventType
    - _Requirements: 10.3, 19.5_

- [x] 4. Implement validation middleware and utilities
  - [x] 4.1 Create validation middleware (`backend/middleware/validation.middleware.js`)
    - Implement GSTIN format validator (15 alphanumeric characters)
    - Implement email format validator
    - Implement invoice date validator (not in future)
    - Implement invoice total calculation validator
    - Implement input sanitization for injection attack prevention
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6_

  - [x]* 4.2 Write property tests for validation functions
    - **Property 14: Email Format Validation** - Validates: Requirements 14.2
    - **Property 15: Invoice Total Calculation Validation** - Validates: Requirements 14.3
    - **Property 16: Invoice Date Validation** - Validates: Requirements 14.4
    - **Property 17: Input Sanitization** - Validates: Requirements 14.6
    - _Requirements: 14.2, 14.3, 14.4, 14.6_

- [x] 5. Implement authentication middleware and error handling
  - [x] 5.1 Create authentication middleware (`backend/middleware/auth.middleware.js`)
    - Implement JWT token validation for protected routes
    - Extract user role and company ID from token payload
    - Implement role-based access control (seller_admin, buyer_admin, super_admin)
    - Handle missing token, expired token, invalid signature errors
    - _Requirements: 1.3, 1.4, 1.5, 12.9_

  - [x]* 5.2 Write property test for JWT payload completeness
    - **Property 1: JWT Payload Completeness**
    - **Validates: Requirements 1.3**
    - Verify JWT contains role and company ID for any valid user
    - _Requirements: 1.3_

  - [x] 5.3 Create error handling middleware (`backend/middleware/error.middleware.js`)
    - Implement centralized error handler with error categorization
    - Format error responses with success flag, error code, message, and details
    - Implement error logging with timestamp, error type, stack trace, request details
    - Never expose internal details or stack traces to users
    - _Requirements: 15.3, 15.4_

- [x] 6. Implement integration layer connectors
  - [x] 6.1 Create integration interface (`backend/integrations/IIntegrationConnector.js`)
    - Define interface with testConnection, importInvoices, and pushInvoice methods
    - _Requirements: 16.1, 16.3_

  - [x] 6.2 Create TallyConnector implementation (`backend/integrations/TallyConnector.js`)
    - Implement testConnection method with Tally API ping within 10 seconds
    - Implement importInvoices method to fetch invoices from Tally API
    - Implement pushInvoice method to send invoice data to Tally API
    - Implement retry logic with exponential backoff (3 attempts: 1s, 2s, 4s)
    - Implement circuit breaker pattern (open after 5 failures, 60s timeout)
    - Handle Tally API errors: unavailable, timeout, authentication failed
    - _Requirements: 3.3, 4.1, 4.4, 9.1, 15.1, 15.5_

  - [x] 6.3 Create MockConnector for testing (`backend/integrations/MockConnector.js`)
    - Implement interface methods with hardcoded test data
    - Return sample invoice data for import
    - Simulate successful and failed push scenarios
    - _Requirements: 16.2_

- [x] 7. Implement business logic services
  - [x] 7.1 Create matching service (`backend/services/matching.service.js`)
    - Implement buyer matching by GSTIN (first priority)
    - Implement buyer matching by company name (fallback, case-insensitive)
    - Set invoice status to "Unmatched" if both fail
    - Update invoice with matched buyer company ID on success
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x]* 7.2 Write property tests for matching engine
    - **Property 6: Unmatched Invoice Status** - Validates: Requirements 5.3
    - **Property 7: Successful Match Updates Invoice** - Validates: Requirements 5.4
    - **Property 8: Case-Insensitive Company Name Matching** - Validates: Requirements 5.5
    - _Requirements: 5.3, 5.4, 5.5_

  - [x] 7.3 Create sync log service (`backend/services/syncLog.service.js`)
    - Implement createLog method with timestamp, eventType, invoiceId, companyId, status, errorMessage
    - Support event types: import_from_tally, buyer_match_attempt, buyer_match_success, buyer_match_failed, invoice_shared_to_buyer, push_to_tally_attempt, push_to_tally_success, push_to_tally_failed
    - Implement log filtering by invoice ID, company, event type, and date range
    - _Requirements: 5.6, 10.1, 10.2, 10.5_

  - [x]* 7.4 Write property test for audit log creation
    - **Property 9: Audit Log Creation**
    - **Validates: Requirements 5.6, 9.4, 10.1, 10.2**
    - Verify SyncLog entry created for any synchronization event
    - _Requirements: 5.6, 9.4, 10.1, 10.2_

- [x] 8. Checkpoint - Ensure backend foundation is complete
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Implement authentication controller and routes
  - [x] 9.1 Create auth controller (`backend/controllers/auth.controller.js`)
    - Implement register method: validate input, hash password, create user, create company
    - Implement login method: validate credentials, generate JWT token within 2 seconds, return token with user role and company ID
    - Handle authentication errors: invalid credentials, non-existent user
    - _Requirements: 1.1, 1.2, 1.3, 2.1_

  - [x] 9.2 Create auth routes (`backend/routes/auth.routes.js`)
    - POST /api/auth/register endpoint
    - POST /api/auth/login endpoint
    - Apply validation middleware to both routes
    - _Requirements: 12.1, 12.2_

- [x] 10. Implement company controller and routes
  - [x] 10.1 Create company controller (`backend/controllers/company.controller.js`)
    - Implement getMyCompany method: return current user's company with Tally connection status
    - Implement updateCompany method: allow updating contact details (email, phone)
    - Implement configureConnection method: encrypt and store Tally credentials
    - Implement testConnection method: verify Tally connectivity within 10 seconds
    - _Requirements: 2.4, 2.5, 3.1, 3.3, 3.4_

  - [x] 10.2 Create company routes (`backend/routes/company.routes.js`)
    - GET /api/company/me endpoint (protected, returns user's company)
    - PUT /api/company/me endpoint (protected, updates company details)
    - POST /api/company/tally-connection endpoint (protected, configures Tally)
    - POST /api/company/test-connection endpoint (protected, tests Tally connection)
    - _Requirements: 12.8_

- [x] 11. Implement invoice controller with import and push logic
  - [x] 11.1 Create invoice controller (`backend/controllers/invoice.controller.js`)
    - Implement getInvoices method: filter by user role and company, return paginated results
    - Implement getInvoiceById method: return complete invoice with line items
    - Implement importFromTally method: fetch from Tally, create Invoice and InvoiceLineItem records, trigger matching, create sync logs
    - Implement pushToTally method: send to buyer Tally, update status, create sync log, handle errors
    - Implement updateStatus method: allow buyers to set Accepted/Rejected, update statusChangedAt
    - Handle duplicate imports using sourceReferenceId check
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6, 6.1, 7.1, 7.2, 7.3, 9.1, 9.2, 9.3, 9.5, 11.2, 11.3_

  - [ ]* 11.2 Write property tests for invoice operations
    - **Property 4: Invoice Data Persistence** - Validates: Requirements 4.2
    - **Property 5: Duplicate Import Prevention** - Validates: Requirements 4.5
    - **Property 10: Push Success Status Update** - Validates: Requirements 9.2
    - **Property 11: Push Failure Status Update** - Validates: Requirements 9.3
    - **Property 13: Status Transition Timestamping** - Validates: Requirements 11.5, 11.6
    - _Requirements: 4.2, 4.5, 9.2, 9.3, 11.5, 11.6_

  - [x] 11.3 Create invoice routes (`backend/routes/invoice.routes.js`)
    - GET /api/invoices endpoint (protected, filtered by user role)
    - GET /api/invoices/:id endpoint (protected, with line items)
    - POST /api/invoices/import-from-tally endpoint (protected, seller only)
    - POST /api/invoices/:id/push-to-tally endpoint (protected, buyer only)
    - PUT /api/invoices/:id/status endpoint (protected, buyer only)
    - _Requirements: 12.3, 12.4, 12.5, 12.6_

- [x] 12. Implement log controller and routes
  - [x] 12.1 Create log controller (`backend/controllers/log.controller.js`)
    - Implement getLogs method: filter by invoice ID, company, event type, date range
    - Return logs in reverse chronological order
    - Apply role-based filtering (sellers see their logs, buyers see their logs, super_admin sees all)
    - _Requirements: 10.4, 10.5_

  - [x] 12.2 Create log routes (`backend/routes/log.routes.js`)
    - GET /api/logs endpoint (protected, with query filters)
    - _Requirements: 12.7_

- [x] 13. Implement super admin controller and routes
  - [x] 13.1 Create super admin controller (`backend/controllers/admin.controller.js`)
    - Implement getAllCompanies method: return all companies with integration status
    - Implement getSystemStats method: calculate total invoices, active companies, sync success rate
    - Implement manualMatch method: trigger matching for unmatched invoices
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 13.2 Create super admin routes (`backend/routes/admin.routes.js`)
    - GET /api/admin/companies endpoint (protected, super_admin only)
    - GET /api/admin/stats endpoint (protected, super_admin only)
    - POST /api/admin/match/:invoiceId endpoint (protected, super_admin only)

- [x] 14. Set up Express server and wire all routes
  - [x] 14.1 Create Express server (`backend/server.js`)
    - Initialize Express app with JSON body parser and CORS
    - Connect to MongoDB using database config
    - Register all route modules (auth, company, invoice, log, admin, field-mapping)
    - Apply error handling middleware as last middleware
    - Start server on port 5000
    - _Requirements: 12.10, 16.4_

- [x] 14.2 Implement user-configurable field mapping (ADDED)
  - Add fieldMapping schema to TallyConnection model
  - Create field mapping controller and routes
  - Update TallyConnector to use dynamic field mapping
  - Support invoice-level and line-item field customization

- [x] 15. Checkpoint - Ensure backend API is complete
  - Backend 100% complete with field mapping support!

- [x] 16. Initialize React frontend application
  - [x] 16.1 Set up React app structure
    - Create directory structure: contexts/, components/, pages/, services/
    - Configure React Router for multi-page navigation
    - Set up environment variable for API base URL
    - _Requirements: 13.1_

  - [x] 16.2 Create API service utilities (`frontend/src/services/api.js`)
    - Create axios instance with base URL and JWT token interceptor
    - Add request interceptor to attach JWT token from localStorage
    - Add response interceptor to handle 401 errors (redirect to login)
    - _Requirements: 12.9, 17.4_

- [x] 17. Implement frontend context providers for state management
  - [x] 17.1 Create AuthContext (`frontend/src/contexts/AuthContext.jsx`)
    - Manage authentication state (user, token, role, companyId)
    - Provide login, logout, and register methods
    - Persist token in localStorage
    - Implement useAuth hook for component access
    - _Requirements: 1.4_

  - [x] 17.2 Create InvoiceContext (`frontend/src/contexts/InvoiceContext.jsx`)
    - Manage invoice list state
    - Provide methods for fetching, filtering, and updating invoices
    - Implement useInvoices hook
    - _Requirements: 6.1, 7.1_

  - [x] 17.3 Create CompanyContext (`frontend/src/contexts/CompanyContext.jsx`)
    - Manage company profile state
    - Provide methods for fetching and updating company details
    - Implement useCompany hook
    - _Requirements: 2.4_

- [x] 18. Create API service modules for frontend
  - [x] 18.1 Create auth service (`frontend/src/services/authService.js`)
    - Implement login(email, password) - calls POST /api/auth/login
    - Implement register(userData) - calls POST /api/auth/register
    - Handle API errors and return user-friendly messages
    - _Requirements: 12.1, 12.2_

  - [x] 18.2 Create invoice service (`frontend/src/services/invoiceService.js`)
    - Implement getInvoices(filters) - calls GET /api/invoices
    - Implement getInvoiceById(id) - calls GET /api/invoices/:id
    - Implement importFromTally() - calls POST /api/invoices/import-from-tally
    - Implement pushToTally(id) - calls POST /api/invoices/:id/push-to-tally
    - Implement updateStatus(id, status) - calls PUT /api/invoices/:id/status
    - _Requirements: 12.3, 12.4, 12.5, 12.6_

  - [x] 18.3 Create company service (`frontend/src/services/companyService.js`)
    - Implement getMyCompany() - calls GET /api/company/me
    - Implement updateCompany(data) - calls PUT /api/company/me
    - Implement configureTally(config) - calls POST /api/company/tally-connection
    - Implement testConnection() - calls POST /api/company/test-connection
    - _Requirements: 12.8_

  - [x] 18.4 Create log service (`frontend/src/services/logService.js`)
    - Implement getLogs(filters) - calls GET /api/logs
    - _Requirements: 12.7_

- [x] 19. Create common UI components
  - [x] 19.1 Create Navbar component (`frontend/src/components/common/Navbar.jsx`)
    - Display navigation links based on user role (Dashboard, Company Profile, Sync Logs, Admin Panel)
    - Include logout button
    - _Requirements: 13.2, 13.3, 13.5, 13.6_

  - [x] 19.2 Create LoadingSpinner component (`frontend/src/components/common/LoadingSpinner.jsx`)
    - Display loading indicator during API calls
    - _Requirements: 13.8_

  - [x] 19.3 Create Notification component (`frontend/src/components/common/Notification.jsx`)
    - Display success and error messages with auto-dismiss
    - _Requirements: 13.9_

  - [x] 19.4 Create StatusBadge component (`frontend/src/components/common/StatusBadge.jsx`)
    - Display color-coded badges for invoice statuses (New, Accepted, Rejected, Pushed_to_Tally, Failed, Unmatched)
    - _Requirements: 6.2, 7.2_

- [x] 20. Create authentication components
  - [x] 20.1 Create LoginForm component (`frontend/src/components/auth/LoginForm.jsx`)
    - Email and password input fields with validation
    - Call authService.login on submit
    - Display error messages for invalid credentials
    - Redirect to dashboard on success
    - _Requirements: 13.1_

  - [x] 20.2 Create RegisterForm component (`frontend/src/components/auth/RegisterForm.jsx`)
    - Form fields for user registration (email, password, company name, GSTIN, phone, company type)
    - Call authService.register on submit
    - Display validation errors
    - _Requirements: 2.1_

- [x] 21. Create invoice components
  - [x] 21.1 Create InvoiceTable component (`frontend/src/components/invoice/InvoiceTable.jsx`)
    - Display invoice list in table format with columns: invoice number, date, seller/buyer name, total amount, status
    - Include action buttons based on user role (View Details, Push to Tally for buyers)
    - Apply responsive design for mobile, tablet, desktop
    - _Requirements: 6.2, 7.2, 13.7_

  - [x] 21.2 Create InvoiceDetailModal component (`frontend/src/components/invoice/InvoiceDetailModal.jsx`)
    - Display complete invoice header (seller, buyer, GSTIN, invoice number, date)
    - Display all line items in LineItemTable
    - Display subtotal, total tax, grand total
    - Display current status and last status change timestamp
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5_

  - [x] 21.3 Create LineItemTable component (`frontend/src/components/invoice/LineItemTable.jsx`)
    - Display line items with description, quantity, rate, taxable amount, tax amount
    - _Requirements: 8.3_

- [x] 22. Create company components
  - [x] 22.1 Create CompanyProfile component (`frontend/src/components/company/CompanyProfile.jsx`)
    - Display company name, GSTIN, email, phone, company type
    - Show Tally connection status indicator (connected, disconnected, error)
    - Allow editing contact details (email, phone)
    - _Requirements: 2.4, 3.4_

  - [x] 22.2 Create TallyConnectionForm component (`frontend/src/components/company/TallyConnectionForm.jsx`)
    - Form fields for API endpoint and credentials
    - Test Connection button to verify Tally connectivity
    - Display connection test results
    - _Requirements: 3.1, 3.3_

- [x] 23. Create log components
  - [x] 23.1 Create SyncLogTable component (`frontend/src/components/logs/SyncLogTable.jsx`)
    - Display logs in table with timestamp, event type, invoice ID, company, status, error message
    - Display in reverse chronological order
    - _Requirements: 10.4_

  - [x] 23.2 Create LogFilter component (`frontend/src/components/logs/LogFilter.jsx`)
    - Filter controls for invoice ID, company, event type, date range
    - _Requirements: 10.5_

- [x] 24. Checkpoint - Ensure frontend components are complete
  - All frontend components (invoice, company, log) created successfully!

- [x] 25. Create frontend pages and routing
  - [x] 25.1 Create LoginPage (`frontend/src/pages/LoginPage.jsx`)
    - Render LoginForm component
    - Include link to RegisterForm
    - _Requirements: 13.1_

  - [x] 25.2 Create SellerDashboard page (`frontend/src/pages/SellerDashboard.jsx`)
    - Display "Import from Tally" button
    - Render InvoiceTable with seller's invoices
    - Show unmatched invoices with distinct visual indicator
    - Handle import button click to trigger invoice import
    - Display loading spinner and success/error notifications
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 25.3 Create BuyerDashboard page (`frontend/src/pages/BuyerDashboard.jsx`)
    - Render InvoiceTable with buyer's matched invoices
    - Include Accept/Reject status change buttons
    - Include "Push to Tally" button (disabled after successful push)
    - Handle push to Tally with success/failure notification within 3 seconds
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 9.5, 9.6_

  - [x] 25.4 Create CompanyProfilePage (`frontend/src/pages/CompanyProfilePage.jsx`)
    - Render CompanyProfile component
    - Render TallyConnectionForm component
    - _Requirements: 13.5_

  - [x] 25.5 Create SyncLogsPage (`frontend/src/pages/SyncLogsPage.jsx`)
    - Render LogFilter component
    - Render SyncLogTable component with filtered results
    - _Requirements: 13.6_

  - [x] 25.6 Create SuperAdminPanel page (`frontend/src/pages/SuperAdminPanel.jsx`)
    - Display system statistics (total invoices, active companies, sync success rate)
    - Display all companies with integration status
    - Display all invoices across companies
    - Include manual match trigger for unmatched invoices
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

  - [x] 25.7 Set up React Router in App.jsx
    - Configure routes: /login, /seller-dashboard, /buyer-dashboard, /company-profile, /sync-logs, /admin
    - Implement protected route wrapper to check authentication
    - Redirect based on user role after login
    - _Requirements: 13.2, 13.3, 13.4, 13.5, 13.6_

- [x] 26. Create sample seed data and documentation
  - [~] 26.1 Create database seed script (`backend/scripts/seed.js`) - SKIPPED per user request
    - Create sample companies (1 seller, 2 buyers)
    - Create sample users for each company with hashed passwords
    - Create sample Tally connections with mock connector configuration
    - Create sample invoices with matched and unmatched statuses
    - Create sample line items for invoices
    - Create sample sync logs showing various event types
    - _Requirements: 20.1, 20.2, 20.3, 20.4_

  - [x] 26.2 Create README documentation (`README.md`)
    - Document project overview and technology stack
    - Include setup instructions (npm install, environment variables, database setup)
    - Document API endpoints with examples
    - Include user role descriptions and access patterns
    - Document how to run with MockConnector vs TallyConnector
    - Include sample .env file template
    - Document MVP scope and limitations (data-sharing layer only, no accounting features)
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [x] 26.3 Create TESTING_GUIDE.md
    - Complete step-by-step testing guide
    - Test scenarios for all user roles
    - Troubleshooting section
    - Test checklist

- [x] 27. Final integration and testing checkpoint
  - ✅ Frontend routing with React Router completed
  - ✅ All page components created and styled
  - ✅ Context providers implemented
  - ✅ Protected routes configured
  - ✅ Role-based dashboards working
  - ✅ Comprehensive testing guide created
  - Ready for user acceptance testing!

## Notes

- Tasks marked with `*` are optional property-based tests and can be skipped for faster MVP delivery
- All property tests validate universal correctness properties from the design document
- Unit tests and integration tests are embedded within implementation tasks as sub-bullets
- Each task references specific requirements for traceability to the requirements document
- Implementation uses JavaScript/Node.js for backend and React for frontend as specified in design
- The MockConnector allows development and testing without actual Tally API connectivity
- Checkpoints at tasks 8, 15, 24, and 27 provide natural break points to validate progress
- Backend tasks (1-15) must complete before frontend tasks (16-25) can fully integrate
- Database models (task 3) must be complete before controllers (tasks 9-13) can function
- Middleware (tasks 4-5) and services (task 7) are prerequisites for controller implementation
- Frontend context providers (task 17) and services (task 18) must exist before page components (task 25)
- The dependency structure ensures incremental progress with working functionality at each checkpoint

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2.1", "2.2", "2.3"] },
    { "id": 2, "tasks": ["2.4", "3.1", "3.2", "3.4", "3.7", "3.8"] },
    { "id": 3, "tasks": ["3.3", "3.5"] },
    { "id": 4, "tasks": ["3.6", "4.1"] },
    { "id": 5, "tasks": ["4.2", "5.1", "5.3", "6.1"] },
    { "id": 6, "tasks": ["5.2", "6.2", "6.3"] },
    { "id": 7, "tasks": ["7.1"] },
    { "id": 8, "tasks": ["7.2", "7.3"] },
    { "id": 9, "tasks": ["7.4", "9.1"] },
    { "id": 10, "tasks": ["9.2", "10.1"] },
    { "id": 11, "tasks": ["10.2", "11.1"] },
    { "id": 12, "tasks": ["11.2", "11.3", "12.1", "13.1"] },
    { "id": 13, "tasks": ["12.2", "13.2"] },
    { "id": 14, "tasks": ["14.1"] },
    { "id": 15, "tasks": ["16.1", "16.2"] },
    { "id": 16, "tasks": ["17.1", "17.2", "17.3"] },
    { "id": 17, "tasks": ["18.1", "18.2", "18.3", "18.4"] },
    { "id": 18, "tasks": ["19.1", "19.2", "19.3", "19.4"] },
    { "id": 19, "tasks": ["20.1", "20.2", "21.1", "22.1", "23.1"] },
    { "id": 20, "tasks": ["21.2", "21.3", "22.2", "23.2"] },
    { "id": 21, "tasks": ["25.1", "25.2", "25.3", "25.4", "25.5", "25.6"] },
    { "id": 22, "tasks": ["25.7"] },
    { "id": 23, "tasks": ["26.1", "26.2"] }
  ]
}
```
