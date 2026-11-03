CREATE TABLE IF NOT EXISTS creative_execution_jobs (
 id text PRIMARY KEY, brand_id text NOT NULL,
 limit_usd numeric(18,6) NOT NULL CHECK(limit_usd > 0),
 reserved_usd numeric(18,6) NOT NULL DEFAULT 0 CHECK(reserved_usd >= 0),
 created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS creative_execution_policy (
 kind text PRIMARY KEY CHECK(kind IN ('reasoning','image')),
 active_limit integer NOT NULL CHECK(active_limit BETWEEN 1 AND 16),
 queue_limit integer NOT NULL CHECK(queue_limit BETWEEN 1 AND 4096)
);
CREATE TABLE IF NOT EXISTS creative_execution_requests (
 job_id text NOT NULL REFERENCES creative_execution_jobs(id), kind text NOT NULL,
 request_key text NOT NULL, input_hash text NOT NULL, payload jsonb NOT NULL,
 reservation_usd numeric(18,6) NOT NULL CHECK(reservation_usd > 0),
 state text NOT NULL CHECK(state IN ('queued','leased','dispatched','completed','unknown','cancelled')),
 owner text, lease_token uuid, lease_until timestamptz, deadline timestamptz NOT NULL,
 response jsonb, error_code text,
 created_at timestamptz NOT NULL DEFAULT clock_timestamp(), updated_at timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(job_id,kind,request_key)
);
CREATE INDEX IF NOT EXISTS creative_execution_queue ON creative_execution_requests(kind,state,created_at);
