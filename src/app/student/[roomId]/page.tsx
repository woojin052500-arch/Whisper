'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getRoomById, getRoomByCode, createStudentSession, verifyStudentLogin, submitQuestion, getQuestionsByStudent, likeQuestion, updateRoomNotice } from '@/lib/auth'
import { Room, Student, Question } from '@/lib/auth'
import { useRealtimeQuestions, useRealtimeRoom } from '@/hooks/useRealtimeQuestions'

export default function StudentRoom() {
  const params = useParams()
  const router = useRouter()
  const roomId = (params.roomId as string).trim()

  const [room, setRoom] = useState<Room | null>(null)
  const [student, setStudent] = useState<Student | null>(null)
  const [nickname, setNickname] = useState('')
  const [password, setPassword] = useState('')
  const [questionText, setQuestionText] = useState('')
  const [initialQuestions, setInitialQuestions] = useState<Question[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(1)

  // Use real-time questions hook
  const allQuestions = useRealtimeQuestions(room?.id || '', initialQuestions)

  // Filter all questions to show only the ones belonging to THIS student
  const myQuestions = allQuestions.filter(q => q.student_id === student?.id)
  
  // Get the latest version of the selected question for real-time modal updates
  const activeQuestion = selectedQuestion 
    ? allQuestions.find(q => q.id === selectedQuestion.id) || selectedQuestion
    : null
  
  // Use real-time room hook for notices
  const realtimeRoom = useRealtimeRoom(room?.id || '', room)

  useEffect(() => {
    loadRoom()
    // Check tutorial
    const hasSeenTutorial = localStorage.getItem('has_seen_student_tutorial')
    if (!hasSeenTutorial) {
      setShowTutorial(true)
    }
    // Restore student session from localStorage
    const sessionKey = `student_auth_${roomId}`
    const savedSession = localStorage.getItem(sessionKey) || localStorage.getItem(`student_session_${roomId}`)
    if (savedSession) {
      try {
        const studentData = JSON.parse(savedSession)
        setStudent(studentData)
        loadStudentQuestions(studentData.id)
        // Migrate to new key if using old one
        if (!localStorage.getItem(sessionKey)) {
          localStorage.setItem(sessionKey, savedSession)
        }
      } catch (e) {
        localStorage.removeItem(sessionKey)
        localStorage.removeItem(`student_session_${roomId}`)
      }
    }
  }, [roomId])

  const loadRoom = async () => {
    // Try full ID first
    let roomData = await getRoomById(roomId)
    
    // If not found, try as 6-digit code
    if (!roomData && roomId.length === 6) {
      roomData = await getRoomByCode(roomId)
    }

    if (!roomData) {
      setError('존재하지 않는 수업방입니다.')
      setIsLoading(false)
      return
    }
    setRoom(roomData)
    setIsLoading(false)
  }

  const handleLogin = async () => {
    if (!nickname.trim() || !password.trim()) {
      setError('닉네임과 비밀번호를 모두 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const studentData = await createStudentSession(room!.id, nickname.trim(), password)
      if (studentData) {
        setStudent(studentData)
        // Save to localStorage for persistence
        localStorage.setItem(`student_session_${room!.id}`, JSON.stringify(studentData))
        localStorage.setItem(`student_session_${roomId}`, JSON.stringify(studentData)) // Also save for short code URL
        
        // Load student's questions
        await loadStudentQuestions(studentData.id)
      } else {
        setError('로그인에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.')
    }
    setIsSubmitting(false)
  }

  const loadStudentQuestions = async (studentId: string) => {
    const questions = await getQuestionsByStudent(studentId)
    setInitialQuestions(questions)
  }

  const handleSubmitQuestion = async () => {
    if (!questionText.trim()) {
      setError('질문 내용을 입력해주세요.')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const success = await submitQuestion(room!.id, student!.id, questionText.trim())
      if (success) {
        setQuestionText('')
        await loadStudentQuestions(student!.id)
      } else {
        setError('질문 제출에 실패했습니다.')
      }
    } catch (err) {
      setError('질문 제출 중 오류가 발생했습니다.')
    }
    setIsSubmitting(false)
  }

  const handleLikeQuestion = async (questionId: string) => {
    const success = await likeQuestion(questionId)
    if (success) {
      await loadStudentQuestions(student!.id)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-20">
          <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-blue-600 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] bg-indigo-600 rounded-full blur-[120px] animate-pulse"></div>
        </div>

        <div className="relative z-10 text-center">
          <div className="relative w-24 h-24 mx-auto mb-8">
            <div className="absolute inset-0 bg-blue-500 rounded-3xl blur-2xl opacity-20 animate-pulse"></div>
            <div className="relative w-full h-full bg-slate-900 border border-white/10 rounded-3xl flex items-center justify-center shadow-2xl">
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tighter mb-2 italic">sgon</h2>
          <p className="text-slate-400 font-bold text-sm tracking-widest uppercase animate-pulse">Experience Loading...</p>
        </div>
      </div>
    )
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="w-full max-w-sm bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-10 border border-white/5 shadow-3xl relative z-10">
          <div className="text-center mb-10">
            <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-red-500/20">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2">수업방을 찾을 수 없습니다</h2>
            <p className="text-slate-400 text-sm font-medium">{error}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full py-4 sm:py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl border border-white/10 transition-all active:scale-[0.98] text-sm uppercase tracking-widest"
          >
            Home
          </button>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Dynamic Glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[80%] h-[80%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse"></div>
        
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-cyan-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/20 transform rotate-3">
              <svg className="w-12 h-12 text-white -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </div>
            <h1 className="text-5xl font-black text-white mb-2 tracking-tighter italic">sgon</h1>
            <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px] ml-1">Premium Class Experience</p>
          </div>

          <div className="bg-slate-900/40 backdrop-blur-3xl p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3.5rem] border border-white/5 shadow-3xl space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-blue-400 mb-3 uppercase tracking-[0.2em] ml-1">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="당신의 닉네임"
                  className="w-full px-6 py-5 bg-white/5 border border-white/10 text-white rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-blue-400 mb-3 uppercase tracking-[0.2em] ml-1">Access Key</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 4자리"
                  maxLength={4}
                  className="w-full px-6 py-5 bg-white/5 border border-white/10 text-white rounded-3xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-700 font-bold"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl animate-in fade-in slide-in-from-top-2">
                <p className="text-red-400 text-xs font-bold text-center leading-relaxed">{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isSubmitting || !nickname.trim() || !password.trim()}
              className="w-full py-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black rounded-[2.5rem] shadow-2xl shadow-blue-500/40 active:scale-[0.98] transition-all disabled:opacity-30 text-lg tracking-tight"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Joining...</span>
                </div>
              ) : '수업 입장하기'}
            </button>
          </div>
        </div>
      </div>
    )
  }

            <div className="text-center">
              <button
                onClick={() => router.push('/')}
                className="text-gray-400 hover:text-white transition-colors text-sm"
              >
                홈으로 돌아가기
              </button>
            </div>
          </div>

          <div className="mt-6 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-emerald-200 text-sm">
                비밀번호는 나중에 다시 접속하여 선생님의 답변을 확인할 때 사용됩니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-32 relative overflow-x-hidden">
      {/* Background Glows */}
      <div className="fixed top-0 left-0 w-full h-full pointer-events-none z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Modern App Header */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-2xl border-b border-white/5 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tighter leading-none italic">sgon</h1>
            <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mt-1">{room?.room_name || 'Classroom'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-black text-white">{student.nickname}</p>
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">Student</p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem(`student_auth_${roomId}`)
              localStorage.removeItem(`student_session_${roomId}`)
              window.location.reload()
            }}
            className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center border border-white/10 active:scale-90 transition-all"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 sm:py-8 relative z-10 max-w-2xl mx-auto">
        {/* Dynamic Notice Bar */}
        {(realtimeRoom?.notice || room?.notice) && (
          <div className="mb-8 sm:mb-10 p-5 sm:p-6 bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-xl border border-blue-500/30 rounded-[2rem] sm:rounded-[2.5rem] shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <svg className="w-16 h-16 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 004 14h12a1 1 0 00.707-1.707L16 11.586V8a6 6 0 00-6-6zM10 18a3 3 0 01-3-3h6a3 3 0 01-3 3z" />
              </svg>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Teacher's Voice</p>
                <p className="text-white font-bold leading-relaxed text-lg">{realtimeRoom?.notice || room?.notice}</p>
              </div>
            </div>
          </div>
        )}

        {/* Floating Add Button for Mobile */}
        <button 
          onClick={() => {
            const modal = document.getElementById('question_modal') as any
            if (modal) modal.showModal()
          }}
          className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-[1.5rem] shadow-3xl shadow-blue-500/40 flex items-center justify-center z-50 active:scale-90 transition-all group"
        >
          <svg className="w-8 h-8 text-white group-hover:rotate-90 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Question List Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-2">
            <div>
              <h2 className="text-2xl font-black tracking-tight italic">sgon list</h2>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">Total {myQuestions.length} Threads</p>
            </div>
          </div>

          {myQuestions.length === 0 ? (
            <div className="py-16 sm:py-24 text-center bg-slate-900/40 backdrop-blur-xl border border-dashed border-white/5 rounded-[2rem] sm:rounded-[3rem]">
              <div className="w-20 h-20 bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-6 opacity-30">
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <p className="text-slate-500 font-bold mb-8">궁금한 점을 소곤소곤 물어보세요.</p>
              <button 
                onClick={() => (document.getElementById('question_modal') as any).showModal()}
                className="px-10 py-5 bg-white/5 hover:bg-white/10 border border-white/10 text-white font-black rounded-2xl transition-all active:scale-95"
              >
                첫 질문하기
              </button>
            </div>
          ) : (
            <div className="grid gap-5">
              {myQuestions.map((q) => (
                <div 
                  key={q.id}
                  onClick={() => setSelectedQuestion(q)}
                  className="group bg-slate-900/60 backdrop-blur-xl border border-white/5 p-6 sm:p-7 rounded-[2rem] sm:rounded-[2.5rem] hover:bg-slate-800/60 transition-all active:scale-[0.98] relative overflow-hidden shadow-xl"
                >
                  <div className={`absolute top-0 left-0 w-2 h-full transition-colors ${q.status === 'answered' ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                  
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl ${
                          q.status === 'answered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                        }`}>
                          {q.status === 'answered' ? 'Solved' : 'Waiting'}
                        </span>
                        <span className="text-slate-600 text-[10px] font-black uppercase tracking-tighter">
                          {new Date(q.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-white font-bold text-lg leading-relaxed mb-4 line-clamp-2">{q.content}</p>
                      
                      {q.status === 'answered' && (
                        <div className="mt-4 p-5 bg-emerald-500/5 rounded-3xl border border-emerald-500/10">
                          <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-2">Reply</p>
                          <p className="text-emerald-50/80 text-sm font-medium line-clamp-2 leading-relaxed">{q.answer_content || '답변이 완료되었습니다.'}</p>
                        </div>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 group-hover:bg-white/10 transition-all">
                      <svg className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Premium Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-40 px-4 sm:px-6 py-6 sm:py-8 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
        <div className="max-w-md mx-auto bg-slate-900/60 backdrop-blur-3xl border border-white/10 rounded-[2rem] sm:rounded-[2.5rem] p-2 flex items-center justify-around shadow-3xl shadow-black/80">
          <button className="flex-1 py-4 flex flex-col items-center gap-1.5 group transition-all">
            <svg className="w-6 h-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.879.879a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">Home</span>
          </button>
          <button 
            onClick={() => (document.getElementById('question_modal') as any).showModal()}
            className="flex-1 py-4 flex flex-col items-center gap-1.5 group transition-all"
          >
            <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center group-hover:bg-white/10 transition-all">
              <svg className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">sgon</span>
          </button>
          <button className="flex-1 py-4 flex flex-col items-center gap-1.5 group transition-all">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 group-hover:text-white transition-colors">Profile</span>
          </button>
        </div>
      </nav>

      {/* sgon Submission Modal (Modern Drawer) */}
      <dialog id="question_modal" className="modal modal-bottom sm:modal-middle bg-slate-950/80 backdrop-blur-md">
        <div className="modal-box bg-slate-900 border border-white/10 rounded-t-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-3xl">
          <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mb-8 sm:hidden"></div>
          <h3 className="text-2xl sm:text-3xl font-black text-white mb-2 sm:mb-3 tracking-tighter italic text-center">sgon it</h3>
          <p className="text-slate-500 text-[11px] sm:text-sm font-bold mb-8 sm:mb-10 text-center uppercase tracking-widest leading-relaxed">익명으로 안전하고 조심스럽게.<br/>선생님께만 들리는 소중한 질문.</p>
          
          <div className="space-y-6 sm:space-y-8">
            <textarea
              className="w-full h-40 sm:h-48 bg-white/5 border border-white/10 text-white p-5 sm:p-7 rounded-[1.5rem] sm:rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold placeholder:text-slate-700 resize-none text-base sm:text-lg leading-relaxed shadow-inner"
              placeholder="궁금한 내용을 편하게 적어주세요..."
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
            ></textarea>
            
            <div className="flex gap-3 sm:gap-4">
              <form method="dialog" className="flex-1">
                <button className="w-full py-4 sm:py-6 bg-slate-800 text-slate-400 font-black rounded-2xl sm:rounded-3xl active:scale-95 transition-all text-sm sm:text-lg tracking-tight uppercase">Close</button>
              </form>
              <button
                onClick={handleSubmitQuestion}
                disabled={isSubmitting || !questionText.trim()}
                className="flex-[2] py-4 sm:py-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black rounded-2xl sm:rounded-3xl shadow-2xl shadow-blue-500/40 active:scale-95 transition-all disabled:opacity-30 text-sm sm:text-lg tracking-tight uppercase"
              >
                {isSubmitting ? 'Sending...' : 'Sgon Now'}
              </button>
            </div>
          </div>
        </div>
        <form method="dialog" className="modal-backdrop">
          <button>close</button>
        </form>
      </dialog>

      {/* Answer Detail View Modal */}
      {selectedQuestion && activeQuestion && (
        <dialog id="detail_modal" className="modal modal-bottom sm:modal-middle bg-slate-950/80 backdrop-blur-md open">
          <div className="modal-box bg-slate-900 border border-white/10 rounded-t-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-3xl">
            <div className="w-16 h-1.5 bg-slate-800 rounded-full mx-auto mb-8 sm:hidden"></div>
            
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <span className={`text-[9px] sm:text-[10px] font-black uppercase tracking-[0.2em] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl ${
                activeQuestion.status === 'answered' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
              }`}>
                {activeQuestion.status === 'answered' ? 'Teacher Answered' : 'Waiting for Reply'}
              </span>
            </div>

            <div className="space-y-8 sm:space-y-10">
              <div className="p-6 sm:p-8 bg-white/5 rounded-[1.5rem] sm:rounded-[2.5rem] border border-white/10 shadow-inner">
                <p className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-2 sm:mb-3 text-right italic">Student Thread</p>
                <p className="text-white font-bold text-lg sm:text-xl leading-relaxed">{activeQuestion.content}</p>
              </div>

              {activeQuestion.status === 'answered' ? (
                <div className="p-6 sm:p-8 bg-gradient-to-br from-emerald-600/20 to-teal-600/20 rounded-[1.5rem] sm:rounded-[2.5rem] border border-emerald-500/30 relative overflow-hidden shadow-2xl">
                  <div className="absolute top-4 right-6 opacity-10">
                    <svg className="w-16 h-16 sm:w-24 sm:h-24 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-[9px] sm:text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em] mb-3 sm:mb-4 italic">Teacher's Reply</p>
                  <p className="text-white font-bold text-lg sm:text-xl leading-relaxed">{activeQuestion.answer_content || '답변이 완료되었습니다.'}</p>
                </div>
              ) : (
                <div className="py-12 sm:py-16 text-center animate-pulse">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-500 font-black text-base sm:text-lg tracking-tight italic">선생님의 소중한 답변을 기다리고 있어요...</p>
                </div>
              )}

              <button 
                onClick={() => setSelectedQuestion(null)}
                className="w-full py-5 sm:py-6 bg-slate-800 text-white font-black rounded-2xl sm:rounded-3xl active:scale-95 transition-all text-base sm:text-lg tracking-tight shadow-xl uppercase"
              >
                Close
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-transparent" onClick={() => setSelectedQuestion(null)}></div>
        </dialog>
      )}

      {/* Interactive Tutorial Modal (Premium sgon Style) */}
      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-950/95 backdrop-blur-2xl">
          <div className="w-full max-w-md bg-slate-900 rounded-[2.5rem] sm:rounded-[3.5rem] border border-white/10 p-8 sm:p-12 relative overflow-hidden shadow-3xl">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <svg className="w-48 h-48 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>
            
            <div className="relative z-10 text-center">
              {tutorialStep === 1 && (
                <div className="space-y-10">
                  <div className="w-28 h-28 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-3xl shadow-blue-500/40 transform rotate-3">
                    <svg className="w-14 h-14 text-white -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-black text-white italic tracking-tighter">hello sgon</h3>
                    <p className="text-slate-500 font-bold leading-relaxed text-lg">
                      선생님께 무엇이든 소곤소곤 물어보세요.<br/>오직 선생님과 나만의 대화입니다.
                    </p>
                  </div>
                  <button onClick={() => setTutorialStep(2)} className="w-full py-6 bg-blue-500 text-white font-black rounded-3xl shadow-2xl shadow-blue-500/40 text-xl tracking-tight">다음 (1/2)</button>
                </div>
              )}
              {tutorialStep === 2 && (
                <div className="space-y-10">
                  <div className="w-28 h-28 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-3xl shadow-emerald-500/40 transform -rotate-3">
                    <svg className="w-14 h-14 text-white rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-black text-white italic tracking-tighter">real-time</h3>
                    <p className="text-slate-500 font-bold leading-relaxed text-lg">
                      상단에 뜨는 선생님의 공지를 놓치지 마세요.<br/>중요한 소식이 실시간으로 전달됩니다.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowTutorial(false)
                      localStorage.setItem('has_seen_student_tutorial', 'true')
                    }} 
                    className="w-full py-6 bg-emerald-500 text-white font-black rounded-3xl shadow-2xl shadow-emerald-500/40 text-xl tracking-tight"
                  >
                    시작할게요! (2/2)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Styled JSX for custom animations */}
      <style jsx global>{`
        .modal-box {
          max-height: 90vh;
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .modal-bottom .modal-box {
          animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }
        ::-webkit-scrollbar {
          display: none;
        }
        .italic {
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
