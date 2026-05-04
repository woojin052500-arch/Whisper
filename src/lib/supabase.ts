import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hzxvqvimlinqodvwkefp.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh6eHZxdmltbGlucW9kdndrZWZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MTUzMzgsImV4cCI6MjA4OTQ5MTMzOH0.gMJT-48XPCTsaXRrAFy-wdFU71yDwxJxGWYpXz_XT-E'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  realtime: {
    params: {
      eventsPerSecond: 2,
    },
  },
})

export type Database = {
  public: {
    Tables: {
      rooms: {
        Row: {
          id: string
          created_at: string
          room_name: string
          teacher_id: string
          is_active: boolean
        }
        Insert: {
          id?: string
          room_name: string
          teacher_id: string
          is_active?: boolean
        }
        Update: {
          id?: string
          room_name?: string
          teacher_id?: string
          is_active?: boolean
        }
      }
      students: {
        Row: {
          id: string
          created_at: string
          room_id: string
          nickname: string
          password_hash: string
        }
        Insert: {
          id?: string
          room_id: string
          nickname: string
          password_hash: string
        }
        Update: {
          id?: string
          room_id?: string
          nickname?: string
          password_hash?: string
        }
      }
      questions: {
        Row: {
          id: string
          created_at: string
          room_id: string
          student_id: string
          content: string
          likes_count: number
          answer_content: string | null
          status: 'pending' | 'answered'
        }
        Insert: {
          id?: string
          room_id: string
          student_id: string
          content: string
          likes_count?: number
          answer_content?: string | null
          status?: 'pending' | 'answered'
        }
        Update: {
          id?: string
          room_id?: string
          student_id?: string
          content?: string
          likes_count?: number
          answer_content?: string | null
          status?: 'pending' | 'answered'
        }
      }
    }
  }
}
