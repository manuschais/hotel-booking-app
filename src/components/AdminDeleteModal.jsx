import { useState } from 'react'

import { todayLocal } from '../utils/date'
const todayStr = todayLocal

export default function AdminDeleteModal({ onClose, onDelete, onResetAll }) {
  const [beforeDate, setBeforeDate] = useState(todayStr())
  const [statuses, setStatuses] = useState({
    completed: true,
    cancelled: true,
    no_show:   false,
  })
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [resetConfirm, setResetConfirm] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)

  const toggleStatus = (key) => {
    setStatuses(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const selectedStatuses = Object.entries(statuses).filter(([, v]) => v).map(([k]) => k)

  const handleDelete = async () => {
    if (!selectedStatuses.length) { alert('กรุณาเลือกสถานะที่ต้องการลบอย่างน้อย 1 รายการ'); return }
    if (!confirm(`ยืนยันลบประวัติก่อนวันที่ ${beforeDate} (สถานะ: ${selectedStatuses.join(', ')}) ?`)) return

    setLoading(true)
    setResult(null)
    const res = await onDelete(beforeDate, selectedStatuses)
    setResult(res)
    setLoading(false)
  }

  const handleResetAll = async () => {
    if (!confirm('⚠️ รีเซ็ตทุกอย่าง? จะลบข้อมูลการจองทั้งหมดและตั้งห้องพักให้ว่างทุกห้อง\nการกระทำนี้ไม่สามารถย้อนคืนได้!')) return
    setResetLoading(true)
    await onResetAll()
    setResetLoading(false)
    setResetConfirm(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal admin-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header" style={{ borderTopColor: '#ef4444' }}>
          <div className="modal-title-row">
            <h2>🗑️ จัดการข้อมูล (Admin)</h2>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* ===== ลบประวัติตามช่วงวันที่ ===== */}
          <div className="action-section">
            <h3 className="section-label">ลบประวัติการจอง</h3>
            <p className="admin-desc">ลบประวัติที่มีวันเช็คอินก่อนวันที่กำหนด (เฉพาะสถานะที่เลือก)</p>
            <p className="admin-warning">⚠️ การจองที่ยังอยู่ในสถานะ "จองแล้ว" และ "เข้าพักแล้ว" จะไม่ถูกลบ</p>

            <div className="admin-form">
              <div className="admin-field">
                <label>ลบข้อมูลก่อนวันที่</label>
                <input
                  type="date"
                  value={beforeDate}
                  onChange={e => setBeforeDate(e.target.value)}
                  max={todayStr()}
                />
              </div>

              <div className="admin-field">
                <label>สถานะที่จะลบ</label>
                <div className="admin-checkboxes">
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={statuses.completed}
                      onChange={() => toggleStatus('completed')}
                    />
                    ✅ ออกแล้ว (completed)
                  </label>
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={statuses.cancelled}
                      onChange={() => toggleStatus('cancelled')}
                    />
                    ❌ ยกเลิก (cancelled)
                  </label>
                  <label className="admin-check">
                    <input
                      type="checkbox"
                      checked={statuses.no_show}
                      onChange={() => toggleStatus('no_show')}
                    />
                    🚫 ไม่มา (no_show)
                  </label>
                </div>
              </div>
            </div>

            {result && (
              <div className={`admin-result ${result.error ? 'admin-result-error' : 'admin-result-ok'}`}>
                {result.error
                  ? `❌ เกิดข้อผิดพลาด: ${result.error.message}`
                  : `✅ ลบเสร็จสิ้น — ลบไปทั้งหมด ${result.count} รายการ`
                }
              </div>
            )}

            <div className="modal-actions">
              <button
                className="btn-danger"
                onClick={handleDelete}
                disabled={loading || !selectedStatuses.length}
              >
                {loading ? 'กำลังลบ...' : '🗑️ ลบประวัติที่เลือก'}
              </button>
              <button className="btn-secondary" onClick={onClose}>ปิด</button>
            </div>
          </div>

          {/* ===== Danger Zone: รีเซ็ตทุกอย่าง ===== */}
          <div className="action-section danger-zone">
            <h3 className="section-label danger-label">⚠️ Danger Zone</h3>
            {!resetConfirm ? (
              <button className="btn-danger-outline" onClick={() => setResetConfirm(true)}>
                🔄 รีเซ็ตข้อมูลทั้งหมด
              </button>
            ) : (
              <div className="reset-confirm">
                <p>การกระทำนี้จะ <strong>ลบข้อมูลการจองทั้งหมด</strong> และตั้งห้องพักทุกห้องกลับเป็น "ว่าง"<br />ไม่สามารถย้อนคืนได้!</p>
                <div className="modal-actions" style={{ marginTop: 12 }}>
                  <button
                    className="btn-danger"
                    onClick={handleResetAll}
                    disabled={resetLoading}
                  >
                    {resetLoading ? 'กำลังรีเซ็ต...' : '⚠️ ยืนยัน รีเซ็ตทั้งหมด'}
                  </button>
                  <button className="btn-secondary" onClick={() => setResetConfirm(false)}>ยกเลิก</button>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  )
}
