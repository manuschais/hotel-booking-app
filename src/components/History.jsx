import { useState } from 'react'
import { STATUS_LABEL, STAY_TYPE } from '../data/roomData'

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' })
}

const STATUS_BADGE_COLOR = {
  booked:    '#f59e0b',
  occupied:  '#ef4444',
  completed: '#6b7280',
  cancelled: '#9ca3af',
  no_show:   '#d1d5db',
}

export default function History({ searchBookings }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleSearch = async () => {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    const data = await searchBookings(q)
    setResults(data)
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="history-container">
      <h2 className="history-title">📜 ประวัติการจอง</h2>
      <p className="history-desc">ค้นหาประวัติการเข้าพักด้วยชื่อผู้เข้าพัก, เบอร์โทรศัพท์ หรือทะเบียนรถ</p>

      <div className="history-search-bar">
        <input
          className="history-search-input"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ชื่อ / เบอร์โทร / ทะเบียนรถ..."
        />
        <button
          className="history-search-btn"
          onClick={handleSearch}
          disabled={loading || !query.trim()}
        >
          {loading ? 'กำลังค้นหา...' : '🔍 ค้นหา'}
        </button>
      </div>

      {results === null && (
        <div className="history-empty">
          <p>พิมพ์ชื่อ, เบอร์โทร หรือทะเบียนรถแล้วกด ค้นหา</p>
        </div>
      )}

      {results !== null && results.length === 0 && (
        <div className="history-empty">
          <p>ไม่พบข้อมูลการจองที่ตรงกัน</p>
        </div>
      )}

      {results !== null && results.length > 0 && (
        <div className="history-results">
          <p className="history-count">พบ {results.length} รายการ</p>
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>ห้อง</th>
                  <th>ชื่อผู้เข้าพัก</th>
                  <th>โทรศัพท์</th>
                  <th>ประเภท</th>
                  <th>เช็คอิน</th>
                  <th>เช็คเอ้าท์</th>
                  <th>สถานะ</th>
                  <th>ผู้รับจอง</th>
                  <th>ทะเบียนรถ</th>
                  <th>หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {results.map(b => (
                  <tr key={b.id}>
                    <td className="history-room">
                      <span className="history-room-num">{b.room?.number || b.roomId}</span>
                      {b.room?.zone && <span className="history-room-zone">{zoneLabel(b.room.zone)}</span>}
                    </td>
                    <td className="history-guest">{b.guestName || '-'}</td>
                    <td>{b.phone || '-'}</td>
                    <td>{b.stayType === STAY_TYPE.HOURLY ? '⏱ ชม.' : '🌙 คืน'}</td>
                    <td>
                      {formatDate(b.checkIn)}
                      {b.stayType === STAY_TYPE.HOURLY && b.checkInTime && (
                        <span className="history-time"> {b.checkInTime}</span>
                      )}
                    </td>
                    <td>
                      {b.stayType === STAY_TYPE.HOURLY
                        ? (b.checkOutTime ? <span className="history-time">{b.checkOutTime}</span> : '-')
                        : formatDate(b.checkOut)
                      }
                    </td>
                    <td>
                      <span
                        className="history-status-badge"
                        style={{ backgroundColor: STATUS_BADGE_COLOR[b.status] || '#9ca3af' }}
                      >
                        {STATUS_LABEL[b.status] || b.status}
                      </span>
                    </td>
                    <td>{b.bookedBy || '-'}</td>
                    <td>
                      {b.carPlate
                        ? `${b.carPlate}${b.carProvince ? ` (${b.carProvince})` : ''}`
                        : '-'}
                    </td>
                    <td className="history-note">{b.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function zoneLabel(zone) {
  if (zone === 'resort') return 'รีสอร์ท'
  if (zone === 'building_a') return 'ตึก A'
  if (zone === 'building_b') return 'ตึก B'
  return zone
}
