-- Check if contacts table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'contacts'
) as contacts_exists;

-- Check llm_usage columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'llm_usage'
ORDER BY ordinal_position;

-- Check email_events columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_schema = 'public' 
AND table_name = 'email_events'
ORDER BY ordinal_position;
