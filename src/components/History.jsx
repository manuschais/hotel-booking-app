import { useState } from 'react'
import * as XLSX from 'xlsx'
import { STATUS_LABEL, STAY_TYPE } from '../data/roomData'
import { todayLocal } from '../utils/date'

const todayStr = todayLocal

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
  const [query,    setQuery]    = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate,   setToDate]   = useState('')
  const [results,  setResults]  = useState(null)
  const [loading,  setLoading]  = useState(false)

  const handleFromDateChange = (e) => {
    const val = e.target.value
    setFromDate(val)
    // auto-fill toDate ด้วยค่าเดียวกัน (แต่ยังแก้ไขได้)
    if (!toDate || toDate < val) setToDate(val)
  }

  const handleSearch = async () => {
    setLoading(true)
    const data = await searchBookings({
      query:    query.trim() || undefined,
      fromDate: fromDate || undefined,
      toDate:   toDate   || undefined,
    })
    setResults(data)
    setLoading(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch()
  }

  const handleClear = () => {
    setQuery('')
    setFromDate('')
    setToDate('')
    setResults(null)
  }

  // ===== Export Excel =====
  const handleExport = () => {
    if (!results?.length) return

    const rows = results.map(b => ({
      'ห้อง':          b.room?.number || b.roomId,
      'โซน':           zoneLabel(b.room?.zone),
      'ชื่อผู้เข้าพัก': b.guestName || '',
      'โทรศัพท์':      b.phone || '',
      'ประเภท':        b.stayType === STAY_TYPE.HOURLY ? 'รายชั่วโมง' : 'รายคืน',
      'วันเช็คอิน':    b.checkIn || '',
      'เวลาเช็คอิน':   b.stayType === STAY_TYPE.HOURLY ? (b.checkInTime || '') : '13:00',
      'วันเช็คเอ้าท์': b.stayType === STAY_TYPE.HOURLY ? b.checkIn : (b.checkOut || ''),
      'เวลาเช็คเอ้าท์':b.checkOutTime || '12:00',
      'จำนวนคน':      b.adults || 1,
      'สถานะ':         STATUS_LABEL[b.status] || b.status,
      'ทะเบียนรถ':    b.carPlate || '',
      'จังหวัด':       b.carProvince || '',
      'ผู้รับจอง':     b.bookedBy || '',
      'หมายเหตุ':      b.note || '',
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'ประวัติการจอง')

    // ชื่อไฟล์ตามช่วงวันที่ที่ค้นหา
    const label = fromDate && toDate
      ? `${fromDate}_to_${toDate}`
      : todayStr()
    XLSX.writeFile(wb, `booking_history_${label}.xlsx`)
  }

  const hasFilter = query.trim() || fromDate || toDate

  return (
    <div className="history-container">
      <h2 className="history-title">📜 ประวัติการจอง</h2>
      <p className="history-desc">ค้นหาประวัติด้วยชื่อ, เบอร์โทร, ทะเบียนรถ หรือเลือกช่วงวันที่</p>

      {/* ===== Search Bar ===== */}
      <div className="history-search-bar">
        <input
          className="history-search-input"
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="ชื่อ / เบอร์โทร / ทะเบียนรถ..."
        />
      </div>

      {/* ===== Date Range ===== */}
      <div className="history-date-range">
        <div className="history-date-field">
          <label>จากวันที่</label>
          <input
            type="date"
            value={fromDate}
            onChange={handleFromDateChange}
            max={todayStr()}
          />
        </div>
        <span className="history-date-sep">—</span>
        <div className="history-date-field">
          <label>ถึงวันที่</label>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            min={fromDate || undefined}
            max={todayStr()}
          />
        </div>
        <button
          className="history-search-btn"
          onClick={handleSearch}
          disabled={loading || !hasFilter}
        >
          {loading ? 'กำลังค้นหา...' : '🔍 ค้นหา'}
        </button>
        {hasFilter && (
          <button className="history-clear-btn" onClick={handleClear}>✕ ล้าง</button>
        )}
      </div>

      {/* ===== Empty State ===== */}
      {results === null && (
        <div className="history-empty">
          <p>กรอกชื่อ / เบอร์โทร / ทะเบียนรถ หรือเลือกช่วงวันที่ แล้วกด ค้นหา</p>
        </div>
      )}

      {results !== null && results.length === 0 && (
        <div className="history-empty">
          <p>ไม่พบข้อมูลการจองที่ตรงกัน</p>
        </div>
      )}

      {/* ===== Results ===== */}
      {results !== null && results.length > 0 && (
        <div className="history-results">
          <div className="history-results-header">
            <p className="history-count">พบ {results.length} รายการ</p>
            <button className="history-export-btn" onClick={handleExport}>
              📊 ส่งออก Excel
            </button>
          </div>
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
  if (zone === 'resort')     return 'รีสอร์ท'
  if (zone === 'building_a') return 'ตึก A'
  if (zone === 'building_b') return 'ตึก B'
  return zone || ''
}
