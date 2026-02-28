import { STATUS_COLOR, STATUS_LABEL } from '../data/roomData'

export default function RoomCard({ room, onClick }) {
  const color = STATUS_COLOR[room.status]
  const label = STATUS_LABEL[room.status]

  return (
    <button
      className={`room-card status-${room.status}`}
      onClick={() => onClick(room)}
      title={`ห้อง ${room.number} - ${label}${room.booking ? `\nผู้เข้าพัก: ${room.booking.guestName}` : ''}`}
    >
      <span className="room-number">{room.number}</span>
      <span className="room-status-dot" style={{ backgroundColor: color }} />
      <span className="room-status-text">{label}</span>
      {room.booking && (
        <span className="room-guest">{room.booking.guestName}</span>
      )}
    </button>
  )
}
