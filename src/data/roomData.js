import { todayLocal } from '../utils/date'

// Room status constants
export const STATUS = {
  AVAILABLE:     'available',      // ว่าง
  BOOKED:        'booked',         // จองแล้ว
  OCCUPIED:      'occupied',       // เข้าพักแล้ว
  CLEANING:      'cleaning',       // ทำความสะอาด
  LATE_CHECKOUT: 'late_checkout',  // เกินเวลา/รอออก
  // Booking-level history statuses (ไม่ใช่ room status):
  COMPLETED:     'completed',      // ออกแล้ว (ประวัติ)
  CANCELLED:     'cancelled',      // ยกเลิก
  NO_SHOW:       'no_show',        // ไม่มา
}

export const STATUS_LABEL = {
  available:     'ว่าง',
  booked:        'จองแล้ว',
  occupied:      'เข้าพักแล้ว',
  cleaning:      'ทำความสะอาด',
  late_checkout: 'รอออก/เกินเวลา',
  completed:     'ออกแล้ว',
  cancelled:     'ยกเลิก',
  no_show:       'ไม่มา',
}

export const STATUS_COLOR = {
  available:     '#22c55e',
  booked:        '#f59e0b',
  occupied:      '#ef4444',
  cleaning:      '#3b82f6',
  late_checkout: '#f97316',  // ส้ม
  completed:     '#6b7280',  // เทา
  cancelled:     '#9ca3af',
  no_show:       '#d1d5db',
}

// Hourly stay colors (purple tones — distinct from daily warm colors)
export const HOURLY_COLOR = {
  booked:   '#8b5cf6',  // สีม่วง
  occupied: '#6d28d9',  // สีม่วงเข้ม
}

// Zone constants
export const ZONES = {
  RESORT: 'resort',
  BUILDING_A: 'building_a',
  BUILDING_B: 'building_b',
}

// Stay type
export const STAY_TYPE = {
  DAILY: 'daily',
  HOURLY: 'hourly',
}

