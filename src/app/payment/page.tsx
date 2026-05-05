'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getOrCreateTeacher } from '@/lib/auth'
import Link from 'next/link'

export default function PaymentPage() {
  const { data: session } = useSession()
  const [teacher, setTeacher] = useState<any>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (session?.user?.email) {
      loadTeacherInfo()
    }
  }, [session])

  const loadTeacherInfo = async () => {
    if (!session?.user?.email) return
    
    const teacherData = await getOrCreateTeacher(session.user.email, session.user.name || undefined)
    setTeacher(teacherData)
  }

  const copyAccountNumber = async () => {
    const accountNumber = '3516376760453'
    const accountInfo = `NH농협지역조합\n계좌번호: ${accountNumber}\n예금주: WJedulab`
    
    try {
      await navigator.clipboard.writeText(accountInfo)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const goToKakaoRoom = () => {
    window.open('https://open.kakao.com/o/g3INItti', '_blank')
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[80%] h-[80%] bg-amber-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-10 border border-white/5 shadow-3xl max-w-md w-full relative z-10 text-center space-y-6">
          <div className="w-20 h-20 bg-amber-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-amber-500/20">
            <svg className="w-10 h-10 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white italic tracking-tight">Payment Required</h1>
          <p className="text-slate-500 font-medium">결제를 진행하려면 먼저 로그인해주세요.</p>
          <Link href="/auth/sign-in" className="block w-full py-4 bg-amber-500 text-slate-950 font-black rounded-2xl shadow-xl shadow-amber-500/20 transition-all active:scale-95">로그인하러 가기</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col font-sans">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[80%] h-[80%] bg-amber-600/5 rounded-full blur-[150px]"></div>
      </div>

      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-3xl border-b border-white/5 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/teacher" className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center hover:bg-white/10 transition-all">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-black italic tracking-tighter leading-none">sgon premium</h1>
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full p-4 sm:p-8 relative z-10 space-y-8 pb-32">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-24 h-24 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-amber-500/20 transform rotate-3 mb-6">
            <svg className="w-12 h-12 text-white -rotate-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-tight">Elevate Your<br/>Classroom</h2>
          <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Premium subscription service</p>
        </div>

        {/* Pricing Card */}
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-8 sm:p-10 shadow-3xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5">
            <svg className="w-40 h-40 text-amber-500" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          </div>
          
          <div className="space-y-8 relative z-10">
            <div>
              <p className="text-amber-500 font-black text-[10px] uppercase tracking-[0.3em] mb-2">Monthly Plan</p>
              <div className="flex items-end gap-2">
                <span className="text-5xl font-black italic tracking-tighter text-white">990</span>
                <span className="text-xl font-bold text-slate-500 mb-2">원 / 월</span>
              </div>
            </div>

            <ul className="space-y-4">
              {[
                '무제한 수업방 생성 및 관리',
                '실시간 익명 질문 & 답변 시스템',
                '수업별 자동 QR 코드 생성',
                '모든 기능 우선 업데이트 제공'
              ].map((feature, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="w-6 h-6 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-bold text-slate-300">{feature}</span>
                </li>
              ))}
            </ul>

            <button
              onClick={goToKakaoRoom}
              className="w-full py-5 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-black rounded-2xl shadow-xl shadow-amber-500/20 transition-all active:scale-95 text-lg"
            >
              Get Premium Now
            </button>
          </div>
        </div>

        {/* Payment Methods */}
        <section className="space-y-6">
          <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] ml-2 italic text-center">Transfer Information</h3>
          
          <div className="bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Bank</span>
              <span className="text-sm font-bold">NH농협지역조합</span>
            </div>
            
            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 group cursor-pointer" onClick={copyAccountNumber}>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Account</span>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono font-black text-amber-500">3516376760453</span>
                <svg className="w-4 h-4 text-slate-700 group-hover:text-amber-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">Owner</span>
              <span className="text-sm font-bold uppercase italic tracking-tighter">WJedulab</span>
            </div>

            {copied && (
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-center">
                <p className="text-emerald-400 text-[10px] font-black uppercase tracking-widest">Account Number Copied!</p>
              </div>
            )}
          </div>
        </section>

        {/* Guidelines */}
        <div className="p-6 bg-blue-500/5 border border-blue-500/10 rounded-[2rem] space-y-4">
          <h4 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] italic">Quick Start Guide</h4>
          <ul className="space-y-3">
            {[
              '계좌번호를 복사하여 990원을 입금해주세요.',
              '입금 후 카카오톡 오픈채팅방에 알려주세요.',
              '24시간 내에 관리자가 승인 처리를 완료합니다.',
              '입금자명과 로그인 이메일이 다르면 처리가 늦어질 수 있습니다.'
            ].map((step, i) => (
              <li key={i} className="flex gap-3 text-[11px] font-bold text-blue-300/60 leading-relaxed italic">
                <span className="text-blue-500/40">0{i+1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Account Info Bar */}
      {teacher && (
        <div className="fixed bottom-0 left-0 w-full z-50 p-4 sm:p-6 bg-gradient-to-t from-slate-950 via-slate-950/90 to-transparent">
          <div className="max-w-md mx-auto bg-slate-900/80 backdrop-blur-3xl border border-white/10 rounded-3xl p-4 flex items-center justify-between shadow-3xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <div>
                <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mb-1">Signed in as</p>
                <p className="text-xs font-bold text-white truncate max-w-[120px]">{teacher.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg ${
                teacher.subscription_status === 'active' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-white/5 text-slate-600'
              }`}>
                {teacher.subscription_status === 'active' ? 'Premium' : 'Free'}
              </span>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        .italic {
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
