'use client'

import { useState, useEffect } from 'react'
import { useSession, signIn, signOut } from 'next-auth/react'
import Link from 'next/link'
import { getRoomsByTeacher, createRoom, deleteRoom, answerQuestion, markQuestionAnswered, getQuestionsByRoom, updateRoomNotice, getRoomById, getOrCreateTeacher, isTeacherPremium, requestPaymentVerification } from '@/lib/auth'
import { Room, Question, Teacher } from '@/lib/auth'
import { useRealtimeQuestions, useRealtimeRoom } from '@/hooks/useRealtimeQuestions'

export default function TeacherDashboard() {
  const { data: session, status } = useSession()
  const [room, setRoom] = useState<Room | null>(null)
  const [roomName, setRoomName] = useState('')
  const [initialQuestions, setInitialQuestions] = useState<Question[]>([])
  const [sortBy, setSortBy] = useState<'latest' | 'likes'>('latest')
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [answerText, setAnswerText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [noticeText, setNoticeText] = useState('')
  const [isUpdatingNotice, setIsUpdatingNotice] = useState(false)
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialStep, setTutorialStep] = useState(1)
  const [showGuide, setShowGuide] = useState(true)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [isPremium, setIsPremium] = useState(false)
  const [myRooms, setMyRooms] = useState<Room[]>([])
  const [showRoomManagement, setShowRoomManagement] = useState(false)
  const [showPaymentPopup, setShowPaymentPopup] = useState(false)
  const [isFirstLogin, setIsFirstLogin] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRequestingPayment, setIsRequestingPayment] = useState(false)
  const [paymentRequested, setPaymentRequested] = useState(false)

  // Use teacher email from Google session
  const teacherId = session?.user?.email || `teacher_${Date.now()}`

  // Use real-time questions hook
  const questions = useRealtimeQuestions(room?.id || '', initialQuestions)
  
  // Real-time room hook for notices
  const realtimeRoom = useRealtimeRoom(room?.id || '', room)

  useEffect(() => {
    if (realtimeRoom?.notice) {
      setNoticeText(realtimeRoom.notice)
    }
  }, [realtimeRoom])

  useEffect(() => {
    // We no longer auto-load the last room to ensure teacher lands on the Home screen
    // But we still need to load the teacher's info
    if (session?.user?.email) {
      loadTeacherInfo(session.user.email)
    }
  }, [session])

  useEffect(() => {
    if (room) {
      loadQuestions()
    }
  }, [room, sortBy])

  const loadTeacherInfo = async (email: string) => {
    const teacherData = await getOrCreateTeacher(email, session?.user?.name || undefined)
    setTeacher(teacherData)
    
    const premiumStatus = await isTeacherPremium(email)
    setIsPremium(premiumStatus)
    
    // Check if first login (newly created teacher)
    if (teacherData && new Date(teacherData.created_at).getTime() > Date.now() - 60000) { // Created within last minute
      setIsFirstLogin(true)
      setShowPaymentPopup(true)
    } else if (!premiumStatus && !localStorage.getItem('paymentPopupShown')) {
      // Show payment popup if not premium and hasn't been shown before
      setShowPaymentPopup(true)
      localStorage.setItem('paymentPopupShown', 'true')
    }
    
    // Load teacher's rooms
    const rooms = await getRoomsByTeacher(email)
    setMyRooms(rooms)
  }

  const loadRoom = async (roomId: string) => {
    const roomData = await getRoomById(roomId)
    if (roomData) {
      setRoom(roomData)
      localStorage.setItem('currentRoomId', roomId)
    }
  }

  const loadQuestions = async () => {
    if (!room) return
    const questionsData = await getQuestionsByRoom(room.id, sortBy)
    setInitialQuestions(questionsData)
    // Check tutorial
    const hasSeenTutorial = localStorage.getItem('has_seen_teacher_tutorial')
    if (!hasSeenTutorial) {
      setShowTutorial(true)
    }
  }

  const handleUpdateNotice = async () => {
    if (!room) return
    setIsUpdatingNotice(true)
    try {
      await updateRoomNotice(room.id, noticeText)
    } finally {
      setIsUpdatingNotice(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !teacherId) return
    
    setIsLoading(true)
    try {
      const newRoom = await createRoom(roomName, teacherId)
      if (newRoom) {
        setRoom(newRoom)
        setRoomName('')
        localStorage.setItem('currentRoomId', newRoom.id)
        
        // Refresh rooms list
        const rooms = await getRoomsByTeacher(teacherId)
        setMyRooms(rooms)
      }
    } catch (error) {
      console.error('Error creating room:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteRoom = async (roomId: string) => {
    if (!confirm('정말로 이 수업방을 삭제하시겠습니까?')) return
    
    try {
      const success = await deleteRoom(roomId)
      if (success) {
        // Remove from rooms list
        setMyRooms(myRooms.filter(r => r.id !== roomId))
        
        // If current room is deleted, clear it
        if (room?.id === roomId) {
          setRoom(null)
          localStorage.removeItem('currentRoomId')
        }
      }
    } catch (error) {
      console.error('Error deleting room:', error)
    }
  }

  const handleSelectRoom = async (roomData: Room) => {
    setRoom(roomData)
    localStorage.setItem('currentRoomId', roomData.id)
  }

  const handleAnswerQuestion = async () => {
    if (!selectedQuestion || !answerText.trim() || isSubmitting) return
    
    setIsSubmitting(true)
    try {
      const success = await answerQuestion(selectedQuestion.id, answerText)
      if (success) {
        setAnswerText('')
        setSelectedQuestion(null)
        await loadQuestions()
      } else {
        alert('답변 저장에 실패했습니다. 다시 시도해주세요.')
      }
    } catch (err) {
      console.error(err)
      alert('오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleMarkAnswered = async (questionId: string) => {
    const success = await markQuestionAnswered(questionId)
    if (success) {
      loadQuestions()
    }
  }

  const roomUrl = room ? `${window.location.origin}/student/${room.id}` : ''

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <p className="text-white text-xl">로그인 확인 중...</p>
        </div>
      </div>
    )
  }

  // Redirect to sign in if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 max-w-md w-full">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">선생님 로그인</h1>
            <p className="text-gray-400">Google 계정으로 간편하게 로그인하세요</p>
          </div>

          <button
            onClick={() => signIn('google', { callbackUrl: '/teacher' })}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 로그인
          </button>

          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-blue-200 text-sm">
                Google 계정으로 로그인하면 수업방을 생성하고 관리할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Admin dashboard for woojin052501@gmail.com
  if (session?.user?.email === 'woojin052501@gmail.com' && !room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        <div className="container mx-auto px-4 py-8">
          {/* Admin Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">관리자 대시보드</h1>
            <p className="text-gray-400">전체 수업방과 결제를 관리하세요</p>
          </div>

          {/* Admin Actions */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Link
              href="/admin"
              className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-red-500/50 transition-all duration-300 group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center group-hover:bg-red-500/30 transition-colors">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">결제 관리</h3>
                  <p className="text-gray-400 text-sm">결제 요청 승인 및 관리</p>
                </div>
              </div>
            </Link>

            <button
              onClick={() => setShowRoomManagement(!showRoomManagement)}
              className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 group text-left"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center group-hover:bg-blue-500/30 transition-colors">
                  <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">수업방 관리</h3>
                  <p className="text-gray-400 text-sm">내 수업방 목록 ({myRooms.length}개)</p>
                </div>
              </div>
            </button>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-1">수업방 생성</h3>
                  <p className="text-gray-400 text-sm">새 수업방 만들기</p>
                </div>
              </div>
            </div>
          </div>

          {/* Room Management Panel */}
          {showRoomManagement && (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 mb-8">
              <h3 className="text-xl font-semibold text-white mb-4">내 수업방 관리</h3>
              
              {myRooms.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <p className="text-gray-400">생성된 수업방이 없습니다.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {myRooms.map((roomData) => (
                    <div key={roomData.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl border border-slate-600/50 hover:border-blue-500/50 transition-all duration-200">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                        </div>
                        <div>
                          <h4 className="text-white font-medium">{roomData.room_name}</h4>
                          <p className="text-gray-400 text-sm">
                            생성일: {new Date(roomData.created_at).toLocaleDateString('ko-KR')}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSelectRoom(roomData)}
                          className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
                        >
                          선택
                        </button>
                        <button
                          onClick={() => handleDeleteRoom(roomData.id)}
                          className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                        >
                          삭제
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Room Creation for Admin */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-semibold text-white mb-4">새 수업방 생성</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  수업방 이름
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="예: 1학년 1반 국어 수업"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                />
              </div>
              
              <button
                onClick={handleCreateRoom}
                disabled={isLoading || !roomName.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isLoading ? '생성 중...' : '수업방 생성'}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
        {/* Payment Popup */}
        {showPaymentPopup && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 max-w-md w-full">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">
                  {isFirstLogin ? '귓속말에 오신 것을 환영합니다!' : '프리미엄 업그레이드'}
                </h2>
                <p className="text-gray-400">
                  {isFirstLogin 
                    ? '무제한 수업방 생성을 위해 프리미엄으로 업그레이드하세요'
                    : '월 990원으로 무제한 수업방을 이용하세요'
                  }
                </p>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-amber-400 font-medium">월 구독료</span>
                    <span className="text-white font-bold text-xl">990원</span>
                  </div>
                  <p className="text-gray-400 text-sm">매월 자동 결제, 언제든지 해지 가능</p>
                </div>

                <div className="p-4 bg-slate-700/50 rounded-xl">
                  <h3 className="text-white font-medium mb-2">입금 계좌 정보</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-400">은행</span>
                      <span className="text-white">NH농협지역조합</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">계좌번호</span>
                      <span className="text-white font-mono">3516376760453</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">예금주</span>
                      <span className="text-white">WJedulab</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText('NH농협지역조합\n계좌번호: 3516376760453\n예금주: WJedulab')
                      alert('계좌번호가 복사되었습니다!')
                    }}
                    className="flex-1 px-4 py-3 bg-amber-500/20 text-amber-400 rounded-lg hover:bg-amber-500/30 transition-colors font-medium"
                  >
                    계좌 복사
                  </button>
                  <button
                    onClick={() => window.open('https://open.kakao.com/o/g3INItti', '_blank')}
                    className="flex-1 px-4 py-3 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors font-medium"
                  >
                    카톡방 이동
                  </button>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                  <p className="text-blue-200 text-sm">
                    입금 후 최대 하루 이내 승인 처리됩니다. 입금 시 카톡방으로 알려주세요!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowPaymentPopup(false)}
                className="mt-6 w-full px-4 py-3 bg-slate-700/50 text-gray-400 rounded-lg hover:bg-slate-700/70 transition-colors"
              >
                나중에 하기
              </button>
            </div>
          </div>
        )}

        {/* Room Management Panel */}
        {showRoomManagement && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">수업방 관리</h2>
                <button
                  onClick={() => setShowRoomManagement(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Add New Room */}
              <div className="bg-slate-700/50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">새 수업방 추가</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="수업방 이름 입력"
                    className="flex-1 px-4 py-3 bg-slate-600/50 border border-slate-500/50 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                  <button
                    onClick={handleCreateRoom}
                    disabled={isLoading || !roomName.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                  >
                    {isLoading ? '생성 중...' : '추가'}
                  </button>
                </div>
              </div>

              {/* Room List */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white mb-4">내 수업방 목록 ({myRooms.length}개)</h3>
                {myRooms.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <p className="text-gray-400">생성된 수업방이 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {myRooms.map((roomData) => (
                      <div key={roomData.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl border border-slate-600/50 hover:border-blue-500/50 transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{roomData.room_name}</h4>
                            <p className="text-gray-400 text-sm">
                              수업 코드: {roomData.id?.slice(-6).toUpperCase()} | 
                              생성일: {new Date(roomData.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              handleSelectRoom(roomData)
                              setShowRoomManagement(false)
                            }}
                            className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
                          >
                            선택
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(roomData.id)}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

          {/* Guide Section */}
          {showGuide && (
            <div className="mb-8 bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">사용 가이드</h3>
                    <p className="text-gray-400 text-sm">귓속말을 효과적으로 사용하는 방법</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowGuide(false)}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700/50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold text-sm">1</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">수업방 생성</h4>
                    <p className="text-gray-400 text-sm">수업 이름을 입력하고 방을 생성합니다. QR 코드가 자동으로 생성됩니다.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold text-sm">2</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">학생 참여 안내</h4>
                    <p className="text-gray-400 text-sm">QR 코드를 보여주거나 방 코드를 공유하여 학생들이 참여하도록 합니다.</p>
                  </div>
                </div>
                
                <div className="flex gap-4">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-400 font-bold text-sm">3</span>
                  </div>
                  <div>
                    <h4 className="text-white font-medium mb-1">질문 관리</h4>
                    <p className="text-gray-400 text-sm">학생들의 익명 질문을 실시간으로 확인하고 답변을 작성합니다.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Room Creation */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-semibold text-white mb-4">새 수업방 생성</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  수업방 이름
                </label>
                <input
                  type="text"
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="예: 1학년 1반 국어 수업"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200"
                />
              </div>
              
              <button
                onClick={handleCreateRoom}
                disabled={isLoading || !roomName.trim()}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed"
              >
                {isLoading ? '생성 중...' : '수업방 생성'}
              </button>
              
              <p className="text-gray-400 text-sm mt-4">
                수업방을 생성하면 QR 코드가 자동으로 생성되어 학생들이 쉽게 참여할 수 있습니다.
              </p>
            </div>
          </div>
      </div>
    )
  }

  // Main teacher dashboard with room
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-xl border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">귓속말</h1>
                <p className="text-gray-400 text-sm">수업 코드: {room?.id?.slice(-6).toUpperCase()}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!isPremium && (
                <Link
                  href="/payment"
                  className="text-amber-400 hover:text-amber-300 transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                  title="프리미엄 업그레이드"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                  </svg>
                </Link>
              )}
              <button
                onClick={() => setRoom(null)}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                title="홈 화면으로 이동"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              {teacher?.is_admin && (
                <Link
                  href="/admin"
                  className="text-red-400 hover:text-red-300 transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                  title="관리자 패널"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </Link>
              )}
              <button
                onClick={() => setShowRoomManagement(!showRoomManagement)}
                className="text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                title="수업방 관리"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </button>
              <button
                onClick={() => signOut()}
                className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                title="로그아웃"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
          <div className="w-full h-1 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - QR Code and Stats */}
          <div className="space-y-6">
            {/* QR Code */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-xl font-semibold text-white mb-4">수업 코드</h2>
              <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-8 rounded-xl text-center">
                <div className="text-white text-6xl font-bold tracking-wider mb-2">
                  {room?.id?.slice(-6).toUpperCase()}
                </div>
                <p className="text-blue-100 text-sm">학생들이 입력할 코드</p>
              </div>
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(room?.id?.slice(-6).toUpperCase() || '')
                    alert('수업 코드가 복사되었습니다!')
                  }}
                  className="w-full px-4 py-3 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors font-medium flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  수업 코드 복사
                </button>
                <p className="text-gray-400 text-sm text-center">
                  학생들은 귓속말에 접속하여 이 코드를 입력하세요
                </p>
              </div>
            </div>

            {/* Stats */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-xl font-semibold text-white mb-4">실시간 통계</h2>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-slate-700/30 rounded-lg">
                  <span className="text-gray-300">전체 질문</span>
                  <span className="text-white font-semibold text-lg">{questions.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                  <span className="text-emerald-400">답변 완료</span>
                  <span className="text-emerald-400 font-semibold text-lg">{questions.filter(q => q.status === 'answered').length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <span className="text-amber-400">답변 대기</span>
                  <span className="text-amber-400 font-semibold text-lg">{questions.filter(q => q.status !== 'answered').length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Questions */}
          <div className="lg:col-span-2">
            {/* Notice Management Section */}
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 mb-8">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white">학급 공지사항 관리</h2>
              </div>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  placeholder="학생들에게 전달할 중요 공지를 입력하세요 (예: 질문은 1인당 3개까지만!)"
                  className="flex-1 px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-white placeholder-gray-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                />
                <button
                  onClick={handleUpdateNotice}
                  disabled={isUpdatingNotice || !noticeText.trim()}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20 flex items-center gap-2"
                >
                  {isUpdatingNotice ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : '등록'}
                </button>
              </div>
            </div>

            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-white">학생 질문 ({questions.length})</h2>
                <div className="flex items-center gap-4">
                  <div className="flex bg-slate-700/50 rounded-lg p-1">
                    <button
                      onClick={() => setSortBy('latest')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        sortBy === 'latest' 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      최신순
                    </button>
                    <button
                      onClick={() => setSortBy('likes')}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        sortBy === 'likes' 
                          ? 'bg-blue-500 text-white' 
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      인기순
                    </button>
                  </div>
                  <button
                    onClick={loadQuestions}
                    className="text-blue-400 hover:text-blue-300 transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                    title="새로고침"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {questions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <p className="text-gray-400 mb-2">아직 질문이 없습니다</p>
                  <p className="text-gray-500 text-sm">학생들이 수업에 참여하면 질문이 나타납니다</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((question) => (
                    <div key={question.id} className="bg-slate-700/50 rounded-xl p-4 border border-slate-600/50 hover:border-blue-500/50 transition-all duration-200">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <p className="text-white leading-relaxed mb-2">{question.content}</p>
                          <div className="flex items-center gap-3 text-sm">
                            <span className="text-gray-400">
                              {new Date(question.created_at).toLocaleTimeString('ko-KR', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            {question.status === 'answered' && (
                              <span className="px-2 py-1 bg-green-500/20 border border-green-500/30 rounded-lg text-green-400 font-medium">
                                답변 완료
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <button
                            onClick={() => handleMarkAnswered(question.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all duration-200 ${
                              question.status === 'answered'
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-slate-700/50 text-gray-400 hover:bg-emerald-500/20 hover:text-emerald-400'
                            }`}
                            title="답변 완료 표시"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-xs font-bold whitespace-nowrap">완료</span>
                          </button>
                          
                          <button
                            onClick={() => setSelectedQuestion(question)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-all duration-200 shadow-lg hover:shadow-blue-500/20"
                            title="답변하기"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            <span className="text-xs font-bold whitespace-nowrap">답변하기</span>
                          </button>
                        </div>
                      </div>
                      
                      <div className="mt-4 p-5 bg-slate-900/60 rounded-2xl border border-slate-700/30 group/content transition-all hover:border-slate-600/50">
                        <p className="text-gray-200 text-base leading-relaxed whitespace-pre-wrap">{question.content}</p>
                        {question.status === 'answered' && question.answer_content && (
                          <div className="mt-5 pt-5 border-t border-slate-700/50 animate-in fade-in slide-in-from-top-2 duration-500">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
                              <span className="text-emerald-400 text-xs font-black uppercase tracking-[0.2em]">나의 답변 완료</span>
                            </div>
                            <div className="p-4 bg-emerald-500/5 rounded-xl border border-emerald-500/10">
                              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap italic">
                                {question.answer_content}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {question.likes_count > 0 && (
                        <div className="flex items-center gap-1 px-2 py-1 mt-3 bg-amber-500/20 border border-amber-500/30 rounded-lg w-fit">
                          <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                          </svg>
                          <span className="text-amber-400 font-medium text-xs">{question.likes_count}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Answer Modal */}
        {selectedQuestion && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-xl font-semibold text-white">질문 답변</h3>
                <button
                  onClick={() => {
                    setSelectedQuestion(null)
                    setAnswerText('')
                  }}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-slate-700/50"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 p-4 bg-slate-700/50 rounded-xl">
                <p className="text-white leading-relaxed">{selectedQuestion.content}</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="flex items-center gap-1 px-2 py-1 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                    <svg className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                    </svg>
                    <span className="text-amber-400 font-medium text-sm">{selectedQuestion.likes_count} 좋아요</span>
                  </div>
                </div>
              </div>

              <textarea
                value={answerText}
                onChange={(e) => setAnswerText(e.target.value)}
                placeholder="답변을 입력하세요..."
                className="w-full h-32 px-4 py-3 bg-slate-700/50 border border-slate-600/50 text-white placeholder-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all duration-200 resize-none"
              />

              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleAnswerQuestion}
                  disabled={!answerText.trim() || isSubmitting}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] disabled:scale-100 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                      <span>등록 중...</span>
                    </>
                  ) : (
                    '답변 등록'
                  )}
                </button>
                <button
                  onClick={() => {
                    setSelectedQuestion(null)
                    setAnswerText('')
                  }}
                  className="flex-1 bg-slate-700/50 hover:bg-slate-700/70 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Room Management Modal */}
        {showRoomManagement && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-slate-800/95 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">수업방 관리</h2>
                <button
                  onClick={() => setShowRoomManagement(false)}
                  className="text-gray-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-700/50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Add New Room */}
              <div className="bg-slate-700/50 rounded-xl p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">새 수업방 추가</h3>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="수업방 이름 입력"
                    className="flex-1 px-4 py-3 bg-slate-600/50 border border-slate-500/50 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
                  />
                  <button
                    onClick={handleCreateRoom}
                    disabled={isLoading || !roomName.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:shadow-xl disabled:cursor-not-allowed"
                  >
                    {isLoading ? '생성 중...' : '추가'}
                  </button>
                </div>
              </div>

              {/* Room List */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white mb-4">내 수업방 목록 ({myRooms.length}개)</h3>
                {myRooms.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-slate-700/50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <p className="text-gray-400">생성된 수업방이 없습니다.</p>
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {myRooms.map((roomData) => (
                      <div key={roomData.id} className="flex items-center justify-between p-4 bg-slate-700/50 rounded-xl border border-slate-600/50 hover:border-blue-500/50 transition-all duration-200">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <div>
                            <h4 className="text-white font-medium">{roomData.room_name}</h4>
                            <p className="text-gray-400 text-sm">
                              수업 코드: {roomData.id?.slice(-6).toUpperCase()} | 
                              생성일: {new Date(roomData.created_at).toLocaleDateString('ko-KR')}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              handleSelectRoom(roomData)
                              setShowRoomManagement(false)
                            }}
                            className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm font-medium"
                          >
                            선택
                          </button>
                          <button
                            onClick={() => handleDeleteRoom(roomData.id)}
                            className="px-3 py-1 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors text-sm font-medium"
                          >
                            삭제
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      {/* Interactive Teacher Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          <div className="relative bg-slate-900 rounded-[2rem] p-8 border border-slate-700 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
            {tutorialStep === 1 && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">학급 공지사항</h3>
                <p className="text-slate-400">화면 상단에서 학생들에게 전달할 공지를 등록해 보세요. 즉시 학생 화면에 나타납니다.</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">질문 관리</h3>
                <p className="text-slate-400">학생들의 질문이 리스트에 표시됩니다. '답변하기' 버튼으로 소통을 시작하세요.</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">수업방 관리</h3>
                <p className="text-slate-400">상단의 '관리' 버튼을 통해 수업방을 새로 만들거나 삭제할 수 있습니다.</p>
                <div className="pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => {
                      setShowTutorial(false)
                      localStorage.setItem('has_seen_teacher_tutorial', 'true')
                    }}
                    className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20"
                  >
                    가이드 완료!
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pointer Arrows for Teacher */}
          {tutorialStep === 1 && (
            <div className="absolute top-[15%] right-[20%] animate-bounce pointer-events-none">
              <div className="w-8 h-8 border-t-4 border-r-4 border-blue-500 rotate-45" />
            </div>
          )}
          {tutorialStep === 2 && (
            <div className="absolute top-[50%] left-1/2 -translate-x-1/2 animate-pulse pointer-events-none">
              <div className="px-6 py-3 bg-emerald-500 text-white font-black rounded-full shadow-2xl">여기에 학생 질문이 나타납니다!</div>
            </div>
          )}
        </div>
      )}
      {/* Premium Lock Overlay */}
      {!isPremium && room && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-xl" />
          
          <div className="relative bg-slate-800 rounded-[2.5rem] p-10 border border-slate-700 max-w-lg w-full shadow-[0_0_100px_rgba(59,130,246,0.2)] text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-400 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-lg shadow-amber-500/20">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <h2 className="text-3xl font-black text-white mb-4 italic tracking-tight">서비스 이용 제한</h2>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              현재 <span className="text-amber-400 font-bold">입금 확인 대기 중</span>입니다.<br/>
              관리자가 입금을 확인한 후 즉시 모든 기능이 활성화됩니다.
            </p>

            <div className="bg-slate-900/50 rounded-3xl p-6 border border-slate-700/50 mb-8 text-left space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">입금 계좌</span>
                <div className="flex items-center gap-2">
                  <span className="text-white font-medium">카카오뱅크 3333-12-3456789</span>
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText('3333123456789')
                      alert('계좌번호가 복사되었습니다!')
                    }}
                    className="p-1.5 bg-slate-700 hover:bg-slate-600 rounded-lg text-slate-300 transition-colors"
                    title="계좌번호 복사"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                  </button>
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">예금주</span>
                <span className="text-white font-medium">귓속말(홍길동)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 text-sm font-bold uppercase tracking-wider">결제 금액</span>
                <span className="text-emerald-400 font-black">990원</span>
              </div>
            </div>

            <div className="space-y-4">
              <button 
                onClick={async () => {
                  if (!session?.user?.email) return
                  setIsRequestingPayment(true)
                  try {
                    const success = await requestPaymentVerification(session.user.email)
                    if (success) {
                      setPaymentRequested(true)
                      alert('입금 확인 요청이 전송되었습니다! 관리자가 확인 후 승인해 드립니다.')
                    } else {
                      alert('요청 전송에 실패했습니다. 잠시 후 다시 시도해주세요.')
                    }
                  } catch (err) {
                    alert('에러가 발생했습니다.')
                  } finally {
                    setIsRequestingPayment(false)
                  }
                }}
                disabled={isRequestingPayment || paymentRequested}
                className="w-full py-5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-blue-500/30 hover:scale-[1.02] active:scale-95 transition-all disabled:from-slate-700 disabled:to-slate-800 disabled:text-slate-500 disabled:scale-100 flex items-center justify-center gap-2"
              >
                {isRequestingPayment ? (
                  <>
                    <span className="w-6 h-6 border-3 border-white/30 border-t-white rounded-full animate-spin"></span>
                    <span>요청 중...</span>
                  </>
                ) : paymentRequested ? (
                  '입금 확인 요청 완료'
                ) : (
                  '입금 확인 요청하기'
                )}
              </button>
              <button 
                onClick={() => setRoom(null)}
                className="w-full py-4 text-slate-500 font-bold hover:text-slate-300 transition-colors"
              >
                홈으로 돌아가기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Teacher Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          
          <div className="relative bg-slate-900 rounded-[2rem] p-8 border border-slate-700 max-w-sm w-full shadow-2xl animate-in zoom-in-95 duration-300">
            {tutorialStep === 1 && (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-blue-500 rounded-2xl flex items-center justify-center mx-auto animate-bounce">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">학급 공지사항</h3>
                <p className="text-slate-400">화면 상단에서 학생들에게 전달할 공지를 등록해 보세요. 즉시 학생 화면에 나타납니다.</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">질문 관리</h3>
                <p className="text-slate-400">학생들의 질문이 리스트에 표시됩니다. '답변하기' 버튼으로 소통을 시작하세요.</p>
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-white">수업방 관리</h3>
                <p className="text-slate-400">상단의 '관리' 버튼을 통해 수업방을 새로 만들거나 삭제할 수 있습니다.</p>
                <div className="pt-4 border-t border-slate-800">
                  <button 
                    onClick={() => {
                      setShowTutorial(false)
                      localStorage.setItem('has_seen_teacher_tutorial', 'true')
                    }}
                    className="w-full py-4 bg-emerald-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20"
                  >
                    가이드 완료!
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Pointer Arrows for Teacher */}
          {tutorialStep === 1 && (
            <div className="absolute top-[25%] right-[30%] animate-bounce pointer-events-none z-[110]">
              <div className="w-12 h-12 border-t-8 border-r-8 border-blue-500 rotate-[135deg]" />
            </div>
          )}
          {tutorialStep === 2 && (
            <div className="absolute top-[60%] left-1/2 -translate-x-1/2 animate-pulse pointer-events-none z-[110]">
              <div className="px-8 py-4 bg-emerald-500 text-white font-black rounded-3xl shadow-[0_0_50px_rgba(16,185,129,0.4)] text-lg">여기에 학생 질문이 실시간으로 나타납니다!</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
