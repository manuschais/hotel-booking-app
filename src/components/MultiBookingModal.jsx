import { useState } from 'react'
import { STAY_TYPE } from '../data/roomData'
import { PROVINCES } from '../data/provinces'
import { todayLocal, addDaysLocal } from '../utils/date'

const addDays = addDaysLocal

function diffDays(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 1
  const a = new Date(checkIn + 'T00:00:00')
  const b = new Date(checkOut + 'T00:00:00')
  const diff = Math.round((b - a) / 86400000)
  return diff > 0 ? diff : 1
}

function getHourlyDefaults() {
  const h = new Date().getHours()
  const pad = n => String(n).padStart(2, '0')
  return { checkInTime: `${pad(h)}:00`, checkOutTime: `${pad((h + 2) % 24)}:00` }
}

function getDefaultForm() {
  const today = todayLocal()
  return {
    guestName: '', phone: '',
    checkIn: today, checkOut: addDays(today, 1), nights: 1,
    checkInTime: '13:00', checkOutTime: '12:00',
    adults: 1, note: '', carPlate: '', carProvince: '',
    stayType: STAY_TYPE.DAILY,
  }
}

export default function MultiBookingModal({ rooms, currentUser, onClose, onBook }) {
  const [form, setForm] = useState(getDefaultForm)
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name === 'stayType') {
      const timeDefaults = value === STAY_TYPE.HOURLY
        ? getHourlyDefaults()
        : { checkInTime: '13:00', checkOutTime: '12:00' }
      const checkOutUpdate = value === STAY_TYPE.HOURLY
        ? { checkOut: null }
        : { checkOut: addDays(form.checkIn, form.nights || 1) }
      setForm(prev => ({ ...prev, stayType: value, ...timeDefaults, ...checkOutUpdate }))
      return
    }
    if (name === 'checkIn' && form.stayType === STAY_TYPE.DAILY) {
      setForm(prev => ({ ...prev, checkIn: value, checkOut: addDays(value, prev.nights || 1) }))
      return
    }
    if (name === 'nights') {
      const n = Math.max(1, parseInt(value) || 1)
      setForm(prev => ({ ...prev, nights: n, checkOut: addDays(prev.checkIn, n) }))
      return
    }
    if (name === 'checkOut' && form.stayType === STAY_TYPE.DAILY) {
      setForm(prev => ({ ...prev, checkOut: value, nights: diffDays(prev.checkIn, value) }))
      return
    }
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async () => {
    if (!form.guestName.trim()) { alert('กรุณากรอกชื่อผู้เข้าพัก'); return }
    if (form.stayType === STAY_TYPE.DAILY && !form.checkOut) {
      alert('กรุณาเลือกวันที่เช็คเอ้าท์'); return
    }
    if (form.stayType === STAY_TYPE.HOURLY && !form.checkOutTime) {
      alert('กรุณาระบุเวลาเช็คเอ้าท์'); return
    }

    setLoading(true)
    try {
      const bookingData = {
        ...form,
        ...(form.stayType === STAY_TYPE.DAILY
          ? { checkInTime: '13:00', checkOutTime: '12:00' }
          : { checkOut: null }),
      }
      await onBook(bookingData)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header" style={{ borderTopColor: '#2563eb' }}>
          <div className="modal-title-row">
            <h2>🏠+ จอง {rooms.length} ห้องพร้อมกัน</h2>
          </div>
          <p className="modal-subtitle">ข้อมูลเดียวกันทุกห้อง</p>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* ห้องที่เลือก */}
          <div className="multi-room-chips">
            {rooms.map(r => (
              <span key={r.id} className="multi-room-chip">{r.number}</span>
            ))}
          </div>

          {/* Form */}
          <div className="action-section">
            <h3 className="section-label">ข้อมูลการจอง</h3>
            <div className="form-grid">

              {/* Stay type */}
              <div className="form-group full-width">
                <label>ประเภทการพัก</label>
                <div className="stay-type-toggle">
                  <label className={`stay-option ${form.stayType === STAY_TYPE.DAILY ? 'active' : ''}`}>
                    <input type="radio" name="stayType" value={STAY_TYPE.DAILY} checked={form.stayType === STAY_TYPE.DAILY} onChange={handleChange} />
                    🌙 รายคืน
                  </label>
                  <label className={`stay-option ${form.stayType === STAY_TYPE.HOURLY ? 'active' : ''}`}>
                    <input type="radio" name="stayType" value={STAY_TYPE.HOURLY} checked={form.stayType === STAY_TYPE.HOURLY} onChange={handleChange} />
                    ⏱ รายชั่วโมง
                  </label>
                </div>
              </div>

              <div className="form-group">
                <label>ชื่อผู้เข้าพัก *</label>
                <input name="guestName" value={form.guestName} onChange={handleChange} placeholder="ชื่อ - นามสกุล / ชื่อกลุ่ม" />
              </div>
              <div className="form-group">
                <label>เบอร์โทรศัพท์</label>
                <input name="phone" value={form.phone} onChange={handleChange} placeholder="0xx-xxx-xxxx" type="tel" />
              </div>

              {form.stayType === STAY_TYPE.DAILY ? (
                <>
                  <div className="form-group">
                    <label>วันที่เช็คอิน *</label>
                    <input name="checkIn" value={form.checkIn} onChange={handleChange} type="date" />
                  </div>
                  <div className="form-group">
                    <label>จำนวนคืน</label>
                    <input name="nights" value={form.nights || 1} onChange={handleChange} type="number" min={1} max={365} />
                  </div>
                  <div className="form-group">
                    <label>วันที่เช็คเอ้าท์ *</label>
                    <input name="checkOut" value={form.checkOut || ''} onChange={handleChange} type="date" min={form.checkIn} />
                  </div>
                </>
              ) : (
                <>
                  <div className="form-group">
                    <label>วันที่ *</label>
                    <input name="checkIn" value={form.checkIn} onChange={handleChange} type="date" />
                  </div>
                  <div className="form-group" style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <label>เวลาเข้าพัก *</label>
                      <input name="checkInTime" value={form.checkInTime} onChange={handleChange} type="time" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <label>เวลาออก *</label>
                      <input name="checkOutTime" value={form.checkOutTime} onChange={handleChange} type="time" />
                    </div>
                  </div>
                </>
              )}

              <div className="form-group">
                <label>จำนวนผู้เข้าพัก (ต่อห้อง)</label>
                <input name="adults" value={form.adults} onChange={handleChange} type="number" min={1} max={20} />
              </div>
              <div className="form-group">
                <label>ทะเบียนรถ</label>
                <input name="carPlate" value={form.carPlate} onChange={handleChange} placeholder="เช่น กข 1234" />
              </div>
              <div className="form-group full-width">
                <label>จังหวัด (ทะเบียนรถ)</label>
                <select name="carProvince" value={form.carProvince} onChange={handleChange}>
                  <option value="">— เลือกจังหวัด —</option>
                  {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="form-group full-width">
                <label>หมายเหตุ</label>
                <textarea name="note" value={form.note} onChange={handleChange} placeholder="หมายเหตุเพิ่มเติม..." rows={2} />
              </div>
            </div>

            <div className="modal-actions" style={{ marginTop: 16 }}>
              <button className="btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? '⏳ กำลังบันทึก...' : `✅ ยืนยันจอง ${rooms.length} ห้อง`}
              </button>
              <button className="btn-secondary" onClick={onClose} disabled={loading}>ยกเลิก</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
