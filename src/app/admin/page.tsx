'use client'

import { useState, useEffect } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { getPaymentRequests, approvePaymentRequest, rejectPaymentRequest, getOrCreateTeacher } from '@/lib/auth'

export default function AdminPanel() {
  const { data: session } = useSession()
  const [isAdmin, setIsAdmin] = useState(false)
  const [paymentRequests, setPaymentRequests] = useState<any[]>([])
  const [selectedStatus, setSelectedStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending')
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    depositName: '',
    depositAmount: '',
    notes: ''
  })

  useEffect(() => {
    if (session?.user?.email) {
      checkAdminStatus()
    }
  }, [session])

  useEffect(() => {
    if (isAdmin) {
      loadPaymentRequests()
    }
  }, [isAdmin, selectedStatus])

  const checkAdminStatus = async () => {
    if (!session?.user?.email) return
    
    const teacher = await getOrCreateTeacher(session.user.email, session.user.name || undefined)
    setIsAdmin(teacher?.is_admin || false)
  }

  const loadPaymentRequests = async () => {
    setIsLoading(true)
    const status = selectedStatus === 'all' ? undefined : selectedStatus
    const requests = await getPaymentRequests(status)
    setPaymentRequests(requests)
    setIsLoading(false)
  }

  const handleApprove = async (requestId: string) => {
    if (!session?.user?.email) return

    const success = await approvePaymentRequest(
      requestId,
      session.user.email,
      formData.depositName || undefined,
      formData.depositAmount ? parseInt(formData.depositAmount) : undefined
    )

    if (success) {
      setFormData({ depositName: '', depositAmount: '', notes: '' })
      loadPaymentRequests()
    }
  }

  const handleReject = async (requestId: string) => {
    if (!session?.user?.email) return

    const success = await rejectPaymentRequest(requestId, session.user.email, formData.notes)
    if (success) {
      setFormData({ depositName: '', depositAmount: '', notes: '' })
      loadPaymentRequests()
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-red-600/10 rounded-full blur-[120px] animate-pulse"></div>
        <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-10 border border-white/5 shadow-3xl max-w-md w-full relative z-10 text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/10 rounded-[2rem] flex items-center justify-center mx-auto border border-red-500/20">
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white italic tracking-tight">Admin Access</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Security Clearance Required</p>
          <p className="text-slate-500 font-medium">관리자 계정으로 로그인해주세요.</p>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
        <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[2.5rem] p-8 sm:p-10 border border-white/5 shadow-3xl max-w-md w-full relative z-10 text-center space-y-6">
          <div className="w-20 h-20 bg-red-500/20 rounded-[2rem] flex items-center justify-center mx-auto border border-red-500/30">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white italic tracking-tight">Access Denied</h1>
          <p className="text-slate-500 font-medium">관리자 권한이 없습니다.</p>
          <button
            onClick={() => signOut()}
            className="w-full py-4 bg-red-500/10 text-red-500 font-black rounded-2xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all active:scale-95"
          >
            로그아웃
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white relative flex flex-col font-sans">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-red-600/5 rounded-full blur-[150px]"></div>
      </div>

      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-3xl border-b border-white/5 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500 rounded-xl flex items-center justify-center shadow-2xl shadow-red-500/20 transform -rotate-6">
            <svg className="w-6 h-6 text-white rotate-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-black italic tracking-tighter leading-none">sgon admin</h1>
            <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mt-1">Control Tower</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/teacher" className="hidden sm:flex px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all">Dashboard</Link>
          <button onClick={() => signOut()} className="w-10 h-10 sm:w-12 sm:h-12 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center justify-center hover:bg-red-500/20 transition-all">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8 relative z-10 space-y-8 pb-32">
        {/* Quick Filter */}
        <section className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-6 shadow-2xl overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`flex-1 min-w-[80px] py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  selectedStatus === status
                    ? 'bg-red-500 text-white shadow-xl shadow-red-500/20'
                    : 'bg-white/5 text-slate-500 hover:text-white'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </section>

        {/* Requests Feed */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
            <h2 className="text-2xl sm:text-3xl font-black italic tracking-tighter uppercase leading-none">Feed Control</h2>
            <span className="px-4 py-2 bg-white/5 border border-white/5 rounded-2xl text-[9px] sm:text-[10px] font-black text-slate-600 tracking-[0.2em] uppercase">{paymentRequests.length} Requests Found</span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center animate-pulse">
              <div className="w-12 h-12 border-4 border-red-500/20 border-t-red-500 rounded-full mx-auto mb-4 animate-spin"></div>
              <p className="text-slate-500 font-black text-xs uppercase tracking-[0.2em]">Syncing Data...</p>
            </div>
          ) : paymentRequests.length === 0 ? (
            <div className="py-20 sm:py-24 text-center bg-slate-900/40 backdrop-blur-xl border border-dashed border-white/5 rounded-[2.5rem] sm:rounded-[3rem]">
              <p className="text-slate-600 font-black text-base sm:text-lg italic tracking-tight uppercase">Feed Empty</p>
              <p className="text-slate-800 text-[9px] sm:text-[10px] font-bold uppercase tracking-widest mt-2">All tasks completed</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {paymentRequests.map((request) => (
                <div key={request.id} className="bg-slate-900/60 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 sm:p-8 hover:bg-slate-800/60 transition-all relative overflow-hidden group shadow-xl">
                  <div className={`absolute top-0 left-0 w-2 h-full transition-colors ${
                    request.status === 'pending' ? 'bg-amber-500' :
                    request.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}></div>

                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl ${
                            request.status === 'pending' ? 'bg-amber-500/20 text-amber-500' :
                            request.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {request.status}
                          </span>
                          <span className="text-slate-600 text-[10px] font-black uppercase tracking-tighter">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-xl font-black">{request.teachers?.name || 'Anonymous'}</h4>
                        <p className="text-slate-500 text-xs font-medium">{request.teachers?.email}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-black text-slate-700 uppercase tracking-widest mb-1">Requested Amount</p>
                        <p className="text-3xl font-black italic tracking-tighter text-white leading-none">{request.amount.toLocaleString()}<span className="text-sm font-bold text-slate-600 ml-1">원</span></p>
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="pt-6 border-t border-white/5 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 italic">Deposit Name</label>
                            <input
                              type="text"
                              value={formData.depositName}
                              onChange={(e) => setFormData({...formData, depositName: e.target.value})}
                              placeholder="입금자명"
                              className="w-full px-5 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all font-bold placeholder:text-slate-800 text-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 italic">Actual Amount</label>
                            <input
                              type="number"
                              value={formData.depositAmount}
                              onChange={(e) => setFormData({...formData, depositAmount: e.target.value})}
                              placeholder="실제 입금액"
                              className="w-full px-5 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all font-bold placeholder:text-slate-800 text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2 italic">Admin Notes</label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            placeholder="메모를 입력하세요..."
                            rows={2}
                            className="w-full px-5 py-4 bg-white/5 border border-white/10 text-white rounded-2xl focus:outline-none focus:ring-4 focus:ring-red-500/20 transition-all font-bold placeholder:text-slate-800 text-sm resize-none"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleReject(request.id)}
                            className="flex-1 py-4 bg-white/5 border border-white/10 text-red-500 font-black rounded-2xl hover:bg-red-500/10 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                          >
                            Reject
                          </button>
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="flex-[2] py-4 bg-gradient-to-r from-red-500 to-pink-600 text-white font-black rounded-2xl shadow-xl shadow-red-500/20 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                          >
                            Approve Payment
                          </button>
                        </div>
                      </div>
                    )}

                    {request.status === 'approved' && (
                      <div className="p-5 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">Verification Details</p>
                          <p className="text-emerald-50/80 text-xs font-bold">{request.deposit_name} • {request.deposit_amount?.toLocaleString()}원</p>
                        </div>
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {request.status === 'rejected' && (
                      <div className="p-5 bg-red-500/5 rounded-2xl border border-red-500/10">
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">Rejection Note</p>
                        <p className="text-red-50/80 text-xs font-bold italic">"{request.notes || 'No reason provided.'}"</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .italic {
          font-style: italic;
        }
      `}</style>
    </div>
  )
}
