import { useState, useMemo } from 'react'
import * as XLSX from 'xlsx'
import { canCancel } from '../data/users'

function formatDateTime(ts) {
  if (!ts) return '-'
  const d = new Date(ts)
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
    + ' ' + d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
}

const EMPTY_ITEM_FORM = { name: '', category: '', unit: 'ชิ้น', min_qty: 5, current_qty: 0 }
const EMPTY_TX_FORM   = { quantity: 1, note: '' }

function exportItemsToExcel(items) {
  const rows = items.map(it => ({
    'ชื่อรายการ':   it.name,
    'หมวดหมู่':     it.category || '-',
    'หน่วย':        it.unit,
    'คงเหลือ':      it.current_qty,
    'จำนวนขั้นต่ำ': it.min_qty,
    'สถานะ':        it.current_qty < it.min_qty ? 'ต่ำกว่าขั้นต่ำ' : it.current_qty < it.min_qty * 1.5 ? 'ใกล้หมด' : 'ปกติ',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 20 }, { wch: 14 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'สต็อกสินค้า')
  XLSX.writeFile(wb, `stock_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.xlsx`)
}

function exportTxToExcel(transactions) {
  const rows = transactions.map(tx => ({
    'วันที่/เวลา':  tx.created_at ? new Date(tx.created_at).toLocaleString('th-TH') : '-',
    'ชื่อรายการ':   tx.stock_items?.name || '-',
    'ประเภท':       tx.type === 'in' ? 'รับเข้า' : 'เบิกออก',
    'จำนวน':        tx.quantity,
    'หน่วย':        tx.stock_items?.unit || '-',
    'หมายเหตุ':     tx.note || '-',
    'ผู้บันทึก':    tx.by_user || '-',
  }))
  const ws = XLSX.utils.json_to_sheet(rows)
  ws['!cols'] = [{ wch: 20 }, { wch: 20 }, { wch: 10 }, { wch: 8 }, { wch: 8 }, { wch: 24 }, { wch: 14 }]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'ประวัติการเคลื่อนไหว')
  XLSX.writeFile(wb, `stock_history_${new Date().toLocaleDateString('th-TH').replace(/\//g, '-')}.xlsx`)
}

export default function Stock({ items, transactions, loading, currentUser, addItem, editItem, deleteItem, addTransaction }) {
  const [tab,       setTab]       = useState('stock')   // 'stock' | 'history'
  const [catFilter, setCatFilter] = useState('all')
  const [itemModal, setItemModal] = useState(null)       // null | { mode:'add'|'edit', item? }
  const [txModal,   setTxModal]   = useState(null)       // null | { type:'in'|'out', item }
  const [itemForm,  setItemForm]  = useState(EMPTY_ITEM_FORM)
  const [txForm,    setTxForm]    = useState(EMPTY_TX_FORM)
  const [saving,    setSaving]    = useState(false)

  // History filters
  const [histItem, setHistItem]   = useState('all')
  const [histFrom, setHistFrom]   = useState('')
  const [histTo,   setHistTo]     = useState('')

  const isAdmin = canCancel(currentUser)

  // Unique categories from items
  const categories = useMemo(() => {
    const cats = [...new Set(items.map(it => it.category).filter(Boolean))].sort()
    return cats
  }, [items])

  const filteredItems = useMemo(() => {
    if (catFilter === 'all') return items
    return items.filter(it => it.category === catFilter)
  }, [items, catFilter])

  const filteredTx = useMemo(() => {
    return transactions.filter(tx => {
      if (histItem !== 'all' && tx.item_id !== histItem) return false
      if (histFrom && tx.created_at < histFrom) return false
      if (histTo   && tx.created_at > histTo + 'T23:59:59') return false
      return true
    })
  }, [transactions, histItem, histFrom, histTo])

  // --- Item Modal ---
  function openAddItem() {
    setItemForm(EMPTY_ITEM_FORM)
    setItemModal({ mode: 'add' })
  }
  function openEditItem(item) {
    setItemForm({ name: item.name, category: item.category, unit: item.unit, min_qty: item.min_qty, current_qty: item.current_qty })
    setItemModal({ mode: 'edit', item })
  }
  async function handleSaveItem() {
    if (!itemForm.name.trim()) { alert('กรุณากรอกชื่อรายการ'); return }
    setSaving(true)
    try {
      const ok = itemModal.mode === 'add'
        ? await addItem(itemForm)
        : await editItem(itemModal.item.id, itemForm)
      if (ok) setItemModal(null)
      else alert('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally { setSaving(false) }
  }

  // --- Transaction Modal ---
  function openTx(type, item) {
    setTxForm(EMPTY_TX_FORM)
    setTxModal({ type, item })
  }
  async function handleSaveTx() {
    const qty = Number(txForm.quantity)
    if (!qty || qty <= 0) { alert('กรุณาระบุจำนวน'); return }
    if (txModal.type === 'out' && qty > txModal.item.current_qty) {
      if (!confirm(`สต็อกคงเหลือ ${txModal.item.current_qty} ${txModal.item.unit} — ยืนยันเบิกเกินสต็อก?`)) return
    }
    setSaving(true)
    try {
      const ok = await addTransaction(
        txModal.item.id,
        txModal.type,
        qty,
        txForm.note,
        currentUser?.displayName || '-',
      )
      if (ok) setTxModal(null)
      else alert('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally { setSaving(false) }
  }

  async function handleDeleteItem(item) {
    if (!confirm(`ลบ "${item.name}" และประวัติทั้งหมด?`)) return
    await deleteItem(item.id)
  }

  if (loading) return <div className="stock-loading">⏳ กำลังโหลด...</div>

  return (
    <div className="stock-wrap">
      <div className="stock-header-row">
        <h2 className="stock-title">📦 ระบบสต็อกสินค้า</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {tab === 'stock' && (
            <button className="btn-stock-export" onClick={() => exportItemsToExcel(filteredItems)}>
              📥 Export Excel
            </button>
          )}
          {tab === 'history' && (
            <button className="btn-stock-export" onClick={() => exportTxToExcel(filteredTx)}>
              📥 Export Excel
            </button>
          )}
          {isAdmin && tab === 'stock' && (
            <button className="btn-stock-add" onClick={openAddItem}>+ เพิ่มรายการ</button>
          )}
        </div>
      </div>

      {/* Internal tabs */}
      <div className="stock-tab-bar">
        <button className={`stock-tab-btn ${tab === 'stock'   ? 'active' : ''}`} onClick={() => setTab('stock')}>📦 สต็อกปัจจุบัน</button>
        <button className={`stock-tab-btn ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>📋 ประวัติการเคลื่อนไหว</button>
      </div>

      {/* ===== STOCK TAB ===== */}
      {tab === 'stock' && (
        <>
          {/* Category filter */}
          <div className="stock-filter-bar">
            <label>หมวดหมู่:</label>
            <select value={catFilter} onChange={e => setCatFilter(e.target.value)}>
              <option value="all">ทั้งหมด ({items.length} รายการ)</option>
              {categories.map(c => (
                <option key={c} value={c}>{c} ({items.filter(it => it.category === c).length})</option>
              ))}
            </select>
          </div>

          {filteredItems.length === 0 ? (
            <p className="stock-empty">ยังไม่มีรายการสต็อก</p>
          ) : (
            <div className="stock-table-wrap">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>ชื่อรายการ</th>
                    <th>หมวด</th>
                    <th>หน่วย</th>
                    <th className="text-right">คงเหลือ</th>
                    <th className="text-right">ขั้นต่ำ</th>
                    <th>การดำเนินการ</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map(item => {
                    const isLow  = item.current_qty < item.min_qty
                    const isWarn = !isLow && item.current_qty < item.min_qty * 1.5
                    return (
                      <tr key={item.id} className={isLow ? 'stock-row-low' : isWarn ? 'stock-row-warn' : ''}>
                        <td className="stock-name">
                          {isLow && <span className="stock-alert-icon" title="สต็อกต่ำกว่าขั้นต่ำ">⚠️</span>}
                          {item.name}
                        </td>
                        <td><span className="stock-cat-badge">{item.category || '-'}</span></td>
                        <td>{item.unit}</td>
                        <td className="text-right">
                          <span className={`stock-qty-badge ${isLow ? 'low' : isWarn ? 'warn' : ''}`}>
                            {item.current_qty}
                          </span>
                        </td>
                        <td className="text-right stock-min-qty">{item.min_qty}</td>
                        <td className="stock-actions">
                          <button
                            className="btn-stock-out"
                            onClick={() => openTx('out', item)}
                            title="เบิกจ่าย"
                          >
                            − เบิก
                          </button>
                          <button
                            className="btn-stock-in"
                            onClick={() => openTx('in', item)}
                            title="รับของเข้า"
                          >
                            + รับ
                          </button>
                          {isAdmin && (
                            <>
                              <button className="btn-stock-edit" onClick={() => openEditItem(item)}>✏️</button>
                              <button className="btn-stock-del"  onClick={() => handleDeleteItem(item)}>🗑️</button>
                            </>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Low stock summary */}
          {items.some(it => it.current_qty < it.min_qty) && (
            <div className="stock-low-summary">
              ⚠️ รายการที่สต็อกต่ำกว่าขั้นต่ำ: {items.filter(it => it.current_qty < it.min_qty).map(it => `${it.name} (${it.current_qty})`).join(', ')}
            </div>
          )}
        </>
      )}

      {/* ===== HISTORY TAB ===== */}
      {tab === 'history' && (
        <>
          <div className="stock-filter-bar">
            <label>รายการ:</label>
            <select value={histItem} onChange={e => setHistItem(e.target.value)}>
              <option value="all">ทั้งหมด</option>
              {items.map(it => <option key={it.id} value={it.id}>{it.name}</option>)}
            </select>
            <label>จาก:</label>
            <input type="date" value={histFrom} onChange={e => setHistFrom(e.target.value)} />
            <label>ถึง:</label>
            <input type="date" value={histTo}   onChange={e => setHistTo(e.target.value)} />
            {(histFrom || histTo || histItem !== 'all') && (
              <button className="btn-stock-clear" onClick={() => { setHistFrom(''); setHistTo(''); setHistItem('all') }}>ล้าง</button>
            )}
          </div>

          {filteredTx.length === 0 ? (
            <p className="stock-empty">ไม่พบประวัติการเคลื่อนไหว</p>
          ) : (
            <div className="stock-table-wrap">
              <table className="stock-table">
                <thead>
                  <tr>
                    <th>วันที่/เวลา</th>
                    <th>รายการ</th>
                    <th>ประเภท</th>
                    <th className="text-right">จำนวน</th>
                    <th>หมายเหตุ</th>
                    <th>ผู้บันทึก</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map(tx => (
                    <tr key={tx.id}>
                      <td className="stock-tx-date">{formatDateTime(tx.created_at)}</td>
                      <td>{tx.stock_items?.name || '-'}</td>
                      <td>
                        <span className={`stock-type-badge ${tx.type === 'in' ? 'badge-in' : 'badge-out'}`}>
                          {tx.type === 'in' ? '▲ รับเข้า' : '▼ เบิกออก'}
                        </span>
                      </td>
                      <td className="text-right">
                        <span className={tx.type === 'in' ? 'tx-qty-in' : 'tx-qty-out'}>
                          {tx.type === 'in' ? '+' : '−'}{tx.quantity} {tx.stock_items?.unit || ''}
                        </span>
                      </td>
                      <td className="stock-tx-note">{tx.note || '-'}</td>
                      <td>{tx.by_user || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* ===== ITEM MODAL ===== */}
      {itemModal && (
        <div className="stock-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setItemModal(null) }}>
          <div className="stock-modal" onMouseDown={e => e.stopPropagation()}>
            <div className="stock-modal-header">
              <h3>{itemModal.mode === 'add' ? '+ เพิ่มรายการสต็อก' : '✏️ แก้ไขรายการสต็อก'}</h3>
              <button className="modal-close" onClick={() => setItemModal(null)}>✕</button>
            </div>
            <div className="stock-modal-body">
              <div className="form-group">
                <label>ชื่อรายการ *</label>
                <input value={itemForm.name} onChange={e => setItemForm(p => ({ ...p, name: e.target.value }))} placeholder="เช่น สบู่ก้อน, น้ำดื่ม" />
              </div>
              <div className="form-group">
                <label>หมวดหมู่</label>
                <input value={itemForm.category} onChange={e => setItemForm(p => ({ ...p, category: e.target.value }))} placeholder="เช่น ห้องน้ำ, เครื่องดื่ม" list="stock-cat-list" />
                <datalist id="stock-cat-list">
                  {categories.map(c => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="stock-form-row">
                <div className="form-group">
                  <label>หน่วย</label>
                  <input value={itemForm.unit} onChange={e => setItemForm(p => ({ ...p, unit: e.target.value }))} placeholder="ชิ้น / ขวด / ก้อน" />
                </div>
                <div className="form-group">
                  <label>จำนวนขั้นต่ำ</label>
                  <input type="number" min={0} value={itemForm.min_qty} onChange={e => setItemForm(p => ({ ...p, min_qty: e.target.value }))} />
                </div>
                {itemModal.mode === 'add' && (
                  <div className="form-group">
                    <label>จำนวนเริ่มต้น</label>
                    <input type="number" min={0} value={itemForm.current_qty} onChange={e => setItemForm(p => ({ ...p, current_qty: e.target.value }))} />
                  </div>
                )}
              </div>
            </div>
            <div className="stock-modal-footer">
              <button className="btn-primary" onClick={handleSaveItem} disabled={saving}>
                {saving ? '⏳ กำลังบันทึก...' : '✅ บันทึก'}
              </button>
              <button className="btn-secondary" onClick={() => setItemModal(null)} disabled={saving}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== TRANSACTION MODAL ===== */}
      {txModal && (
        <div className="stock-modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setTxModal(null) }}>
          <div className="stock-modal stock-modal-sm" onMouseDown={e => e.stopPropagation()}>
            <div className="stock-modal-header">
              <h3>
                {txModal.type === 'in'
                  ? `▲ รับของเข้า — ${txModal.item.name}`
                  : `▼ เบิกจ่าย — ${txModal.item.name}`}
              </h3>
              <button className="modal-close" onClick={() => setTxModal(null)}>✕</button>
            </div>
            <div className="stock-modal-body">
              <p className="stock-tx-current">
                สต็อกปัจจุบัน: <strong>{txModal.item.current_qty} {txModal.item.unit}</strong>
              </p>
              <div className="stock-form-row">
                <div className="form-group" style={{ flex: 1 }}>
                  <label>จำนวน ({txModal.item.unit}) *</label>
                  <input
                    type="number" min={1}
                    value={txForm.quantity}
                    onChange={e => setTxForm(p => ({ ...p, quantity: e.target.value }))}
                    autoFocus
                  />
                </div>
              </div>
              <div className="form-group">
                <label>หมายเหตุ</label>
                <input value={txForm.note} onChange={e => setTxForm(p => ({ ...p, note: e.target.value }))} placeholder="เช่น ซื้อเพิ่ม, ใช้ในห้อง 5 ห้อง" />
              </div>
            </div>
            <div className="stock-modal-footer">
              <button
                className={txModal.type === 'in' ? 'btn-stock-in' : 'btn-stock-out'}
                onClick={handleSaveTx}
                disabled={saving}
                style={{ padding: '8px 20px', fontSize: '0.95rem' }}
              >
                {saving ? '⏳...' : txModal.type === 'in' ? '✅ บันทึกรับของ' : '✅ ยืนยันเบิก'}
              </button>
              <button className="btn-secondary" onClick={() => setTxModal(null)} disabled={saving}>ยกเลิก</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
