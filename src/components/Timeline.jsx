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

export default function Timeline({ rooms, onRoomClick }) {
  const [startDate, setStartDate] = useState(todayStr)
  const [days, setDays] = useState(7)

  const dates = useMemo(() => {
    const arr = []
    for (let i = 0; i < days; i++) arr.push(addDays(startDate, i))
    return arr
  }, [startDate, days])

  const goBack = () => setStartDate(prev => addDays(prev, -days))
  const goFwd  = () => setStartDate(prev => addDays(prev, days))
  const goToday = () => setStartDate(todayStr())

  const zones = [ZONES.RESORT, ZONES.BUILDING_A, ZONES.BUILDING_B]

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
            {zones.map(zone => {
              const zoneRooms = rooms.filter(r => r.zone === zone)
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function RoomRow({ room, dates, onRoomClick }) {
  const allBookings = room.bookings || []

  return (
    <tr className="tl-room-row" onClick={() => onRoomClick(room)} title={`คลิกเพื่อจัดการห้อง ${room.number}`}>
      <td className="tl-room-name">{room.number}</td>
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

        if (!dailyBooking && hourlyBookings.length === 0) {
          return (
            <td key={date} className="tl-cell tl-cell-empty">
              <div className="tl-empty" />
            </td>
          )
        }

        return (
          <td key={date} className={`tl-cell${hourlyBookings.length > 0 ? ' tl-cell-multi' : ''}`}>
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
