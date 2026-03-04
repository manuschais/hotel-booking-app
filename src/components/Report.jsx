import { useState, useMemo } from 'react'
import { ZONES, STATUS, STAY_TYPE, getRoomStatusOnDate } from '../data/roomData'
import { todayLocal, addDaysLocal } from '../utils/date'

const addDays = addDaysLocal

const ZONE_LABELS = {
  [ZONES.RESORT]:     '🏡 รีสอร์ท',
  [ZONES.BUILDING_A]: '🏢 ตึก A',
  [ZONES.BUILDING_B]: '🏢 ตึก B',
}

function formatDateThai(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
}

function getDayStats(rooms, date) {
  let checkIns = 0, checkOuts = 0, occupied = 0, booked = 0, available = 0, cleaning = 0

  rooms.forEach(room => {
    const status = getRoomStatusOnDate(room, date)
    if      (status === STATUS.OCCUPIED)  occupied++
    else if (status === STATUS.BOOKED)    booked++
    else if (status === STATUS.CLEANING)  cleaning++
    else if (status === STATUS.AVAILABLE) available++

    ;(room.bookings || []).forEach(b => {
      if (b.status === STATUS.CANCELLED || b.status === STATUS.NO_SHOW) return
      // เช็คอิน: checkIn = date
      if (b.checkIn === date) checkIns++
      // เช็คเอ้าท์: checkOut = date (daily) หรือ checkIn = date ที่เป็น hourly ที่ completed/occupied
      if (b.stayType === STAY_TYPE.DAILY && b.checkOut === date) checkOuts++
      if (b.stayType === STAY_TYPE.HOURLY && b.checkIn === date &&
        (b.status === STATUS.COMPLETED || b.status === STATUS.OCCUPIED)) checkOuts++
    })
  })

  return { checkIns, checkOuts, occupied, booked, available, cleaning, total: rooms.length }
}

function getZoneStats(rooms, date) {
  return Object.entries(ZONE_LABELS).map(([zone, label]) => {
    const zoneRooms = rooms.filter(r => r.zone === zone)
    const stats = getDayStats(zoneRooms, date)
    return { zone, label, ...stats }
  })
}

