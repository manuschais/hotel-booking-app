// Room status constants
export const STATUS = {
  AVAILABLE: 'available',     // ว่าง
  BOOKED: 'booked',           // จองแล้ว
  OCCUPIED: 'occupied',       // เข้าพักแล้ว
  CLEANING: 'cleaning',       // ทำความสะอาด
}

export const STATUS_LABEL = {
  available: 'ว่าง',
  booked: 'จองแล้ว',
  occupied: 'เข้าพักแล้ว',
  cleaning: 'ทำความสะอาด',
}

export const STATUS_COLOR = {
  available: '#22c55e',
  booked: '#f59e0b',
  occupied: '#ef4444',
  cleaning: '#3b82f6',
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
      bookings: [],  // array ของการจองทั้งหมด (รองรับจองต่อเนื่อง)
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
        bookings: [],
      })
    }
  }
  return rooms
}

// All rooms combined
export function generateAllRooms() {
  return [
    ...generateResortRooms(),
    ...generateBuildingRooms('A'),
    ...generateBuildingRooms('B'),
  ]
}

// Get current active booking (booked or occupied) — first one by checkIn date
export function getActiveBooking(room) {
  if (!room.bookings?.length) return null
  const active = room.bookings
    .filter(b => b.status === STATUS.BOOKED || b.status === STATUS.OCCUPIED)
    .sort((a, b) => (a.checkIn || '').localeCompare(b.checkIn || ''))
  return active[0] || null
}

// Compute room display status from bookings array (real-time)
export function computeRoomStatus(room) {
  if (room.bookings?.some(b => b.status === STATUS.OCCUPIED)) return STATUS.OCCUPIED
  if (room.bookings?.some(b => b.status === STATUS.BOOKED)) return STATUS.BOOKED
  return room.status
}

// Compute room status on a specific date (for dashboard date picker)
// - today   → real-time status (including cleaning)
// - future  → from bookings array
// - past    → from bookings array (historical if not yet removed)
export function getRoomStatusOnDate(room, date) {
  const today = new Date().toISOString().split('T')[0]

  if (date === today) {
    return computeRoomStatus(room)
  }

  // Find a booking that covers this date
  // Daily: checkOut day is FREE (guest out 12:00, next guest in at 13:00) → date < checkOut
  // Hourly: same day only
  const booking = (room.bookings || []).find(b => {
    if (!b.checkIn) return false
    if (b.stayType === STAY_TYPE.HOURLY) return b.checkIn === date
    const checkOut = b.checkOut || b.checkIn
    return b.checkIn <= date && (b.checkOut ? date < checkOut : date <= checkOut)
  })

  if (!booking) return STATUS.AVAILABLE
  return booking.status === STATUS.OCCUPIED ? STATUS.OCCUPIED : STATUS.BOOKED
}

// Get booking on a specific date (for tooltip/modal)
export function getBookingOnDate(room, date) {
  const today = new Date().toISOString().split('T')[0]
  if (date === today) return getActiveBooking(room)

  return (room.bookings || []).find(b => {
    if (!b.checkIn) return false
    if (b.stayType === STAY_TYPE.HOURLY) return b.checkIn === date
    const checkOut = b.checkOut || b.checkIn
    return b.checkIn <= date && (b.checkOut ? date < checkOut : date <= checkOut)
  }) || null
}
