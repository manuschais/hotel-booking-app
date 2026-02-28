import { STATUS_LABEL, STATUS_COLOR } from '../data/roomData'

export default function SummaryBar({ rooms }) {
  const counts = {
    available: 0,
    booked: 0,
    occupied: 0,
    cleaning: 0,
  }

  rooms.forEach(r => {
    if (counts[r.status] !== undefined) counts[r.status]++
  })

  return (
    <div className="summary-bar">
      {Object.entries(counts).map(([status, count]) => (
        <div key={status} className="summary-item">
          <span className="summary-dot" style={{ backgroundColor: STATUS_COLOR[status] }} />
          <span className="summary-label">{STATUS_LABEL[status]}</span>
          <span className="summary-count">{count}</span>
        </div>
      ))}
      <div className="summary-item summary-total">
        <span className="summary-label">รวม</span>
        <span className="summary-count">{rooms.length}</span>
      </div>
    </div>
  )
}
