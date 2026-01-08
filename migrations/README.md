# Database Migrations

This directory contains SQL migration files for database schema changes.

## Running Migrations

### Option 1: Using Drizzle Kit (Recommended)

The project uses Drizzle ORM which can automatically sync schema changes:

```bash
npm run db:push
```

This will push all schema changes from `shared/schema.ts` directly to the database.

### Option 2: Manual SQL Execution

If you prefer to run migrations manually or Drizzle Kit doesn't work:

1. Connect to your PostgreSQL database using your preferred client (psql, pgAdmin, etc.)

2. Run the migration file:
   ```bash
   psql $DATABASE_URL -f migrations/create_lead_transfer_requests.sql
   ```

   Or using a database client:
   - Open the SQL file
   - Execute it against your database

3. Verify the table was created:
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_name = 'lead_transfer_requests';
   ```

## Migration Files

- `create_lead_transfer_requests.sql` - Creates the `lead_transfer_requests` table for the lead transfer request system

## Notes

- All migrations use `IF NOT EXISTS` clauses to prevent errors if run multiple times
- Foreign key constraints ensure data integrity
- Indexes are created for optimal query performance

