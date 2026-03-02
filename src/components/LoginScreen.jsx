import { useState } from 'react'
import { authenticate } from '../data/users'

export default function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    const user = authenticate(username.trim(), password)
    if (user) {
      setError('')
      onLogin(user)
    } else {
      setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง')
    }
  }

  const handleGuestView = () => {
    onLogin(null) // null = read-only guest
  }

  return (
    <div className="login-overlay">
      <div className="login-box">
        <div className="login-logo">🏨</div>
        <h1 className="login-title">ระบบจองห้องพัก</h1>
        <p className="login-subtitle">รีสอร์ท — กรุณาเข้าสู่ระบบ</p>

        <form className="login-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>ชื่อผู้ใช้</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="admin / user1 / user2"
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>รหัสผ่าน</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="รหัสผ่าน"
            />
          </div>

          {error && <p className="login-error">{error}</p>}

          <button type="submit" className="btn-primary login-btn">
            เข้าสู่ระบบ
          </button>
        </form>

        <button className="login-guest-btn" onClick={handleGuestView}>
          ดูข้อมูลแบบไม่เข้าสู่ระบบ (อ่านอย่างเดียว)
        </button>

        <div className="login-hint">
          <p>บัญชีทดสอบ:</p>
          <code>admin / </code>
          <code>user1 / </code>
          <code>user2 / </code>
        </div>
      </div>
    </div>
  )
}
