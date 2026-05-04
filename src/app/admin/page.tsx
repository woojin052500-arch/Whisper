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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 max-w-md w-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">관리자 전용</h1>
            <p className="text-gray-400">관리자 계정으로 로그인해주세요.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 max-w-md w-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">접근 거부</h1>
            <p className="text-gray-400">관리자 권한이 필요합니다.</p>
            <button
              onClick={() => signOut()}
              className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-start mb-8">
            <div className="text-center flex-1">
              <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-pink-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">관리자 패널</h1>
              <p className="text-gray-400">결제 요청을 승인하고 관리하세요</p>
            </div>
            
            <div className="flex gap-4">
              <Link
                href="/teacher"
                className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                선생님 대시보드
              </Link>
              <button
                onClick={() => signOut()}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                로그아웃
              </button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 mb-6">
            <div className="flex flex-wrap gap-2">
              {(['pending', 'approved', 'rejected', 'all'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setSelectedStatus(status)}
                  className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                    selectedStatus === status
                      ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                      : 'bg-slate-700/50 text-gray-300 hover:bg-slate-700/70'
                  }`}
                >
                  {status === 'pending' && '대기 중'}
                  {status === 'approved' && '승인됨'}
                  {status === 'rejected' && '거절됨'}
                  {status === 'all' && '전체'}
                </button>
              ))}
            </div>
          </div>

          {/* Payment Requests */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
            <h2 className="text-xl font-semibold text-white mb-4">결제 요청 목록</h2>
            
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-400">로딩 중...</p>
              </div>
            ) : paymentRequests.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">요청이 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentRequests.map((request) => (
                  <div key={request.id} className="p-4 bg-slate-700/50 rounded-xl border border-slate-600/50">
                    <div className="grid md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <p className="text-gray-400 text-sm">요청자</p>
                        <p className="text-white font-medium">{request.teachers?.name || request.teachers?.email}</p>
                        <p className="text-gray-400 text-sm">{request.teachers?.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-sm">결제 금액</p>
                        <p className="text-white font-bold text-xl">{request.amount.toLocaleString()}원</p>
                        <p className="text-gray-400 text-sm">{new Date(request.created_at).toLocaleDateString('ko-KR')}</p>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-gray-400 text-sm mb-2">상태</p>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        request.status === 'pending' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                        request.status === 'approved' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                        'bg-red-500/20 text-red-400 border border-red-500/30'
                      }`}>
                        {request.status === 'pending' && '대기 중'}
                        {request.status === 'approved' && '승인됨'}
                        {request.status === 'rejected' && '거절됨'}
                      </span>
                    </div>

                    {request.status === 'pending' && (
                      <div className="space-y-4">
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              입금자명
                            </label>
                            <input
                              type="text"
                              value={formData.depositName}
                              onChange={(e) => setFormData({...formData, depositName: e.target.value})}
                              placeholder="입금자명 입력"
                              className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500/50 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">
                              입금액
                            </label>
                            <input
                              type="number"
                              value={formData.depositAmount}
                              onChange={(e) => setFormData({...formData, depositAmount: e.target.value})}
                              placeholder="입금액 입력"
                              className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500/50 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            비고 (선택사항)
                          </label>
                          <textarea
                            value={formData.notes}
                            onChange={(e) => setFormData({...formData, notes: e.target.value})}
                            placeholder="거절 사유 등 메모"
                            rows={2}
                            className="w-full px-3 py-2 bg-slate-600/50 border border-slate-500/50 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                          />
                        </div>

                        <div className="flex gap-3">
                          <button
                            onClick={() => handleApprove(request.id)}
                            className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                          >
                            승인
                          </button>
                          <button
                            onClick={() => handleReject(request.id)}
                            className="flex-1 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300"
                          >
                            거절
                          </button>
                        </div>
                      </div>
                    )}

                    {request.status === 'approved' && (
                      <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                        <p className="text-emerald-400 text-sm">
                          승인됨: {request.deposit_name} ({request.deposit_amount?.toLocaleString()}원)
                        </p>
                      </div>
                    )}

                    {request.status === 'rejected' && (
                      <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                        <p className="text-red-400 text-sm">
                          거절됨: {request.notes || '사유 없음'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
