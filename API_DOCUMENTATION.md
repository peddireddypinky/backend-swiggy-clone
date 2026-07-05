# API Documentation

## Auth
- POST /api/auth/register
- POST /api/auth/login

## Restaurants
- POST /api/restaurants/
- GET /api/restaurants/my
- GET /api/restaurants/search
- GET /api/restaurants/recommendations/:userId
- PUT /api/restaurants/:id

## Orders
- POST /api/orders/create
- POST /api/orders/cancel/:orderId
- POST /api/orders/refund/:orderId
- GET /api/orders/my
- GET /api/orders/:orderId
- PUT /api/orders/update-status/:orderId
- POST /api/orders/calculate-delivery-fee

## Admin
- GET /api/admin/statistics
- GET /api/admin/orders
- GET /api/admin/surge-settings
- POST /api/admin/surge-settings
- PUT /api/admin/surge-settings/:id
- GET /api/admin/fraud/orders
- POST /api/admin/fraud/approve/:orderId
- POST /api/admin/fraud/reject/:orderId
- POST /api/admin/fraud/restrict/:userId

## Delivery
- POST /api/delivery/set-status
- POST /api/delivery/decline/:orderId
