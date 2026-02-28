import { useState, useCallback, useMemo } from 'react'
import { ZONES, computeRoomStatus, getRoomStatusOnDate, getBookingOnDate } from './data/roomData'
import { canCancel } from './data/users'
import { useSupabaseRooms } from './hooks/useSupabaseRooms'
import ResortZone from './components/ResortZone'
import BuildingZone from './components/BuildingZone'
import BookingModal from './components/BookingModal'
import StatusLegend from './components/StatusLegend'
import SummaryBar from './components/SummaryBar'
import LoginScreen from './components/LoginScreen'
import Timeline from './components/Timeline'
import './App.css'

const TABS = [
  { key: 'all',             label: '🏠 ทั้งหมด' },
  { key: ZONES.RESORT,      label: '🏡 รีสอร์ท' },
  { key: ZONES.BUILDING_A,  label: '🏢 ตึก A' },
  { key: ZONES.BUILDING_B,  label: '🏢 ตึก B' },
  { key: 'timeline',        label: '📅 ตารางจอง' },
]

const AUTH_KEY = 'resort_auth'
const todayStr = () => new Date().toISOString().split('T')[0]

function formatDateThai(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function App() {
  const { rooms, loading, error, updateRoom, resetAllRooms } = useSupabaseRooms()

  const [activeTab, setActiveTab] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [viewDate, setViewDate] = useState(todayStr)   // ← วันที่ดู dashboard

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = sessionStorage.getItem(AUTH_KEY)
      return saved ? JSON.parse(saved) : undefined
    } catch { return undefined }
  })

  const handleLogin = useCallback((user) => {
    setCurrentUser(user)
    try { sessionStorage.setItem(AUTH_KEY, JSON.stringify(user)) } catch { /* ignore */ }
  }, [])

  const handleLogout = useCallback(() => {
    setCurrentUser(undefined)
    sessionStorage.removeItem(AUTH_KEY)
  }, [])

  const handleRoomClick = useCallback((room) => {
    setSelectedRoom(room)
    setModalOpen(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setModalOpen(false)
    setSelectedRoom(null)
  }, [])

  const handleClearAll = useCallback(() => {
    if (window.confirm('ล้างข้อมูลการจองทั้งหมด? ไม่สามารถกู้คืนได้')) {
      resetAllRooms()
    }
  }, [resetAllRooms])

  // *** hooks ต้องอยู่ก่อน early return ทุกตัว ***
  // Rooms with status computed for the selected viewDate
  const liveRooms = useMemo(() => rooms.map(r => {
    const status = getRoomStatusOnDate(r, viewDate)
    const activeBookingOnDate = getBookingOnDate(r, viewDate)
    return { ...r, status, _viewBooking: activeBookingOnDate }
  }), [rooms, viewDate])

  // SummaryBar always uses today's real-time counts
  const todayRooms = useMemo(() =>
    rooms.map(r => ({ ...r, status: computeRoomStatus(r) })),
    [rooms]
  )

  if (currentUser === undefined) return <LoginScreen onLogin={handleLogin} />

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner" />
        <p>กำลังโหลดข้อมูล...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="loading-screen error">
        <p>❌ เชื่อมต่อฐานข้อมูลไม่ได้</p>
        <code>{error}</code>
        <p style={{ fontSize: '0.85rem', marginTop: 8 }}>ตรวจสอบไฟล์ .env ว่าใส่ URL และ Key ถูกต้อง</p>
      </div>
    )
  }

  const isToday = viewDate === todayStr()

  const resortRooms     = liveRooms.filter(r => r.zone === ZONES.RESORT)
  const buildingAFloor1 = liveRooms.filter(r => r.zone === ZONES.BUILDING_A && r.floor === 1)
  const buildingAFloor2 = liveRooms.filter(r => r.zone === ZONES.BUILDING_A && r.floor === 2)
  const buildingBFloor1 = liveRooms.filter(r => r.zone === ZONES.BUILDING_B && r.floor === 1)
  const buildingBFloor2 = liveRooms.filter(r => r.zone === ZONES.BUILDING_B && r.floor === 2)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top-row">
          <div className="header-content">
            <h1>🏨 ระบบจองห้องพัก รีสอร์ท</h1>
            <p>จัดการห้องพักทั้งหมด 88 ห้อง ใน 3 โซน</p>
          </div>
          <div className="header-actions">
            {currentUser ? (
              <div className="user-info">
                <span className="db-badge">🟢 Online</span>
                <span className={`user-badge role-${currentUser.role}`}>
                  {currentUser.role === 'admin' ? '👑' : '👤'} {currentUser.displayName}
                </span>
                {canCancel(currentUser) && (
                  <button className="btn-clear" onClick={handleClearAll}>🗑️ ล้างข้อมูล</button>
                )}
                <button className="btn-logout" onClick={handleLogout}>ออกจากระบบ</button>
              </div>
            ) : (
              <div className="user-info">
                <span className="db-badge">🟢 Online</span>
                <span className="user-badge role-guest">👁️ ดูอย่างเดียว</span>
                <button className="btn-logout" onClick={handleLogout}>เข้าสู่ระบบ</button>
              </div>
            )}
          </div>
        </div>
        <SummaryBar rooms={todayRooms} />
      </header>

      <div className="app-body">
        <StatusLegend />

        {/* ===== DATE PICKER BAR ===== */}
        <div className="date-bar">
          <span className="date-bar-label">📅 ดูห้องพักวันที่:</span>
          <input
            type="date"
            className="date-bar-input"
            value={viewDate}
            onChange={e => setViewDate(e.target.value)}
          />
          {!isToday && (
            <button className="date-bar-today" onClick={() => setViewDate(todayStr())}>
              กลับวันนี้
            </button>
          )}
          <span className={`date-bar-desc ${!isToday ? 'date-bar-future' : ''}`}>
            {isToday ? '🟢 แสดงสถานะปัจจุบัน (Real-time)' : `📋 แสดงการจองวัน ${formatDateThai(viewDate)}`}
          </span>
        </div>

        <nav className="tab-nav">
          {TABS.map(tab => (
            <button
              key={tab.key}
              className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <main className="main-content">
          {activeTab === 'timeline' ? (
            <Timeline rooms={liveRooms} onRoomClick={handleRoomClick} />
          ) : (
            <>
              {(activeTab === 'all' || activeTab === ZONES.RESORT) && (
                <ResortZone rooms={resortRooms} onRoomClick={handleRoomClick} viewDate={viewDate} />
              )}
              {(activeTab === 'all' || activeTab === ZONES.BUILDING_A) && (
                <BuildingZone
                  building="A"
                  floor1Rooms={buildingAFloor1}
                  floor2Rooms={buildingAFloor2}
                  onRoomClick={handleRoomClick}
                  viewDate={viewDate}
                />
              )}
              {(activeTab === 'all' || activeTab === ZONES.BUILDING_B) && (
                <BuildingZone
                  building="B"
                  floor1Rooms={buildingBFloor1}
                  floor2Rooms={buildingBFloor2}
                  onRoomClick={handleRoomClick}
                  viewDate={viewDate}
                />
              )}
            </>
          )}
        </main>
      </div>

      {modalOpen && selectedRoom && (
        <BookingModal
          room={rooms.find(r => r.id === selectedRoom.id) || selectedRoom}
          currentUser={currentUser}
          onClose={handleModalClose}
          onUpdate={updateRoom}
        />
      )}
    </div>
  )
}
