# CWRVC Water Billing App

A role-based water billing and utility management web application for Centennial Water Resource Venture Corporation. The app provides a modern dashboard for managing customer accounts, generating bills, processing payments, capturing meter readings, handling service requests, and supporting staff operations.

## Overview

This project combines a React + TypeScript frontend with Firebase services for authentication, Firestore, storage, and serverless functions. It is designed for water utility operations and includes a multi-role workflow for administrators, staff, and meter readers.

## Key Features

- Secure sign-in with role-based access for admin, staff, and meter readers
- Customer account and billing management
- Bill generation, viewing, and payment tracking
- Meter reading workflow for field staff
- Service requests and customer support handling
- Reporting and analytics views
- Feedback and staff management
- Email and SMS-related functionality through Firebase Functions and the SMS proxy service

## Tech Stack

- Frontend: React, TypeScript, Vite, React Router, Tailwind CSS
- UI: Radix UI components and custom shadcn-style building blocks
- Backend: Firebase Authentication, Firestore, Storage, and Cloud Functions
- Data/Utilities: Supabase client, Chart.js/Recharts, PDF/Excel export helpers, QR code support

## Project Structure

- src/components — Application screens and feature modules
- src/contexts — Authentication context and provider
- src/lib — Firebase and Supabase configuration
- src/services — Service-layer helpers for auth, billing, and related workflows
- functions/src — Firebase Cloud Functions
- sms-proxy — Lightweight SMS proxy service
- public/assets — Static assets such as branding and background images

## Prerequisites

- Node.js 22 LTS (recommended; required by the Functions project)
- npm
- A Firebase project with Authentication, Firestore, Storage, and Cloud Functions enabled
- Optional: a Supabase project if you plan to use the Supabase integration

## Getting Started

1. Clone the repository.
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Install Cloud Functions dependencies:
   ```bash
   cd functions
   npm install
   cd ..
   ```
4. Create a root environment file named .env.local with your Firebase and Supabase settings:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_TEMPO=false
   ```
5. Start the frontend development server:
   ```bash
   npm run dev
   ```
6. Start the Firebase Functions emulator locally if needed:
   ```bash
   cd functions
   npm run serve
   ```

## Available Scripts

### Root project

- npm run dev — start the Vite development server
- npm run build — type-check and create a production build
- npm run preview — preview the production build locally
- npm run lint — run ESLint across the frontend codebase

### Functions project

- npm run build — compile the Cloud Functions TypeScript code
- npm run serve — start Firebase emulators for functions
- npm run deploy — deploy functions to Firebase

## Deployment

- Frontend hosting is configured through Firebase Hosting in firebase.json.
- Functions are deployed from the functions directory.
- Storage rules are defined in storage.rules.

## Notes

- The login flow checks the Firestore staffs collection for active user records, so your Firebase project needs the corresponding staff data seeded before first use.
- The current build has been verified successfully with npm run build. Vite reports some chunk-size warnings for large Firebase-related bundles, but the production build completes successfully.
