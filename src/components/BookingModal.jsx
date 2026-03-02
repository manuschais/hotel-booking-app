import { useState } from 'react'
import { STATUS, STATUS_LABEL, STATUS_COLOR, HOURLY_COLOR, STAY_TYPE, getActiveBooking } from '../data/roomData'
import { canEdit, canCancel } from '../data/users'
import { PROVINCES } from '../data/provinces'
import { todayLocal, addDaysLocal } from '../utils/date'

const addDays  = addDaysLocal
const todayStr = todayLocal

// คำนวณจำนวนคืนจาก checkIn → checkOut
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
  return {
    checkInTime:  `${pad(h)}:00`,
    checkOutTime: `${pad((h + 2) % 24)}:00`,
  }
}

// ใช้ function แทน const เพื่อให้คำนวณวันที่ใหม่ทุกครั้งที่เปิด modal
function getDefaultForm() {
  const today = todayStr()
  return {
    guestName: '',
    phone: '',
    checkIn: today,
    checkOut: addDays(today, 1),
    nights: 1,
    checkInTime: '13:00',
    checkOutTime: '12:00',
    adults: 1,
    note: '',
    carPlate: '',
    carProvince: '',
    stayType: STAY_TYPE.DAILY,
  }
}

// ตรวจสอบการจองทับซ้อน
function findOverlap(existingBookings, newCheckIn, newCheckOut, newStayType, newCheckInTime, newCheckOutTime, excludeId = null) {
  const active = existingBookings.filter(b =>
    b.id !== excludeId &&
    (b.status === STATUS.BOOKED || b.status === STATUS.OCCUPIED)
  )
  for (const b of active) {
    if (newStayType === STAY_TYPE.DAILY && b.stayType === STAY_TYPE.DAILY) {
      // ทับซ้อนเมื่อ newCheckIn < b.checkOut AND newCheckOut > b.checkIn
      if (newCheckIn < b.checkOut && newCheckOut > b.checkIn) return b
    } else if (newStayType === STAY_TYPE.HOURLY && b.stayType === STAY_TYPE.HOURLY) {
      // วันเดียวกัน + ช่วงเวลาทับ
      if (newCheckIn === b.checkIn && newCheckInTime < b.checkOutTime && newCheckOutTime > b.checkInTime) return b
    } else if (newStayType === STAY_TYPE.DAILY && b.stayType === STAY_TYPE.HOURLY) {
      if (newCheckIn <= b.checkIn && newCheckOut > b.checkIn) return b
    } else if (newStayType === STAY_TYPE.HOURLY && b.stayType === STAY_TYPE.DAILY) {
      if (b.checkIn <= newCheckIn && newCheckIn < b.checkOut) return b
    }
  }
  return null
}

