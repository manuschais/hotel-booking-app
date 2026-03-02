import { useState, useCallback, useMemo } from 'react'
import { ZONES, computeRoomStatus, getRoomStatusOnDate, getBookingOnDate } from './data/roomData'
import { canCancel } from './data/users'
import { useSupabaseRooms } from './hooks/useSupabaseRooms'
import { todayLocal } from './utils/date'
import ResortZone from './components/ResortZone'
import BuildingZone from './components/BuildingZone'
import BookingModal from './components/BookingModal'
import StatusLegend from './components/StatusLegend'
import SummaryBar from './components/SummaryBar'
import LoginScreen from './components/LoginScreen'
import Timeline from './components/Timeline'
import History from './components/History'
import AdminDeleteModal from './components/AdminDeleteModal'
import './App.css'

const TABS = [
  { key: 'all',             label: '🏠 ทั้งหมด' },
  { key: ZONES.RESORT,      label: '🏡 รีสอร์ท' },
  { key: ZONES.BUILDING_A,  label: '🏢 ตึก A' },
  { key: ZONES.BUILDING_B,  label: '🏢 ตึก B' },
  { key: 'timeline',        label: '📅 ตารางจอง' },
  { key: 'history',         label: '📜 ประวัติ' },
]

const AUTH_KEY = 'resort_auth'
const todayStr = todayLocal

function formatDateThai(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
}

export default function App() {
  const {
    rooms, loading, error,
    addBooking, checkIn, checkOut, cancelBooking,
    updateBookingFields, extendBooking,
    setRoomAvailable,
    searchBookings, deleteBookingsByRange,
    resetAllRooms,
  } = useSupabaseRooms()

  const [activeTab, setActiveTab] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [adminDeleteOpen, setAdminDeleteOpen] = useState(false)
  const [viewDate, setViewDate] = useState(todayStr)

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

  // *** hooks ต้องอยู่ก่อน early return ทุกตัว ***
  const liveRooms = useMemo(() => rooms.map(r => {
    const status = getRoomStatusOnDate(r, viewDate)
    const activeBookingOnDate = getBookingOnDate(r, viewDate)
    return { ...r, status, _viewBooking: activeBookingOnDate }
  }), [rooms, viewDate])

  // SummaryBar uses today's real-time counts
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

  // ห้องที่ถูกเลือก (raw room พร้อม bookings)
  const selectedRoomFull = selectedRoom
    ? rooms.find(r => r.id === selectedRoom.id) || selectedRoom
    : null

  const isAdmin = canCancel(currentUser)

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
                {isAdmin && (
                  <button className="btn-clear" onClick={() => setAdminDeleteOpen(true)}>
                    🗑️ จัดการข้อมูล
                  </button>
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
            // ซ่อน tab ประวัติ — เฉพาะ Admin เท่านั้น
            tab.key === 'history' && !isAdmin ? null : (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            )
          ))}
        </nav>

        <main className="main-content">
          {activeTab === 'history' ? (
            <History searchBookings={searchBookings} />
          ) : activeTab === 'timeline' ? (
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

      {/* ===== BOOKING MODAL ===== */}
      {modalOpen && selectedRoomFull && (
        <BookingModal
          room={selectedRoomFull}
          currentUser={currentUser}
          onClose={handleModalClose}
          onBook={(formData)        => addBooking(selectedRoomFull.id, { ...formData, bookedBy: currentUser?.displayName || '-' })}
          onCheckIn={(bookingId)    => checkIn(bookingId)}
          onCheckOut={(bookingId)   => checkOut(bookingId, selectedRoomFull.id)}
          onCancel={(bookingId)     => cancelBooking(bookingId)}
          onEdit={(bookingId, fields) => updateBookingFields(bookingId, fields)}
          onExtend={(bookingId, changes) => extendBooking(bookingId, changes)}
          onCleaned={()            => setRoomAvailable(selectedRoomFull.id)}
        />
      )}

      {/* ===== ADMIN DELETE MODAL ===== */}
      {adminDeleteOpen && (
        <AdminDeleteModal
          onClose={() => setAdminDeleteOpen(false)}
          onDelete={deleteBookingsByRange}
          onResetAll={resetAllRooms}
        />
      )}
    </div>
  )
}
