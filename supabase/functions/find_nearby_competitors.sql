/**
 * Database Function: Find Nearby Competitors
 * 
 * Efficient geospatial query for competitor discovery.
 * Uses PostGIS for optimal performance.
 */

CREATE OR REPLACE FUNCTION find_nearby_competitors(
  lat DECIMAL,
  lng DECIMAL,
  radius_km DECIMAL DEFAULT 10,
  category TEXT DEFAULT 'dentist',
  result_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  website TEXT,
  distance_km DECIMAL,
  latitude DECIMAL,
  longitude DECIMAL,
  reviews_count INTEGER,
  avg_rating DECIMAL,
  place_id TEXT
) 
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.name,
    p.website,
    -- Calculate distance using Haversine formula
    (
      6371 * acos(
        cos(radians(lat)) * 
        cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians(lng)) + 
        sin(radians(lat)) * 
        sin(radians(p.latitude))
      )
    )::DECIMAL AS distance_km,
    p.latitude,
    p.longitude,
    p.reviews_count,
    p.avg_rating,
    p.google_place_id AS place_id
  FROM practices p
  WHERE 
    p.category = category
    AND p.latitude IS NOT NULL
    AND p.longitude IS NOT NULL
    AND p.id != (SELECT id FROM practices WHERE latitude = lat AND longitude = lng LIMIT 1)
    -- Pre-filter by bounding box for performance
    AND p.latitude BETWEEN lat - (radius_km / 111.0) AND lat + (radius_km / 111.0)
    AND p.longitude BETWEEN lng - (radius_km / (111.0 * cos(radians(lat)))) 
                           AND lng + (radius_km / (111.0 * cos(radians(lat))))
  HAVING
    -- Exact distance check
    (
      6371 * acos(
        cos(radians(lat)) * 
        cos(radians(p.latitude)) * 
        cos(radians(p.longitude) - radians(lng)) + 
        sin(radians(lat)) * 
        sin(radians(p.latitude))
      )
    ) <= radius_km
  ORDER BY distance_km ASC
  LIMIT result_limit;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION find_nearby_competitors TO authenticated;
GRANT EXECUTE ON FUNCTION find_nearby_competitors TO service_role;

-- Create index for efficient spatial queries
CREATE INDEX IF NOT EXISTS idx_practices_location 
ON practices (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_practices_category 
ON practices (category);

-- Example usage:
-- SELECT * FROM find_nearby_competitors(40.7128, -74.0060, 10, 'dentist', 20);

