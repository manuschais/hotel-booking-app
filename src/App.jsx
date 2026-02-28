import { useState, useCallback } from 'react'
import { generateAllRooms, ZONES } from './data/roomData'
import ResortZone from './components/ResortZone'
import BuildingZone from './components/BuildingZone'
import BookingModal from './components/BookingModal'
import StatusLegend from './components/StatusLegend'
import SummaryBar from './components/SummaryBar'
import './App.css'

const TABS = [
  { key: 'all', label: 'ทั้งหมด' },
  { key: ZONES.RESORT, label: 'รีสอร์ท (บ้านหลัง)' },
  { key: ZONES.BUILDING_A, label: 'ตึก A' },
  { key: ZONES.BUILDING_B, label: 'ตึก B' },
]

export default function App() {
  const [rooms, setRooms] = useState(generateAllRooms)
  const [activeTab, setActiveTab] = useState('all')
  const [selectedRoom, setSelectedRoom] = useState(null)
  const [modalOpen, setModalOpen] = useState(false)

  const handleRoomClick = useCallback((room) => {
    setSelectedRoom(room)
    setModalOpen(true)
  }, [])

  const handleModalClose = useCallback(() => {
    setModalOpen(false)
    setSelectedRoom(null)
  }, [])

  const handleUpdateRoom = useCallback((roomId, updates) => {
    setRooms(prev =>
      prev.map(r => r.id === roomId ? { ...r, ...updates } : r)
    )
  }, [])

  const resortRooms = rooms.filter(r => r.zone === ZONES.RESORT)
  const buildingAFloor1 = rooms.filter(r => r.zone === ZONES.BUILDING_A && r.floor === 1)
  const buildingAFloor2 = rooms.filter(r => r.zone === ZONES.BUILDING_A && r.floor === 2)
  const buildingBFloor1 = rooms.filter(r => r.zone === ZONES.BUILDING_B && r.floor === 1)
  const buildingBFloor2 = rooms.filter(r => r.zone === ZONES.BUILDING_B && r.floor === 2)

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <h1>🏨 ระบบจองห้องพัก รีสอร์ท</h1>
          <p>จัดการห้องพักทั้งหมด 88 ห้อง ใน 3 โซน</p>
        </div>
        <SummaryBar rooms={rooms} />
      </header>

      <div className="app-body">
        <StatusLegend />

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
          {(activeTab === 'all' || activeTab === ZONES.RESORT) && (
            <ResortZone
              rooms={resortRooms}
              onRoomClick={handleRoomClick}
            />
          )}

          {(activeTab === 'all' || activeTab === ZONES.BUILDING_A) && (
            <BuildingZone
              building="A"
              floor1Rooms={buildingAFloor1}
              floor2Rooms={buildingAFloor2}
              onRoomClick={handleRoomClick}
            />
          )}

          {(activeTab === 'all' || activeTab === ZONES.BUILDING_B) && (
            <BuildingZone
              building="B"
              floor1Rooms={buildingBFloor1}
              floor2Rooms={buildingBFloor2}
              onRoomClick={handleRoomClick}
            />
          )}
        </main>
      </div>

      {modalOpen && selectedRoom && (
        <BookingModal
          room={selectedRoom}
          onClose={handleModalClose}
          onUpdate={handleUpdateRoom}
        />
      )}
    </div>
  )
}
