import { useState, useEffect } from 'react'
import axios from 'axios'
import { Shield, Lock, Globe, List, PlusCircle, Cpu } from 'lucide-react'
import './App.css'

// VECTABASE CONFIGURATION
const VECTABASE_URL = 'http://localhost:3000'
const PROJECT_API_KEY = 'eyJh5._def_.pqc_v1_anon_x6SbJWvxLBeB9PpL-DpskiITLj0RwuTX9zZ73Wo68Ek'

// Extract Project ID for Tenant Auth
const PROJECT_ID = PROJECT_API_KEY.startsWith('eyJh') ? PROJECT_API_KEY.split('._def_')[0].replace('eyJh', '') : '';

export default function App() {
  const [user, setUser] = useState<any>(null)
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [newPost, setNewPost] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [funcName, setFuncName] = useState('')
  const [funcResult, setFuncResult] = useState<any>(null)

  useEffect(() => {
    fetchUser()
    fetchAnnouncements()
  }, [])

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${VECTABASE_URL}/api/auth/verify`, {
        withCredentials: true
      })
      // Ensure user belongs to this project? verifyAccess handles platform session globally. 
      // But for tenant auth, we might want to be strict. For now, rely on existing verify logic.
      if (res.data.authorized && res.data.user) {
        setUser(res.data.user)
      }
    } catch (err) {
      console.log('No active session found.')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAnnouncements = async () => {
    try {
      const res = await axios.post(`${VECTABASE_URL}/api/database/query`, {
        sql: 'SELECT * FROM announcements ORDER BY created_at DESC'
      }, {
        headers: { 'Authorization': `Bearer ${PROJECT_API_KEY}` }
      })
      if (res.data.rows) setAnnouncements(res.data.rows)
    } catch (err) {
      console.error('Failed to fetch announcements')
    }
  }

  const handleCreate = async () => {
    if (!newPost) return
    try {
      await axios.post(`${VECTABASE_URL}/api/database/query`, {
        sql: `INSERT INTO announcements (content, author_email) VALUES ('${newPost.replace(/'/g, "''")}', '${user?.email || 'anonymous'}')`
      }, {
        headers: { 'Authorization': `Bearer ${PROJECT_API_KEY}` }
      })
      setNewPost('')
      fetchAnnouncements()
    } catch (err) {
      alert('Security violation or query error')
    }
  }

  const handleInvoke = async () => {
    if (!funcName) return
    setFuncResult({ loading: true })
    try {
      const res = await fetch(`${VECTABASE_URL}/api/v1/functions/${funcName}/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PROJECT_API_KEY}`
        },
        body: JSON.stringify({ timestamp: Date.now() })
      })

      const data = await res.json().catch(() => ({ body: "Non-JSON response" }))
      if (!res.ok) {
        setFuncResult({ error: `HTTP ${res.status}`, response: data })
      } else {
        setFuncResult(data)
      }
    } catch (err: any) {
      setFuncResult({ error: err.message })
    }
  }

  if (isLoading) return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0d0d0d', color: '#3ecf8e' }}>Connecting to Gateway...</div>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ width: '40px', height: '40px', backgroundColor: '#3ecf8e', borderRadius: '8px', color: 'black', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>V</div>
        <h1 style={{ margin: 0, letterSpacing: '-1px' }}>Vectabase Integration Site</h1>
      </div>

      {!user ? (
        <div className="card">
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Lock color="#ff4d4d" /> Protected Area</h2>
          <p>Please identity yourself with Vectabase to view or post announcements.</p>
          <button style={{ backgroundColor: '#4285F4', color: 'white', fontWeight: 'bold' }} onClick={() => window.location.href = `${VECTABASE_URL}/api/auth/google?projectId=${PROJECT_ID}&redirectTo=${encodeURIComponent(window.location.origin)}`}>
            Login with Vectabase (Google)
          </button>
        </div>
      ) : (
        <>
          <div className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 className="success" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Shield /> Authorized</h2>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>LOGGED IN AS</div>
                <div style={{ fontWeight: 'bold' }}>{user.name}</div>
              </div>
            </div>

            <div style={{ marginTop: '2rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><PlusCircle size={18} /> New Broadcast</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  placeholder="Broadcast a message..."
                  style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #333', background: '#000', color: 'white' }}
                />
                <button onClick={handleCreate} style={{ backgroundColor: '#3ecf8e', color: 'black', fontWeight: 'bold' }}>Post</button>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: '1rem', borderColor: '#333' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Cpu size={18} /> Basic Computing</h3>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <input
                value={funcName}
                onChange={(e) => setFuncName(e.target.value)}
                placeholder="Function Slug (e.g. data-processor)"
                style={{ flex: 1, padding: '0.5rem', borderRadius: '4px', border: '1px solid #333', background: '#000', color: 'white' }}
              />
              <button onClick={handleInvoke} style={{ backgroundColor: '#fff', color: 'black', fontWeight: 'bold' }}>Invoke</button>
            </div>
            {funcResult && (
              <div style={{ background: '#0a0a0a', padding: '1rem', borderRadius: '4px', border: '1px solid #222' }}>
                <div style={{ fontSize: '0.7rem', opacity: 0.5, marginBottom: '0.5rem' }}>EXECUTION RESULT</div>
                <pre style={{ margin: 0, fontSize: '0.8rem', overflowX: 'auto' }}>{JSON.stringify(funcResult, null, 2)}</pre>
              </div>
            )}
          </div>

          <div className="card" style={{ marginTop: '1rem', background: 'linear-gradient(145deg, #0a0a0a 0%, #050505 100%)', border: '1px solid #3ecf8e33' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#3ecf8e' }}><Shield size={18} /> Advanced Vault Testing</h3>
              <span style={{ fontSize: '9px', fontWeight: 'bold', background: '#3ecf8e22', color: '#3ecf8e', padding: '2px 6px', borderRadius: '4px' }}>VAULT-AWARE</span>
            </div>
            <p style={{ fontSize: '12px', opacity: 0.6, marginBottom: '1rem' }}>This test triggers a complex sequence: fetching users from DB, decrypting Vault secrets, and persisting an audit log.</p>
            <button
              onClick={() => { setFuncName('complex-strategy'); handleInvoke(); }}
              style={{ width: '100%', backgroundColor: '#3ecf8e', color: 'black', fontWeight: 'bold', letterSpacing: '1px' }}
            >
              RUN VAULT-DB STRATEGY
            </button>
          </div>
        </>
      )}

      <div className="card">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><List size={18} /> Global Announcements</h3>
        {announcements.length === 0 ? (
          <p style={{ opacity: 0.5 }}>No broadcasts detected.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {announcements.map((a, i) => (
              <div key={i} className="announcement">
                <div style={{ fontSize: '1.1rem' }}>{a.content}</div>
                <div style={{ fontSize: '0.7rem', opacity: 0.4, marginTop: '0.2rem' }}>
                  By {a.author_email} • {new Date(a.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginTop: '4rem', opacity: 0.3, fontSize: '0.7rem' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Shield size={12} /> SECURED BY VECTABASE</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Globe size={12} /> EDGE COMPUTE</span>
      </div>
    </div>
  )
}
