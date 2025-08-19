# MyProBuddy - Partner Onboarding & Lead Management System

## Overview

MyProBuddy is a comprehensive web application designed for Partner onboarding and lead management. The system supports two primary service types: Grant and Equity funding assistance. It provides Partner-specific submission links and QR codes, captures detailed lead information through type-specific forms, and manages leads through a structured status hierarchy with automated progression rules. The application features role-based access control, comprehensive reporting capabilities, and CSV-based data export functionality.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **Routing**: Wouter for client-side routing with protected routes based on user roles
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Forms**: React Hook Form with Zod validation for type-safe form handling
- **UI Theme**: Clean, minimal design inspired by Zoho with consistent color scheme (blue primary, red destructive, green success)

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Session Management**: Express sessions with configurable storage backends
- **Authentication**: bcrypt for password hashing with role-based access control
- **Data Storage**: CSV-based storage system with file locking mechanisms for concurrent access
- **API Design**: RESTful endpoints with comprehensive error handling and logging

### Data Storage Solutions
- **Primary Storage**: CSV files for all data persistence (users, Partners, leads, status hierarchy, activity logs)
- **CSV Service**: Custom implementation with file locking for thread-safe operations
- **Memory Storage**: In-memory caching layer for improved performance during development
- **Database Preparation**: Drizzle ORM configuration for PostgreSQL (ready for production migration)

### Authentication and Authorization
- **Session-Based Auth**: Express sessions with secure cookie configuration
- **Role-Based Access Control (RBAC)**: Four user roles with granular permissions:
  - Admin: Full system access including user management
  - Manager: Partner and lead management, reporting access
  - Partner: Limited access to own Partner data and leads
  - Analyst: Read-only access to leads and reports
- **Route Protection**: Client-side route guards based on user roles
- **Password Security**: bcrypt hashing with configurable salt rounds

### Lead Management Engine
- **Status Hierarchy**: Configurable status progression with automatic advancement rules
- **Status Engine**: Background service for automatic status transitions based on time limits
- **Activity Logging**: Comprehensive audit trail for all system actions
- **Form Processing**: Dynamic form handling for Grant and Equity applications with JSON storage

## External Dependencies

### UI and Design
- **Radix UI**: Comprehensive component primitives for accessible UI components
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Lucide React**: Icon library for consistent iconography
- **shadcn/ui**: Pre-built component library following design system principles

### Data Processing
- **csv-parser**: CSV file reading capabilities
- **csv-writer**: CSV file writing and export functionality
- **date-fns**: Date manipulation and formatting utilities

### Development Tools
- **Vite**: Fast build tool with hot module replacement
- **TypeScript**: Type safety across the entire application
- **Zod**: Runtime type validation and schema definition
- **ESBuild**: Fast JavaScript bundler for production builds

### Session and Security
- **express-session**: Session management middleware
- **bcrypt**: Password hashing and verification
- **connect-pg-simple**: PostgreSQL session store (prepared for production)

### Replit Integration
- **@replit/vite-plugin-runtime-error-modal**: Development error handling
- **@replit/vite-plugin-cartographer**: Development environment enhancements