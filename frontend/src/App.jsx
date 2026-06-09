import { useEffect, useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'

function App() {
  const [count, setCount] = useState(0)
  const [health, setHealth] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadHealth() {
      try {
        setLoading(true)
        const response = await fetch('/api/health')
        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.message || 'ไม่สามารถเชื่อมต่อ API ได้')
        }
        setHealth(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    loadHealth()
  }, [])

  return (
    <>
      <section id="center">
        <div className="hero">
          <img src={heroImg} className="base" width="170" height="179" alt="" />
          <img src={reactLogo} className="framework" alt="React logo" />
          <img src={viteLogo} className="vite" alt="Vite logo" />
        </div>
        <div>
          <h1>เชื่อมต่อ Backend แล้ว</h1>
          <p>Frontend เรียก API จาก Backend ที่ <code>/api/health</code> ผ่าน proxy ของ Vite</p>
          {loading ? (
            <p>กำลังเชื่อมต่อ API...</p>
          ) : error ? (
            <p style={{ color: 'red' }}>เกิดข้อผิดพลาด: {error}</p>
          ) : (
            <div>
              <p>Status: {health?.status}</p>
              <p>Message: {health?.message}</p>
              <p>Time: {new Date(health?.timestamp).toLocaleString()}</p>
            </div>
          )}
        </div>
        <button
          type="button"
          className="counter"
          onClick={() => setCount((count) => count + 1)}
        >
          Count is {count}
        </button>
      </section>

      <div className="ticks"></div>

      <section id="next-steps">
        <div id="docs">
          <h2>Next step</h2>
          <p>ลองเรียก API อื่นจาก Backend เช่น <code>/api/users</code> หรือ <code>/api/items</code></p>
        </div>
      </section>

      <div className="ticks"></div>
      <section id="spacer"></section>
    </>
  )
}

export default App
