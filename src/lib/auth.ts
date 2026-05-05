import bcrypt from 'bcryptjs'
import { v4 as uuidv4 } from 'uuid'
import { supabase } from './supabase'

export type Student = {
  id: string
  room_id: string
  nickname: string
  password_hash: string
}

export type Room = {
  id: string
  room_name: string
  teacher_id: string
  is_active: boolean
  created_at: string
  updated_at: string
  notice?: string
}

export type Question = {
  id: string
  room_id: string
  student_id: string
  content: string
  likes_count: number
  answer_content: string | null
  status: 'pending' | 'answered'
  created_at: string
}

export type Teacher = {
  id: string
  email: string
  name?: string
  is_admin: boolean
  is_premium: boolean
  premium_expires_at?: string
  payment_requests_count: number
  total_rooms_created: number
  created_at: string
}

export type PaymentRequest = {
  id: string
  teacher_id: string
  amount: number
  status: 'pending' | 'approved' | 'rejected'
  deposit_name?: string
  deposit_amount?: number
  deposit_date?: string
  approved_by?: string
  approved_at?: string
  notes?: string
  created_at: string
}

// Hash password
export const hashPassword = async (password: string): Promise<string> => {
  const saltRounds = 10
  return await bcrypt.hash(password, saltRounds)
}

// Verify password
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash)
}

// Test database connection
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    console.log('Testing database connection...')
    console.log('Supabase URL:', 'https://hzxvqvimlinqodvwkefp.supabase.co')
    
    const { data, error } = await supabase
      .from('rooms')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Database connection test failed:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      return false
    }
    
    console.log('Database connection test passed')
    return true
  } catch (error) {
    console.error('Database connection test error:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return false
  }
}

