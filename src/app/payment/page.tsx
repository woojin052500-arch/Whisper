'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { getOrCreateTeacher } from '@/lib/auth'

export default function PaymentPage() {
  const { data: session } = useSession()
  const [teacher, setTeacher] = useState<any>(null)
  const [copied, setCopied] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

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
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 max-w-md w-full">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">로그인 필요</h1>
            <p className="text-gray-400">결제를 위해 먼저 로그인해주세요.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">프리미엄 결제</h1>
            <p className="text-gray-400">무제한 수업방 생성을 위해 결제하세요</p>
          </div>

          {/* Payment Info */}
          <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 mb-6">
            <h2 className="text-xl font-semibold text-white mb-4">결제 정보</h2>
            
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
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">은행</span>
                    <span className="text-white">NH농협지역조합</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400">계좌번호</span>
                    <div className="flex items-center gap-2">
                      <span className="text-white font-mono">3516376760453</span>
                      <button
                        onClick={copyAccountNumber}
                        className="text-amber-400 hover:text-amber-300 transition-colors p-1 rounded hover:bg-slate-600/50"
                        title="계좌번호 복사"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">예금주</span>
                    <span className="text-white">WJedulab</span>
                  </div>
                </div>
                
                {copied && (
                  <div className="mt-3 p-2 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
                    <p className="text-emerald-400 text-sm text-center">계좌번호가 복사되었습니다!</p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-blue-200 text-sm font-medium mb-1">구독 혜택</p>
                    <ul className="text-blue-200 text-xs space-y-1">
                      <li>• 무제한 수업방 생성</li>
                      <li>• 실시간 질문/답변 관리</li>
                      <li>• QR 코드 자동 생성</li>
                      <li>• 월 990원으로 모든 기능 이용</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Teacher Status */}
          {teacher && (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50 mb-6">
              <h2 className="text-xl font-semibold text-white mb-4">내 계정 상태</h2>
              
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">이메일</span>
                  <span className="text-white">{teacher.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">구독 상태</span>
                  <span className={`font-medium ${teacher.subscription_status === 'active' ? 'text-emerald-400' : 'text-gray-400'}`}>
                    {teacher.subscription_status === 'active' ? '구독 중' : '미구독'}
                  </span>
                </div>
                {teacher.subscription_next_billing_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">다음 결제일</span>
                    <span className="text-white">
                      {new Date(teacher.subscription_next_billing_at).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment Actions */}
          {teacher?.subscription_status !== 'active' && (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <h2 className="text-xl font-semibold text-white mb-4">결제 방법</h2>
              
              <div className="space-y-4">
                <button
                  onClick={copyAccountNumber}
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  계좌번호 복사하기
                </button>

                <button
                  onClick={goToKakaoRoom}
                  className="w-full bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] flex items-center justify-center gap-3"
                >
                  <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold">카</span>
                  </div>
                  입금 안내 카톡방으로 이동
                </button>
              </div>
              
              <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-amber-200 text-sm font-medium mb-1">결제 안내</p>
                    <ul className="text-amber-200 text-xs space-y-1">
                      <li>• 계좌번호를 복사하여 입금하세요</li>
                      <li>• 입금 후 카톡방으로 알려주세요</li>
                      <li>• 24시간 내에 승인 처리됩니다</li>
                      <li>• 입금자명과 이메일을 일치시켜주세요</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Active Subscription */}
          {teacher?.subscription_status === 'active' && (
            <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-6 border border-slate-700/50">
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">구독 활성화</h3>
                <p className="text-gray-400">
                  프리미엄 혜택을 모두 이용할 수 있습니다.
                </p>
                {teacher.subscription_next_billing_at && (
                  <p className="text-gray-400 text-sm mt-2">
                    다음 결제일: {new Date(teacher.subscription_next_billing_at).toLocaleDateString('ko-KR')}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
