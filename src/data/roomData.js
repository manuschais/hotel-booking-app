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

// Zone constants
export const ZONES = {
  RESORT: 'resort',
  BUILDING_A: 'building_a',
  BUILDING_B: 'building_b',
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
      status: STATUS.AVAILABLE,
      booking: null,
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
        type: `ห้องพัก`,
        floor,
        building: `ตึก ${building}`,
        status: STATUS.AVAILABLE,
        booking: null,
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
