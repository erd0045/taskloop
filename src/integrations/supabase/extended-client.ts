
import { createClient } from '@supabase/supabase-js';
import { ExtendedDatabase } from '@/lib/database.types';

const SUPABASE_URL = "https://jcevycwicnnntzzakpnj.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpjZXZ5Y3dpY25ubnR6emFrcG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIzODE3MjYsImV4cCI6MjA1Nzk1NzcyNn0.LCmFH3GxkLX8sFbovSxqN1b4lgSn8K0oN3r4bwWhUa4";

export const extendedSupabase = createClient<ExtendedDatabase>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
