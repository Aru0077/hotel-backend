# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a hotel management backend built with NestJS, featuring a multi-role user system with comprehensive authentication. The system supports three user roles: Admin, Merchant, and Customer, with role-based access control and multiple authentication methods.

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
- Users can have multiple roles simultaneously
- Unified authentication system supporting username/email/phone + password/code
- OAuth integration (Facebook, Google)
- Phone verification via Alibaba Cloud SMS

### Module Structure
- **auth/** - Complete authentication system with multiple strategies
- **user/** - User management and profile operations
- **config/** - Environment configuration with validation
- **prisma/** - Database client and connection management
- **redis/** - Caching layer for sessions and verification codes
- **sms/** - Alibaba Cloud SMS integration for phone verification
- **common/** - Shared guards, interceptors, filters, and decorators

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

Role assignment happens after successful authentication, allowing users to have multiple active roles.

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