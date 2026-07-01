-- Add GPS coordinates to orders and order_requests for map navigation
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_lat  double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng  double precision;

ALTER TABLE order_requests
  ADD COLUMN IF NOT EXISTS delivery_lat  double precision,
  ADD COLUMN IF NOT EXISTS delivery_lng  double precision;
