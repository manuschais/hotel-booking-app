import { useState, useCallback, useMemo } from 'react'
import { ZONES, STATUS, getRoomStatusOnDate, getBookingOnDate } from './data/roomData'
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
import BookingDetailModal from './components/BookingDetailModal'
import AdminDeleteModal from './components/AdminDeleteModal'
import Report from './components/Report'
import MultiBookingModal from './components/MultiBookingModal'
import Stock from './components/Stock'
import { useSupabaseStock } from './hooks/useSupabaseStock'
import HelpModal from './components/HelpModal'
import './App.css'

const TABS = [
  { key: 'all',             label: '🏠 ทั้งหมด' },
  { key: ZONES.RESORT,      label: '🏡 รีสอร์ท' },
  { key: ZONES.BUILDING_A,  label: '🏢 ตึก A' },
  { key: ZONES.BUILDING_B,  label: '🏢 ตึก B' },
  { key: 'timeline',        label: '📅 ตารางจอง' },
  { key: 'history',         label: '📜 ประวัติ' },
  { key: 'report',          label: '📊 รายงาน' },
  { key: 'stock',           label: '📦 สต็อก' },
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
    markNoShow,
    searchBookings, deleteBooking, deleteBookingsByRange,
    resetAllRooms,
  } = useSupabaseRooms()

  const {
    items: stockItems, transactions: stockTx, loading: stockLoading,
    addItem, editItem, deleteItem, addTransaction,
  } = useSupabaseStock()

  const [activeTab, setActiveTab] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [clickedDate, setClickedDate] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [bookingDetailItem, setBookingDetailItem] = useState(null)
  const [adminDeleteOpen, setAdminDeleteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)
  const [viewDate, setViewDate] = useState(todayStr)
  const [multiSelectMode, setMultiSelectMode] = useState(false)
  const [selectedRoomIds, setSelectedRoomIds] = useState(new Set())
  const [multiBookingOpen, setMultiBookingOpen] = useState(false)

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

  const handleExitMultiSelect = useCallback(() => {
    setMultiSelectMode(false)
    setSelectedRoomIds(new Set())
  }, [])

  const handleRoomClick = useCallback((room, date = null) => {
    if (!currentUser) return
    if (multiSelectMode) {
      if (room.status !== STATUS.AVAILABLE) return
      setSelectedRoomIds(prev => {
        const next = new Set(prev)
        next.has(room.id) ? next.delete(room.id) : next.add(room.id)
        return next
      })
      return
    }
    setSelectedRoom(room)
    setClickedDate(date)
    setModalOpen(true)
  }, [multiSelectMode])

  const handleModalClose = useCallback(() => {
    setModalOpen(false)
    setSelectedRoom(null)
    setClickedDate(null)
  }, [])

  const handleBookingDetail = useCallback((booking) => {
    setBookingDetailItem(booking)
  }, [])

  const handleBookingDetailClose = useCallback(() => {
    setBookingDetailItem(null)
  }, [])

  // *** hooks ต้องอยู่ก่อน early return ทุกตัว ***
  const liveRooms = useMemo(() => rooms.map(r => {
    const status = getRoomStatusOnDate(r, viewDate)
    const activeBookingOnDate = getBookingOnDate(r, viewDate)
    return { ...r, status, _viewBooking: activeBookingOnDate }
  }), [rooms, viewDate])


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
            <button className="btn-help" onClick={() => setHelpOpen(true)}>❓ คู่มือ</button>
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
        <SummaryBar rooms={liveRooms} isToday={isToday} viewDate={viewDate} />
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
            (!currentUser && tab.key !== 'all') ? null : (
              <button
                key={tab.key}
                className={`tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => { setActiveTab(tab.key); if (multiSelectMode) handleExitMultiSelect() }}
              >
                {tab.label}
              </button>
            )
          ))}
          {['all', ZONES.RESORT, ZONES.BUILDING_A, ZONES.BUILDING_B].includes(activeTab) && currentUser && (
            <button
              className={`btn-multi-select ${multiSelectMode ? 'active' : ''}`}
              onClick={() => multiSelectMode ? handleExitMultiSelect() : setMultiSelectMode(true)}
            >
              {multiSelectMode ? `✕ ออก (${selectedRoomIds.size})` : '🏠+ หลายห้อง'}
            </button>
          )}
        </nav>

        <main className="main-content">
          {activeTab === 'stock' ? (
            <Stock
              items={stockItems} transactions={stockTx} loading={stockLoading}
              currentUser={currentUser}
              addItem={addItem} editItem={editItem} deleteItem={deleteItem}
              addTransaction={addTransaction}
            />
          ) : activeTab === 'report' ? (
            <Report rooms={rooms} />
          ) : activeTab === 'history' ? (
            <History searchBookings={searchBookings} onBookingDetail={handleBookingDetail} />
          ) : activeTab === 'timeline' ? (
            <Timeline rooms={liveRooms} onRoomClick={handleRoomClick} onBookingDetail={handleBookingDetail} />
          ) : (
            <>
              {(activeTab === 'all' || activeTab === ZONES.RESORT) && (
                <ResortZone rooms={resortRooms} onRoomClick={handleRoomClick} viewDate={viewDate}
                  multiSelectMode={multiSelectMode} selectedRoomIds={selectedRoomIds} showGuest={!!currentUser} />
              )}
              {(activeTab === 'all' || activeTab === ZONES.BUILDING_A) && (
                <BuildingZone
                  building="A"
                  floor1Rooms={buildingAFloor1}
                  floor2Rooms={buildingAFloor2}
                  onRoomClick={handleRoomClick}
                  viewDate={viewDate}
                  multiSelectMode={multiSelectMode} selectedRoomIds={selectedRoomIds} showGuest={!!currentUser}
                />
              )}
              {(activeTab === 'all' || activeTab === ZONES.BUILDING_B) && (
                <BuildingZone
                  building="B"
                  floor1Rooms={buildingBFloor1}
                  floor2Rooms={buildingBFloor2}
                  onRoomClick={handleRoomClick}
                  viewDate={viewDate}
                  multiSelectMode={multiSelectMode} selectedRoomIds={selectedRoomIds} showGuest={!!currentUser}
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
          initialCheckIn={clickedDate}
          onBook={(formData)        => addBooking(selectedRoomFull.id, { ...formData, bookedBy: currentUser?.displayName || '-' })}
          onCheckIn={(bookingId)    => checkIn(bookingId)}
          onCheckOut={(bookingId)   => checkOut(bookingId, selectedRoomFull.id)}
          onNoShow={(bookingId)     => markNoShow(bookingId)}
          onCancel={(bookingId)     => cancelBooking(bookingId)}
          onEdit={(bookingId, fields) => updateBookingFields(bookingId, fields)}
          onExtend={(bookingId, changes) => extendBooking(bookingId, changes)}
          onCleaned={()            => setRoomAvailable(selectedRoomFull.id)}
        />
      )}

      {/* ===== BOOKING DETAIL MODAL (ประวัติ / แก้ไข / ลบ) ===== */}
      {bookingDetailItem && (
        <BookingDetailModal
          booking={bookingDetailItem}
          currentUser={currentUser}
          onClose={handleBookingDetailClose}
          onEdit={(bookingId, fields) => updateBookingFields(bookingId, fields)}
          onDelete={(bookingId) => deleteBooking(bookingId)}
          onCheckIn={(bookingId) => checkIn(bookingId)}
          onCheckOut={(bookingId, roomId) => checkOut(bookingId, roomId)}
          onCancel={(bookingId) => cancelBooking(bookingId)}
          onExtend={(bookingId, changes) => extendBooking(bookingId, changes)}
          onNoShow={(bookingId) => markNoShow(bookingId)}
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

      {/* ===== MULTI-BOOKING MODAL ===== */}
      {multiBookingOpen && (
        <MultiBookingModal
          rooms={liveRooms.filter(r => selectedRoomIds.has(r.id))}
          currentUser={currentUser}
          onClose={() => setMultiBookingOpen(false)}
          onBook={async (formData) => {
            await Promise.all(
              [...selectedRoomIds].map(roomId =>
                addBooking(roomId, { ...formData, bookedBy: currentUser?.displayName || '-' })
              )
            )
            setMultiBookingOpen(false)
            handleExitMultiSelect()
          }}
        />
      )}

      {/* ===== FLOATING MULTI-SELECT BAR ===== */}
      {multiSelectMode && selectedRoomIds.size > 0 && (
        <div className="floating-multi-bar">
          <span className="multi-bar-count">🏠 {selectedRoomIds.size} ห้อง:</span>
          <span className="multi-bar-rooms">
            {liveRooms.filter(r => selectedRoomIds.has(r.id)).map(r => r.number).join(', ')}
          </span>
          <button className="btn-multi-book" onClick={() => setMultiBookingOpen(true)}>
            ✅ จอง {selectedRoomIds.size} ห้อง
          </button>
          <button className="btn-multi-clear" onClick={() => setSelectedRoomIds(new Set())}>ล้าง</button>
        </div>
      )}

      {/* ===== HELP MODAL ===== */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
    </div>
  )
}
