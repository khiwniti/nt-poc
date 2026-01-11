-- Add geospatial coordinates to facilities table
-- Migration: 003_add_facility_geospatial.sql
-- Purpose: Enable map-based visualization of facilities with real-time status updates

-- Add latitude and longitude columns
ALTER TABLE facilities
ADD COLUMN latitude DECIMAL(10, 8),
ADD COLUMN longitude DECIMAL(11, 8);

-- Create index for geospatial queries
CREATE INDEX idx_facilities_coordinates ON facilities(latitude, longitude);

-- Populate existing facilities with Bangkok area coordinates
-- Bangkok center: 13.7563°N, 100.5018°E
-- Spread facilities in ~50km radius for realistic map view
UPDATE facilities
SET
  latitude = 13.7563 + (random() * 0.5 - 0.25),  -- ±0.25° (~28km range)
  longitude = 100.5018 + (random() * 0.5 - 0.25)
WHERE latitude IS NULL;

-- Add column comments for documentation
COMMENT ON COLUMN facilities.latitude IS 'Facility latitude coordinate in decimal degrees (WGS84)';
COMMENT ON COLUMN facilities.longitude IS 'Facility longitude coordinate in decimal degrees (WGS84)';
