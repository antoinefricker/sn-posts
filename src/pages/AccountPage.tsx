import { EditProfile } from '@/auth/EditProfile'

export function AccountPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">User edition</h1>
      <EditProfile />
    </div>
  )
}
