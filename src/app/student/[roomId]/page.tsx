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
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(1)
  const [activeView, setActiveView] = useState<'home' | 'questions'>('home')

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

  useEffect(() => {
    if (room) {
      // Save to room history for students
      const historyJson = localStorage.getItem('sgon_student_rooms')
      let history = historyJson ? JSON.parse(historyJson) : []
      
      const newEntry = {
        id: room.id,
        name: room.room_name,
        lastJoined: new Date().toISOString()
      }
      
      // Remove existing entry for the same room
      history = history.filter((r: any) => r.id !== room.id)
      // Add to front and limit to 10
      history.unshift(newEntry)
      history = history.slice(0, 10)
      
      localStorage.setItem('sgon_student_rooms', JSON.stringify(history))
    }
  }, [room])

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-950 rounded-full mx-auto mb-6 animate-spin"></div>
          <h2 className="text-3xl font-bold text-indigo-950 tracking-tight mb-2">sgon</h2>
          <p className="text-slate-400 font-bold text-xs tracking-widest uppercase">데이터를 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="w-full max-w-sm bg-white rounded-[2.5rem] p-8 sm:p-10 border border-slate-200 shadow-xl relative z-10 text-center">
          <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-red-100">
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-indigo-950 tracking-tight mb-2">방을 찾을 수 없습니다</h2>
          <p className="text-slate-400 text-sm font-medium mb-8">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="w-full py-5 bg-indigo-950 text-white font-bold rounded-2xl shadow-lg shadow-indigo-900/10 transition-all active:scale-[0.98] text-sm uppercase tracking-widest"
          >
            홈으로 가기
          </button>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-50/50 rounded-full blur-[120px] opacity-20"></div>
      </div>
        
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-10">
            <h1 className="text-6xl font-bold text-indigo-950 mb-4 tracking-tight">sgon</h1>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-50 border border-indigo-100 rounded-full">
              <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></div>
              <p className="text-indigo-900 font-bold text-[10px] uppercase tracking-widest">{room?.room_name || '수업 참여'}</p>
            </div>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-200 shadow-xl space-y-8">
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-indigo-950 mb-3 uppercase tracking-[0.2em] ml-1">닉네임</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="당신의 닉네임"
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 text-slate-900 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all placeholder:text-slate-300 font-bold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-indigo-950 mb-3 uppercase tracking-[0.2em] ml-1">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="비밀번호 4자리"
                  maxLength={4}
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 text-slate-900 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all placeholder:text-slate-300 font-bold"
                />
              </div>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl animate-in fade-in slide-in-from-top-2">
                <p className="text-red-600 text-xs font-bold text-center leading-relaxed">{error}</p>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={isSubmitting || !nickname.trim() || !password.trim()}
              className="w-full py-6 bg-indigo-950 text-white font-bold rounded-[2.5rem] shadow-lg shadow-indigo-900/10 active:scale-[0.98] transition-all disabled:opacity-30 text-lg tracking-tight"
            >
              {isSubmitting ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>입장 중...</span>
                </div>
              ) : '수업 입장하기'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 pb-32 relative overflow-x-hidden font-sans">
      {/* Background elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-50/50 rounded-full blur-[120px] opacity-20"></div>
      </div>

      {/* Modern App Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-2xl border-b border-slate-100 px-6 py-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none text-indigo-950">sgon</h1>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">{room?.room_name || '수업'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-xs font-bold text-slate-900">{student.nickname}</p>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Student</p>
          </div>
          <button 
            onClick={() => {
              localStorage.removeItem(`student_auth_${roomId}`)
              localStorage.removeItem(`student_session_${roomId}`)
              router.push('/')
            }}
            className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 active:scale-90 transition-all"
          >
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-6 sm:py-8 relative z-10 max-w-2xl mx-auto">
        {activeView === 'home' ? (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Hero Welcome */}
            <div className="bg-indigo-950 text-white rounded-[2.5rem] p-8 sm:p-10 shadow-2xl shadow-indigo-900/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16"></div>
              <div className="relative z-10">
                <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-60 mb-2">Welcome Back</p>
                <h2 className="text-3xl font-bold tracking-tight mb-6">{student.nickname}님,<br/>반가워요! 👋</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                    <p className="text-[9px] font-bold uppercase opacity-50 mb-1">나의 질문</p>
                    <p className="text-xl font-bold">{myQuestions.length}</p>
                  </div>
                  <div className="bg-white/5 backdrop-blur-md rounded-2xl p-4 border border-white/10">
                    <p className="text-[9px] font-bold uppercase opacity-50 mb-1">답변 완료</p>
                    <p className="text-xl font-bold text-emerald-400">{myQuestions.filter(q => q.status === 'answered').length}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Dynamic Notice Section */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-indigo-950 uppercase tracking-[0.3em] ml-2">선생님 공지사항</h3>
              <div className="bg-white border border-slate-100 rounded-[2.5rem] p-8 shadow-sm">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <p className="text-indigo-950 font-bold leading-relaxed text-lg italic">
                      {realtimeRoom?.notice || room?.notice || '현재 게시된 공지사항이 없습니다.'}
                    </p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">
                      최종 업데이트: {new Date(realtimeRoom?.updated_at || room?.updated_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions / Stats */}
            <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100">
              <h3 className="text-[10px] font-bold text-indigo-950 uppercase tracking-[0.3em] mb-6">수업 정보</h3>
              <div className="space-y-6">
                <div className="flex justify-between items-center pb-6 border-b border-slate-200">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">수업 코드</span>
                  <span className="text-indigo-950 font-bold text-lg tracking-tight uppercase">{room?.id?.slice(-6)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">수업 참여 인원</span>
                  <span className="text-indigo-950 font-bold text-lg tracking-tight">실시간 접속 중</span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between mb-8 px-2">
              <h2 className="text-2xl font-bold tracking-tight text-indigo-950">질문 내역</h2>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] mt-1">총 {myQuestions.length}개의 질문</p>
            </div>

          {myQuestions.length === 0 ? (
            <div className="py-16 sm:py-24 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[2rem] sm:rounded-[3rem]">
              <p className="text-slate-400 font-bold mb-8">궁금한 점을 소곤소곤 물어보세요.</p>
              <button 
                onClick={() => (document.getElementById('question_modal') as any).showModal()}
                className="px-10 py-5 bg-indigo-950 text-white font-bold rounded-2xl shadow-lg shadow-indigo-900/10 transition-all active:scale-95"
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
                  className="group bg-white border border-slate-100 p-6 sm:p-7 rounded-[2.5rem] hover:border-indigo-100 transition-all active:scale-[0.98] relative overflow-hidden shadow-sm"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3">
                        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl ${
                          q.status === 'answered' ? 'bg-emerald-50 text-emerald-600' : 'bg-indigo-50 text-indigo-900'
                        }`}>
                          {q.status === 'answered' ? '답변완료' : '대기중'}
                        </span>
                        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-tighter">
                          {new Date(q.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-slate-900 font-bold text-lg leading-relaxed mb-4 line-clamp-2">{q.content}</p>
                      
                      {q.status === 'answered' && (
                        <div className="mt-4 p-5 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <p className="text-emerald-950 text-sm font-medium line-clamp-2 leading-relaxed">{q.answer_content || '답변이 완료되었습니다.'}</p>
                        </div>
                      )}
                    </div>
                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center shrink-0 border border-slate-100">
                      <svg className="w-5 h-5 text-slate-300 group-hover:text-indigo-950 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      </main>

      {/* Premium Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 w-full z-40 px-4 sm:px-6 py-6 sm:py-10 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none">
        <div className="max-w-xs mx-auto bg-white/90 backdrop-blur-2xl border border-slate-200 rounded-[3rem] p-2 flex items-center shadow-2xl shadow-indigo-900/10 pointer-events-auto">
          <button 
            onClick={() => setActiveView('home')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeView === 'home' ? 'text-indigo-950' : 'text-slate-300'}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.879.879a1 1 0 001.414-1.414l-7-7z" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-widest">Home</span>
          </button>
          
          <button 
            onClick={() => setIsQuestionModalOpen(true)}
            className="w-16 h-16 bg-indigo-950 text-white rounded-full flex items-center justify-center shadow-lg shadow-indigo-900/40 -mt-12 border-4 border-white active:scale-90 transition-all z-50"
          >
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>

          <button 
            onClick={() => setActiveView('questions')}
            className={`flex-1 py-4 flex flex-col items-center gap-1 transition-all ${activeView === 'questions' ? 'text-indigo-950' : 'text-slate-300'}`}
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
            <span className="text-[9px] font-bold uppercase tracking-widest">sgon</span>
          </button>
        </div>
      </nav>

      {/* Custom Question Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
          <div 
            className="absolute inset-0 bg-indigo-950/40 backdrop-blur-md"
            onClick={() => setIsQuestionModalOpen(false)}
          ></div>
          
          <div className="bg-white w-full max-w-lg rounded-t-[3rem] sm:rounded-[4rem] p-10 sm:p-14 shadow-2xl relative overflow-hidden animate-slide-up sm:animate-fade-in mx-auto border border-slate-100">
            {/* Decorative background */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full blur-3xl -mr-24 -mt-24 opacity-40"></div>
            
            <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-12 sm:hidden"></div>
            
            <div className="text-center mb-12 relative z-10">
              <div className="w-20 h-20 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-sm transform -rotate-3">
                <svg className="w-10 h-10 text-indigo-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h3 className="text-4xl font-bold text-indigo-950 mb-3 tracking-tight">소곤거리기</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.4em] ml-1">익명으로 질문을 남겨보세요</p>
            </div>
            
            <div className="space-y-10 relative z-10">
              <textarea
                className="w-full h-48 bg-slate-50 border border-slate-100 text-indigo-950 p-8 rounded-[2.5rem] focus:outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all font-bold placeholder:text-slate-200 resize-none text-xl leading-relaxed shadow-inner"
                placeholder="궁금한 내용을 입력하세요..."
                value={questionText}
                onChange={(e) => setQuestionText(e.target.value)}
                autoFocus
              ></textarea>
              
              <div className="flex gap-4">
                <button 
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="flex-1 py-6 bg-slate-100 text-slate-400 font-bold rounded-[1.5rem] active:scale-95 transition-all text-xs uppercase tracking-widest"
                >
                  취소
                </button>
                <button
                  onClick={async () => {
                    await handleSubmitQuestion()
                    setIsQuestionModalOpen(false)
                  }}
                  disabled={isSubmitting || !questionText.trim()}
                  className="flex-[2] py-6 bg-indigo-950 text-white font-bold rounded-[1.5rem] shadow-xl shadow-indigo-900/20 active:scale-95 transition-all disabled:opacity-30 text-xs uppercase tracking-widest"
                >
                  {isSubmitting ? '전송 중...' : '질문 보내기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Answer Detail View Modal */}
      {selectedQuestion && activeQuestion && (
        <dialog id="detail_modal" className="modal modal-bottom sm:modal-middle bg-slate-900/40 backdrop-blur-md open">
          <div className="modal-box bg-white border border-slate-200 rounded-t-[2rem] sm:rounded-[3rem] p-6 sm:p-10 shadow-2xl">
            <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 sm:hidden"></div>
            
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.2em] px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl ${
                activeQuestion.status === 'answered' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
              }`}>
                {activeQuestion.status === 'answered' ? '선생님 답변 완료' : '답변 대기 중'}
              </span>
            </div>

            <div className="space-y-8 sm:space-y-10">
              <div className="p-6 sm:p-8 bg-slate-50 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100">
                <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2 sm:mb-3 text-right">나의 질문</p>
                <p className="text-indigo-950 font-bold text-lg sm:text-xl leading-relaxed">{activeQuestion.content}</p>
              </div>

              {activeQuestion.status === 'answered' ? (
                <div className="p-6 sm:p-8 bg-emerald-50 rounded-[1.5rem] sm:rounded-[2.5rem] border border-emerald-100 relative overflow-hidden">
                  <p className="text-[9px] sm:text-[10px] font-bold text-emerald-600 uppercase tracking-[0.3em] mb-3 sm:mb-4">선생님의 답변</p>
                  <p className="text-emerald-950 font-bold text-lg sm:text-xl leading-relaxed">{activeQuestion.answer_content || '답변이 완료되었습니다.'}</p>
                </div>
              ) : (
                <div className="py-12 sm:py-16 text-center">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <svg className="w-8 h-8 sm:w-10 sm:h-10 text-indigo-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-bold text-base sm:text-lg tracking-tight">선생님의 답변을 기다리고 있어요</p>
                </div>
              )}

              <button 
                onClick={() => setSelectedQuestion(null)}
                className="w-full py-5 sm:py-6 bg-indigo-950 text-white font-bold rounded-2xl sm:rounded-3xl active:scale-95 transition-all text-base sm:text-lg tracking-tight shadow-lg shadow-indigo-900/10"
              >
                닫기
              </button>
            </div>
          </div>
          <div className="modal-backdrop bg-transparent" onClick={() => setSelectedQuestion(null)}></div>
        </dialog>
      )}

      {/* Interactive Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-white/90 backdrop-blur-2xl">
          <div className="w-full max-w-md bg-white rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-200 p-8 sm:p-12 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <svg className="w-48 h-48 text-indigo-950" fill="currentColor" viewBox="0 0 20 20">
                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
              </svg>
            </div>
            
            <div className="relative z-10">
              {tutorialStep === 1 && (
                <div className="space-y-10">
                  <div className="w-28 h-28 bg-indigo-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-sm transform -rotate-3">
                    <svg className="w-14 h-14 text-indigo-950 -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-bold text-indigo-950 tracking-tight text-center">반가워요!</h3>
                    <p className="text-slate-500 font-bold leading-relaxed text-lg text-center">
                      선생님께 무엇이든 소곤소곤 물어보세요.<br/>오직 선생님과 나만의 대화입니다.
                    </p>
                  </div>
                  <button onClick={() => setTutorialStep(2)} className="w-full py-6 bg-indigo-950 text-white font-bold rounded-3xl shadow-lg shadow-indigo-900/10 text-xl tracking-tight active:scale-95 transition-all">다음 (1/2)</button>
                </div>
              )}
              {tutorialStep === 2 && (
                <div className="space-y-10">
                  <div className="w-28 h-28 bg-emerald-50 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-sm transform -rotate-3">
                    <svg className="w-14 h-14 text-emerald-600 rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl font-bold text-indigo-950 tracking-tight text-center">실시간 공지</h3>
                    <p className="text-slate-500 font-bold leading-relaxed text-lg text-center">
                      상단에 뜨는 선생님의 공지를 놓치지 마세요.<br/>중요한 소식이 실시간으로 전달됩니다.
                    </p>
                  </div>
                  <button 
                    onClick={() => {
                      setShowTutorial(false)
                      localStorage.setItem('has_seen_student_tutorial', 'true')
                    }} 
                    className="w-full py-6 bg-emerald-500 text-white font-bold rounded-3xl shadow-lg shadow-emerald-500/10 text-xl tracking-tight active:scale-95 transition-all"
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
