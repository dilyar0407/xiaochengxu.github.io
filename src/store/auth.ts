// 全局状态管理
import {create} from 'zustand'
import type {Profile} from '@/db/types'

interface AuthState {
  user: Profile | null
  isLoading: boolean
  setUser: (user: Profile | null) => void
  setLoading: (loading: boolean) => void
  clearUser: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({user, isLoading: false}),
  setLoading: (loading) => set({isLoading: loading}),
  clearUser: () => set({user: null, isLoading: false})
}))
