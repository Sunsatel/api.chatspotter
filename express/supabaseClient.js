// this file lives on the server
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://yrgsveuvexfhoprjcjvq.supabase.co"
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3N2ZXV2ZXhmaG9wcmpjanZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Nzc5ODAxMjksImV4cCI6MTk5MzU1NjEyOX0.xSOJxnh1tuLfUVaT2n4Gcl6jSqf3kmBzOrP39qD1xvk"
const supabaseServiceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyZ3N2ZXV2ZXhmaG9wcmpjanZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTY3Nzk4MDEyOSwiZXhwIjoxOTkzNTU2MTI5fQ.o3bN5SdDwpbIuGFoc_uZfcj5_LHIW3yZdA7CWPg2ykg"

export const supabase = createClient(supabaseUrl, supabaseServiceKey)