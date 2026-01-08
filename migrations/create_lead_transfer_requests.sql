-- Create lead_transfer_requests table
CREATE TABLE IF NOT EXISTS lead_transfer_requests (
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

-- Create index on lead_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_lead_transfer_requests_lead_id ON lead_transfer_requests(lead_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_lead_transfer_requests_status ON lead_transfer_requests(status);

-- Create index on requested_by_user_id for user queries
CREATE INDEX IF NOT EXISTS idx_lead_transfer_requests_requested_by ON lead_transfer_requests(requested_by_user_id);

-- Create index on company_id (via from_sheet_id) for admin queries
-- Note: This requires a join, but we can index the sheet_id for faster company filtering
CREATE INDEX IF NOT EXISTS idx_lead_transfer_requests_from_sheet ON lead_transfer_requests(from_sheet_id);
CREATE INDEX IF NOT EXISTS idx_lead_transfer_requests_to_sheet ON lead_transfer_requests(to_sheet_id);

