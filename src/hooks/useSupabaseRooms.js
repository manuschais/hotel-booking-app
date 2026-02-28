import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { generateAllRooms, computeRoomStatus } from '../data/roomData'

// ===== Seed: ถ้าในตาราง rooms ว่างเปล่า ให้ใส่ข้อมูลเริ่มต้น =====
async function seedIfEmpty() {
  const { count } = await supabase
    .from('rooms')
    .select('*', { count: 'exact', head: true })

  if (count === 0) {
    const initial = generateAllRooms()
    const rows = initial.map(r => ({
      id:       r.id,
      number:   r.number,
      zone:     r.zone,
      type:     r.type,
      floor:    r.floor,
      building: r.building,
      status:   r.status,
      bookings: r.bookings,
    }))

    const { error } = await supabase.from('rooms').insert(rows)
    if (error) console.error('Seed error:', error)
    else console.log('✅ Seeded', rows.length, 'rooms to Supabase')
  }
}

export function useSupabaseRooms() {
  const [rooms, setRooms] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // โหลดข้อมูลจาก Supabase
  const fetchRooms = useCallback(async () => {
    const { data, error } = await supabase
      .from('rooms')
      .select('*')
      .order('id')

    if (error) {
      setError(error.message)
    } else {
      // Recompute status from bookings array
      const updated = data.map(r => ({ ...r, status: computeRoomStatus(r) }))
      setRooms(updated)
    }
    setLoading(false)
  }, [])

  // โหลดครั้งแรก + seed ถ้าว่าง
  useEffect(() => {
    seedIfEmpty().then(fetchRooms)
  }, [fetchRooms])

  // Real-time: รับการเปลี่ยนแปลงทันที
  useEffect(() => {
    const channel = supabase
      .channel('rooms-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rooms' },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            const updated = { ...payload.new, status: computeRoomStatus(payload.new) }
            setRooms(prev => prev.map(r => r.id === updated.id ? updated : r))
          }
        }
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // อัพเดทห้อง (บันทึกไป Supabase)
  const updateRoom = useCallback(async (roomId, updater) => {
    setRooms(prev => {
      const current = prev.find(r => r.id === roomId)
      if (!current) return prev

      const updated = typeof updater === 'function' ? updater(current) : { ...current, ...updater }
      updated.status = computeRoomStatus(updated)

      // บันทึกไป Supabase (async — ไม่รอ)
      supabase
        .from('rooms')
        .update({
          status:   updated.status,
          bookings: updated.bookings,
        })
        .eq('id', roomId)
        .then(({ error }) => {
          if (error) console.error('Update error:', error)
        })

      return prev.map(r => r.id === roomId ? updated : r)
    })
  }, [])

  // ล้างข้อมูลทั้งหมด (admin only)
  const resetAllRooms = useCallback(async () => {
    const initial = generateAllRooms()
    const updates = initial.map(r =>
      supabase
        .from('rooms')
        .update({ status: 'available', bookings: [] })
        .eq('id', r.id)
    )
    await Promise.all(updates)
    await fetchRooms()
  }, [fetchRooms])

  return { rooms, loading, error, updateRoom, resetAllRooms }
}
