'use client'

import { useState, useEffect, useRef } from 'react'
import { checkDuplicate } from '@/shared/services/duplicate-check'

interface Options {
  table: string
  field: string
  value: string
  excludeId?: string
  enabled?: boolean
}

export function useDuplicateCheck({ table, field, value, excludeId, enabled = true }: Options) {
  const [isDuplicate, setIsDuplicate] = useState(false)
  const [checking, setChecking] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!enabled || !value.trim()) {
      setIsDuplicate(false)
      setChecking(false)
      return
    }

    setChecking(true)
    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(async () => {
      const result = await checkDuplicate({ table, field, value: value.trim(), excludeId })
      setIsDuplicate(result)
      setChecking(false)
    }, 500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [table, field, value, excludeId, enabled])

  return { isDuplicate, checking }
}
