import { STATUS_COLOR, STATUS_LABEL } from '../data/roomData'

export default function StatusLegend() {
  return (
    <div className="status-legend">
      {Object.entries(STATUS_LABEL).map(([key, label]) => (
        <div key={key} className="legend-item">
          <span className="legend-dot" style={{ backgroundColor: STATUS_COLOR[key] }} />
          <span>{label}</span>
        </div>
      ))}
    </div>
  )
}
