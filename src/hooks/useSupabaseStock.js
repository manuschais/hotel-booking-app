import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSupabaseStock() {
  const [items,        setItems]        = useState([])
  const [transactions, setTransactions] = useState([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  const fetchAll = useCallback(async () => {
    const [itemsRes, txRes] = await Promise.all([
      supabase.from('stock_items').select('*').order('category').order('name'),
      supabase.from('stock_transactions')
        .select('*, stock_items(name, unit)')
        .order('created_at', { ascending: false })
        .limit(300),
    ])
    if (itemsRes.error) { setError(itemsRes.error.message); setLoading(false); return }
    if (txRes.error)    { setError(txRes.error.message);    setLoading(false); return }
    setItems(itemsRes.data || [])
    setTransactions(txRes.data || [])
    setLoading(false)
  }, [])

  // Initial fetch
  useEffect(() => { fetchAll() }, [fetchAll])

  // Real-time: any change → refetch
  useEffect(() => {
    const channel = supabase
      .channel('stock-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_items' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stock_transactions' }, fetchAll)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetchAll])

  // ===== CRUD =====

  const addItem = useCallback(async (fields) => {
    const { error } = await supabase.from('stock_items').insert({
      name:        fields.name.trim(),
      category:    fields.category?.trim() || '',
      unit:        fields.unit?.trim() || 'ชิ้น',
      current_qty: Number(fields.current_qty) || 0,
      min_qty:     Number(fields.min_qty) || 5,
    })
    if (error) { console.error('addItem:', error); return false }
    return true
  }, [])

  const editItem = useCallback(async (id, fields) => {
    const { error } = await supabase.from('stock_items').update({
      name:     fields.name.trim(),
      category: fields.category?.trim() || '',
      unit:     fields.unit?.trim() || 'ชิ้น',
      min_qty:  Number(fields.min_qty) || 5,
    }).eq('id', id)
    if (error) { console.error('editItem:', error); return false }
    // Optimistic update
    setItems(prev => prev.map(it => it.id === id ? { ...it, ...fields, name: fields.name.trim() } : it))
    return true
  }, [])

  const deleteItem = useCallback(async (id) => {
    const { error } = await supabase.from('stock_items').delete().eq('id', id)
    if (error) { console.error('deleteItem:', error); return false }
    setItems(prev => prev.filter(it => it.id !== id))
    setTransactions(prev => prev.filter(tx => tx.item_id !== id))
    return true
  }, [])

  // type: 'in' | 'out'
  const addTransaction = useCallback(async (itemId, type, quantity, note, byUser) => {
    const qty = Number(quantity)
    if (!qty || qty <= 0) return false

    // Insert transaction
    const { error: txErr } = await supabase.from('stock_transactions').insert({
      item_id:  itemId,
      type,
      quantity: qty,
      note:     note?.trim() || '',
      by_user:  byUser || '',
    })
    if (txErr) { console.error('addTransaction:', txErr); return false }

    // Update stock qty: fetch current → compute new → update
    const delta = type === 'in' ? qty : -qty
    const { data: itemData } = await supabase.from('stock_items').select('current_qty').eq('id', itemId).single()
    const newQty = Math.max(0, (itemData?.current_qty || 0) + delta)
    await supabase.from('stock_items').update({ current_qty: newQty }).eq('id', itemId)

    // Optimistic local update
    setItems(prev => prev.map(it =>
      it.id === itemId ? { ...it, current_qty: Math.max(0, (it.current_qty || 0) + delta) } : it
    ))
    return true
  }, [])

  return {
    items, transactions, loading, error,
    addItem, editItem, deleteItem, addTransaction,
    refresh: fetchAll,
  }
}