export default function Report({ rooms }) {
  const [viewDate, setViewDate] = useState(todayLocal())
  const [viewMode, setViewMode] = useState('daily')

  const today = todayLocal()

  // ============ DAILY ============
  const dayStats   = useMemo(() => getDayStats(rooms, viewDate),   [rooms, viewDate])
  const zoneStats  = useMemo(() => getZoneStats(rooms, viewDate),  [rooms, viewDate])

  // ============ WEEKLY ============
  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(viewDate, i))
  }, [viewDate])

  const weekRows = useMemo(() => weekDates.map(d => ({
    date: d,
    ...getDayStats(rooms, d),
  })), [rooms, weekDates])

  const occupancyRate = dayStats.total > 0
    ? Math.round(((dayStats.occupied + dayStats.booked) / dayStats.total) * 100)
    : 0

  return (
    <div className="report-wrap">

      {/* ===== Controls ===== */}
      <div className="report-controls">
        <div className="report-mode-btns">
          <button
            className={`report-mode-btn ${viewMode === 'daily' ? 'active' : ''}`}
            onClick={() => setViewMode('daily')}
          >📅 รายวัน</button>
          <button
            className={`report-mode-btn ${viewMode === 'weekly' ? 'active' : ''}`}
            onClick={() => setViewMode('weekly')}
          >📊 รายสัปดาห์</button>
        </div>
        <div className="report-date-row">
          <label>วันที่:</label>
          <input type="date" value={viewDate} onChange={e => setViewDate(e.target.value)} />
          {viewDate !== today && (
            <button className="date-bar-today" onClick={() => setViewDate(today)}>วันนี้</button>
          )}
          <span className="report-date-desc">{formatDateThai(viewDate)}</span>
        </div>
      </div>

      {/* ===== DAILY VIEW ===== */}
      {viewMode === 'daily' && (
        <>
          {/* Summary cards */}
          <div className="report-cards">
            <StatCard icon="🔑" label="เช็คอินวันนี้"     value={dayStats.checkIns}  color="#22c55e" />
            <StatCard icon="🚪" label="เช็คเอ้าท์วันนี้"  value={dayStats.checkOuts} color="#f59e0b" />
            <StatCard icon="🛏️" label="กำลังพักอยู่"      value={dayStats.occupied}  color="#ef4444" />
            <StatCard icon="📋" label="จองแล้ว (รอเข้า)"  value={dayStats.booked}    color="#f97316" />
            <StatCard icon="✅" label="ห้องว่าง"           value={dayStats.available} color="#6b7280" />
            <StatCard icon="🧹" label="ทำความสะอาด"       value={dayStats.cleaning}  color="#3b82f6" />
          </div>

          {/* Occupancy bar */}
          <div className="report-occupancy">
            <div className="report-occupancy-header">
              <span>อัตราการเข้าพัก</span>
              <span className="report-occupancy-pct">{occupancyRate}%</span>
            </div>
            <div className="report-occupancy-bar">
              <div
                className="report-occupancy-fill"
                style={{ width: `${occupancyRate}%`, background: occupancyRate >= 80 ? '#ef4444' : occupancyRate >= 50 ? '#f97316' : '#22c55e' }}
              />
            </div>
            <div className="report-occupancy-sub">
              {dayStats.occupied + dayStats.booked} / {dayStats.total} ห้อง
            </div>
          </div>

          {/* Zone breakdown */}
          <div className="report-section">
            <h3 className="report-section-title">แยกตามโซน</h3>
            <div className="report-table-wrap">
              <table className="report-table">
                <thead>
                  <tr>
                    <th>โซน</th>
                    <th>ทั้งหมด</th>
                    <th>เช็คอิน</th>
                    <th>เช็คเอ้าท์</th>
                    <th>เข้าพัก</th>
                    <th>จองแล้ว</th>
                    <th>ว่าง</th>
                    <th>ทำความสะอาด</th>
                  </tr>
                </thead>
                <tbody>
                  {zoneStats.map(z => (
                    <tr key={z.zone}>
                      <td className="report-zone-label">{z.label}</td>
                      <td className="report-td-num">{z.total}</td>
                      <td className="report-td-num report-td-checkin">{z.checkIns || '-'}</td>
                      <td className="report-td-num report-td-checkout">{z.checkOuts || '-'}</td>
                      <td className="report-td-num report-td-occupied">{z.occupied || '-'}</td>
                      <td className="report-td-num report-td-booked">{z.booked || '-'}</td>
                      <td className="report-td-num">{z.available || '-'}</td>
                      <td className="report-td-num report-td-cleaning">{z.cleaning || '-'}</td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="report-total-row">
                    <td>รวม</td>
                    <td className="report-td-num">{dayStats.total}</td>
                    <td className="report-td-num report-td-checkin">{dayStats.checkIns || '-'}</td>
                    <td className="report-td-num report-td-checkout">{dayStats.checkOuts || '-'}</td>
                    <td className="report-td-num report-td-occupied">{dayStats.occupied || '-'}</td>
                    <td className="report-td-num report-td-booked">{dayStats.booked || '-'}</td>
                    <td className="report-td-num">{dayStats.available || '-'}</td>
                    <td className="report-td-num report-td-cleaning">{dayStats.cleaning || '-'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ===== WEEKLY VIEW ===== */}
      {viewMode === 'weekly' && (
        <div className="report-section">
          <h3 className="report-section-title">สรุป 7 วัน ตั้งแต่ {formatDateThai(viewDate)}</h3>
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>เช็คอิน</th>
                  <th>เช็คเอ้าท์</th>
                  <th>เข้าพัก</th>
                  <th>จองแล้ว</th>
                  <th>ว่าง</th>
                  <th>% เข้าพัก</th>
                </tr>
              </thead>
              <tbody>
                {weekRows.map(row => {
                  const pct = row.total > 0
                    ? Math.round(((row.occupied + row.booked) / row.total) * 100)
                    : 0
                  const isToday = row.date === today
                  return (
                    <tr key={row.date} className={isToday ? 'report-today-row' : ''}>
                      <td className="report-date-cell">
                        {formatDateThai(row.date)}
                        {isToday && <span className="report-today-badge">วันนี้</span>}
                      </td>
                      <td className="report-td-num report-td-checkin">{row.checkIns || '-'}</td>
                      <td className="report-td-num report-td-checkout">{row.checkOuts || '-'}</td>
                      <td className="report-td-num report-td-occupied">{row.occupied || '-'}</td>
                      <td className="report-td-num report-td-booked">{row.booked || '-'}</td>
                      <td className="report-td-num">{row.available || '-'}</td>
                      <td className="report-td-num">
                        <div className="report-pct-bar">
                          <div
                            className="report-pct-fill"
                            style={{ width: `${pct}%`, background: pct >= 80 ? '#ef4444' : pct >= 50 ? '#f97316' : '#22c55e' }}
                          />
                          <span>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button className="tl-btn" onClick={() => setViewDate(prev => addDays(prev, -7))}>◀ ก่อนหน้า</button>
            <button className="tl-btn tl-btn-today" onClick={() => setViewDate(today)}>สัปดาห์นี้</button>
            <button className="tl-btn" onClick={() => setViewDate(prev => addDays(prev, 7))}>ถัดไป ▶</button>
          </div>
        </div>
      )}

    </div>
  )
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="report-card" style={{ borderTopColor: color }}>
      <div className="report-card-icon">{icon}</div>
      <div className="report-card-value" style={{ color }}>{value}</div>
      <div className="report-card-label">{label}</div>
    </div>
  )
}
