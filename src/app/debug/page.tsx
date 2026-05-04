'use client'

import { useState } from 'react'
import { testDatabaseConnection, createRoom } from '@/lib/auth'

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="bg-slate-800/50 backdrop-blur-xl rounded-2xl p-8 border border-slate-700/50 max-w-2xl w-full">
        <h1 className="text-2xl font-bold text-white mb-6">Database Debug</h1>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={testConnection}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
          >
            Test Database Connection
          </button>
          
          <button
            onClick={testRoomCreation}
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 disabled:from-slate-600 disabled:to-slate-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-300"
          >
            Test Room Creation
          </button>
        </div>
        
        {result && (
          <div className="p-4 bg-slate-700/50 rounded-xl">
            <pre className="text-white text-sm whitespace-pre-wrap">{result}</pre>
          </div>
        )}
        
        {isLoading && (
          <div className="text-center text-gray-400">
            Testing...
          </div>
        )}
      </div>
    </div>
  )
}