// Generate a unique booking ID
export function newBookingId() {
  return `bk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

// ===== DB ↔ JS Mapping (snake_case ↔ camelCase) =====

// แปลง Supabase row → JS booking object
export function fromDbBooking(row) {
  if (!row) return null
  return {
    id:             row.id,
    roomId:         row.room_id,
    guestName:      row.guest_name    ?? '',
    phone:          row.phone         ?? '',
    checkIn:        row.check_in,
    checkOut:       row.check_out     ?? null,
    checkInTime:    row.check_in_time  ?? '13:00',
    checkOutTime:   row.check_out_time ?? '12:00',
    adults:         row.adults        ?? 1,
    note:           row.note          ?? '',
    carPlate:       row.car_plate     ?? '',
    carProvince:    row.car_province  ?? '',
    stayType:       row.stay_type     ?? STAY_TYPE.DAILY,
    status:         row.status,
    bookedBy:       row.booked_by     ?? '',
    createdAt:      row.created_at,
    checkOutActual: row.check_out_actual ?? null,
  }
}

// แปลง JS form data → Supabase columns (ไม่รวม id, status — ให้ caller กำหนดเอง)
export function toDbBooking(formData, roomId) {
  return {
    room_id:        roomId,
    guest_name:     formData.guestName    || '',
    phone:          formData.phone        || '',
    check_in:       formData.checkIn,
    check_out:      formData.checkOut     || null,
    check_in_time:  formData.checkInTime  || '13:00',
    check_out_time: formData.checkOutTime || '12:00',
    adults:         formData.adults       || 1,
    note:           formData.note         || '',
    car_plate:      formData.carPlate     || '',
    car_province:   formData.carProvince  || '',
    stay_type:      formData.stayType     || STAY_TYPE.DAILY,
    booked_by:      formData.bookedBy     || '',
  }
}

// Generate resort bungalow rooms (R-01 to R-40)
function generateResortRooms() {
  const rooms = []
  for (let i = 1; i <= 40; i++) {
    rooms.push({
      id: `R-${String(i).padStart(2, '0')}`,
      number: `R-${String(i).padStart(2, '0')}`,
      zone: ZONES.RESORT,
      type: 'บ้านหลัง',
      floor: null,
      building: null,
      status: STATUS.AVAILABLE,
    })
  }
  return rooms
}

// Generate building rooms: 2 floors, 12 rooms per floor
function generateBuildingRooms(building) {
  const rooms = []
  const prefix = building === 'A' ? 'A' : 'B'
  const zone = building === 'A' ? ZONES.BUILDING_A : ZONES.BUILDING_B

  for (let floor = 1; floor <= 2; floor++) {
    for (let num = 1; num <= 12; num++) {
      const roomNum = `${prefix}${floor}${String(num).padStart(2, '0')}`
      rooms.push({
        id: roomNum,
        number: roomNum,
        zone,
        type: 'ห้องพัก',
        floor,
        building: `ตึก ${building}`,
        status: STATUS.AVAILABLE,
      })
    }
  }
  return rooms
}

// All rooms combined (no bookings — now stored in separate table)
export function generateAllRooms() {
  return [
    ...generateResortRooms(),
    ...generateBuildingRooms('A'),
    ...generateBuildingRooms('B'),
  ]
}

// Get current active booking (booked or occupied) — sorted by date+time (hourly เรียงตามเวลา)
export function getActiveBooking(room) {
  if (!room.bookings?.length) return null
  const active = room.bookings
    .filter(b => b.status === STATUS.BOOKED || b.status === STATUS.OCCUPIED)
    .sort((a, b) => {
      const keyA = (a.checkIn || '') + ' ' + (a.checkInTime || '00:00')
      const keyB = (b.checkIn || '') + ' ' + (b.checkInTime || '00:00')
      return keyA.localeCompare(keyB)
    })
  return active[0] || null
}

// Compute room display status from bookings array (real-time)
export function computeRoomStatus(room) {
  const today = todayLocal()
  const nowTime = new Date().toTimeString().slice(0, 5) // 'HH:MM'

  // OCCUPIED / LATE_CHECKOUT: แขกเช็คอินแล้ว
  const occupiedBooking = room.bookings?.find(b => b.status === STATUS.OCCUPIED)
  if (occupiedBooking) {
    if (occupiedBooking.stayType === STAY_TYPE.HOURLY) {
      // รายชั่วโมง: เกินเวลา checkOut → late checkout
      if (occupiedBooking.checkIn < today) return STATUS.LATE_CHECKOUT
      if (occupiedBooking.checkIn === today && occupiedBooking.checkOutTime && occupiedBooking.checkOutTime <= nowTime)
        return STATUS.LATE_CHECKOUT
    } else {
      // รายวัน: เกินวัน checkOut แล้ว → late checkout
      if (occupiedBooking.checkOut && occupiedBooking.checkOut <= today) return STATUS.LATE_CHECKOUT
    }
    return STATUS.OCCUPIED
  }

  // BOOKED: นับเฉพาะที่ยังอยู่ใน window วันนี้ (checkIn ≤ today < checkOut)
  // ป้องกันบัก: จองวันเดิมแล้วไม่มาเช็คอิน พอวันถัดไปยังขึ้น "จองแล้ว"
  const hasActiveBooked = room.bookings?.some(b => {
    if (b.status !== STATUS.BOOKED) return false
    if (b.stayType === STAY_TYPE.HOURLY) return b.checkIn === today
    const checkOut = b.checkOut || b.checkIn
    return b.checkIn <= today && (b.checkOut ? today < checkOut : today <= checkOut)
  })
  if (hasActiveBooked) return STATUS.BOOKED

  // Fallback: ดึงจาก rooms.status แต่อนุญาตเฉพาะ CLEANING และ AVAILABLE
  // ถ้า DB มี 'occupied'/'booked' โดยไม่มี booking รองรับ → ถือเป็น AVAILABLE
  return room.status === STATUS.CLEANING ? STATUS.CLEANING : STATUS.AVAILABLE
}

// Compute room status on a specific date (for dashboard date picker)
// - today   → real-time status (including cleaning)
// - future  → from bookings array
// - past    → from bookings array (completed = occupied historically)
export function getRoomStatusOnDate(room, date) {
  const today = todayLocal()

  if (date === today) {
    return computeRoomStatus(room)
  }

  // Find a booking that covers this date
  // Daily: checkOut day is FREE (guest out 12:00, next guest in at 13:00) → date < checkOut
  // Hourly: same day only
  const booking = (room.bookings || []).find(b => {
    if (!b.checkIn) return false
    // skip cancelled / no_show
    if (b.status === STATUS.CANCELLED || b.status === STATUS.NO_SHOW) return false
    if (b.stayType === STAY_TYPE.HOURLY) return b.checkIn === date
    const checkOut = b.checkOut || b.checkIn
    return b.checkIn <= date && (b.checkOut ? date < checkOut : date <= checkOut)
  })

  if (!booking) return STATUS.AVAILABLE
  // completed = was occupied historically, booked = pre-arrival
  if (booking.status === STATUS.OCCUPIED || booking.status === STATUS.COMPLETED) return STATUS.OCCUPIED
  return STATUS.BOOKED
}

// Get booking on a specific date (for tooltip/modal)
export function getBookingOnDate(room, date) {
  const today = todayLocal()
  if (date === today) return getActiveBooking(room)

  return (room.bookings || []).find(b => {
    if (!b.checkIn) return false
    if (b.status === STATUS.CANCELLED || b.status === STATUS.NO_SHOW) return false
    if (b.stayType === STAY_TYPE.HOURLY) return b.checkIn === date
    const checkOut = b.checkOut || b.checkIn
    return b.checkIn <= date && (b.checkOut ? date < checkOut : date <= checkOut)
  }) || null
}
