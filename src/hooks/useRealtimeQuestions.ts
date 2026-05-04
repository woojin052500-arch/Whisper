import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Question, Room } from '@/lib/auth'

export const useRealtimeQuestions = (roomId: string, initialQuestions: Question[] = []) => {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)
  
  // Sync state with initialQuestions when they change
  useEffect(() => {
    setQuestions(initialQuestions)
  }, [initialQuestions])

  useEffect(() => {
    if (!roomId) return

    // Set up real-time subscription
    const subscription = supabase
      .channel(`questions_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `room_id=eq.${roomId}`
        },
        (payload) => {
          console.log('Real-time update received:', payload)
          
          if (payload.eventType === 'INSERT') {
            // New question added
            setQuestions(prev => [payload.new as Question, ...prev])
          } else if (payload.eventType === 'UPDATE') {
            // Question updated (answer added, status changed, likes incremented)
            setQuestions(prev => 
              prev.map(q => 
                q.id === payload.new.id ? payload.new as Question : q
              )
            )
          } else if (payload.eventType === 'DELETE') {
            // Question deleted
            setQuestions(prev => prev.filter(q => q.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [roomId])

  return questions
}

export const useRealtimeStudentQuestions = (studentId: string, initialQuestions: Question[] = []) => {
  const [questions, setQuestions] = useState<Question[]>(initialQuestions)

  // Sync state with initialQuestions when they change
  useEffect(() => {
    setQuestions(initialQuestions)
  }, [initialQuestions])

  useEffect(() => {
    if (!studentId) return

    // Set up real-time subscription for student's questions
    const subscription = supabase
      .channel(`student_questions_${studentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'questions',
          filter: `student_id=eq.${studentId}`
        },
        (payload) => {
          console.log('Real-time event received:', payload.eventType, payload.new?.id)
          if (payload.eventType === 'INSERT') {
            const newQuestion = payload.new as Question
            setQuestions(prev => {
              if (prev.find(q => q.id === newQuestion.id)) return prev
              return [newQuestion, ...prev]
            })
          }
          if (payload.eventType === 'UPDATE') {
            const updatedQuestion = payload.new as Question
            setQuestions(prev => prev.map(q => q.id === updatedQuestion.id ? updatedQuestion : q))
          }
          if (payload.eventType === 'DELETE') {
            setQuestions(prev => prev.filter(q => q.id !== payload.old.id))
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [studentId])

  return questions
}

export const useRealtimeRoom = (roomId: string, initialRoom: Room | null) => {
  const [room, setRoom] = useState<Room | null>(initialRoom)

  useEffect(() => {
    setRoom(initialRoom)
  }, [initialRoom])

  useEffect(() => {
    if (!roomId) return

    const subscription = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          console.log('Room update received:', payload)
          setRoom(payload.new as Room)
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [roomId])

  return room
}
