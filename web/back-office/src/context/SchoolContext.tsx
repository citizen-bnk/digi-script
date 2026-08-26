import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, type School } from '../api/client'
import { useAuth } from './AuthContext'

/**
 * Every school-scoped screen needs one school to work against, but the three
 * back-office roles arrive at that differently: a SUPER_USER or SUPPORT user
 * is pinned to their own school, while a SYSTEM_OWNER has no schoolId at all
 * and instead drills into one of many (Application Spec section 4: "Click
 * school name to drill down into school-specific dashboard"). Resolving that
 * here keeps every screen below from re-deriving it.
 */
interface SchoolContextValue {
  schools: School[]
  activeSchool: School | null
  setActiveSchoolId: (schoolId: string) => void
  loading: boolean
  error: string | null
}

const SchoolContext = createContext<SchoolContextValue | undefined>(undefined)

const ACTIVE_SCHOOL_KEY = 'digiscript_backoffice_active_school'

export function SchoolProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [schools, setSchools] = useState<School[]>([])
  const [activeId, setActiveId] = useState<string | null>(() => localStorage.getItem(ACTIVE_SCHOOL_KEY))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let cancelled = false
    api
      .listSchools()
      .then((res) => {
        if (cancelled) return
        setSchools(res.schools)
        setActiveId((current) => {
          // A remembered school from a previous session is only valid if it
          // is still in the list this user can actually see.
          if (current && res.schools.some((school) => school.id === current)) return current
          return res.schools[0]?.id ?? null
        })
      })
      .catch((err) => !cancelled && setError(err instanceof Error ? err.message : 'Could not load schools'))
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [user])

  const setActiveSchoolId = useCallback((schoolId: string) => {
    setActiveId(schoolId)
    localStorage.setItem(ACTIVE_SCHOOL_KEY, schoolId)
  }, [])

  const value = useMemo<SchoolContextValue>(
    () => ({
      schools,
      activeSchool: schools.find((school) => school.id === activeId) ?? null,
      setActiveSchoolId,
      loading,
      error,
    }),
    [schools, activeId, setActiveSchoolId, loading, error],
  )

  return <SchoolContext.Provider value={value}>{children}</SchoolContext.Provider>
}

export function useSchool() {
  const ctx = useContext(SchoolContext)
  if (!ctx) {
    throw new Error('useSchool must be used within SchoolProvider')
  }
  return ctx
}
