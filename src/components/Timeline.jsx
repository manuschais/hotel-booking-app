import { useState, useMemo } from 'react'
import { STATUS_COLOR, HOURLY_COLOR, ZONES, getActiveBooking } from '../data/roomData'
import { todayLocal, addDaysLocal } from '../utils/date'

const ZONE_LABELS = {
  [ZONES.RESORT]:     '🏡 รีสอร์ท - บ้านหลัง',
  [ZONES.BUILDING_A]: '🏢 ตึก A',
  [ZONES.BUILDING_B]: '🏢 ตึก B',
}

const addDays  = addDaysLocal
const todayStr = todayLocal

function formatShort(dateStr) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const ZONE_FILTER_OPTIONS = [
  { key: 'all',             label: '🏠 ทั้งหมด' },
  { key: ZONES.RESORT,      label: '🏡 รีสอร์ท' },
  { key: ZONES.BUILDING_A,  label: '🏢 ตึก A' },
  { key: ZONES.BUILDING_B,  label: '🏢 ตึก B' },
]

export default function Timeline({ rooms, onRoomClick }) {
  const [startDate, setStartDate] = useState(todayStr)
  const [days, setDays] = useState(7)
  const [zoneFilter, setZoneFilter] = useState('all')
  const [roomSearch, setRoomSearch] = useState('')

  const dates = useMemo(() => {
    const arr = []
    for (let i = 0; i < days; i++) arr.push(addDays(startDate, i))
    return arr
  }, [startDate, days])

  const goBack = () => setStartDate(prev => addDays(prev, -days))
  const goFwd  = () => setStartDate(prev => addDays(prev, days))
  const goToday = () => setStartDate(todayStr())

  // Filter rooms by zone + room search
  const filteredRooms = useMemo(() => {
    const searchTrim = roomSearch.trim().toLowerCase()
    return rooms.filter(r => {
      const zoneMatch = zoneFilter === 'all' || r.zone === zoneFilter
      const searchMatch = !searchTrim || r.number.toLowerCase().includes(searchTrim)
      return zoneMatch && searchMatch
    })
  }, [rooms, zoneFilter, roomSearch])

  // Zones to show (respect filter, but group by zone for headers)
  const zonesToShow = useMemo(() => {
    if (zoneFilter !== 'all') return [zoneFilter]
    return [ZONES.RESORT, ZONES.BUILDING_A, ZONES.BUILDING_B]
  }, [zoneFilter])

  return (
    <div className="timeline-wrap">
      {/* Controls */}
      <div className="timeline-controls">
        <button className="tl-btn" onClick={goBack}>◀ ก่อนหน้า</button>
        <button className="tl-btn tl-btn-today" onClick={goToday}>วันนี้</button>
        <button className="tl-btn" onClick={goFwd}>ถัดไป ▶</button>
        <div className="tl-range">
          <span>จาก</span>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
          <span>จำนวน</span>
          <select value={days} onChange={e => setDays(Number(e.target.value))}>
            <option value={7}>7 วัน</option>
            <option value={14}>14 วัน</option>
            <option value={30}>30 วัน</option>
          </select>
        </div>
      </div>

      {/* Zone filter + Room search */}
      <div className="tl-filter-bar">
        <div className="tl-zone-btns">
          {ZONE_FILTER_OPTIONS.map(opt => (
            <button
              key={opt.key}
              className={`tl-zone-btn ${zoneFilter === opt.key ? 'active' : ''}`}
              onClick={() => setZoneFilter(opt.key)}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <div className="tl-room-search">
          <input
            type="text"
            className="tl-room-search-input"
            placeholder="🔍 ค้นหาเลขห้อง เช่น R-01, A101"
            value={roomSearch}
            onChange={e => setRoomSearch(e.target.value)}
          />
          {roomSearch && (
            <button className="tl-room-search-clear" onClick={() => setRoomSearch('')}>✕</button>
          )}
        </div>
        <span className="tl-room-count">แสดง {filteredRooms.length} ห้อง</span>
      </div>

      {/* Gantt Table */}
      <div className="timeline-table-wrap">
        <table className="timeline-table">
          <thead>
            <tr>
              <th className="tl-room-col">ห้อง</th>
              {dates.map(d => (
                <th
                  key={d}
                  className={`tl-date-col ${d === todayStr() ? 'tl-today' : ''}`}
                >
                  {formatShort(d)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredRooms.length === 0 ? (
              <tr>
                <td colSpan={dates.length + 1} style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
                  ไม่พบห้องที่ตรงกับการค้นหา
                </td>
              </tr>
            ) : (
              zonesToShow.map(zone => {
                const zoneRooms = filteredRooms.filter(r => r.zone === zone)
                if (zoneRooms.length === 0) return null
                return [
                  // Zone header row
                  <tr key={`zone-${zone}`} className="tl-zone-row">
                    <td colSpan={dates.length + 1}>{ZONE_LABELS[zone]}</td>
                  </tr>,
                  // Room rows
                  ...zoneRooms.map(room => (
                    <RoomRow
                      key={room.id}
                      room={room}
                      dates={dates}
                      onRoomClick={onRoomClick}
                    />
                  )),
                ]
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RoomRow({ room, dates, onRoomClick }) {
  const allBookings = room.bookings || []

  return (
    <tr className="tl-room-row">
      {/* ชื่อห้อง: คลิกเปิด modal ปกติ (ไม่ระบุวัน) */}
      <td
        className="tl-room-name"
        onClick={() => onRoomClick(room)}
        title={`คลิกเพื่อจัดการห้อง ${room.number}`}
      >
        {room.number}
      </td>
      {dates.map(date => {
        // Daily booking covering this date (exclude checkOut day)
        const dailyBooking = allBookings.find(b => {
          if (!b.checkIn || b.stayType === 'hourly') return false
          const checkOut = b.checkOut || b.checkIn
          return b.checkIn <= date && (b.checkOut ? date < checkOut : date <= checkOut)
        })

        // All hourly bookings on this exact date, sorted by checkInTime
        const hourlyBookings = allBookings
          .filter(b => b.stayType === 'hourly' && b.checkIn === date)
          .sort((a, b) => (a.checkInTime || '').localeCompare(b.checkInTime || ''))

        // ช่องว่าง: คลิกเพื่อจองพร้อมดึงวันที่เข้ามาเลย
        if (!dailyBooking && hourlyBookings.length === 0) {
          return (
            <td
              key={date}
              className="tl-cell tl-cell-empty tl-cell-clickable"
              onClick={() => onRoomClick(room, date)}
              title={`จองห้อง ${room.number} วันที่ ${date}`}
            >
              <div className="tl-empty" />
            </td>
          )
        }

        // ช่องที่มีการจอง: คลิกเปิด modal ปกติ
        return (
          <td
            key={date}
            className={`tl-cell${hourlyBookings.length > 0 ? ' tl-cell-multi' : ''}`}
            onClick={() => onRoomClick(room)}
          >
            {/* Daily booking block */}
            {dailyBooking && (() => {
              const isStart = dailyBooking.checkIn === date
              const color = STATUS_COLOR[dailyBooking.status]
              return (
                <div
                  className={`tl-booking ${isStart ? 'tl-booking-start' : 'tl-booking-mid'}`}
                  style={{ backgroundColor: color }}
                  title={`${dailyBooking.guestName} (${dailyBooking.status})`}
                >
                  {isStart && <span className="tl-booking-label">{dailyBooking.guestName}</span>}
                </div>
              )
            })()}
            {/* Hourly booking blocks — multiple per day */}
            {hourlyBookings.map(b => (
              <div
                key={b.id}
                className="tl-hourly-block"
                style={{ backgroundColor: HOURLY_COLOR[b.status] || '#8b5cf6' }}
                title={`${b.guestName}  ${b.checkInTime || ''}–${b.checkOutTime || ''}`}
              >
                <span className="tl-hourly-time">{b.checkInTime}</span>
                <span className="tl-hourly-name">{b.guestName}</span>
              </div>
            ))}
          </td>
        )
      })}
    </tr>
  )
}
