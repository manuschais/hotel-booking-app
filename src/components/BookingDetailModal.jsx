import { useState } from 'react'
import { STATUS, STATUS_LABEL, STATUS_COLOR, STAY_TYPE } from '../data/roomData'
import { canEdit, canCancel } from '../data/users'
import { PROVINCES } from '../data/provinces'
import { addDaysLocal } from '../utils/date'
import BookingSlip from './BookingSlip'

const addDays = addDaysLocal

function diffDays(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1
  const a = new Date(checkIn + 'T00:00:00')
  const b = new Date(checkOut + 'T00:00:00')
  const diff = Math.round((b - a) / 86400000)
  return diff > 0 ? diff : 1
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}

// เลขที่จอง รูปแบบ YYMMRRRR เช่น 26030001
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

export default function BookingDetailModal({
  booking, currentUser, onClose,
  onEdit, onDelete,
  onCheckIn, onCheckOut, onCancel, onExtend, onNoShow,
}) {
  const [editMode, setEditMode] = useState(false)
  const [showSlip, setShowSlip] = useState(false)
  const [form, setForm] = useState({
    ...booking,
    nights: diffDays(booking.checkIn, booking.checkOut),
  })

  const editable = canEdit(currentUser)
  const isAdmin  = canCancel(currentUser)

  const isBooked   = booking.status === STATUS.BOOKED
  const isOccupied = booking.status === STATUS.OCCUPIED
  const isActive   = isBooked || isOccupied
  const isHourly   = booking.stayType === STAY_TYPE.HOURLY

  const canCancelThis = isAdmin ||
    (currentUser && booking.bookedBy === currentUser.displayName)

  const handleCheckIn = () => {
    if (!confirm(`ยืนยันเช็คอิน "${booking.guestName}"?`)) return
    onCheckIn(booking.id)
    onClose()
  }

  const handleCheckOut = () => {
    if (!confirm(`ยืนยันเช็คเอ้าท์ "${booking.guestName}"?`)) return
    onCheckOut(booking.id, booking.roomId)
    onClose()
  }

  const handleExtend = () => {
    if (isHourly) {
      const [h, m] = (booking.checkOutTime || '12:00').split(':').map(Number)
      const newH = (h + 1) % 24
      const newTime = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      onExtend(booking.id, { checkOutTime: newTime })
    } else {
      const newCheckOut = addDays(booking.checkOut || booking.checkIn, 1)
      onExtend(booking.id, { checkOut: newCheckOut })
    }
    onClose()
  }

  const handleCancelBooking = () => {
    if (!confirm(`ยืนยันยกเลิกการจองของ "${booking.guestName}"?`)) return
    onCancel(booking.id)
    onClose()
  }

  const handleNoShow = () => {
    if (!confirm(`บันทึก "${booking.guestName}" เป็น "ไม่มาตามกำหนด"?`)) return
    onNoShow(booking.id)
    onClose()
  }

  const statusColor = STATUS_COLOR[booking.status] || '#9ca3af'

  const roomLabel = booking.room
    ? `${booking.room.number}${booking.room.zone ? ` — ${zoneLabel(booking.room.zone)}` : ''}`
    : (booking.roomId || '-')

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'checkIn') {
      setForm(prev => ({ ...prev, checkIn: value, checkOut: addDays(value, prev.nights || 1) }))
      return
    }
    if (name === 'nights') {
      const n = Math.max(1, parseInt(value) || 1)
      setForm(prev => ({ ...prev, nights: n, checkOut: addDays(prev.checkIn, n) }))
      return
    }
    if (name === 'checkOut') {
      setForm(prev => ({ ...prev, checkOut: value, nights: diffDays(prev.checkIn, value) }))
      return
    }
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    onEdit(booking.id, {
      guestName:    form.guestName,
      phone:        form.phone,
      note:         form.note,
      carPlate:     form.carPlate,
      carProvince:  form.carProvince,
      checkIn:      form.checkIn,
      checkOut:     isHourly ? null : form.checkOut,
      checkInTime:  isHourly ? form.checkInTime : undefined,
      checkOutTime: isHourly ? form.checkOutTime : undefined,
    })
    setEditMode(false)
  }

  const handleDelete = () => {
    if (!confirm(
      `ยืนยันลบการจอง #${bookingRef(booking)} ของ "${booking.guestName}" ออกจากระบบ?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้`
    )) return
    onDelete(booking.id)
    onClose()
  }

  return (
    <>
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header" style={{ borderTopColor: statusColor }}>
          <div className="modal-title-row">
            <h2>#{bookingRef(booking)}</h2>
            <span className="modal-status-badge" style={{ backgroundColor: statusColor }}>
              {STATUS_LABEL[booking.status] || booking.status}
            </span>
          </div>
          <p className="modal-subtitle">ห้อง {roomLabel}</p>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="action-section">

            <div className="section-header-row">
              <h3 className="section-label">ข้อมูลการจอง</h3>
              {editable && !editMode && (
                <button className="btn-edit-inline" onClick={() => setEditMode(true)}>✏️ แก้ไข</button>
              )}
              {editable && editMode && (
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn-save-inline" onClick={handleSave}>💾 บันทึก</button>
                  <button className="btn-edit-inline" onClick={() => setEditMode(false)}>ยกเลิก</button>
                </div>
              )}
            </div>

            {editMode ? (
              <div className="form-grid">
                <div className="form-group">
                  <label>ชื่อผู้เข้าพัก *</label>
                  <input name="guestName" value={form.guestName || ''} onChange={handleChange} />
                </div>
                <div className="form-group">
                  <label>เบอร์โทรศัพท์</label>
                  <input name="phone" value={form.phone || ''} onChange={handleChange} type="tel" />
                </div>
                {booking.stayType === STAY_TYPE.HOURLY ? (
                  <>
                    <div className="form-group">
                      <label>วันที่</label>
                      <input name="checkIn" value={form.checkIn || ''} onChange={handleChange} type="date" />
                    </div>
                    <div className="form-group">
                      <label>เวลาเข้า</label>
                      <input name="checkInTime" value={form.checkInTime || ''} onChange={handleChange} type="time" />
                    </div>
                    <div className="form-group">
                      <label>เวลาออก</label>
                      <input name="checkOutTime" value={form.checkOutTime || ''} onChange={handleChange} type="time" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-group">
                      <label>วันเช็คอิน</label>
                      <input name="checkIn" value={form.checkIn || ''} onChange={handleChange} type="date" />
                    </div>
                    <div className="form-group">
                      <label>จำนวนคืน</label>
                      <input name="nights" value={form.nights || 1} onChange={handleChange} type="number" min={1} />
                    </div>
                    <div className="form-group">
                      <label>วันเช็คเอ้าท์</label>
                      <input name="checkOut" value={form.checkOut || ''} onChange={handleChange} type="date" min={form.checkIn} />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label>ทะเบียนรถ</label>
                  <input name="carPlate" value={form.carPlate || ''} onChange={handleChange} placeholder="เช่น กข 1234" />
                </div>
                <div className="form-group">
                  <label>จังหวัด</label>
                  <select name="carProvince" value={form.carProvince || ''} onChange={handleChange}>
                    <option value="">— เลือกจังหวัด —</option>
                    {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group full-width">
                  <label>หมายเหตุ</label>
                  <textarea name="note" value={form.note || ''} onChange={handleChange} rows={2} />
                </div>
              </div>
            ) : (
              <div className="booking-info">
                <InfoRow label="ชื่อผู้เข้าพัก" value={booking.guestName || '-'} />
                <InfoRow label="โทรศัพท์"       value={booking.phone || '-'} />
                <InfoRow label="ประเภท"          value={booking.stayType === STAY_TYPE.HOURLY ? '⏱ รายชั่วโมง' : '🌙 รายคืน'} />
                {booking.stayType === STAY_TYPE.DAILY ? (
                  <>
                    <InfoRow label="เช็คอิน"    value={`${formatDate(booking.checkIn)}${booking.checkInTime ? ` เวลา ${booking.checkInTime} น.` : ''}`} />
                    <InfoRow label="เช็คเอ้าท์" value={`${formatDate(booking.checkOut)}${booking.checkOutTime ? ` เวลา ${booking.checkOutTime} น.` : ''}`} />
                    <InfoRow label="จำนวนคืน"   value={`${diffDays(booking.checkIn, booking.checkOut)} คืน`} />
                  </>
                ) : (
                  <>
                    <InfoRow label="วันที่"   value={formatDate(booking.checkIn)} />
                    <InfoRow label="เวลาเข้า" value={booking.checkInTime || '-'} />
                    <InfoRow label="เวลาออก"  value={booking.checkOutTime || '-'} />
                  </>
                )}
                {booking.adults && <InfoRow label="จำนวนคน" value={`${booking.adults} คน`} />}
                {booking.carPlate && (
                  <InfoRow label="ทะเบียนรถ" value={`${booking.carPlate}${booking.carProvince ? ` (${booking.carProvince})` : ''}`} />
                )}
                {booking.note && <InfoRow label="หมายเหตุ" value={booking.note} />}
                {booking.bookedBy && <InfoRow label="ผู้รับจอง" value={booking.bookedBy} />}
              </div>
            )}

            {/* ===== Actions ตามสถานะ booking ===== */}
            {isActive && editable && !editMode && (
              <div className="modal-actions" style={{ marginTop: 16 }}>
                {isBooked && onCheckIn && (
                  <button className="btn-success" onClick={handleCheckIn}>🔑 เช็คอิน (เข้าพัก)</button>
                )}
                {isOccupied && onCheckOut && (
                  <button className="btn-warning" onClick={handleCheckOut}>🚪 เช็คเอ้าท์</button>
                )}
                {isOccupied && onExtend && (
                  <button className="btn-extend" onClick={handleExtend}>
                    {isHourly ? '⏱ ต่ออีก 1 ชั่วโมง' : '📅 ต่ออีก 1 คืน'}
                  </button>
                )}
                {isBooked && canCancelThis && onNoShow && (
                  <button className="btn-noshow-sm" style={{ padding: '6px 12px', fontSize: '0.82rem' }} onClick={handleNoShow}>🚫 ไม่มา</button>
                )}
                {canCancelThis && onCancel && (
                  <button className="btn-danger" onClick={handleCancelBooking}>❌ ยกเลิกการจอง</button>
                )}
              </div>
            )}

            <div className="modal-actions" style={{ marginTop: isActive && editable ? 8 : 16 }}>
              {isAdmin && !editMode && (
                <button className="btn-danger" onClick={handleDelete}>🗑️ ลบรายการนี้</button>
              )}
              {!editMode && (
                <button className="btn-slip-sm" onClick={() => setShowSlip(true)}>🖨️ ใบจอง</button>
              )}
              <button className="btn-secondary" onClick={onClose}>ปิด</button>
            </div>

          </div>
        </div>
      </div>
    </div>

    {showSlip && (
      <BookingSlip booking={booking} onClose={() => setShowSlip(false)} />
    )}
  </>
  )
}

function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="info-label">{label}</span>
      <span className="info-value">{value}</span>
    </div>
  )
}
