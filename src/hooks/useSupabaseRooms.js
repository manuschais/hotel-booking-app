import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import {
  generateAllRooms, computeRoomStatus, newBookingId,
  fromDbBooking, toDbBooking, STATUS,
} from '../data/roomData'
import { localDateStr } from '../utils/date'

// ===== ประวัติย้อนหลังที่โหลดเพื่อแสดงใน timeline/date-picker =====
const HISTORY_DAYS = 90

// รวม bookings เข้าไปใน room objects
function buildRoomsWithBookings(rawRooms, rawBookings) {
  const byRoom = {}
  rawBookings.forEach(b => {
    if (!byRoom[b.room_id]) byRoom[b.room_id] = []
    byRoom[b.room_id].push(fromDbBooking(b))
  })
  return rawRooms.map(room => {
    const bookings = byRoom[room.id] || []
    return { ...room, bookings, status: computeRoomStatus({ ...room, bookings }) }
  })
}

// Seed ห้องพักถ้า rooms table ว่างเปล่า
async function seedIfEmpty() {
  const { count } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })
  if (count === 0) {
    const rows = generateAllRooms().map(({ id, number, zone, type, floor, building, status }) => ({
      id, number, zone, type, floor, building, status,
    }))
    const { error } = await supabase.from('rooms').insert(rows)
    if (error) console.error('Seed error:', error)
    else console.log('✅ Seeded', rows.length, 'rooms')
  }
}

