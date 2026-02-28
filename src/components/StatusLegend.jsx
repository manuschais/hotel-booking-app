import { STATUS_COLOR, STATUS_LABEL, HOURLY_COLOR } from '../data/roomData'

const HOURLY_LEGEND = [
  { color: HOURLY_COLOR.booked,   label: 'จองแล้ว (ชม.)' },
  { color: HOURLY_COLOR.occupied, label: 'เข้าพักแล้ว (ชม.)' },
]

export default function StatusLegend() {
  return (
    <div className="status-legend">
      {Object.entries(STATUS_LABEL).map(([key, label]) => (
        <div key={key} className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: STATUS_COLOR[key] }} />
          <span>{label}</span>
        </div>
      ))}
      <span className="legend-divider">|</span>
      {HOURLY_LEGEND.map(item => (
        <div key={item.label} className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: item.color }} />
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
