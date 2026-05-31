-- SUPERADMIN is stored as TEXT on SQLite; no column change required.
-- Promote a single existing ADMIN to SUPERADMIN when none exists yet.
UPDATE "User"
SET "role" = 'SUPERADMIN'
WHERE "id" = (
  SELECT "id" FROM "User" WHERE "role" = 'ADMIN' ORDER BY "createdAt" ASC LIMIT 1
)
AND NOT EXISTS (SELECT 1 FROM "User" WHERE "role" = 'SUPERADMIN');
