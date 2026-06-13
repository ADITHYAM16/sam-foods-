-- Remove saved addresses that have no coordinates (these were saved before radius validation was added)
-- Users must re-add their addresses which will now be validated against the 10km delivery radius
DELETE FROM saved_addresses WHERE lat IS NULL AND lng IS NULL AND label != 'Current Location';
