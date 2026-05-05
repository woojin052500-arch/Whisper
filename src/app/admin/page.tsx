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
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="bg-white rounded-[2.5rem] sm:rounded-[3.5rem] p-8 sm:p-10 border border-slate-200 shadow-2xl max-w-md w-full relative z-10 text-center space-y-6">
        <div className="w-20 h-20 bg-slate-50 rounded-[2rem] flex items-center justify-center mx-auto border border-slate-100">
          <svg className="w-10 h-10 text-indigo-950" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-indigo-950 tracking-tight">Admin Access</h1>
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">보안 인증 필요</p>
        <p className="text-slate-500 font-medium">관리자 계정으로 로그인해주세요.</p>
      </div>
    </div>
    )
  }

  if (!isAdmin) {
    return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      <div className="bg-white rounded-[2.5rem] p-8 sm:p-10 border border-slate-200 shadow-2xl max-w-md w-full relative z-10 text-center space-y-6">
        <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto border border-red-100">
          <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h1 className="text-3xl font-bold text-red-600 tracking-tight">Access Denied</h1>
        <p className="text-slate-500 font-medium">관리자 권한이 없습니다.</p>
        <button
          onClick={() => signOut()}
          className="w-full py-4 bg-indigo-950 text-white font-bold rounded-2xl shadow-lg active:scale-95 transition-all"
        >
          로그아웃
        </button>
      </div>
    </div>
    )
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 relative flex flex-col font-sans">
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-indigo-50/50 rounded-full blur-[150px] opacity-20"></div>
      </div>

      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-3xl border-b border-slate-100 px-4 sm:px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight leading-none text-indigo-950">sgon admin</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">관리자 패널</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <Link href="/teacher" className="hidden sm:flex px-5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-100 transition-all text-slate-600">대시보드</Link>
          <button onClick={() => signOut()} className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center hover:bg-slate-100 transition-all">
            <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-8 relative z-10 space-y-8 pb-32">
        {/* Quick Filter */}
        <section className="bg-slate-50 border border-slate-100 rounded-[2rem] p-4 sm:p-6 shadow-sm overflow-x-auto no-scrollbar">
          <div className="flex items-center gap-3">
            {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`flex-1 min-w-[80px] py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest transition-all ${
                  selectedStatus === status
                    ? 'bg-indigo-950 text-white shadow-xl shadow-indigo-900/10'
                    : 'bg-white text-slate-400 border border-slate-100 hover:text-indigo-950'
                }`}
              >
                {status === 'pending' ? '대기중' : status === 'approved' ? '승인됨' : status === 'rejected' ? '거절됨' : '전체'}
              </button>
            ))}
          </div>
        </section>

        {/* Requests Feed */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 px-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight uppercase leading-none">결제 요청 목록</h2>
            <span className="px-4 py-2 bg-white/5 border border-white/5 rounded-2xl text-[9px] sm:text-[10px] font-bold text-slate-600 tracking-[0.2em] uppercase">{paymentRequests.length}개의 요청</span>
          </div>

          {isLoading ? (
            <div className="py-20 text-center">
              <div className="w-12 h-12 border-4 border-slate-100 border-t-indigo-950 rounded-full mx-auto mb-4 animate-spin"></div>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-[0.2em]">데이터 동기화 중...</p>
            </div>
          ) : paymentRequests.length === 0 ? (
            <div className="py-20 sm:py-24 text-center bg-slate-50 border border-dashed border-slate-200 rounded-[2.5rem] sm:rounded-[3rem]">
              <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">요청 내역이 없습니다</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {paymentRequests.map((request) => (
                <div key={request.id} className="bg-white border border-slate-100 rounded-[2.5rem] p-6 sm:p-8 hover:border-slate-200 transition-all relative overflow-hidden group shadow-sm">
                  <div className={`absolute top-0 left-0 w-2 h-full transition-colors ${
                    request.status === 'pending' ? 'bg-amber-500' :
                    request.status === 'approved' ? 'bg-emerald-500' : 'bg-red-500'
                  }`}></div>

                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <span className={`text-[9px] font-bold uppercase tracking-[0.2em] px-3 py-1.5 rounded-xl ${
                            request.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                            request.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                          }`}>
                            {request.status}
                          </span>
                          <span className="text-slate-300 text-[10px] font-bold uppercase tracking-tighter">
                            {new Date(request.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <h4 className="text-xl font-bold text-indigo-950">{request.teachers?.name || 'Anonymous'}</h4>
                        <p className="text-slate-400 text-xs font-medium">{request.teachers?.email}</p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">요청 금액</p>
                        <p className="text-3xl font-bold text-indigo-950 leading-none">{request.amount.toLocaleString()}<span className="text-sm font-bold text-slate-300 ml-1">원</span></p>
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="pt-6 border-t border-slate-100 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-indigo-950 uppercase tracking-widest ml-2">입금자명</label>
                            <input
                              type="text"
                              value={formData.depositName}
                              onChange={(e) => setFormData({...formData, depositName: e.target.value})}
                              placeholder="입금자명"
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all font-bold placeholder:text-slate-200 text-sm shadow-sm"
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold text-indigo-950 uppercase tracking-widest ml-2">실제 입금액</label>
                            <input
                              type="number"
                              value={formData.depositAmount}
                              onChange={(e) => setFormData({...formData, depositAmount: e.target.value})}
                              placeholder="실제 입금액"
                              className="w-full px-5 py-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all font-bold placeholder:text-slate-200 text-sm shadow-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <label className="text-[10px] font-bold text-indigo-950 uppercase tracking-widest ml-2">관리자 메모</label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            placeholder="메모를 입력하세요..."
                            rows={2}
                            className="w-full px-5 py-4 bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-950/5 transition-all font-bold placeholder:text-slate-200 text-sm resize-none shadow-sm"
                          />
                        </div>

                        <div className="flex gap-3">
                            <button
                            onClick={() => handleReject(request.id)}
                            className="flex-1 py-4 bg-slate-50 border border-slate-200 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                          >
                            거절
                          </button>
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="flex-[2] py-4 bg-indigo-950 text-white font-bold rounded-2xl shadow-lg shadow-indigo-900/10 transition-all active:scale-95 text-[10px] uppercase tracking-widest"
                          >
                            결제 승인
                          </button>
                        </div>
                      </div>
                    )}

                    {request.status === 'approved' && (
                      <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                        <div>
                          <p className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest mb-1">입금 확인 상세</p>
                          <p className="text-emerald-950 text-sm font-bold">{request.deposit_name} • {request.deposit_amount?.toLocaleString()}원</p>
                        </div>
                        <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      </div>
                    )}

                    {request.status === 'rejected' && (
                      <div className="p-5 bg-red-50 rounded-2xl border border-red-100">
                        <p className="text-[9px] font-bold text-red-600 uppercase tracking-widest mb-1">거절 사유</p>
                        <p className="text-red-950 text-sm font-bold">"{request.notes || '이유가 작성되지 않았습니다.'}"</p>
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
