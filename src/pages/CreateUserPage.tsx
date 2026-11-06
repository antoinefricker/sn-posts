import { AdminCreateUser } from '@/auth/AdminCreateUser'

export function CreateUserPage() {
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-semibold">User creation</h1>
      <AdminCreateUser />
    </div>
  )
}
