import { createClient } from '@supabase/supabase-js'

// Paste your actual values here directly
const SUPABASE_URL = 'https://kqorbtwggcjalbpuhqbt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtxb3JidHdnZ2NqYWxicHVocWJ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI2ODM3NjksImV4cCI6MjA5ODI1OTc2OX0.BJlrOH7MQ7LfLf5Zb4QX6UntTY86T_aPzqCDPQu81_c'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
})