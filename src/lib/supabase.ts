import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or Anon Key is missing. Check your environment variables.')
}

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
          updated_at: string
          room_name: string
          teacher_id: string
          is_active: boolean
          notice: string | null
        }
        Insert: {
          id?: string
          room_name: string
          teacher_id: string
          is_active?: boolean
          notice?: string | null
        }
        Update: {
          id?: string
          room_name?: string
          teacher_id?: string
          is_active?: boolean
          notice?: string | null
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
