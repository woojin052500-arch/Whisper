'use client'

import { useState } from 'react'
import { testDatabaseConnection, createRoom } from '@/lib/auth'
import Link from 'next/link'

export default function DebugPage() {
  const [result, setResult] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)

  const testConnection = async () => {
    setIsLoading(true)
    setResult('Testing database connection...')
    
    try {
      const isConnected = await testDatabaseConnection()
      if (isConnected) {
        setResult('✅ Database connection successful!')
      } else {
        setResult('❌ Database connection failed')
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`)
    }
    
    setIsLoading(false)
  }

  const testRoomCreation = async () => {
    setIsLoading(true)
    setResult('Testing room creation...')
    
    try {
      const room = await createRoom('Test Room', 'test@example.com')
      if (room) {
        setResult(`✅ Room created successfully! ID: ${room.id}`)
      } else {
        setResult('❌ Room creation failed')
      }
    } catch (error) {
      setResult(`❌ Error: ${error}`)
    }
    
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[80%] h-[80%] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse"></div>
      
      <div className="w-full max-w-md relative z-10 space-y-8">
        <div className="text-center">
          <div className="w-20 h-20 bg-emerald-500/10 rounded-[2rem] flex items-center justify-center mx-auto mb-6 border border-emerald-500/20">
            <svg className="w-10 h-10 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
            </svg>
          </div>
          <h1 className="text-3xl font-black text-white italic tracking-tight">Debug Console</h1>
          <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mt-2">System Diagnostics</p>
        </div>

        <div className="bg-slate-900/40 backdrop-blur-3xl p-8 rounded-[2.5rem] border border-white/5 shadow-3xl space-y-6">
          <div className="space-y-4">
            <button
              onClick={testConnection}
              disabled={isLoading}
              className="w-full py-4 bg-white/5 border border-white/10 text-white font-black rounded-2xl hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
            >
              Test DB Connection
            </button>
            
            <button
              onClick={testRoomCreation}
              disabled={isLoading}
              className="w-full py-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-black rounded-2xl hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 text-xs uppercase tracking-widest"
            >
              Test Room Creation
            </button>
          </div>

          {result && (
            <div className="p-6 bg-slate-950/60 rounded-2xl border border-white/5">
              <pre className="text-emerald-400 text-[10px] font-mono whitespace-pre-wrap leading-relaxed">{result}</pre>
            </div>
          )}

          {isLoading && (
            <div className="text-center">
              <div className="w-6 h-6 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin mx-auto"></div>
            </div>
          )}
        </div>

        <div className="text-center">
          <Link href="/" className="text-slate-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest italic">Back to sgon</Link>
        </div>
      </div>
    </div>
  )
}
