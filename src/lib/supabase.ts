import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://phuwnolfplexyozczrrd.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_mLLsE5Tu1LUiV5sbA9-sYQ_utkQ_lYd'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
