import { useState } from 'react'
import { STATUS, STATUS_LABEL, STATUS_COLOR } from '../data/roomData'

const today = () => new Date().toISOString().split('T')[0]

export default function BookingModal({ room, onClose, onUpdate }) {
  const [form, setForm] = useState({
    guestName: room.booking?.guestName || '',
    phone: room.booking?.phone || '',
    checkIn: room.booking?.checkIn || today(),
    checkOut: room.booking?.checkOut || '',
    adults: room.booking?.adults || 1,
    note: room.booking?.note || '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleBook = () => {
    if (!form.guestName.trim()) {
      alert('กรุณากรอกชื่อผู้เข้าพัก')
      return
    }
    if (!form.checkOut) {
      alert('กรุณาเลือกวันที่เช็คเอ้าท์')
      return
    }
    onUpdate(room.id, {
      status: STATUS.BOOKED,
      booking: { ...form },
    })
    onClose()
  }

  const handleCheckIn = () => {
    onUpdate(room.id, { status: STATUS.OCCUPIED })
    onClose()
  }

  const handleCheckOut = () => {
    onUpdate(room.id, {
      status: STATUS.CLEANING,
      booking: null,
    })
    onClose()
  }

  const handleCleaned = () => {
    onUpdate(room.id, { status: STATUS.AVAILABLE })
    onClose()
  }

  const handleCancel = () => {
    onUpdate(room.id, {
      status: STATUS.AVAILABLE,
      booking: null,
    })
    onClose()
  }

  const statusColor = STATUS_COLOR[room.status]
  const statusLabel = STATUS_LABEL[room.status]

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderTopColor: statusColor }}>
          <div className="modal-title-row">
            <h2>ห้อง {room.number}</h2>
            <span className="modal-status-badge" style={{ backgroundColor: statusColor }}>
              {statusLabel}
            </span>
          </div>
          <p className="modal-subtitle">{room.type}{room.building ? ` | ${room.building}` : ''}{room.floor ? ` ชั้น ${room.floor}` : ''}</p>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Available: show booking form */}
          {room.status === STATUS.AVAILABLE && (
            <div className="action-section">
              <h3>จองห้องพัก</h3>
              <div className="form-grid">
                <div className="form-group">
                  <label>ชื่อผู้เข้าพัก *</label>
                  <input
                    name="guestName"
                    value={form.guestName}
                    onChange={handleChange}
                    placeholder="ชื่อ - นามสกุล"
                  />
                </div>
                <div className="form-group">
                  <label>เบอร์โทรศัพท์</label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="0xx-xxx-xxxx"
                    type="tel"
                  />
                </div>
                <div className="form-group">
                  <label>วันที่เช็คอิน *</label>
                  <input
                    name="checkIn"
                    value={form.checkIn}
                    onChange={handleChange}
                    type="date"
                    min={today()}
                  />
                </div>
                <div className="form-group">
                  <label>วันที่เช็คเอ้าท์ *</label>
                  <input
                    name="checkOut"
                    value={form.checkOut}
                    onChange={handleChange}
                    type="date"
                    min={form.checkIn || today()}
                  />
                </div>
                <div className="form-group">
                  <label>จำนวนผู้เข้าพัก</label>
                  <input
                    name="adults"
                    value={form.adults}
                    onChange={handleChange}
                    type="number"
                    min={1}
                    max={10}
                  />
                </div>
                <div className="form-group full-width">
                  <label>หมายเหตุ</label>
                  <textarea
                    name="note"
                    value={form.note}
                    onChange={handleChange}
                    placeholder="หมายเหตุเพิ่มเติม..."
                    rows={2}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button className="btn-primary" onClick={handleBook}>
                  ✅ ยืนยันการจอง
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  ยกเลิก
                </button>
              </div>
            </div>
          )}

          {/* Booked: show booking info + check-in button */}
          {room.status === STATUS.BOOKED && room.booking && (
            <div className="action-section">
              <h3>ข้อมูลการจอง</h3>
              <div className="booking-info">
                <InfoRow label="ผู้เข้าพัก" value={room.booking.guestName} />
                <InfoRow label="โทรศัพท์" value={room.booking.phone || '-'} />
                <InfoRow label="เช็คอิน" value={formatDate(room.booking.checkIn)} />
                <InfoRow label="เช็คเอ้าท์" value={formatDate(room.booking.checkOut)} />
                <InfoRow label="จำนวนคน" value={`${room.booking.adults} คน`} />
                {room.booking.note && <InfoRow label="หมายเหตุ" value={room.booking.note} />}
              </div>
              <div className="modal-actions">
                <button className="btn-success" onClick={handleCheckIn}>
                  🔑 เช็คอิน (เข้าพัก)
                </button>
                <button className="btn-danger" onClick={handleCancel}>
                  ❌ ยกเลิกการจอง
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  ปิด
                </button>
              </div>
            </div>
          )}

          {/* Occupied: show guest info + check-out button */}
          {room.status === STATUS.OCCUPIED && (
            <div className="action-section">
              <h3>กำลังเข้าพัก</h3>
              {room.booking && (
                <div className="booking-info">
                  <InfoRow label="ผู้เข้าพัก" value={room.booking.guestName} />
                  <InfoRow label="โทรศัพท์" value={room.booking.phone || '-'} />
                  <InfoRow label="เช็คอิน" value={formatDate(room.booking.checkIn)} />
                  <InfoRow label="เช็คเอ้าท์" value={formatDate(room.booking.checkOut)} />
                  <InfoRow label="จำนวนคน" value={`${room.booking.adults} คน`} />
                </div>
              )}
              <div className="modal-actions">
                <button className="btn-warning" onClick={handleCheckOut}>
                  🚪 เช็คเอ้าท์
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  ปิด
                </button>
              </div>
            </div>
          )}

          {/* Cleaning: show clean done button */}
          {room.status === STATUS.CLEANING && (
            <div className="action-section">
              <h3>กำลังทำความสะอาด</h3>
              <p className="cleaning-msg">ห้องนี้อยู่ระหว่างการทำความสะอาด กรุณารอสักครู่</p>
              <div className="modal-actions">
                <button className="btn-primary" onClick={handleCleaned}>
                  ✨ ทำความสะอาดเสร็จแล้ว (พร้อมจอง)
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  ปิด
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
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

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}
