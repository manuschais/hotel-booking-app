import { useRef } from 'react'
import { STATUS_LABEL, STAY_TYPE } from '../data/roomData'
import { todayLocal } from '../utils/date'

function diffDays(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1
  const a = new Date(checkIn + 'T00:00:00')
  const b = new Date(checkOut + 'T00:00:00')
  const diff = Math.round((b - a) / 86400000)
  return diff > 0 ? diff : 1
}

function formatDateThai(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

function formatDateShort(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { year: '2-digit', month: 'short', day: 'numeric' })
}

function bookingRef(booking) {
  if (!booking) return '?'
  if (booking.bookingNumber) {
    const d = new Date((booking.checkIn || '') + 'T00:00:00')
    const yy = isNaN(d.getTime()) ? '??' : String(d.getFullYear()).slice(-2)
    const mm = isNaN(d.getTime()) ? '??' : String(d.getMonth() + 1).padStart(2, '0')
    const run = String(booking.bookingNumber).padStart(4, '0')
    return `${yy}${mm}${run}`
  }
  const parts = (booking.id || '').split('_')
  return parts[parts.length - 1].toUpperCase()
}

function zoneLabel(zone) {
  if (zone === 'resort')     return 'รีสอร์ท'
  if (zone === 'building_a') return 'ตึก A'
  if (zone === 'building_b') return 'ตึก B'
  return zone || ''
}

export default function BookingSlip({ booking, onClose }) {
  const slipRef = useRef(null)

  const isHourly = booking.stayType === STAY_TYPE.HOURLY
  const nights   = isHourly ? null : diffDays(booking.checkIn, booking.checkOut)
  const roomLabel = booking.room
    ? `${booking.room.number}${booking.room.zone ? ` (${zoneLabel(booking.room.zone)})` : ''}`
    : (booking.roomId || '-')
  const printedAt = formatDateThai(todayLocal())

  const handlePrint = () => {
    window.print()
  }

  const handleSaveImage = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(slipRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })
      const link = document.createElement('a')
      link.download = `ใบจอง-${bookingRef(booking)}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch (err) {
      console.error('html2canvas error:', err)
      alert('บันทึกรูปไม่สำเร็จ กรุณาลองใหม่')
    }
  }

  return (
    <div className="slip-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="slip-modal" onMouseDown={e => e.stopPropagation()}>

        {/* Action bar (ซ่อนตอนพิมพ์) */}
        <div className="slip-actions no-print">
          <button className="btn-slip-print" onClick={handlePrint}>🖨️ พิมพ์</button>
          <button className="btn-slip-save"  onClick={handleSaveImage}>📸 บันทึกรูป</button>
          <button className="btn-secondary"  onClick={onClose}>✕ ปิด</button>
        </div>

        {/* กระดาษ A5 */}
        <div className="booking-slip-paper" ref={slipRef}>

          {/* Header */}
          <div className="slip-header">
            <div className="slip-logo">🏨</div>
            <div className="slip-hotel-name">รีสอร์ท</div>
            <div className="slip-hotel-sub">ใบยืนยันการจองห้องพัก</div>
          </div>

          {/* Ref + Status */}
          <div className="slip-ref-row">
            <div className="slip-ref-box">
              <span className="slip-ref-label">เลขที่จอง</span>
              <span className="slip-ref-number">#{bookingRef(booking)}</span>
            </div>
            <div className="slip-status-badge" data-status={booking.status}>
              {STATUS_LABEL[booking.status] || booking.status}
            </div>
          </div>

          <div className="slip-divider" />

          {/* Room */}
          <div className="slip-section">
            <div className="slip-room-big">ห้อง {roomLabel}</div>
            <div className="slip-stay-type">
              {isHourly ? '⏱ รายชั่วโมง' : '🌙 รายคืน'}
            </div>
          </div>

          <div className="slip-divider" />

          {/* Dates */}
          <div className="slip-dates">
            {isHourly ? (
              <>
                <SlipDateBox label="วันที่" date={formatDateThai(booking.checkIn)} sub={null} />
                <div className="slip-dates-sep">→</div>
                <SlipDateBox label="เวลาเข้า" date={booking.checkInTime || '-'} sub={null} isTime />
                <div className="slip-dates-sep">→</div>
                <SlipDateBox label="เวลาออก" date={booking.checkOutTime || '-'} sub={null} isTime />
              </>
            ) : (
              <>
                <SlipDateBox label="เช็คอิน"    date={formatDateShort(booking.checkIn)}  sub={booking.checkInTime  ? `เวลา ${booking.checkInTime} น.`  : 'เวลา 13:00 น.'} />
                <div className="slip-dates-sep">→</div>
                <SlipDateBox label="เช็คเอ้าท์" date={formatDateShort(booking.checkOut)} sub={booking.checkOutTime ? `เวลา ${booking.checkOutTime} น.` : 'เวลา 12:00 น.'} />
                <div className="slip-dates-nights">{nights} คืน</div>
              </>
            )}
          </div>

          <div className="slip-divider" />

          {/* Guest info */}
          <div className="slip-info-grid">
            <SlipInfoRow label="ชื่อผู้เข้าพัก" value={booking.guestName || '-'} highlight />
            {booking.phone     && <SlipInfoRow label="โทรศัพท์"  value={booking.phone} />}
            {booking.adults    && <SlipInfoRow label="จำนวนคน"   value={`${booking.adults} คน`} />}
            {booking.carPlate  && (
              <SlipInfoRow
                label="ทะเบียนรถ"
                value={`${booking.carPlate}${booking.carProvince ? ` (${booking.carProvince})` : ''}`}
              />
            )}
            {booking.note      && <SlipInfoRow label="หมายเหตุ"  value={booking.note} />}
          </div>

          {/* Footer */}
          <div className="slip-footer">
            <div className="slip-footer-left">
              {booking.bookedBy && <span>ผู้รับจอง: {booking.bookedBy}</span>}
            </div>
            <div className="slip-footer-right">
              <span>พิมพ์: {printedAt}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function SlipDateBox({ label, date, sub, isTime }) {
  return (
    <div className={`slip-date-box${isTime ? ' slip-date-time' : ''}`}>
      <div className="slip-date-label">{label}</div>
      <div className="slip-date-val">{date}</div>
      {sub && <div className="slip-date-sub">{sub}</div>}
    </div>
  )
}

function SlipInfoRow({ label, value, highlight }) {
  return (
    <div className={`slip-info-row${highlight ? ' slip-info-highlight' : ''}`}>
      <span className="slip-info-label">{label}</span>
      <span className="slip-info-value">{value}</span>
    </div>
  )
}
