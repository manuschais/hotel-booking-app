import RoomCard from './RoomCard'

export default function BuildingZone({ building, floor1Rooms, floor2Rooms, onRoomClick, multiSelectMode, selectedRoomIds }) {
  const allRooms = [...floor1Rooms, ...floor2Rooms]
  const available = allRooms.filter(r => r.status === 'available').length

  return (
    <section className="zone-section">
      <div className="zone-header">
        <div className="zone-title">
          <span className="zone-icon">🏢</span>
          <h2>ตึก {building}</h2>
        </div>
        <div className="zone-stats">
          <span className="stat-available">ว่าง: {available}</span>
          <span className="stat-divider">/</span>
          <span className="stat-total">ทั้งหมด: {allRooms.length}</span>
        </div>
      </div>

      <div className="building-floors">
        <div className="floor">
          <div className="floor-label">
            <span>ชั้น 2</span>
            <span className="floor-count">({floor2Rooms.filter(r=>r.status==='available').length}/{floor2Rooms.length} ว่าง)</span>
          </div>
          <div className="floor-grid">
            {floor2Rooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                onClick={onRoomClick}
                multiSelectMode={multiSelectMode}
                isSelected={selectedRoomIds?.has(room.id) ?? false}
              />
            ))}
          </div>
        </div>

        <div className="floor-divider" />

        <div className="floor">
          <div className="floor-label">
            <span>ชั้น 1</span>
            <span className="floor-count">({floor1Rooms.filter(r=>r.status==='available').length}/{floor1Rooms.length} ว่าง)</span>
          </div>
          <div className="floor-grid">
            {floor1Rooms.map(room => (
              <RoomCard
                key={room.id}
                room={room}
                onClick={onRoomClick}
                multiSelectMode={multiSelectMode}
                isSelected={selectedRoomIds?.has(room.id) ?? false}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