export function useSupabaseRooms() {
  const [rawRooms,    setRawRooms]    = useState([])
  const [rawBookings, setRawBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  // rooms ที่ส่งออกมา = rawRooms + rawBookings รวมกัน (คำนวณใหม่ทุกครั้งที่ข้อมูลเปลี่ยน)
  const rooms = useMemo(
    () => buildRoomsWithBookings(rawRooms, rawBookings),
    [rawRooms, rawBookings]
  )

  // โหลด bookings จาก Supabase
  // - active: booked/occupied (ทุกวัน)
  // - recent: 90 วันที่ผ่านมา (สำหรับ timeline/date-picker)
  const fetchBookings = useCallback(async () => {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - HISTORY_DAYS)
    const cutoffStr = localDateStr(cutoff)

    const [activeRes, recentRes] = await Promise.all([
      supabase.from('bookings').select('*').in('status', ['booked', 'occupied']),
      supabase.from('bookings').select('*')
        .in('status', ['completed', 'cancelled', 'no_show'])
        .gte('check_in', cutoffStr),
    ])

    if (activeRes.error)  { setError(activeRes.error.message);  return }
    if (recentRes.error)  { setError(recentRes.error.message);  return }

    // Deduplicate ด้วย id
    const seen = new Set()
    const merged = [...(activeRes.data || []), ...(recentRes.data || [])].filter(b => {
      if (seen.has(b.id)) return false
      seen.add(b.id)
      return true
    })
    setRawBookings(merged)
  }, [])

  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase.from('rooms').select('*').order('id')
    if (error) { setError(error.message); return }
    setRawRooms(data)
  }, [])

  const fetchAll = useCallback(async () => {
    await Promise.all([fetchRooms(), fetchBookings()])
    setLoading(false)
  }, [fetchRooms, fetchBookings])

  // Mount: seed ถ้าว่าง แล้วโหลดข้อมูล
  useEffect(() => {
    seedIfEmpty().then(fetchAll)
  }, [fetchAll])

  // Real-time: rooms table
  useEffect(() => {
    const channel = supabase.channel('resort-realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'rooms' }, (payload) => {
        setRawRooms(prev => prev.map(r => r.id === payload.new.id ? payload.new : r))
      })
      // bookings: refetch ทุกครั้งที่มีการเปลี่ยนแปลง (INSERT/UPDATE/DELETE)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bookings' }, () => {
        fetchBookings()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [fetchBookings])

  // ===== BOOKING OPERATIONS =====

  // เพิ่ม booking ใหม่ (จอง)
  const addBooking = useCallback(async (roomId, formData) => {
    const row = {
      ...toDbBooking(formData, roomId),
      id: newBookingId(),
      status: STATUS.BOOKED,
      booked_by: formData.bookedBy || '',
    }
    const { error } = await supabase.from('bookings').insert(row)
    if (error) { console.error('addBooking:', error); alert('บันทึกไม่สำเร็จ: ' + error.message) }
    // real-time จะ trigger fetchBookings เอง
  }, [])

  // เช็คอิน (BOOKED → OCCUPIED)
  const checkIn = useCallback(async (bookingId) => {
    const { error } = await supabase
      .from('bookings').update({ status: STATUS.OCCUPIED }).eq('id', bookingId)
    if (error) { console.error('checkIn:', error); return }
    setRawBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: STATUS.OCCUPIED } : b))
  }, [])

  // เช็คเอ้าท์ (OCCUPIED → COMPLETED + room → CLEANING)
  const checkOut = useCallback(async (bookingId, roomId) => {
    const now = new Date().toISOString()
    const [bookingRes, roomRes] = await Promise.all([
      supabase.from('bookings')
        .update({ status: STATUS.COMPLETED, check_out_actual: now })
        .eq('id', bookingId),
      supabase.from('rooms')
        .update({ status: STATUS.CLEANING })
        .eq('id', roomId),
    ])
    if (bookingRes.error) { console.error('checkOut booking:', bookingRes.error); return }
    if (roomRes.error)    { console.error('checkOut room:',    roomRes.error);    return }

    setRawBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, status: STATUS.COMPLETED, check_out_actual: now } : b
    ))
    setRawRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: STATUS.CLEANING } : r))
  }, [])

  // ยกเลิกการจอง (mark cancelled — ไม่ลบ)
  const cancelBooking = useCallback(async (bookingId) => {
    const { error } = await supabase
      .from('bookings').update({ status: STATUS.CANCELLED }).eq('id', bookingId)
    if (error) { console.error('cancelBooking:', error); return }
    setRawBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, status: STATUS.CANCELLED } : b
    ))
  }, [])

  // แก้ไขข้อมูลผู้เข้าพัก (ชื่อ, เบอร์, ทะเบียน, หมายเหตุ)
  const updateBookingFields = useCallback(async (bookingId, fields) => {
    const dbFields = {}
    if (fields.guestName   !== undefined) dbFields.guest_name   = fields.guestName
    if (fields.phone       !== undefined) dbFields.phone        = fields.phone
    if (fields.note        !== undefined) dbFields.note         = fields.note
    if (fields.carPlate    !== undefined) dbFields.car_plate    = fields.carPlate
    if (fields.carProvince !== undefined) dbFields.car_province = fields.carProvince

    const { error } = await supabase.from('bookings').update(dbFields).eq('id', bookingId)
    if (error) { console.error('updateBookingFields:', error); return }
    setRawBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, ...dbFields } : b
    ))
  }, [])

  // ต่อเวลาพัก (checkOut date หรือ checkOutTime)
  const extendBooking = useCallback(async (bookingId, changes) => {
    const dbFields = {}
    if (changes.checkOut     !== undefined) dbFields.check_out      = changes.checkOut
    if (changes.checkOutTime !== undefined) dbFields.check_out_time = changes.checkOutTime

    const { error } = await supabase.from('bookings').update(dbFields).eq('id', bookingId)
    if (error) { console.error('extendBooking:', error); return }
    setRawBookings(prev => prev.map(b =>
      b.id === bookingId ? { ...b, ...dbFields } : b
    ))
  }, [])

  // ===== ROOM OPERATIONS =====

  // ทำความสะอาดเสร็จ → ห้องว่าง
  const setRoomAvailable = useCallback(async (roomId) => {
    const { error } = await supabase
      .from('rooms').update({ status: STATUS.AVAILABLE }).eq('id', roomId)
    if (error) { console.error('setRoomAvailable:', error); return }
    setRawRooms(prev => prev.map(r => r.id === roomId ? { ...r, status: STATUS.AVAILABLE } : r))
  }, [])

  // ===== HISTORY / SEARCH =====

  // ค้นหา booking ตามชื่อ / เบอร์ / ทะเบียน และกรองตามช่วงวันที่
  const searchBookings = useCallback(async ({ query, fromDate, toDate } = {}) => {
    let req = supabase
      .from('bookings')
      .select('*, rooms(number, zone, type, building, floor)')
      .order('check_in', { ascending: false })
      .limit(500)

    if (query?.trim()) {
      const q = query.trim()
      req = req.or(`guest_name.ilike.%${q}%,phone.ilike.%${q}%,car_plate.ilike.%${q}%`)
    }
    if (fromDate) req = req.gte('check_in', fromDate)
    if (toDate)   req = req.lte('check_in', toDate)

    const { data, error } = await req
    if (error) { console.error('searchBookings:', error); return [] }
    return data.map(b => ({ ...fromDbBooking(b), room: b.rooms }))
  }, [])

  // Admin: ลบประวัติตามช่วงวันที่ (เฉพาะ completed/cancelled/no_show)
  const deleteBookingsByRange = useCallback(async (beforeDate, statuses) => {
    if (!beforeDate || !statuses?.length) return { count: 0 }
    // ไม่อนุญาตลบ booked/occupied เด็ดขาด
    const safeStatuses = statuses.filter(s => ['completed', 'cancelled', 'no_show'].includes(s))
    if (!safeStatuses.length) return { count: 0 }

    const { data, error } = await supabase
      .from('bookings')
      .delete()
      .lt('check_in', beforeDate)
      .in('status', safeStatuses)
      .select('id')  // รับ id ที่ถูกลบกลับมา

    if (error) { console.error('deleteBookingsByRange:', error); return { count: 0, error } }
    await fetchBookings()
    return { count: data?.length || 0 }
  }, [fetchBookings])

  // Admin: รีเซ็ตทุกอย่าง
  const resetAllRooms = useCallback(async () => {
    // ลบ bookings ทุกตัวที่ไม่ใช่ active (เพื่อความปลอดภัย)
    await supabase.from('bookings').delete().neq('id', 'NEVER_MATCH_THIS')
    // Reset room status
    const ids = rawRooms.map(r => r.id)
    await Promise.all(ids.map(id =>
      supabase.from('rooms').update({ status: STATUS.AVAILABLE }).eq('id', id)
    ))
    await fetchAll()
  }, [rawRooms, fetchAll])

  return {
    rooms, loading, error,
    // Booking operations
    addBooking, checkIn, checkOut, cancelBooking,
    updateBookingFields, extendBooking,
    // Room operations
    setRoomAvailable,
    // History
    searchBookings, deleteBookingsByRange,
    // Admin
    resetAllRooms,
  }
}
