'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function Home() {
  const [roomCode, setRoomCode] = useState('')
  const [recentRooms, setRecentRooms] = useState<any[]>([])

  useEffect(() => {
    const historyJson = localStorage.getItem('sgon_student_rooms')
    if (historyJson) {
      setRecentRooms(JSON.parse(historyJson))
    }
  }, [])

  return (
    <div className="min-h-screen bg-white text-slate-900 relative overflow-hidden flex flex-col items-center justify-center font-sans">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-50/50 rounded-full blur-[120px] opacity-20"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-indigo-50/50 rounded-full blur-[120px] opacity-20"></div>
      </div>

      <div className="container max-w-lg mx-auto px-6 py-12 relative z-10 flex flex-col min-h-screen">
        {/* Logo / Header */}
        <header className="flex flex-col items-center mb-12 sm:mb-16 pt-8">
          <h1 className="text-6xl sm:text-7xl font-bold tracking-tight mb-4 text-slate-900">sgon</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[9px] sm:text-[10px] bg-slate-100 px-5 py-2.5 rounded-full border border-slate-200">
            실시간 수업 소통 플랫폼
          </p>
        </header>

        {/* Main Selection Area */}
        <div className="flex-1 space-y-8 flex flex-col justify-center pb-20">
          <div className="text-center space-y-4 mb-4">
            <h2 className="text-2xl font-bold leading-tight tracking-tight text-slate-800">
              가장 조용한 목소리가 만드는<br />
              <span className="text-indigo-900">가장 뜨거운 수업</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm">부담 없는 익명 질문으로 소통의 벽을 허무세요.</p>
          </div>

          {/* Student Entrance */}
          <div className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-xl space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-indigo-900 uppercase tracking-widest ml-2 text-center">수업 입장</label>
              <input
                type="text"
                placeholder="수업 코드를 입력하세요 (6자리)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                maxLength={6}
                className="w-full px-6 py-5 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-900/10 transition-all font-bold placeholder:text-slate-300 text-lg text-center tracking-widest uppercase"
              />
            </div>
            
            <Link 
              href={roomCode ? `/student/${roomCode}` : '#'}
              className={`w-full py-6 flex items-center justify-center gap-3 font-bold rounded-3xl transition-all text-lg shadow-xl ${
                roomCode 
                  ? 'bg-indigo-950 text-white shadow-indigo-900/20 active:scale-[0.98]' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed'
              }`}
              onClick={(e) => {
                if (!roomCode) e.preventDefault()
              }}
            >
              수업 참여하기
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>

          {/* Recent Rooms Section */}
          {recentRooms.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-sm font-bold text-slate-800 tracking-tight">내가 참여중인 수업</h3>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full uppercase tracking-widest">{recentRooms.length} Rooms</span>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('sgon_student_rooms')
                      setRecentRooms([])
                    }}
                    className="text-[9px] font-bold text-slate-300 hover:text-red-400 uppercase tracking-widest transition-colors"
                  >
                    초기화
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                {recentRooms.slice(0, 5).map((room) => (
                  <Link 
                    key={room.id}
                    href={`/student/${room.id}`}
                    className="group bg-white border border-slate-100 p-8 rounded-[2.5rem] flex items-center justify-between hover:border-indigo-950/20 hover:shadow-2xl hover:shadow-indigo-900/5 transition-all active:scale-[0.98] shadow-sm"
                  >
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-indigo-950 rounded-2xl flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-indigo-950/20 group-hover:scale-110 transition-transform">
                        {room.id.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-slate-900 group-hover:text-indigo-950 transition-colors leading-tight">{room.name}</h4>
                        <div className="flex items-center gap-3 mt-1.5">
                          <span className="text-[10px] font-bold text-indigo-900/40 uppercase tracking-widest">Code: {room.id}</span>
                          <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">{new Date(room.lastJoined).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </div>
                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-indigo-950 group-hover:text-white transition-all shadow-sm">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Teacher Entrance */}
          <Link 
            href="/teacher"
            className="group relative block"
          >
            <div className="relative bg-white hover:bg-slate-50 border border-slate-200 p-8 rounded-[2.5rem] flex items-center justify-between transition-all group-active:scale-[0.98] shadow-lg">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center border border-slate-200">
                  <svg className="w-7 h-7 text-indigo-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold tracking-tight text-slate-900">선생님 전용</h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-0.5">Teacher Dashboard</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center border border-slate-200 group-hover:translate-x-2 transition-transform">
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </div>
          </Link>
        </div>

        {/* Footer / Info */}
        <footer className="mt-auto pt-10 text-center space-y-4">
          <div className="flex justify-center gap-8">
            <div className="text-center">
              <p className="text-indigo-900 font-bold text-xl">100%</p>
              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-1">Anonymous</p>
            </div>
            <div className="w-[1px] h-8 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-indigo-900 font-bold text-xl">Real</p>
              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-1">Live Sync</p>
            </div>
            <div className="w-[1px] h-8 bg-slate-200"></div>
            <div className="text-center">
              <p className="text-indigo-900 font-bold text-xl">Free</p>
              <p className="text-slate-400 font-bold uppercase text-[9px] tracking-widest mt-1">For Students</p>
            </div>
          </div>
          <p className="text-slate-300 font-bold text-[9px] uppercase tracking-widest">© 2026 WJedulab. All rights reserved.</p>
        </footer>
      </div>

      <style jsx global>{`
        @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard/dist/web/static/pretendard.css');
        body {
          font-family: 'Pretendard', -apple-system, BlinkMacSystemFont, system-ui, Roboto, 'Helvetica Neue', 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif;
        }
      `}</style>
    </div>
  )
}
