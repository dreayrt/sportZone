-- OPTIONAL alternative to php artisan db:seed --class=PartTwoSeeder.
-- Run AFTER php artisan migrate, inside the existing database.
-- Existing global addons and bookings are preserved. Rerunning is safe.
INSERT INTO addons (venue_id, code, name, category, price, unit, stock_quantity, image, status)
SELECT v.id, CONCAT('P2-V', v.id, '-A', a.id), a.name, a.category,
       a.price, a.unit, a.stock_quantity, a.image, a.status
FROM venues v CROSS JOIN addons a
LEFT JOIN addons existing ON existing.code = CONCAT('P2-V', v.id, '-A', a.id)
WHERE v.owner_id IS NOT NULL AND a.venue_id IS NULL AND existing.id IS NULL;
