'use client'

import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function SignIn() {
  const router = useRouter()

  const handleGoogleSignIn = () => {
    signIn('google', { callbackUrl: '/teacher' })
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/5 rounded-full blur-[100px]"></div>
      
      <div className="w-full max-w-sm relative z-10">
        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-gradient-to-tr from-blue-500 to-indigo-600 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-blue-500/20 transform rotate-3">
            <svg className="w-12 h-12 text-white -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h1 className="text-5xl font-black text-white mb-2 tracking-tighter italic">sgon</h1>
          <p className="text-slate-400 font-bold tracking-widest uppercase text-[10px] ml-1">Teacher Authentication</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-3xl p-8 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-white/5 shadow-3xl space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-white tracking-tight italic uppercase">Welcome Back</h2>
            <p className="text-slate-500 font-medium text-sm leading-relaxed">구글 계정으로 로그인하여<br/>수업을 관리하고 시작하세요.</p>
          </div>

          <button
            onClick={handleGoogleSignIn}
            className="group w-full py-5 bg-white text-slate-950 font-black rounded-2xl shadow-2xl active:scale-[0.98] transition-all flex items-center justify-center gap-3 text-lg hover:bg-slate-100"
          >
            <svg className="w-6 h-6 transition-transform group-hover:scale-110" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Google로 로그인
          </button>

          <div className="pt-4 flex flex-col items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="text-slate-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em]"
            >
              Back to Home
            </button>
          </div>
        </div>

        <div className="mt-8 p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] flex gap-4 items-center">
          <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-blue-300/60 text-[11px] font-bold leading-relaxed italic">
            계정 보안을 위해 공식 Google 인증을 사용하며, 어떠한 비밀번호도 수집하지 않습니다.
          </p>
        </div>
      </div>
    </div>
  )
}
