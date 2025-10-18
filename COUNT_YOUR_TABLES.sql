-- Count how many tables exist in your database
SELECT COUNT(*) as total_tables_in_database
FROM pg_tables 
WHERE schemaname = 'public';

