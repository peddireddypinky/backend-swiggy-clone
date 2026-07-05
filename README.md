# Swiggy Clone Backend API

A production-ready Node.js and MongoDB backend for a Swiggy-style food delivery platform.

## Features
- Authentication and role-based authorization
- Restaurant management and search
- Menu, cart, and order workflows
- Fraud detection and admin review
- Dynamic surge pricing
- Delivery partner assignment and order status tracking
- Recommendation engine

## Installation
1. Install dependencies: npm install
2. Start the server: npm start
3. Seed admin credentials: npm run seed:admin
4. Seed delivery partners: npm run seed:delivery

## Environment Variables
- PORT
- MONGO_URI
- MONGO_URI_DIRECT
- MONGO_URI_LOCAL
- JWT_SECRET

## Admin Credentials
- Email: admin@test.com
- Password: admin123

## API Overview
- POST /api/auth/register
- POST /api/auth/login
- GET /api/restaurants/search
- POST /api/orders/create
- POST /api/orders/cancel/:orderId
- GET /api/admin/statistics
- GET /api/admin/fraud/orders

## Deployment
The app is configured to run on a Node.js server with MongoDB.
