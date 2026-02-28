import RoomCard from './RoomCard'

export default function ResortZone({ rooms, onRoomClick }) {
  const available = rooms.filter(r => r.status === 'available').length
  const occupied = rooms.filter(r => r.status !== 'available').length

  return (
    <section className="zone-section">
      <div className="zone-header">
        <div className="zone-title">
          <span className="zone-icon">🏡</span>
          <h2>รีสอร์ท - บ้านหลัง</h2>
        </div>
        <div className="zone-stats">
          <span className="stat-available">ว่าง: {available}</span>
          <span className="stat-divider">/</span>
          <span className="stat-total">ทั้งหมด: {rooms.length}</span>
        </div>
      </div>

      <div className="resort-grid">
        {rooms.map(room => (
          <RoomCard key={room.id} room={room} onClick={onRoomClick} />
        ))}
      </div>
    </section>
  )
}
