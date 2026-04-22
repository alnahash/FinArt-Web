import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://phuwnolfplexyozczrrd.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBodXdub2xmcGxleHlvemN6cnJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2OTA0MjcsImV4cCI6MjA5MjI2NjQyN30.tBlxY2Hcbzxhwl7xjJQwascxLZZh5YQXdqThm-AVcGc'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
