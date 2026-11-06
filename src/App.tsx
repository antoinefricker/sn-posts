import { AuthForm } from './auth/AuthForm'
import { useAuth } from './auth/AuthContext'
import './App.css'

function App() {
  const { session, profile, loading, signOut } = useAuth()

  if (loading) return <p>Loading…</p>
  if (!session) return <AuthForm />

  return (
    <section className="account">
      <h1>Welcome{profile ? `, ${profile.name}` : ''}</h1>
      <p>Email: {session.user.email}</p>
      {profile && <p>Club ID: {profile.club_id}</p>}
      <button type="button" onClick={signOut}>
        Sign out
      </button>
    </section>
  )
}

export default App
