'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function Home() {
  const [roomCode, setRoomCode] = useState('')

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden flex flex-col items-center justify-center font-sans">
      {/* Premium Background Elements */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] right-[-10%] w-[70%] h-[70%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="container max-w-lg mx-auto px-6 py-12 relative z-10 flex flex-col min-h-screen">
        {/* Logo / Header */}
        <header className="flex flex-col items-center mb-12 sm:mb-16 pt-8">
          <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/20 mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-500 animate-in zoom-in duration-1000">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <h1 className="text-6xl sm:text-7xl font-black tracking-tighter italic mb-4 bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent animate-in slide-in-from-bottom-4 duration-1000">sgon</h1>
          <p className="text-slate-400 font-black uppercase tracking-[0.4em] text-[9px] sm:text-[10px] bg-white/5 px-5 py-2.5 rounded-full border border-white/5 animate-in fade-in duration-1000 delay-300">
            Premium Class Interaction
          </p>
        </header>

        {/* Main Selection Area */}
        <div className="flex-1 space-y-8 flex flex-col justify-center pb-20">
          <div className="text-center space-y-4 mb-4">
            <h2 className="text-2xl font-black leading-tight italic tracking-tight">
              가장 조용한 목소리가 만드는<br />
              <span className="text-blue-500">가장 뜨거운 수업</span>
            </h2>
            <p className="text-slate-500 font-medium text-sm">부담 없는 익명 질문으로 소통의 벽을 허무세요.</p>
          </div>

          {/* Student Entrance */}
          <div className="bg-slate-900/60 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-3xl space-y-6">
            <div className="space-y-2">
              <label className="block text-[10px] font-black text-blue-400 uppercase tracking-widest ml-2">Student Access</label>
              <input
                type="text"
                placeholder="수업 코드를 입력하세요 (6자리)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                maxLength={6}
                className="w-full px-6 py-5 bg-white/5 border border-white/10 text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-blue-500/20 transition-all font-bold placeholder:text-slate-700 text-lg text-center tracking-widest uppercase"
              />
            </div>
            
            <Link 
              href={roomCode ? `/student/${roomCode}` : '#'}
              className={`w-full py-6 flex items-center justify-center gap-3 font-black rounded-3xl transition-all text-lg shadow-2xl ${
                roomCode 
                  ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-blue-500/40 active:scale-[0.98]' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
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

          {/* Teacher Entrance */}
          <Link 
            href="/teacher"
            className="group relative block"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative bg-white/5 hover:bg-white/10 border border-white/10 p-8 rounded-[2.5rem] flex items-center justify-between transition-all group-active:scale-[0.98]">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center border border-emerald-500/20">
                  <svg className="w-7 h-7 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">선생님 전용</h3>
                  <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-0.5">Teacher Dashboard</p>
                </div>
              </div>
              <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/5 group-hover:translate-x-2 transition-transform">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              <p className="text-white font-black text-xl italic">100%</p>
              <p className="text-slate-600 font-bold uppercase text-[9px] tracking-widest mt-1">Anonymous</p>
            </div>
            <div className="w-[1px] h-8 bg-white/5"></div>
            <div className="text-center">
              <p className="text-white font-black text-xl italic">Real</p>
              <p className="text-slate-600 font-bold uppercase text-[9px] tracking-widest mt-1">Live Sync</p>
            </div>
            <div className="w-[1px] h-8 bg-white/5"></div>
            <div className="text-center">
              <p className="text-white font-black text-xl italic">Free</p>
              <p className="text-slate-600 font-bold uppercase text-[9px] tracking-widest mt-1">For Students</p>
            </div>
          </div>
          <p className="text-slate-700 font-bold text-[9px] uppercase tracking-widest">© 2026 WJedulab. All rights reserved.</p>
        </footer>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;700;900&display=swap');
        body {
          font-family: 'Outfit', sans-serif;
        }
        .italic {
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
