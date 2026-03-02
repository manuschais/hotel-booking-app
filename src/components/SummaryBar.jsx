import { STATUS_LABEL, STATUS_COLOR } from '../data/roomData'

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function SummaryBar({ rooms, isToday, viewDate }) {
  const counts = {}
  rooms.forEach(r => {
    counts[r.status] = (counts[r.status] || 0) + 1
  })

  // สถานะที่จะแสดงเสมอ (แม้จำนวนเป็น 0)
  const primaryStatuses = ['available', 'booked', 'occupied', 'cleaning']

  // รวม status ทั้งหมดที่มีจริง + primaryStatuses (ไม่ซ้ำ)
  const statusesToShow = [...new Set([...primaryStatuses, ...Object.keys(counts)])]
    .filter(s => primaryStatuses.includes(s) || (counts[s] || 0) > 0)

  return (
    <div className="summary-bar">
      <div className="summary-date-label">
        {isToday
          ? <span className="summary-today-tag">🟢 วันนี้</span>
          : <span className="summary-date-tag">📅 {formatDateShort(viewDate)}</span>
        }
      </div>
      {statusesToShow.map(status => (
        <div key={status} className="summary-item">
          <span className="summary-dot" style={{ backgroundColor: STATUS_COLOR[status] || '#9ca3af' }} />
          <span className="summary-label">{STATUS_LABEL[status] || status}</span>
          <span className="summary-count">{counts[status] || 0}</span>
        </div>
      ))}
      <div className="summary-item summary-total">
        <span className="summary-label">รวม</span>
        <span className="summary-count">{rooms.length}</span>
      </div>
    </div>
  )
}
