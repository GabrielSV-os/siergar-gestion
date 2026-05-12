-- Migration: Add RPC for getting DB size
CREATE OR REPLACE FUNCTION get_db_size()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN pg_database_size(current_database());
END;
$$;

GRANT EXECUTE ON FUNCTION get_db_size TO anon, authenticated;
