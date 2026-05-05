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
  const [noticeSuccess, setNoticeSuccess] = useState(false)
  const [isRequestingPayment, setIsRequestingPayment] = useState(false)
  const [paymentRequested, setPaymentRequested] = useState(false)

  // Use teacher email from Google session
  const teacherId = session?.user?.email || `teacher_${Date.now()}`

  // Use real-time questions hook
  const questions = useRealtimeQuestions(room?.id || '', initialQuestions)
  
  // Real-time room hook for notices
  const realtimeRoom = useRealtimeRoom(room?.id || '', room)

  useEffect(() => {
    // Initialize notice text from room data if not already set
    if (realtimeRoom?.notice && noticeText === '') {
      setNoticeText(realtimeRoom.notice)
    } else if (room?.notice && noticeText === '') {
      setNoticeText(room.notice)
    }
  }, [realtimeRoom, room])

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

    // Check payment status
    if ((teacherData as any)?.payment_status === 'pending') {
      setPaymentRequested(true)
      setShowPaymentPopup(true)
    }

    // Check tutorial
    const hasSeenTutorial = localStorage.getItem('has_seen_teacher_tutorial')
    if (!hasSeenTutorial) {
      setShowTutorial(true)
    }
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
  }

  const handleUpdateNotice = async () => {
    if (!room) return
    setIsUpdatingNotice(true)
    try {
      const success = await updateRoomNotice(room.id, noticeText)
      if (success) {
        const updatedRoom = { ...room, notice: noticeText, updated_at: new Date().toISOString() }
        setRoom(updatedRoom)
        setNoticeSuccess(true)
        setTimeout(() => setNoticeSuccess(false), 2000)
      } else {
        alert('공지 게시 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
      }
    } finally {
      setIsUpdatingNotice(false)
    }
  }

  const handleCreateRoom = async () => {
    if (!roomName.trim() || !teacherId) return
    
    if (!isPremium) {
      setShowPaymentPopup(true)
      return
    }

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
    if (!isPremium) {
      setShowPaymentPopup(true)
      return
    }
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

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="relative z-10 text-center">
          <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-950 rounded-full mx-auto mb-6 animate-spin"></div>
          <h2 className="text-3xl font-bold text-indigo-950 tracking-tight mb-2">sgon</h2>
          <p className="text-slate-400 font-bold text-xs tracking-widest uppercase">인증 중...</p>
        </div>
      </div>
    )
  }

  // Redirect to sign in if not authenticated
  if (!session) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="w-full max-w-sm relative z-10">
          <div className="text-center mb-12">
            <h1 className="text-6xl font-bold text-indigo-950 mb-2 tracking-tight">sgon</h1>
            <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px] ml-1">선생님 대시보드</p>
          </div>

          <div className="bg-white p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-slate-200 shadow-xl space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-slate-800 tracking-tight">선생님 로그인</h2>
              <p className="text-slate-500 font-medium text-sm leading-relaxed">구글 계정으로 간편하게 시작하고<br/>수업의 품격을 높여보세요.</p>
            </div>

            <button
              onClick={() => signIn('google', { callbackUrl: '/teacher' })}
              className="w-full py-5 bg-indigo-950 text-white font-bold rounded-2xl shadow-lg shadow-indigo-900/10 active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg"
            >
              <svg className="w-6 h-6" viewBox="0 0 24 24">
                <path fill="#ffffff" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#ffffff" opacity="0.8" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#ffffff" opacity="0.6" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#ffffff" opacity="0.4" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google로 로그인
            </button>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl">
              <p className="text-slate-400 text-[11px] font-bold text-center leading-relaxed">
                계정 보안을 위해 공식 Google 인증을 사용합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Admin dashboard
  if (session?.user?.email === 'woojin052501@gmail.com' && !room) {
    return (
      <div className="min-h-screen bg-white text-slate-900 relative overflow-hidden font-sans">
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-5">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500 rounded-full blur-[120px]"></div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
          <header className="flex items-center justify-between mb-16">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-indigo-950 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/10 transform -rotate-6">
                <svg className="w-8 h-8 text-white rotate-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-indigo-950">sgon Admin</h1>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-1">관리자 전용 대시보드</p>
              </div>
            </div>
            <button onClick={() => signOut()} className="px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-100 font-bold transition-all active:scale-95">로그아웃</button>
          </header>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Link href="/admin" className="p-8 bg-white border border-slate-100 rounded-[3rem] hover:border-indigo-950/20 transition-all group shadow-sm">
              <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-indigo-950 mb-2">결제 승인 관리</h3>
              <p className="text-slate-500 text-sm font-medium">선생님들의 프리미엄 결제 요청을 실시간으로 확인하고 승인합니다.</p>
            </Link>

            <button onClick={() => setShowRoomManagement(true)} className="p-8 bg-white border border-slate-100 rounded-[3rem] hover:border-indigo-950/20 transition-all group text-left shadow-sm">
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <svg className="w-7 h-7 text-indigo-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-indigo-950 mb-2">전체 수업방 관리</h3>
              <p className="text-slate-500 text-sm font-medium">현재 생성된 모든 sgon 수업방 목록을 조회하고 관리합니다.</p>
            </button>

            <div className="p-8 bg-white border border-slate-100 rounded-[3rem] shadow-sm">
              <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center mb-6">
                <svg className="w-7 h-7 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-indigo-950 mb-2">시스템 현황</h3>
              <p className="text-slate-500 text-sm font-medium">활성 사용자 수와 실시간 트래픽 데이터를 모니터링합니다.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Teacher Room Selection / Creation
  if (!room) {
    return (
      <div className="min-h-screen bg-white text-indigo-950 relative overflow-hidden font-sans">
        <div className="absolute top-0 right-0 w-full h-full pointer-events-none opacity-5">
          <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-500 rounded-full blur-[150px]"></div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-12 relative z-10">
          <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 mb-20 sm:mb-28">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-indigo-950 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-900/10 transform -rotate-6">
                <span className="text-4xl font-bold text-white">s</span>
              </div>
              <div>
                <h1 className="text-4xl font-bold tracking-tight text-indigo-950">sgon board</h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-1.5 ml-0.5">{session?.user?.name} 선생님</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setShowPaymentPopup(true)} 
                className={`px-8 py-4 rounded-[1.5rem] font-bold text-sm transition-all flex items-center gap-3 ${isPremium ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100 shadow-sm hover:scale-105'}`}
              >
                <div className={`w-2 h-2 rounded-full animate-pulse ${isPremium ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
                {isPremium ? '프리미엄 활성화' : '프리미엄 신청'}
              </button>
              <button onClick={() => signOut()} className="px-6 py-4 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-[1.5rem] border border-slate-100 font-bold transition-all text-sm">로그아웃</button>
            </div>
          </header>

          <div className="grid sm:grid-cols-2 gap-16 sm:gap-24">
            <section className="space-y-12">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-indigo-950">수업 목록</h2>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Managed Classes</p>
                </div>
                <div className="px-5 py-2 bg-indigo-50 rounded-2xl border border-indigo-100">
                  <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest">{myRooms.length} Active</span>
                </div>
              </div>
              
              {myRooms.length === 0 ? (
                <div className="py-24 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[3rem] group hover:border-indigo-200 transition-colors">
                  <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                    <svg className="w-10 h-10 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                  </div>
                  <p className="text-slate-400 font-bold mb-4">아직 생성된 수업방이 없습니다.</p>
                  <p className="text-indigo-950/20 text-[10px] font-bold uppercase tracking-widest">첫 번째 수업방을 만들어보세요</p>
                </div>
              ) : (
                <div className="grid gap-6">
                  {myRooms.map((r) => (
                    <button 
                      key={r.id}
                      onClick={() => handleSelectRoom(r)}
                      className="group p-10 bg-white border border-slate-100 rounded-[3rem] hover:border-indigo-950/20 hover:shadow-2xl hover:shadow-indigo-900/5 transition-all text-left relative overflow-hidden shadow-sm"
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="w-2 h-2 bg-indigo-950 rounded-full"></span>
                            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">Room ID: {r.id.slice(-6).toUpperCase()}</p>
                          </div>
                          <h4 className="text-2xl font-bold text-indigo-950 mb-2 group-hover:translate-x-1 transition-transform">{r.room_name}</h4>
                          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{new Date(r.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="w-14 h-14 bg-slate-50 rounded-[1.5rem] flex items-center justify-center group-hover:bg-indigo-950 group-hover:text-white transition-all shadow-sm">
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section className="space-y-12">
              <div>
                <h2 className="text-3xl font-bold tracking-tight text-indigo-950">새 수업 시작</h2>
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">Initialize Session</p>
              </div>
              <div className="p-10 bg-white border border-slate-100 rounded-[3.5rem] shadow-xl shadow-indigo-900/5 space-y-10">
                <div className="space-y-4">
                  <label className="block text-[10px] font-bold text-indigo-950 uppercase tracking-[0.4em] ml-1">수업 명칭</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="예: 3학년 2반 수학교실"
                    className="w-full px-8 py-7 bg-slate-50 border border-slate-100 text-indigo-950 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all font-bold placeholder:text-slate-200 text-xl shadow-inner"
                  />
                </div>
                
                <button
                  onClick={handleCreateRoom}
                  disabled={isLoading || !roomName.trim()}
                  className="w-full py-7 bg-indigo-950 text-white font-bold rounded-[2rem] shadow-xl shadow-indigo-900/20 active:scale-[0.98] transition-all disabled:opacity-30 text-xl tracking-tight"
                >
                  {isLoading ? '생성 중...' : '수업 시작하기'}
                </button>

                <div className="p-8 bg-indigo-50/50 rounded-[2rem] border border-indigo-100">
                  <div className="flex items-start gap-4">
                    <svg className="w-6 h-6 text-indigo-950 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-indigo-950/60 text-sm font-medium leading-relaxed">
                      수업방을 생성하면 고유 코드가 발급됩니다. 학생들은 sgon 웹사이트에서 코드만 입력하면 즉시 참여할 수 있습니다.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>

        {/* Payment Popup */}
        {showPaymentPopup && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-6 z-[100]">
            <div className="bg-white border border-slate-200 rounded-[3rem] p-8 sm:p-12 max-w-lg w-full shadow-2xl relative overflow-hidden">
              <div className="text-center mb-10 relative z-10">
                <div className="w-16 h-16 bg-indigo-950 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-900/20">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-7.714 2.143L11 21l-2.286-6.857L1 12l7.714-2.143L11 3z" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold text-indigo-950 tracking-tight mb-2">sgon 프리미엄</h2>
                <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">{paymentRequested ? '입금 확인 요청 완료' : '모든 기능을 무제한으로 이용하세요'}</p>
              </div>

              <div className="space-y-6 relative z-10">
                {paymentRequested ? (
                  <div className="p-8 bg-indigo-50 border border-indigo-100 rounded-[2.5rem] text-center space-y-4">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto shadow-sm">
                      <div className="w-8 h-8 border-4 border-indigo-50 border-t-indigo-950 rounded-full animate-spin"></div>
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-indigo-950 mb-2">입금 확인 중입니다</h4>
                      <p className="text-slate-500 text-sm leading-relaxed font-medium">관리자가 입금을 확인하는 대로<br/>프리미엄 기능이 활성화됩니다.</p>
                    </div>
                    <div className="pt-4">
                      <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest mb-4">입금이 늦어지나요?</p>
                      <button 
                        onClick={() => window.open('https://open.kakao.com/o/g3INItti', '_blank')}
                        className="w-full py-4 bg-[#FEE500] text-slate-900 rounded-2xl font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all"
                      >
                        입금자 확인방 가기
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="p-8 bg-indigo-950 rounded-[2.5rem] text-white shadow-xl shadow-indigo-900/20">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold tracking-widest uppercase text-xs opacity-70">월간 구독</span>
                        <span className="font-bold text-3xl tracking-tight">990원</span>
                      </div>
                      <p className="text-xs font-bold opacity-80 uppercase tracking-widest">모든 수업 기능 잠금 해제</p>
                    </div>

                    <div className="bg-slate-50 rounded-[2.5rem] p-8 border border-slate-100 space-y-4">
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">입금 계좌</span>
                        <span className="text-indigo-950 font-bold text-sm">NH농협 3516376760453</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">예금주</span>
                        <span className="text-indigo-950 font-bold text-sm">WJedulab</span>
                      </div>
                    </div>
                  </>
                )}

                <div className="flex gap-3">
                  <button onClick={() => {
                    navigator.clipboard.writeText('NH농협 3516376760453')
                    alert('계좌번호가 복사되었습니다.')
                  }} className="flex-1 py-5 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-slate-100 transition-all text-slate-600">계좌 복사</button>
                  <button 
                    disabled={isRequestingPayment}
                    onClick={async () => {
                      setIsRequestingPayment(true)
                      if (session?.user?.email) {
                        await requestPaymentVerification(session.user.email)
                        setPaymentRequested(true)
                      }
                      window.open('https://open.kakao.com/o/g3INItti', '_blank')
                      setIsRequestingPayment(false)
                    }} className="flex-1 py-5 bg-[#FEE500] text-slate-900 rounded-2xl font-bold text-xs uppercase tracking-widest hover:brightness-110 transition-all disabled:opacity-50"
                  >
                    {isRequestingPayment ? '처리 중...' : '입금자 확인방 입장'}
                  </button>
                </div>

                <button onClick={() => setShowPaymentPopup(false)} className="w-full py-4 sm:py-5 text-slate-400 font-bold text-[10px] sm:text-xs uppercase tracking-[0.3em] hover:text-slate-600 transition-all">나중에 하기</button>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // Main teacher dashboard with room
  return (
    <div className="min-h-screen bg-white text-slate-900 relative flex flex-col font-sans">
      {/* Background elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-50/50 rounded-full blur-[120px] opacity-20"></div>
      </div>

      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-3xl border-b border-slate-100 px-4 sm:px-8 py-3 sm:py-4 flex items-center justify-between">
        <div className="flex items-center gap-3 sm:gap-4">
          <button onClick={() => setRoom(null)} className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all active:scale-90 border border-slate-100">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="h-6 sm:h-8 w-[1px] bg-white/10 mx-1 sm:mx-2"></div>
          <div className="max-w-[150px] sm:max-w-none text-left">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight leading-none mb-1">sgon room</h1>
            <p className="text-[9px] sm:text-[10px] font-bold text-blue-400 uppercase tracking-widest truncate">{room.room_name}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="text-right hidden sm:block">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-1">수업 코드</p>
            <p className="text-2xl font-bold tracking-tight text-blue-500 leading-none">{room?.id?.slice(-6).toUpperCase()}</p>
          </div>
          <div className="h-10 w-[1px] bg-white/10 mx-2 hidden sm:block"></div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowRoomManagement(true)} className="w-10 h-10 sm:w-12 sm:h-12 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all group">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
            <button onClick={() => signOut()} className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center hover:bg-red-500/20 transition-all group">
              <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-8 relative z-10 grid lg:grid-cols-12 gap-6 sm:gap-8">
        {/* Left Column - Notice & Actions */}
        <aside className="lg:col-span-4 space-y-6 sm:space-y-8">
          <section className="bg-white border border-slate-100 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 shadow-sm space-y-6 sm:space-y-8">
            <div>
              <h3 className="text-[10px] font-bold text-indigo-950 uppercase tracking-[0.3em] mb-4 ml-1">수업 관리</h3>
              <div className="space-y-4">
                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">전체 질문</span>
                    <span className="text-2xl font-bold text-indigo-950">{questions.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">답변 완료</span>
                    <span className="text-2xl font-bold text-emerald-500">{questions.filter(q => q.status === 'answered').length}</span>
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/student/${room.id}`)
                    setIsLoading(true)
                    setTimeout(() => setIsLoading(false), 2000)
                  }}
                  className="w-full py-5 bg-indigo-950 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-900/10 active:scale-95"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {isLoading ? '복사 완료!' : '수업 링크 복사'}
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-bold text-indigo-950 uppercase tracking-[0.3em] mb-4 ml-1">공지사항</h3>
              <div className="space-y-4">
                <div className="relative group">
                  <textarea
                    value={noticeText}
                    onChange={(e) => setNoticeText(e.target.value)}
                    placeholder="공지사항을 입력하세요..."
                    className="w-full h-24 sm:h-32 bg-slate-50 border border-slate-100 text-slate-900 p-4 sm:p-5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all font-bold placeholder:text-slate-200 text-xs sm:text-sm resize-none shadow-sm"
                  />
                  {room?.notice && (
                    <button 
                      onClick={async () => {
                        if (confirm('공지를 삭제하시겠습니까?')) {
                          const success = await updateRoomNotice(room.id, '')
                          if (success) {
                            setNoticeText('')
                            setRoom({ ...room, notice: '' })
                          }
                        }
                      }}
                      className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm text-slate-400 hover:text-red-500 rounded-xl border border-slate-100 shadow-sm transition-all"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
                <button
                  onClick={handleUpdateNotice}
                  disabled={isUpdatingNotice || noticeText.trim() === (room?.notice || '')}
                  className={`w-full py-5 rounded-2xl font-bold shadow-lg transition-all text-xs uppercase tracking-widest ${noticeSuccess ? 'bg-emerald-500 text-white shadow-emerald-500/10' : 'bg-indigo-950 text-white shadow-indigo-900/10 active:scale-95'}`}
                >
                  {isUpdatingNotice ? '업데이트 중...' : (noticeSuccess ? '공지 게시 완료!' : '공지 게시하기')}
                </button>
              </div>
            </div>
          </section>
        </aside>

        <section className="lg:col-span-8 space-y-6 sm:space-y-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2 sm:px-4">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase text-indigo-950">질문 목록</h2>
            <div className="flex bg-slate-50 rounded-2xl p-1.5 border border-slate-100 w-full sm:w-auto">
              <button 
                onClick={() => setSortBy('latest')}
                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all ${sortBy === 'latest' ? 'bg-indigo-950 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                최신순
              </button>
              <button 
                onClick={() => setSortBy('likes')}
                className={`flex-1 sm:flex-none px-4 sm:px-5 py-2 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-widest transition-all ${sortBy === 'likes' ? 'bg-indigo-950 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
              >
                인기순
              </button>
            </div>
          </div>

          <div className="grid gap-6">
            {questions.length === 0 ? (
              <div className="p-32 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[4rem]">
                <div className="w-24 h-24 bg-white rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-sm">
                  <svg className="w-12 h-12 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                  </svg>
                </div>
                <p className="text-indigo-950 font-bold text-xl tracking-tight mb-2">아직 질문이 없습니다</p>
                <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">학생들이 질문을 남길 때까지 기다려주세요</p>
              </div>
            ) : (
              questions.map((q) => (
                <div 
                  key={q.id} 
                  className="bg-white border border-slate-100 rounded-[2rem] sm:rounded-[3rem] p-6 sm:p-8 hover:border-slate-200 transition-all group relative overflow-hidden shadow-sm"
                >
                  <div className={`absolute top-0 left-0 w-2 h-full transition-colors ${q.status === 'answered' ? 'bg-emerald-500' : 'bg-blue-600'}`}></div>
                  
                  <div className="flex justify-between items-start gap-8">
                    <div className="flex-1 space-y-6">
                      <div className="flex items-center gap-3">
                        <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-4 py-2 rounded-2xl ${q.status === 'answered' ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
                          {q.status === 'answered' ? '답변 완료' : '대기 중'}
                        </span>
                        <span className="text-slate-300 text-[10px] font-bold uppercase tracking-tighter">
                          {new Date(q.created_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {q.likes_count > 0 && (
                          <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-amber-100">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" /></svg>
                            {q.likes_count}
                          </span>
                        )}
                      </div>
                      
                      <p className="text-indigo-950 font-bold text-2xl leading-relaxed tracking-tight">{q.content}</p>

                      {q.status === 'answered' && q.answer_content && (
                        <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                            <span className="text-emerald-600 text-[10px] font-bold uppercase tracking-[0.3em]">선생님의 답변</span>
                          </div>
                          <p className="text-slate-500 text-lg font-medium leading-relaxed italic">{q.answer_content}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-3 shrink-0">
                      <button 
                        onClick={() => setSelectedQuestion(q)}
                        className="w-14 h-14 bg-slate-50 hover:bg-indigo-950 text-slate-400 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-slate-100 shadow-sm"
                      >
                        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                      {q.status !== 'answered' && (
                        <button 
                          onClick={() => handleMarkAnswered(q.id)}
                          className="w-14 h-14 bg-emerald-50 hover:bg-emerald-600 text-emerald-600 hover:text-white rounded-2xl flex items-center justify-center transition-all border border-emerald-100 shadow-sm"
                        >
                          <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </main>

      {selectedQuestion && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xl">
          <div className="bg-white border border-slate-200 rounded-[2.5rem] sm:rounded-[3rem] p-8 sm:p-12 max-w-2xl w-full shadow-2xl relative overflow-hidden">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-950 rounded-xl flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold tracking-tight text-indigo-950 uppercase">질문 답변</h3>
              </div>
              <button onClick={() => { setSelectedQuestion(null); setAnswerText(''); }} className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all border border-slate-100">
                <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-10">
              <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-sm">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-3">학생 질문</p>
                <p className="text-slate-900 font-bold text-xl leading-relaxed">{selectedQuestion.content}</p>
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-[0.3em] ml-2">선생님 답변</label>
                <textarea
                  value={answerText}
                  onChange={(e) => setAnswerText(e.target.value)}
                  placeholder="답변 내용을 입력하세요..."
                  className="w-full h-48 bg-white border border-slate-200 text-slate-900 p-8 rounded-[2rem] focus:outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all font-bold placeholder:text-slate-200 text-lg leading-relaxed shadow-sm resize-none"
                />
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={() => { setSelectedQuestion(null); setAnswerText(''); }} 
                  className="flex-1 py-6 bg-slate-100 text-slate-400 font-bold rounded-2xl active:scale-95 transition-all text-lg"
                >
                  취소
                </button>
                <button
                  onClick={handleAnswerQuestion}
                  disabled={!answerText.trim() || isSubmitting}
                  className="flex-[2] py-6 bg-indigo-950 text-white font-bold rounded-2xl shadow-xl shadow-indigo-900/10 active:scale-95 transition-all disabled:opacity-30 text-lg"
                >
                  {isSubmitting ? '전송 중...' : '답변 등록'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Room Management Panel Overlay */}
      {showRoomManagement && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-indigo-950/20 backdrop-blur-xl">
          <div className="bg-white border border-slate-100 rounded-[3rem] sm:rounded-[4rem] p-8 sm:p-12 max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl relative">
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight text-indigo-950">수업 통합 관리</h2>
              <button onClick={() => setShowRoomManagement(false)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center hover:bg-slate-100 transition-all text-slate-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-12">
              {/* Add New Room Section */}
              <div className="bg-slate-50 rounded-[3rem] p-10 border border-slate-100">
                <h3 className="text-[10px] font-bold text-indigo-950 uppercase tracking-[0.3em] mb-6 ml-2">수업 바로 추가하기</h3>
                <div className="flex flex-col sm:flex-row gap-4">
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="수업 이름을 입력하세요..."
                    className="flex-1 px-8 py-6 bg-white border border-slate-100 text-indigo-950 rounded-3xl focus:outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all font-bold placeholder:text-slate-200 text-lg"
                  />
                  <button
                    onClick={handleCreateRoom}
                    disabled={isLoading || !roomName.trim()}
                    className="px-10 py-6 bg-indigo-950 text-white font-bold rounded-3xl shadow-xl shadow-indigo-900/10 active:scale-95 transition-all disabled:opacity-20 text-lg"
                  >
                    {isLoading ? '생성 중...' : '생성하기'}
                  </button>
                </div>
              </div>

              {/* Room List Section */}
              <div className="space-y-6">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mb-2 ml-2">나의 수업 목록 ({myRooms.length})</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {myRooms.map((roomData) => (
                    <div key={roomData.id} className="group p-8 bg-white border border-slate-100 rounded-[2.5rem] hover:border-indigo-950/20 transition-all flex items-center justify-between shadow-sm">
                      <div>
                        <h4 className="text-xl font-bold text-indigo-950 mb-1">{roomData.room_name}</h4>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-none mt-1">Code: {roomData.id?.slice(-6).toUpperCase()}</p>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => { handleSelectRoom(roomData); setShowRoomManagement(false); }}
                          className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center hover:bg-indigo-950 hover:text-white transition-all active:scale-90"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => handleDeleteRoom(roomData.id)}
                          className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center hover:bg-red-500 hover:text-white transition-all active:scale-90"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTutorial && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-indigo-950/40 backdrop-blur-3xl">
          <div className="bg-white border border-slate-100 rounded-[4rem] p-16 max-w-lg w-full shadow-2xl text-center space-y-12 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-8 opacity-5">
                <svg className="w-48 h-48 text-indigo-950" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12V12a1 1 0 002 0v-1.012l.21.09a1 1 0 01.59 1.15l-1 4a1 1 0 01-1.807.45L1.894 14.87a1 1 0 011.416-1.414l.89.89 1.11-4.44l-2-.857a1 1 0 010-1.84L3.31 9.397z" />
                </svg>
              </div>

              <div className="space-y-12 relative z-10">
                <div className="w-20 h-20 bg-blue-500/20 rounded-2xl flex items-center justify-center mx-auto border border-blue-500/30">
                  <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl font-bold tracking-tight">실시간 공지</h3>
                  <p className="text-slate-500 font-bold text-lg leading-relaxed">
                    왼쪽 사이드바에서 실시간 공지를 올려보세요.<br/>학생들의 화면 상단에 즉시 나타납니다.
                  </p>
                </div>
                <button onClick={() => setTutorialStep(2)} className="w-full py-6 bg-blue-500 text-white font-bold rounded-3xl shadow-2xl shadow-blue-500/40 text-xl tracking-tight">다음 (1/2)</button>
              </div>
            {tutorialStep === 2 && (
              <div className="space-y-12 relative z-10">
                <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto border border-emerald-500/30">
                  <svg className="w-10 h-10 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="space-y-4">
                  <h3 className="text-4xl font-bold tracking-tight">실시간 답변</h3>
                  <p className="text-slate-500 font-bold text-lg leading-relaxed">
                    학생들의 익명 질문(sgon)에 바로 답변하세요.<br/>답변이 등록되면 학생에게 알림이 갑니다.
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setShowTutorial(false)
                    localStorage.setItem('has_seen_teacher_tutorial', 'true')
                  }} 
                  className="w-full py-6 bg-emerald-500 text-white font-bold rounded-3xl shadow-2xl shadow-emerald-500/40 text-xl tracking-tight"
                >
                  시작할게요! (2/2)
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Styled JSX for custom animations */}
      <style jsx global>{`
        ::-webkit-scrollbar {
          width: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(51, 65, 85, 0.8);
          border-radius: 10px;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(71, 85, 105, 1);
        }
        .italic {
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
