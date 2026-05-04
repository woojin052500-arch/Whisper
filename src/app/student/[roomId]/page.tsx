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

  // Filter all questions to show only the ones belonging to THIS student
  const questions = allQuestions.filter(q => q.student_id === student?.id)
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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </div>
          <p className="text-white text-xl">수업방을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  if (error && !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 max-w-md w-full">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">수업방을 찾을 수 없습니다</h2>
            <p className="text-gray-400">{error}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02]"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">{room?.room_name}</h1>
            <p className="text-gray-400">수업에 참여하기</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                닉네임
              </label>
              <input
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="수업에서 사용할 닉네임을 입력하세요"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                비밀번호
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="답변 확인을 위한 비밀번호를 입력하세요"
                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200"
              />
            </div>

            {error && (
              <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-200 text-sm">{error}</p>
                </div>
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={!nickname.trim() || !password.trim() || isSubmitting}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
            >
              {isSubmitting ? '참여 중...' : '수업 참여하기'}
            </button>

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">{room?.room_name}</h1>
                <p className="text-gray-400 text-sm">{student.nickname}님으로 접속 중</p>
              </div>
            </div>
              <button
                onClick={() => {
                  setStudent(null)
                  setNickname('')
                  setPassword('')
                  setInitialQuestions([])
                  localStorage.removeItem(`student_session_${room?.id}`)
                  localStorage.removeItem(`student_session_${roomId}`)
                }}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
          </div>
        </div>
      </div>

      {/* My Dashboard (Home Screen) */}
      <div className="container mx-auto px-4 pt-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-800/40 backdrop-blur-2xl rounded-[2.5rem] p-8 border border-slate-700/50 shadow-2xl overflow-hidden relative group">
            {/* Background Glow */}
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-emerald-500/10 blur-[100px] rounded-full group-hover:bg-emerald-500/20 transition-all duration-700"></div>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs font-black rounded-full uppercase tracking-widest border border-emerald-500/20">
                    Active Session
                  </div>
                  <div className="h-1 w-1 bg-slate-600 rounded-full"></div>
                  <span className="text-slate-400 text-sm font-medium">수업 참여 중</span>
                </div>
                <div>
                  <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-2">
                    {room?.room_name}
                  </h1>
                  <p className="text-slate-400 text-lg flex items-center gap-2">
                    <span className="text-emerald-400 font-bold">{student.nickname}</span>님, 반갑습니다! 오늘도 즐거운 수업 되세요.
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-700/30 text-center">
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1">내 질문</p>
                  <p className="text-white text-3xl font-black">{allQuestions.length}</p>
                </div>
                <div className="bg-slate-900/50 p-5 rounded-3xl border border-slate-700/30 text-center">
                  <p className="text-slate-500 text-xs font-bold uppercase mb-1">답변 완료</p>
                  <p className="text-emerald-400 text-3xl font-black">
                    {allQuestions.filter(q => q.status === 'answered').length}
                  </p>
                </div>
              </div>
            </div>

            {/* Prominent Notice Section */}
            {realtimeRoom?.notice && (
              <div className="mt-8 pt-8 border-t border-slate-700/50">
                <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/10 rounded-[2rem] p-6 border border-blue-500/20 shadow-inner">
                  <div className="flex items-start gap-5">
                    <div className="w-12 h-12 bg-blue-500 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-blue-500/40">
                      <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-blue-400 font-bold text-sm uppercase tracking-widest mb-1">나의 공지사항</h3>
                      <p className="text-white text-lg leading-relaxed font-medium">
                        {realtimeRoom.notice}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto space-y-12">

          {/* Question Input */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">질문하기</h2>
            </div>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              placeholder="궁금한 점을 익명으로 질문하세요..."
              className="w-full h-32 px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all duration-200 resize-none"
            />
            <div className="flex justify-between items-center mt-4">
              <p className="text-gray-400 text-sm">
                익명으로 질문이 전달됩니다
              </p>
              <button
                onClick={handleSubmitQuestion}
                disabled={!questionText.trim() || isSubmitting}
                className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isSubmitting ? '제출 중...' : '질문하기'}
              </button>
            </div>
          </div>

          {/* My Questions */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-white">내 질문과 답변</h2>
            </div>
            
            {myQuestions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-gray-400">아직 질문이 없습니다</p>
                <p className="text-gray-500 text-sm mt-2">첫 번째 질문을 작성해보세요!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {myQuestions.map((question) => (
                  <div
                    key={question.id}
                    onClick={() => setSelectedQuestion(question)}
                    className={`p-4 rounded-xl border transition-all duration-200 cursor-pointer hover:scale-[1.01] active:scale-[0.99] ${
                      question.status === 'answered'
                        ? 'bg-emerald-500/10 border-emerald-500/30'
                        : 'bg-slate-700/30 border-slate-600/50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <p className="text-white flex-1 leading-relaxed">{question.content}</p>
                      <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                        <button
                          onClick={() => handleLikeQuestion(question.id)}
                          className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors duration-200"
                        >
                          <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                          <span className="text-amber-400 font-medium text-sm">{question.likes_count}</span>
                        </button>
                        {question.status === 'answered' && (
                          <span className="px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm font-medium">
                            답변완료
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {question.status === 'answered' && (
                      <div className="mt-2 text-center">
                        <p className="text-emerald-400/60 text-xs font-medium animate-pulse">클릭하여 답변 확인하기</p>
                      </div>
                    )}
                    
                    <p className="text-gray-500 text-xs mt-2">
                      {new Date(question.created_at).toLocaleString('ko-KR')}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-400 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">사용 안내</h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-400 font-semibold text-xs">1</span>
                </div>
                <p className="text-gray-300 text-sm">질문은 익명으로 전달되어 다른 학생들에게 공개됩니다</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-400 font-semibold text-xs">2</span>
                </div>
                <p className="text-gray-300 text-sm">다른 학생의 질문에 '좋아요'를 누를 수 있습니다</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-400 font-semibold text-xs">3</span>
                </div>
                <p className="text-gray-300 text-sm">선생님이 답변을 하면 이 페이지에서 바로 확인할 수 있습니다</p>
              </div>
              <div className="flex gap-3">
                <div className="w-6 h-6 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-emerald-400 font-semibold text-xs">4</span>
                </div>
                <p className="text-gray-300 text-sm">나중에 다시 확인하고 싶을 때는 같은 닉네임과 비밀번호로 로그인하세요</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Detail Modal */}
      {activeQuestion && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-300"
          onClick={() => setSelectedQuestion(null)}
        >
          <div 
            className="bg-slate-800/95 backdrop-blur-xl rounded-3xl p-8 border border-slate-700/50 max-w-2xl w-full shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-400 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">질문 상세 내용</h3>
              </div>
              <button
                onClick={() => setSelectedQuestion(null)}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-xl hover:bg-slate-700/50"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="p-6 bg-slate-700/30 rounded-2xl border border-slate-600/30">
                <p className="text-white text-lg leading-relaxed font-medium">{activeQuestion.content}</p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    {activeQuestion.likes_count}
                  </span>
                  <span>{new Date(activeQuestion.created_at).toLocaleString('ko-KR')}</span>
                </div>
              </div>

              {activeQuestion.status === 'answered' ? (
                <div className="p-6 bg-emerald-500/10 rounded-2xl border border-emerald-500/30 animate-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center gap-2 mb-3">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                    <p className="text-emerald-400 font-bold">선생님 답변</p>
                  </div>
                  <p className="text-gray-100 text-lg leading-relaxed whitespace-pre-wrap">
                    {activeQuestion.answer_content || '답변이 완료되었습니다.'}
                  </p>
                </div>
              ) : (
                <div className="p-6 bg-amber-500/5 rounded-2xl border border-amber-500/20 text-center animate-pulse">
                  <p className="text-amber-400/80 font-medium">선생님이 답변을 작성 중입니다. 잠시만 기다려주세요!</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedQuestion(null)}
              className="w-full mt-8 bg-slate-700 hover:bg-slate-600 text-white font-bold py-4 rounded-2xl transition-all duration-200"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Interactive Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          <div className="relative bg-slate-900 rounded-[2rem] p-8 border border-slate-700 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
            {tutorialStep === 1 && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">질문하기</h3>
                <p className="text-slate-400">아래 입력창에 궁금한 점을 적어보세요. 익명으로 안전하게 전달됩니다.</p>
                <div className="pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => setTutorialStep(2)}
                    className="w-full py-4 bg-blue-500 text-white font-bold rounded-2xl"
                  >
                    다음 (1/3)
                  </button>
                </div>
              </div>
            )}

            {tutorialStep === 2 && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center mx-auto">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">내 질문 확인</h3>
                <p className="text-slate-400">내가 한 질문들은 리스트에 쌓이게 됩니다. 다른 학생은 볼 수 없으니 걱정 마세요!</p>
                <div className="pt-4 border-t border-slate-800 flex gap-2">
                  <button onClick={() => setTutorialStep(1)} className="flex-1 py-4 bg-slate-800 text-slate-400 font-bold rounded-2xl">이전</button>
                  <button onClick={() => setTutorialStep(3)} className="flex-2 py-4 bg-blue-500 text-white font-bold rounded-2xl px-8">다음 (2/3)</button>
                </div>
              </div>
            )}

            {tutorialStep === 3 && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">답변 확인하기</h3>
                <p className="text-slate-400">선생님이 답변을 완료하면 질문 카드가 활성화됩니다. 클릭해서 답변을 확인하세요!</p>
                <div className="pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => {
                      setShowTutorial(false)
                      localStorage.setItem('has_seen_student_tutorial', 'true')
                    }}
                    className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20"
                  >
                    가이드 완료!
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pointer Arrows / Highlights */}
          {tutorialStep === 1 && (
            <div className="absolute top-[65%] left-1/2 -translate-x-1/2 mt-4 animate-bounce pointer-events-none">
              <div className="w-8 h-8 border-t-4 border-l-4 border-blue-500 rotate-45" />
            </div>
          )}
          {tutorialStep === 2 && (
            <div className="absolute bottom-[20%] left-1/2 -translate-x-1/2 animate-pulse pointer-events-none">
              <div className="px-6 py-3 bg-emerald-500 text-white font-black rounded-full shadow-2xl">여기에 내 질문이 표시됩니다!</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
