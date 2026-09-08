import { pool } from "./db";

// saila_intake_sessions.customer_phone — see migrations/add_intake_session_customer_phone.sql.
// Applied at boot so a deploy needs no manual SQL step; ADD COLUMN IF NOT EXISTS
// is a no-op once present.
export async function ensureIntakeSessionCustomerPhoneColumn(): Promise<void> {
  await pool.query(
    `ALTER TABLE saila_intake_sessions ADD COLUMN IF NOT EXISTS customer_phone VARCHAR(30)`,
  );
}

export async function ensureLeadTransferRequestsTable(): Promise<void> {
  try {
    // Check if table exists
    const checkResult = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'lead_transfer_requests'
      );
    `);
    
    const tableExists = checkResult.rows[0]?.exists;
    
    if (!tableExists) {
      console.log("Creating lead_transfer_requests table...");
      
      await pool.query(`
        CREATE TABLE lead_transfer_requests (
          id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
          lead_id VARCHAR NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
          from_sheet_id VARCHAR NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
          to_sheet_id VARCHAR NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
          requested_by_user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) NOT NULL DEFAULT 'pending',
          approved_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
          rejected_by_user_id VARCHAR REFERENCES users(id) ON DELETE SET NULL,
          rejection_reason TEXT,
          approved_at TIMESTAMP,
          rejected_at TIMESTAMP,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);
      
      // Create indexes
      await pool.query(`
        CREATE INDEX idx_lead_transfer_requests_lead_id ON lead_transfer_requests(lead_id);
        CREATE INDEX idx_lead_transfer_requests_status ON lead_transfer_requests(status);
        CREATE INDEX idx_lead_transfer_requests_requested_by ON lead_transfer_requests(requested_by_user_id);
        CREATE INDEX idx_lead_transfer_requests_from_sheet ON lead_transfer_requests(from_sheet_id);
        CREATE INDEX idx_lead_transfer_requests_to_sheet ON lead_transfer_requests(to_sheet_id);
      `);
      
      console.log("lead_transfer_requests table created successfully");
    } else {
      console.log("lead_transfer_requests table already exists");
    }
  } catch (error: any) {
    // If it's a "relation already exists" error, that's fine
    if (error.message?.includes('already exists') || error.code === '42P07') {
      console.log("lead_transfer_requests table already exists (detected via error)");
      return;
    }
    throw error;
  }
}