// Create a new room
export const createRoom = async (roomName: string, teacherId: string): Promise<Room | null> => {
  try {
    console.log('Creating room with:', { roomName, teacherId })
    
    // Test connection first
    const isConnected = await testDatabaseConnection()
    if (!isConnected) {
      throw new Error('Database connection failed')
    }
    
    console.log('Attempting to insert room...')
    
    const { data, error } = await supabase
      .from('rooms')
      .insert([{ 
        room_name: roomName, 
        teacher_id: teacherId,
        is_active: true 
      }])
      .select()
      .single()

    console.log('Insert result:', { data, error })

    if (error) {
      console.error('Supabase error:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      throw error
    }
    
    console.log('Room created successfully:', data)
    return data
  } catch (error) {
    console.error('Error creating room:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return null
  }
}

// Get room by ID
export const getRoomById = async (roomId: string): Promise<Room | null> => {
  // Validate UUID format to prevent Supabase syntax errors
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(roomId)) {
    console.log('Invalid UUID format for getRoomById:', roomId);
    return null;
  }

  try {
    console.log('Getting room by ID:', roomId)
    
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single()

    console.log('Room query result:', { data, error })

    if (error) {
      console.error('Supabase error getting room:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      throw error
    }
    
    return data
  } catch (error) {
    console.error('Error getting room:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return null
  }
}

// Get room by 6-digit code
export const getRoomByCode = async (code: string): Promise<Room | null> => {
  try {
    console.log('Getting room by code:', code)
    
    // UUID columns in Supabase don't support 'like' directly in the JS client
    // So we fetch recent rooms and filter in JS. For a typical app scale, this is efficient.
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000)

    if (error) {
      console.error('Supabase error getting rooms for code lookup:', error)
      throw error
    }
    
    // Find the room where ID ends with the code
    const foundRoom = data?.find(room => 
      room.id.toLowerCase().endsWith(code.toLowerCase())
    )
    
    return foundRoom || null
  } catch (error) {
    console.error('Error getting room by code:', error)
    return null
  }
}

// Update room notice
export const updateRoomNotice = async (roomId: string, notice: string): Promise<boolean> => {
  try {
    console.log('Updating notice for room:', roomId, 'with text:', notice)
    const { error } = await supabase
      .from('rooms')
      .update({ 
        notice,
        updated_at: new Date().toISOString()
      })
      .eq('id', roomId)

    if (error) {
      console.error('Supabase error updating notice:', error)
      throw error
    }
    return true
  } catch (error) {
    console.error('Error in updateRoomNotice:', error)
    return false
  }
}

// Get rooms by teacher ID
export const getRoomsByTeacher = async (teacherId: string): Promise<Room[]> => {
  try {
    console.log('Getting rooms for teacher:', teacherId)
    
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    console.log('Teacher rooms query result:', { data, error })

    if (error) {
      console.error('Supabase error getting teacher rooms:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error getting teacher rooms:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return []
  }
}

// Delete room
export const deleteRoom = async (roomId: string): Promise<boolean> => {
  try {
    console.log('Deleting room:', roomId)
    
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)

    if (error) {
      console.error('Supabase error deleting room:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      throw error
    }
    
    return true
  } catch (error) {
    console.error('Error deleting room:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return false
  }
}

// Payment system functions

// Get or create teacher
export const getOrCreateTeacher = async (email: string, name?: string): Promise<Teacher | null> => {
  try {
    // First try to get existing teacher
    const { data: existingTeacher, error: getError } = await supabase
      .from('teachers')
      .select('*')
      .eq('email', email)
      .single()

    if (existingTeacher) {
      return existingTeacher
    }

    // Create new teacher if not exists
    const { data, error } = await supabase
      .from('teachers')
      .insert([{ email, name }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error getting/creating teacher:', error)
    return null
  }
}

// Create payment request
export const createPaymentRequest = async (teacherId: string, amount: number = 10000): Promise<PaymentRequest | null> => {
  try {
    const { data, error } = await supabase
      .from('payment_requests')
      .insert([{ teacher_id: teacherId, amount }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating payment request:', error)
    return null
  }
}

// Get payment requests for admin
export const getPaymentRequests = async (status?: 'pending' | 'approved' | 'rejected'): Promise<PaymentRequest[]> => {
  try {
    console.log('Getting payment requests with status:', status)
    
    let query = supabase
      .from('payment_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    console.log('Payment requests query result:', { data, error })

    if (error) {
      console.error('Supabase error getting payment requests:', error)
      console.error('Error details:', JSON.stringify(error, null, 2))
      throw error
    }
    
    return data || []
  } catch (error) {
    console.error('Error getting payment requests:', error)
    console.error('Error details:', JSON.stringify(error, null, 2))
    return []
  }
}

// Approve payment request
export const approvePaymentRequest = async (requestId: string, adminId: string, depositName?: string, depositAmount?: number): Promise<boolean> => {
  try {
    const premiumExpiresAt = new Date()
    premiumExpiresAt.setFullYear(premiumExpiresAt.getFullYear() + 1) // 1 year from now

    // Get the payment request to get teacher_id
    const { data: request, error: getError } = await supabase
      .from('payment_requests')
      .select('teacher_id')
      .eq('id', requestId)
      .single()

    if (getError || !request) throw getError || new Error('Request not found')

    // Get admin's teacher ID
    const { data: adminTeacher } = await supabase
      .from('teachers')
      .select('id')
      .eq('email', adminId)
      .single()

    const adminUUID = adminTeacher?.id || adminId // Fallback to email if ID not found, but DB will likely error if it expects UUID

    // Update payment request
    const { error: updateError } = await supabase
      .from('payment_requests')
      .update({
        status: 'approved',
        deposit_name: depositName,
        deposit_amount: depositAmount,
        deposit_date: new Date().toISOString(),
        approved_by: adminUUID,
        approved_at: new Date().toISOString()
      })
      .eq('id', requestId)

    if (updateError) throw updateError

    // Update teacher to premium
    const { error: teacherError } = await supabase
      .from('teachers')
      .update({
        is_premium: true,
        payment_status: 'approved',
        premium_expires_at: premiumExpiresAt.toISOString()
      })
      .eq('id', request.teacher_id)

    if (teacherError) throw teacherError

    return true
  } catch (error) {
    console.error('Error approving payment request:', error)
    return false
  }
}

// Reject payment request
export const rejectPaymentRequest = async (requestId: string, adminId: string, notes?: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('payment_requests')
      .update({
        status: 'rejected',
        approved_by: adminId,
        approved_at: new Date().toISOString(),
        notes
      })
      .eq('id', requestId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error rejecting payment request:', error)
    return false
  }
}

// Check if teacher is premium
export const isTeacherPremium = async (email: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('teachers')
      .select('is_premium, premium_expires_at')
      .eq('email', email)
      .single()

    if (error) return false

    if (!data?.is_premium) return false

    // Check if premium is still valid
    if (data.premium_expires_at) {
      const expiryDate = new Date(data.premium_expires_at)
      const now = new Date()
      return expiryDate > now
    }

    return true
  } catch (error) {
    console.error('Error checking premium status:', error)
    return false
  }
}

// Create or get student session
export const createStudentSession = async (
  roomId: string,
  nickname: string,
  password: string
): Promise<Student | null> => {
  try {
    // Check if nickname already exists in this room
    const { data: existingStudent, error: checkError } = await supabase
      .from('students')
      .select('*')
      .eq('room_id', roomId)
      .eq('nickname', nickname)
      .single()

    if (existingStudent) {
      // Verify password for existing student
      const isValidPassword = await verifyPassword(password, existingStudent.password_hash)
      if (isValidPassword) {
        return existingStudent
      } else {
        throw new Error('이미 사용 중인 닉네임입니다.')
      }
    }

    // Create new student
    const passwordHash = await hashPassword(password)
    const { data, error } = await supabase
      .from('students')
      .insert([{ room_id: roomId, nickname, password_hash: passwordHash }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error creating student session:', error)
    return null
  }
}

// Verify student login
export const verifyStudentLogin = async (
  roomId: string,
  nickname: string,
  password: string
): Promise<Student | null> => {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('*')
      .eq('room_id', roomId)
      .eq('nickname', nickname)
      .single()

    if (error) throw error

    const isValidPassword = await verifyPassword(password, data.password_hash)
    if (!isValidPassword) {
      throw new Error('비밀번호가 일치하지 않습니다.')
    }

    return data
  } catch (error) {
    console.error('Error verifying student login:', error)
    return null
  }
}

// Submit a question
export const submitQuestion = async (
  roomId: string,
  studentId: string,
  content: string
): Promise<Question | null> => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .insert([{ room_id: roomId, student_id: studentId, content }])
      .select()
      .single()

    if (error) throw error
    return data
  } catch (error) {
    console.error('Error submitting question:', error)
    return null
  }
}

// Get questions for a room
export const getQuestionsByRoom = async (
  roomId: string,
  sortBy: 'latest' | 'likes' = 'latest'
): Promise<Question[]> => {
  try {
    let query = supabase
      .from('questions')
      .select('*')
      .eq('room_id', roomId)

    if (sortBy === 'likes') {
      query = query.order('likes_count', { ascending: false })
    } else {
      query = query.order('created_at', { ascending: false })
    }

    const { data, error } = await query

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting questions:', error)
    return []
  }
}


// Get questions by student
export const getQuestionsByStudent = async (studentId: string): Promise<Question[]> => {
  try {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Error getting student questions:', error)
    return []
  }
}

// Like a question
export const likeQuestion = async (questionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase.rpc('increment_question_likes', {
      question_uuid: questionId
    })

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error liking question:', error)
    return false
  }
}

// Answer a question
export const answerQuestion = async (questionId: string, answerContent: string): Promise<boolean> => {
  try {
    console.log('Attempting to save answer for:', questionId)
    const { data, error } = await supabase
      .from('questions')
      .update({ 
        answer_content: answerContent,
        status: 'answered'
      })
      .eq('id', questionId)
      .select()

    if (error) {
      console.error('Supabase error answering question:', error)
      return false
    }

    if (!data || data.length === 0) {
      console.warn('No rows updated. Check if question ID is valid and RLS allowed.')
      return false
    }

    console.log('Answer saved successfully:', data[0])
    return true
  } catch (err) {
    console.error('Catch error answering question:', err)
    return false
  }
}

// Mark question as answered in class
export const markQuestionAnswered = async (questionId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('questions')
      .update({ status: 'answered' })
      .eq('id', questionId)

    if (error) throw error
    return true
  } catch (error) {
    console.error('Error marking question as answered:', error)
    return false
  }
}

// Request payment verification with auto-registration
export const requestPaymentVerification = async (email: string): Promise<boolean> => {
  try {
    console.log('Requesting payment verification for:', email)
    
    // 1. First, ensure the teacher exists and get their ID
    const { data: teacher, error: fetchError } = await supabase
      .from('teachers')
      .select('id, email')
      .eq('email', email)
      .single()

    let currentTeacherId = teacher?.id

    if (fetchError || !teacher) {
      console.log('Teacher not found, creating new record...')
      const { data: newTeacher, error: createError } = await supabase
        .from('teachers')
        .insert([{ email, is_premium: false, payment_status: 'pending' }])
        .select()
        .single()
      
      if (createError) throw createError
      currentTeacherId = newTeacher.id
    } else {
      // 2. Update existing teacher status
      await supabase
        .from('teachers')
        .update({ payment_status: 'pending' })
        .eq('email', email)
    }
    
    // 3. Insert a new record into payment_requests table for the admin panel
    const { error: requestError } = await supabase
      .from('payment_requests')
      .insert([{
        teacher_id: currentTeacherId,
        amount: 990,
        status: 'pending',
        created_at: new Date().toISOString()
      }])

    if (requestError) {
      console.error('Error creating payment request record:', requestError)
      // Even if this fails, we return true if the teacher status was updated
      // but ideally both should succeed.
    }
    
    return true
  } catch (error) {
    console.error('Error requesting payment verification:', error)
    return false
  }
}
