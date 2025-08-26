# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a hotel management backend built with NestJS, featuring a multi-role user system with comprehensive authentication. The system serves three independent frontend applications corresponding to three user roles: ADMIN (Administrator), MERCHANT (Merchant), and CUSTOMER (Customer).

**Important Architecture Decisions:**
- **Single Role Per User**: The system does not support role switching functionality. Each user maintains a single role identity throughout their entire lifecycle.
- **Role-Required Authentication**: Role information is a mandatory parameter in all login and registration endpoints.
- **Role-Based Access Control**: The system determines user permissions and accessible feature modules based on their assigned role.
- **Separate Frontend Applications**: Three distinct frontend applications serve different user roles, each with role-specific interfaces and functionality.

## Common Commands

### Development
- `npm run start:dev` - Start development server with watch mode
- `npm run start` - Start production server  
- `npm run start:debug` - Start with debugging enabled

### Testing
- `npm run test` - Run unit tests
- `npm run test:watch` - Run tests in watch mode
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:cov` - Run tests with coverage

### Code Quality
- `npm run lint` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier
- `npm run build` - Build the project

### Database
- `npx prisma generate` - Generate Prisma client
- `npx prisma db push` - Push schema changes to database
- `npx prisma migrate dev` - Create and apply new migration
- `npx prisma studio` - Launch Prisma Studio GUI

## Architecture Overview

### Database Schema
The system uses a flexible multi-role architecture with PostgreSQL:

- **User** - Core user entity with basic information
- **AuthCredential** - Stores all authentication identifiers (username, email, phone, OAuth)
- **UserRole** - Junction table linking users to specific roles
- **Merchant/Customer/Admin** - Role-specific information tables

Key features:
- Single role per user (no role switching)
- Unified authentication system supporting username/email/phone + password/code
- OAuth integration (Facebook, Google)
- Phone verification via Alibaba Cloud SMS
- Role-specific data isolation and permissions

### Module Structure
- **auth/** - Complete authentication system with role-based strategies
  - **services/** - Password, token, verification code, and OAuth services
  - **guards/** - Authentication guards for different strategies
  - **strategies/** - Passport strategies (JWT, local, Facebook, Google)
- **user/** - User management and profile operations
- **config/** - Environment configuration with validation
- **prisma/** - Database client and connection management
- **redis/** - Caching layer for sessions and verification codes
- **sms/** - Alibaba Cloud SMS integration for phone verification
- **common/** - Shared utilities, guards, interceptors, filters, and decorators
  - **utils/** - Unified validation utilities (ValidatorsUtil)

### Global Configuration
- JWT-based authentication with refresh tokens
- Global rate limiting via Throttler
- Response transformation interceptor for consistent API responses
- Global exception filter for error handling
- Request logging interceptor

### Authentication Flow
The system supports multiple authentication methods:
1. Username/Email/Phone + Password
2. Email/Phone + Verification Code
3. OAuth (Facebook, Google)

**Role-Specific Authentication:**
- Role type (ADMIN/MERCHANT/CUSTOMER) is required for all authentication requests
- Users are created with a single, permanent role that cannot be changed
- Each authentication attempt validates the user's role against the requested role
- Role-specific business logic is applied during registration (e.g., MERCHANT status starts as INACTIVE for approval)

### Environment Variables
Key environment variables include:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_HOST`, `REDIS_PORT` - Redis configuration
- `JWT_SECRET`, `JWT_REFRESH_SECRET` - JWT tokens
- `FACEBOOK_APP_ID`, `GOOGLE_CLIENT_ID` - OAuth credentials
- `ALIBABA_CLOUD_ACCESS_KEY_*` - SMS service credentials

### Testing Strategy
- Unit tests with Jest for individual components
- E2E tests for API endpoints
- Test database separate from development/production