export default function BookingModal({
  room, currentUser, onClose,
  onBook, onCheckIn, onCheckOut, onCancel, onEdit, onExtend, onCleaned,
}) {
  const activeBooking = getActiveBooking(room)

  // pre-fill form ด้วย activeBooking เฉพาะเมื่อห้องเป็น BOOKED/OCCUPIED จริง
  // ถ้าห้องเป็น AVAILABLE (แม้มีการจองล่วงหน้า) ให้ใช้ default form เปล่าๆ
  const isRoomActive = room.status === STATUS.BOOKED
    || room.status === STATUS.OCCUPIED
    || room.status === STATUS.LATE_CHECKOUT

  const [form, setForm] = useState(() => ({
    ...getDefaultForm(),
    ...(activeBooking && isRoomActive ? {
      ...activeBooking,
      nights: diffDays(activeBooking.checkIn, activeBooking.checkOut),
    } : {}),
  }))
  const [editMode, setEditMode] = useState(false)
  const [editingPendingId, setEditingPendingId] = useState(null)
  const [pendingEditForm, setPendingEditForm]   = useState({})

  // form แยกสำหรับ "เพิ่มการจองต่อเนื่อง" — เริ่มที่ checkOut ของแขกปัจจุบัน
  const [contForm, setContForm] = useState(() => {
    const nextIn = activeBooking?.checkOut || todayStr()
    return { ...getDefaultForm(), checkIn: nextIn, checkOut: addDays(nextIn, 1), nights: 1 }
  })

  const editable = canEdit(currentUser)
  const isAdmin  = canCancel(currentUser)

  // ยกเลิกได้: Admin หรือ คนที่จองไว้
  const canCancelThis = isAdmin ||
    (currentUser && activeBooking?.bookedBy === currentUser.displayName)

  // ===== handlers สำหรับ pending bookings =====
  const handleEditPending = (booking) => {
    setEditingPendingId(booking.id)
    setPendingEditForm({ ...booking, nights: diffDays(booking.checkIn, booking.checkOut) })
  }

  const handlePendingChange = (e) => {
    const { name, value } = e.target
    if (name === 'checkIn') {
      const newCheckOut = addDays(value, pendingEditForm.nights || 1)
      setPendingEditForm(prev => ({ ...prev, checkIn: value, checkOut: newCheckOut }))
      return
    }
    if (name === 'nights') {
      const n = Math.max(1, parseInt(value) || 1)
      setPendingEditForm(prev => ({ ...prev, nights: n, checkOut: addDays(prev.checkIn, n) }))
      return
    }
    if (name === 'checkOut') {
      setPendingEditForm(prev => ({ ...prev, checkOut: value, nights: diffDays(prev.checkIn, value) }))
      return
    }
    setPendingEditForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSavePendingEdit = () => {
    // ตรวจ overlap (ยกเว้นตัวเอง)
    const conflict = findOverlap(
      room.bookings || [],
      pendingEditForm.checkIn, pendingEditForm.checkOut,
      pendingEditForm.stayType, pendingEditForm.checkInTime, pendingEditForm.checkOutTime,
      editingPendingId,
    )
    if (conflict) {
      alert(`❌ มีการจองทับซ้อน!\nมีการจองของ "${conflict.guestName}" ในช่วงวันที่นั้นอยู่แล้ว`)
      return
    }
    onEdit(editingPendingId, {
      guestName:   pendingEditForm.guestName,
      phone:       pendingEditForm.phone,
      carPlate:    pendingEditForm.carPlate,
      carProvince: pendingEditForm.carProvince,
      note:        pendingEditForm.note,
      checkIn:     pendingEditForm.checkIn,
      checkOut:    pendingEditForm.checkOut,
    })
    setEditingPendingId(null)
  }

  const handleCancelPending = (booking) => {
    if (!confirm(`ยืนยันยกเลิกการจองของ "${booking.guestName}"?`)) return
    onCancel(booking.id)
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (name === 'stayType') {
      const timeDefaults = value === STAY_TYPE.HOURLY
        ? getHourlyDefaults()
        : { checkInTime: '13:00', checkOutTime: '12:00' }
      setForm(prev => ({ ...prev, stayType: value, ...timeDefaults }))
      return
    }

    if (name === 'checkIn' && form.stayType === STAY_TYPE.DAILY) {
      // checkIn เปลี่ยน → คำนวณ checkOut ใหม่จากจำนวนคืน
      const newCheckOut = addDays(value, form.nights || 1)
      setForm(prev => ({ ...prev, checkIn: value, checkOut: newCheckOut }))
      return
    }

    if (name === 'nights') {
      const n = Math.max(1, parseInt(value) || 1)
      const newCheckOut = addDays(form.checkIn, n)
      setForm(prev => ({ ...prev, nights: n, checkOut: newCheckOut }))
      return
    }

    if (name === 'checkOut' && form.stayType === STAY_TYPE.DAILY) {
      // checkOut เปลี่ยนมือ → ซิงค์จำนวนคืน
      const n = diffDays(form.checkIn, value)
      setForm(prev => ({ ...prev, checkOut: value, nights: n }))
      return
    }

    setForm(prev => ({ ...prev, [name]: value }))
  }

  // ===== เพิ่ม Booking (จากห้องว่าง) =====
  const handleBook = () => {
    if (!form.guestName.trim()) { alert('กรุณากรอกชื่อผู้เข้าพัก'); return }
    if (form.stayType === STAY_TYPE.DAILY && !form.checkOut) {
      alert('กรุณาเลือกวันที่เช็คเอ้าท์'); return
    }
    if (form.stayType === STAY_TYPE.HOURLY && !form.checkOutTime) {
      alert('กรุณาระบุเวลาเช็คเอ้าท์'); return
    }

    // ตรวจสอบการจองทับซ้อน
    const conflict = findOverlap(
      room.bookings || [],
      form.checkIn, form.checkOut,
      form.stayType, form.checkInTime, form.checkOutTime,
    )
    if (conflict) {
      alert(`❌ มีการจองทับซ้อน!\n\nห้องนี้มีการจองของ "${conflict.guestName}" อยู่แล้ว\nในช่วงวันที่ ${conflict.checkIn} — ${conflict.checkOut || conflict.checkIn}\n\nกรุณายกเลิกการจองเดิมก่อน หรือเลือกวันอื่น`)
      return
    }

    const bookingData = {
      ...form,
      ...(form.stayType === STAY_TYPE.DAILY ? { checkInTime: '13:00', checkOutTime: '12:00' } : {}),
    }
    onBook(bookingData)
    onClose()
  }

  // ===== handler สำหรับ contForm (จองต่อเนื่อง) =====
  const handleContChange = (e) => {
    const { name, value } = e.target
    if (name === 'stayType') {
      const timeDefaults = value === STAY_TYPE.HOURLY ? getHourlyDefaults() : { checkInTime: '13:00', checkOutTime: '12:00' }
      setContForm(prev => ({ ...prev, stayType: value, ...timeDefaults }))
      return
    }
    if (name === 'checkIn' && contForm.stayType === STAY_TYPE.DAILY) {
      setContForm(prev => ({ ...prev, checkIn: value, checkOut: addDays(value, prev.nights || 1) }))
      return
    }
    if (name === 'nights') {
      const n = Math.max(1, parseInt(value) || 1)
      setContForm(prev => ({ ...prev, nights: n, checkOut: addDays(prev.checkIn, n) }))
      return
    }
    if (name === 'checkOut' && contForm.stayType === STAY_TYPE.DAILY) {
      setContForm(prev => ({ ...prev, checkOut: value, nights: diffDays(prev.checkIn, value) }))
      return
    }
    setContForm(prev => ({ ...prev, [name]: value }))
  }

  // ===== จองต่อเนื่อง (จากห้องที่จองแล้ว/เข้าพัก) =====
  const handleAddBooking = () => {
    if (!contForm.guestName.trim()) { alert('กรุณากรอกชื่อผู้เข้าพัก'); return }
    if (!contForm.checkOut) { alert('กรุณาเลือกวันที่เช็คเอ้าท์'); return }

    // ตรวจสอบการจองทับซ้อน (ยกเว้น activeBooking ที่กำลังพักอยู่)
    const conflict = findOverlap(
      room.bookings || [],
      contForm.checkIn, contForm.checkOut,
      contForm.stayType, contForm.checkInTime, contForm.checkOutTime,
      activeBooking?.id,
    )
    if (conflict) {
      alert(`❌ มีการจองทับซ้อน!\n\nมีการจองของ "${conflict.guestName}" ในช่วงวันที่นั้นอยู่แล้ว`)
      return
    }

    const bookingData = {
      ...contForm,
      ...(contForm.stayType === STAY_TYPE.DAILY ? { checkInTime: '13:00', checkOutTime: '12:00' } : {}),
    }
    onBook(bookingData)
    onClose()
  }

  // ===== เช็คอิน =====
  const handleCheckIn = () => {
    if (!activeBooking) return
    onCheckIn(activeBooking.id)
    onClose()
  }

  // ===== เช็คเอ้าท์ =====
  const handleCheckOut = () => {
    if (!activeBooking) return
    onCheckOut(activeBooking.id)
    onClose()
  }

  // ===== ทำความสะอาดเสร็จ =====
  const handleCleaned = () => {
    onCleaned()
    onClose()
  }

  // ===== ยกเลิกการจอง =====
  const handleCancel = () => {
    if (!activeBooking) return
    if (!confirm(`ยืนยันยกเลิกการจองของ "${activeBooking.guestName}"?`)) return
    onCancel(activeBooking.id)
    onClose()
  }

  // ===== ต่ออีก 1 คืน =====
  const handleExtendDaily = () => {
    if (!activeBooking) return
    const newCheckOut = addDays(activeBooking.checkOut || activeBooking.checkIn, 1)
    onExtend(activeBooking.id, { checkOut: newCheckOut })
    onClose()
  }

  // ===== ต่ออีก 1 ชั่วโมง =====
  const handleExtendHourly = () => {
    if (!activeBooking) return
    const [h, m] = (activeBooking.checkOutTime || '12:00').split(':').map(Number)
    const newH = (h + 1) % 24
    const newCheckOutTime = `${String(newH).padStart(2, '0')}:${String(m).padStart(2, '0')}`
    onExtend(activeBooking.id, { checkOutTime: newCheckOutTime })
    onClose()
  }

  // ===== บันทึกการแก้ไข =====
  const handleSaveEdit = () => {
    if (!activeBooking) return
    onEdit(activeBooking.id, {
      guestName:   form.guestName,
      phone:       form.phone,
      carPlate:    form.carPlate,
      carProvince: form.carProvince,
      note:        form.note,
    })
    setEditMode(false)
  }

  const isHourlyBooking = activeBooking?.stayType === STAY_TYPE.HOURLY
  const isLateCheckout  = room.status === STATUS.LATE_CHECKOUT
  const statusColor = isHourlyBooking
    ? (HOURLY_COLOR[room.status] || STATUS_COLOR[room.status])
    : STATUS_COLOR[room.status]
  const statusLabel = STATUS_LABEL[room.status]

  const pendingBookings = (room.bookings || []).filter(b =>
    b.id !== activeBooking?.id && b.status === STATUS.BOOKED
  )

  return (
    <div className="modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" onMouseDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header" style={{ borderTopColor: statusColor }}>
          <div className="modal-title-row">
            <h2>ห้อง {room.number}</h2>
            <span className="modal-status-badge" style={{ backgroundColor: statusColor }}>
              {statusLabel}
            </span>
            {pendingBookings.length > 0 && (
              <span className="pending-badge">+{pendingBookings.length} รอจอง</span>
            )}
          </div>
          <p className="modal-subtitle">
            {room.type}
            {room.building ? ` | ${room.building}` : ''}
            {room.floor ? ` ชั้น ${room.floor}` : ''}
          </p>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* ===== ว่าง: ฟอร์มจอง ===== */}
          {room.status === STATUS.AVAILABLE && (
            <div className="action-section">
              {editable ? (
                <>
                  <h3 className="section-label">จองห้องพัก</h3>
                  <BookingForm form={form} onChange={handleChange} />
                  <div className="modal-actions">
                    <button className="btn-primary" onClick={handleBook}>✅ ยืนยันการจอง</button>
                    <button className="btn-secondary" onClick={onClose}>ยกเลิก</button>
                  </div>
                </>
              ) : (
                <ReadOnlyNotice />
              )}
            </div>
          )}

          {/* ===== จองแล้ว / เข้าพักแล้ว / รอออก ===== */}
          {(room.status === STATUS.BOOKED || room.status === STATUS.OCCUPIED || room.status === STATUS.LATE_CHECKOUT) && activeBooking && (
            <div className="action-section">
              <div className="section-header-row">
                <h3 className="section-label">ข้อมูลผู้เข้าพัก</h3>
                {editable && !editMode && (
                  <button className="btn-edit-inline" onClick={() => setEditMode(true)}>✏️ แก้ไข</button>
                )}
                {editable && editMode && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button className="btn-save-inline" onClick={handleSaveEdit}>💾 บันทึก</button>
                    <button className="btn-edit-inline" onClick={() => { setEditMode(false); setForm({ ...getDefaultForm(), ...activeBooking, nights: diffDays(activeBooking.checkIn, activeBooking.checkOut) }) }}>ยกเลิก</button>
                  </div>
                )}
              </div>

              {isLateCheckout && (
                <div className="late-checkout-warning">
                  ⚠️ เกินเวลาเช็คเอ้าท์แล้ว — รอลูกค้าออก
                </div>
              )}

              {editMode ? (
                <EditGuestForm form={form} onChange={handleChange} />
              ) : (
                <div className="booking-info">
                  <InfoRow label="ชื่อผู้เข้าพัก" value={activeBooking.guestName} />
                  <InfoRow label="โทรศัพท์"       value={activeBooking.phone || '-'} />
                  <InfoRow label="ประเภท"          value={activeBooking.stayType === STAY_TYPE.HOURLY ? '⏱ รายชั่วโมง' : '🌙 รายคืน'} />
                  {activeBooking.stayType === STAY_TYPE.DAILY ? (
                    <>
                      <InfoRow label="เช็คอิน"    value={`${formatDate(activeBooking.checkIn)} เวลา ${activeBooking.checkInTime || '13:00'} น.`} />
                      <InfoRow label="เช็คเอ้าท์" value={`${formatDate(activeBooking.checkOut)} เวลา ${activeBooking.checkOutTime || '12:00'} น.`} />
                      <InfoRow label="จำนวนคืน"   value={`${diffDays(activeBooking.checkIn, activeBooking.checkOut)} คืน`} />
                    </>
                  ) : (
                    <>
                      <InfoRow label="วันที่"   value={formatDate(activeBooking.checkIn)} />
                      <InfoRow label="เวลาเข้า" value={activeBooking.checkInTime || '-'} />
                      <InfoRow label="เวลาออก"  value={activeBooking.checkOutTime || '-'} />
                    </>
                  )}
                  <InfoRow label="จำนวนคน" value={`${activeBooking.adults} คน`} />
                  {activeBooking.carPlate && (
                    <InfoRow label="ทะเบียนรถ" value={`${activeBooking.carPlate}${activeBooking.carProvince ? ` (${activeBooking.carProvince})` : ''}`} />
                  )}
                  {activeBooking.note && (
                    <InfoRow label="หมายเหตุ" value={activeBooking.note} />
                  )}
                  {activeBooking.bookedBy && (
                    <InfoRow label="ผู้รับจอง" value={activeBooking.bookedBy} />
                  )}
                </div>
              )}

              {pendingBookings.length > 0 && (
                <div className="pending-list">
                  <p className="pending-title">การจองถัดไป ({pendingBookings.length} รายการ)</p>
                  {pendingBookings.map(b => {
                    const isEditingThis = editingPendingId === b.id
                    const canCancelB = isAdmin || (currentUser && b.bookedBy === currentUser.displayName)
                    return (
                      <div key={b.id} className={`pending-item ${isEditingThis ? 'pending-item-editing' : ''}`}>
                        {isEditingThis ? (
                          <PendingEditForm
                            form={pendingEditForm}
                            onChange={handlePendingChange}
                            onSave={handleSavePendingEdit}
                            onCancel={() => setEditingPendingId(null)}
                          />
                        ) : (
                          <>
                            <div className="pending-item-info">
                              <span className="pending-ref">#{bookingRef(b.id)}</span>
                              <span className="pending-name">{b.guestName}</span>
                              {b.phone && <span className="pending-phone">{b.phone}</span>}
                              <span className="pending-dates">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</span>
                            </div>
                            {editable && (
                              <div className="pending-item-actions">
                                <button className="btn-edit-sm" onClick={() => handleEditPending(b)}>✏️ แก้ไข</button>
                                {canCancelB && (
                                  <button className="btn-cancel-sm" onClick={() => handleCancelPending(b)}>✕ ยกเลิก</button>
                                )}
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              {editable && (
                <div className="modal-actions">
                  {room.status === STATUS.BOOKED && (
                    <button className="btn-success" onClick={handleCheckIn}>🔑 เช็คอิน (เข้าพัก)</button>
                  )}
                  {(room.status === STATUS.OCCUPIED || room.status === STATUS.LATE_CHECKOUT) && (
                    <button className="btn-warning" onClick={handleCheckOut}>🚪 เช็คเอ้าท์</button>
                  )}
                  {(room.status === STATUS.OCCUPIED || room.status === STATUS.LATE_CHECKOUT) && !isHourlyBooking && (
                    <button className="btn-extend" onClick={handleExtendDaily}>📅 ต่ออีก 1 คืน</button>
                  )}
                  {(room.status === STATUS.OCCUPIED || room.status === STATUS.LATE_CHECKOUT) && isHourlyBooking && (
                    <button className="btn-extend" onClick={handleExtendHourly}>⏱ ต่ออีก 1 ชั่วโมง</button>
                  )}
                  {canCancelThis && (
                    <button className="btn-danger" onClick={handleCancel}>❌ ยกเลิกการจอง</button>
                  )}
                  <button className="btn-secondary" onClick={onClose}>ปิด</button>
                </div>
              )}

              {/* จองต่อเนื่อง */}
              {editable && (
                <div className="continuous-booking">
                  <details>
                    <summary>➕ เพิ่มการจองต่อเนื่อง</summary>
                    <div style={{ marginTop: 12 }}>
                      <BookingForm form={contForm} onChange={handleContChange} />
                      <button className="btn-primary" style={{ marginTop: 8, width: '100%' }} onClick={handleAddBooking}>
                        ✅ บันทึกการจองต่อเนื่อง
                      </button>
                    </div>
                  </details>
                </div>
              )}

              {!editable && <ReadOnlyNotice />}
            </div>
          )}

          {/* ===== ทำความสะอาด ===== */}
          {room.status === STATUS.CLEANING && (
            <div className="action-section">
              <h3 className="section-label">กำลังทำความสะอาด</h3>
              <p className="cleaning-msg">ห้องนี้อยู่ระหว่างการทำความสะอาด กรุณารอสักครู่</p>

              {activeBooking && (
                <div className="next-booking-card">
                  <p className="next-booking-title">📋 รอรับแขกถัดไป</p>
                  <div className="booking-info">
                    <InfoRow label="ชื่อผู้เข้าพัก" value={activeBooking.guestName} />
                    <InfoRow label="โทรศัพท์"       value={activeBooking.phone || '-'} />
                    <InfoRow label="ประเภท"          value={activeBooking.stayType === STAY_TYPE.HOURLY ? '⏱ รายชั่วโมง' : '🌙 รายคืน'} />
                    {activeBooking.stayType === STAY_TYPE.DAILY ? (
                      <>
                        <InfoRow label="เช็คอิน"    value={`${formatDate(activeBooking.checkIn)} เวลา ${activeBooking.checkInTime || '13:00'} น.`} />
                        <InfoRow label="เช็คเอ้าท์" value={`${formatDate(activeBooking.checkOut)} เวลา ${activeBooking.checkOutTime || '12:00'} น.`} />
                      </>
                    ) : (
                      <>
                        <InfoRow label="วันที่"   value={formatDate(activeBooking.checkIn)} />
                        <InfoRow label="เวลาเข้า" value={activeBooking.checkInTime || '-'} />
                        <InfoRow label="เวลาออก"  value={activeBooking.checkOutTime || '-'} />
                      </>
                    )}
                    <InfoRow label="จำนวนคน" value={`${activeBooking.adults || 1} คน`} />
                  </div>
                  {pendingBookings.length > 0 && (
                    <div className="pending-list">
                      <p className="pending-title">การจองถัดไป ({pendingBookings.length} รายการ)</p>
                      {pendingBookings.map(b => {
                        const isEditingThis = editingPendingId === b.id
                        const canCancelB = isAdmin || (currentUser && b.bookedBy === currentUser.displayName)
                        return (
                          <div key={b.id} className={`pending-item ${isEditingThis ? 'pending-item-editing' : ''}`}>
                            {isEditingThis ? (
                              <PendingEditForm
                                form={pendingEditForm}
                                onChange={handlePendingChange}
                                onSave={handleSavePendingEdit}
                                onCancel={() => setEditingPendingId(null)}
                              />
                            ) : (
                              <>
                                <div className="pending-item-info">
                                  <span className="pending-ref">#{bookingRef(b.id)}</span>
                                  <span className="pending-name">{b.guestName}</span>
                                  {b.phone && <span className="pending-phone">{b.phone}</span>}
                                  <span className="pending-dates">{formatDate(b.checkIn)} → {formatDate(b.checkOut)}</span>
                                </div>
                                {editable && (
                                  <div className="pending-item-actions">
                                    <button className="btn-edit-sm" onClick={() => handleEditPending(b)}>✏️ แก้ไข</button>
                                    {canCancelB && (
                                      <button className="btn-cancel-sm" onClick={() => handleCancelPending(b)}>✕ ยกเลิก</button>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {editable ? (
                <div className="modal-actions">
                  <button className="btn-primary" onClick={handleCleaned}>✨ ทำความสะอาดเสร็จแล้ว (พร้อมจอง)</button>
                  <button className="btn-secondary" onClick={onClose}>ปิด</button>
                </div>
              ) : (
                <ReadOnlyNotice />
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}

// ===== Sub-components =====

function BookingForm({ form, onChange }) {
  return (
    <div className="form-grid">
      <div className="form-group full-width">
        <label>ประเภทการพัก</label>
        <div className="stay-type-toggle">
          <label className={`stay-option ${form.stayType === STAY_TYPE.DAILY ? 'active' : ''}`}>
            <input type="radio" name="stayType" value={STAY_TYPE.DAILY} checked={form.stayType === STAY_TYPE.DAILY} onChange={onChange} />
            🌙 รายคืน
          </label>
          <label className={`stay-option ${form.stayType === STAY_TYPE.HOURLY ? 'active' : ''}`}>
            <input type="radio" name="stayType" value={STAY_TYPE.HOURLY} checked={form.stayType === STAY_TYPE.HOURLY} onChange={onChange} />
            ⏱ รายชั่วโมง
          </label>
        </div>
      </div>

      <div className="form-group">
        <label>ชื่อผู้เข้าพัก *</label>
        <input name="guestName" value={form.guestName} onChange={onChange} placeholder="ชื่อ - นามสกุล" />
      </div>
      <div className="form-group">
        <label>เบอร์โทรศัพท์</label>
        <input name="phone" value={form.phone} onChange={onChange} placeholder="0xx-xxx-xxxx" type="tel" />
      </div>

      {form.stayType === STAY_TYPE.DAILY ? (
        <>
          <div className="form-group">
            <label>วันที่เช็คอิน *</label>
            <input name="checkIn" value={form.checkIn} onChange={onChange} type="date" />
            <span className="time-hint">⏰ เวลาเข้า 13:00 น.</span>
          </div>
          <div className="form-group">
            <label>จำนวนคืน</label>
            <input
              name="nights"
              value={form.nights || 1}
              onChange={onChange}
              type="number"
              min={1}
              max={365}
            />
          </div>
          <div className="form-group">
            <label>วันที่เช็คเอ้าท์ *</label>
            <input name="checkOut" value={form.checkOut} onChange={onChange} type="date" min={form.checkIn} />
            <span className="time-hint">⏰ เวลาออก 12:00 น.</span>
          </div>
        </>
      ) : (
        <>
          <div className="form-group">
            <label>วันที่ *</label>
            <input name="checkIn" value={form.checkIn} onChange={onChange} type="date" />
          </div>
          <div className="form-group" style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1 }}>
              <label>เวลาเข้าพัก *</label>
              <input name="checkInTime" value={form.checkInTime} onChange={onChange} type="time" />
            </div>
            <div style={{ flex: 1 }}>
              <label>เวลาออก *</label>
              <input name="checkOutTime" value={form.checkOutTime} onChange={onChange} type="time" />
            </div>
          </div>
        </>
      )}

      <div className="form-group">
        <label>จำนวนผู้เข้าพัก</label>
        <input name="adults" value={form.adults} onChange={onChange} type="number" min={1} max={20} />
      </div>
      <div className="form-group">
        <label>ทะเบียนรถ</label>
        <input name="carPlate" value={form.carPlate} onChange={onChange} placeholder="เช่น กข 1234" />
      </div>
      <div className="form-group full-width">
        <label>จังหวัด (ทะเบียนรถ)</label>
        <select name="carProvince" value={form.carProvince} onChange={onChange}>
          <option value="">— เลือกจังหวัด —</option>
          {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="form-group full-width">
        <label>หมายเหตุ</label>
        <textarea name="note" value={form.note} onChange={onChange} placeholder="หมายเหตุเพิ่มเติม..." rows={2} />
      </div>
    </div>
  )
}

function EditGuestForm({ form, onChange }) {
  return (
    <div className="form-grid">
      <div className="form-group">
        <label>ชื่อผู้เข้าพัก *</label>
        <input name="guestName" value={form.guestName} onChange={onChange} />
      </div>
      <div className="form-group">
        <label>เบอร์โทรศัพท์</label>
        <input name="phone" value={form.phone} onChange={onChange} type="tel" />
      </div>
      <div className="form-group">
        <label>ทะเบียนรถ</label>
        <input name="carPlate" value={form.carPlate || ''} onChange={onChange} placeholder="เช่น กข 1234" />
      </div>
      <div className="form-group">
        <label>จังหวัด (ทะเบียนรถ)</label>
        <select name="carProvince" value={form.carProvince || ''} onChange={onChange}>
          <option value="">— เลือกจังหวัด —</option>
          {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div className="form-group full-width">
        <label>หมายเหตุ</label>
        <textarea name="note" value={form.note || ''} onChange={onChange} rows={2} />
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

function ReadOnlyNotice() {
  return (
    <div className="readonly-notice">
      👁️ โหมดดูอย่างเดียว — กรุณาเข้าสู่ระบบเพื่อจัดการการจอง
    </div>
  )
}

function PendingEditForm({ form, onChange, onSave, onCancel }) {
  return (
    <div className="pending-edit-form">
      <div className="pending-edit-row">
        <div className="form-group">
          <label>ชื่อผู้เข้าพัก *</label>
          <input name="guestName" value={form.guestName || ''} onChange={onChange} />
        </div>
        <div className="form-group">
          <label>เบอร์โทรศัพท์</label>
          <input name="phone" value={form.phone || ''} onChange={onChange} type="tel" />
        </div>
      </div>
      <div className="pending-edit-row">
        <div className="form-group">
          <label>วันเช็คอิน</label>
          <input name="checkIn" value={form.checkIn || ''} onChange={onChange} type="date" />
        </div>
        <div className="form-group">
          <label>จำนวนคืน</label>
          <input name="nights" value={form.nights || 1} onChange={onChange} type="number" min={1} />
        </div>
        <div className="form-group">
          <label>วันเช็คเอ้าท์</label>
          <input name="checkOut" value={form.checkOut || ''} onChange={onChange} type="date" min={form.checkIn} />
        </div>
      </div>
      <div className="pending-edit-row">
        <div className="form-group">
          <label>ทะเบียนรถ</label>
          <input name="carPlate" value={form.carPlate || ''} onChange={onChange} placeholder="เช่น กข 1234" />
        </div>
        <div className="form-group full-width">
          <label>หมายเหตุ</label>
          <input name="note" value={form.note || ''} onChange={onChange} />
        </div>
      </div>
      <div className="pending-edit-actions">
        <button className="btn-save-inline" onClick={onSave}>💾 บันทึก</button>
        <button className="btn-edit-inline" onClick={onCancel}>ยกเลิก</button>
      </div>
    </div>
  )
}

// แสดงเลขอ้างอิงจาก booking ID (bk_timestamp_xxxxx → XXXXX)
function bookingRef(id) {
  if (!id) return '?'
  const parts = id.split('_')
  return parts[parts.length - 1].toUpperCase()
}

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
}
