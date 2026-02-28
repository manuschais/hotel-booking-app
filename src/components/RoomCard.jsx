import { STATUS_COLOR, STATUS_LABEL, HOURLY_COLOR, STAY_TYPE, getActiveBooking } from '../data/roomData'

export default function RoomCard({ room, onClick }) {
  const label = STATUS_LABEL[room.status]
  // Use _viewBooking (date-picker override) if present, else fall back to real active booking
  const displayBooking = room._viewBooking !== undefined ? room._viewBooking : getActiveBooking(room)
  const activeBooking = getActiveBooking(room)
  const isHourly = displayBooking?.stayType === STAY_TYPE.HOURLY
  // Hourly stays use purple tones; daily stays use standard colors
  const color = isHourly
    ? (HOURLY_COLOR[room.status] || STATUS_COLOR[room.status])
    : STATUS_COLOR[room.status]
  const hasPending = (room.bookings || []).filter(b => b.id !== activeBooking?.id && b.status === 'booked').length > 0

  return (
    <button
      className={`room-card status-${room.status}`}
      onClick={() => onClick(room)}
      title={`ห้อง ${room.number} — ${label}${displayBooking ? `\nผู้เข้าพัก: ${displayBooking.guestName}` : ''}`}
    >
      <div className="room-card-top">
        <span className="room-number">{room.number}</span>
        <span className="room-status-dot" style={{ backgroundColor: color }} />
      </div>
      <span className="room-status-text">{label}</span>
      {displayBooking && (
        <span className="room-guest">{displayBooking.guestName}</span>
      )}
      <div className="room-badges">
        {isHourly && <span className="badge-hourly">ชม.</span>}
        {hasPending && <span className="badge-pending">+{(room.bookings || []).filter(b => b.id !== activeBooking?.id && b.status === 'booked').length}</span>}
      </div>
    </button>
  )
}
