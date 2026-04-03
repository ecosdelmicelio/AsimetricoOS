import type { Tables } from '@/shared/types/database'
import type { UserRole } from '@/shared/types'

export type Profile = Tables<'profiles'>

export interface AuthUser {
  id: string
  email: string
  profile: Profile
  role: UserRole
}
