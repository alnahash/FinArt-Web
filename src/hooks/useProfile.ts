import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { getProfile } from '../services/db'
import type { Profile } from '../types'

export function useProfile() {
  const { user } = useAuth()
  const [profile, setProfile] = useState<Profile | null>(null)

  useEffect(() => {
    if (!user) return
    getProfile(user.id).then(({ data }) => { if (data) setProfile(data) })
  }, [user])

  return profile
}
