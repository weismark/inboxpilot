'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'
import type { AnalyzeResponse } from './api'

interface AnalysisContextValue {
  result: AnalyzeResponse | null
  loading: boolean
  error: string | null
  message: string
  subject: string
  setResult: (r: AnalyzeResponse | null) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
  setMessage: (m: string) => void
  setSubject: (s: string) => void
}

const AnalysisContext = createContext<AnalysisContextValue | null>(null)

export function AnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResult] = useState<AnalyzeResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [subject, setSubject] = useState('')

  return (
    <AnalysisContext.Provider value={{
      result, loading, error, message, subject,
      setResult, setLoading, setError, setMessage, setSubject,
    }}>
      {children}
    </AnalysisContext.Provider>
  )
}

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext)
  if (!ctx) throw new Error('useAnalysis must be used inside AnalysisProvider')
  return ctx
}
