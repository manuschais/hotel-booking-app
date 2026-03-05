import { useState } from 'react'

const SECTIONS = [
  {
    key: 'status',
    title: '🎨 สถานะห้องพัก',
    content: (
      <div className="help-section-body">
        <div className="help-status-grid">
          <div className="help-status-item">
            <span className="help-dot" style={{ background: '#22c55e' }} />
            <div>
              <strong>ว่าง (Available)</strong>
              <p>ห้องพร้อมรับจอง สามารถคลิกจองได้ทันที</p>
            </div>
          </div>
          <div className="help-status-item">
            <span className="help-dot" style={{ background: '#f97316' }} />
            <div>
              <strong>จองแล้ว (Booked)</strong>
              <p>มีการจองล่วงหน้าแล้ว รอวันเช็คอิน</p>
            </div>
          </div>
          <div className="help-status-item">
            <span className="help-dot" style={{ background: '#ef4444' }} />
            <div>
              <strong>เข้าพักแล้ว (Occupied)</strong>
              <p>แขกเช็คอินและกำลังพักอยู่</p>
            </div>
          </div>
          <div className="help-status-item">
            <span className="help-dot" style={{ background: '#a855f7' }} />
            <div>
              <strong>ทำความสะอาด (Cleaning)</strong>
              <p>แขกเช็คเอ้าท์แล้ว รอทำความสะอาด</p>
            </div>
          </div>
          <div className="help-status-item">
            <span className="help-dot" style={{ background: '#6b7280' }} />
            <div>
              <strong>ปิดปรับปรุง (Maintenance)</strong>
              <p>ห้องไม่พร้อมใช้งานชั่วคราว</p>
            </div>
          </div>
        </div>
        <div className="help-tip">
          💡 ตัวเลขสีส้มบนการ์ดห้อง เช่น <strong>+2</strong> = มีการจองล่วงหน้าอีก 2 รายการ
        </div>
      </div>
    ),
  },
  {
    key: 'booking',
    title: '📋 การจองห้องพัก',
    content: (
      <div className="help-section-body">
        <h4>การจองรายคืน</h4>
        <ol className="help-steps">
          <li>คลิกห้องที่ต้องการ (สีเขียว = ว่าง)</li>
          <li>กรอกชื่อผู้เข้าพัก เบอร์โทร</li>
          <li>เลือกวันที่เช็คอิน และจำนวนคืน</li>
          <li>กด <strong>✅ ยืนยันการจอง</strong></li>
        </ol>
        <h4>การจองรายชั่วโมง</h4>
        <ol className="help-steps">
          <li>คลิกห้องที่ต้องการ</li>
          <li>เลือกประเภท <strong>⏱ รายชั่วโมง</strong></li>
          <li>ระบุวันที่ เวลาเข้า-ออก</li>
          <li>กด <strong>✅ ยืนยันการจอง</strong></li>
        </ol>
        <div className="help-tip">
          💡 สามารถจองล่วงหน้าได้หลายรายการในห้องเดียวกัน ระบบจะแสดงเตือนถ้าวันชนกัน
        </div>
      </div>
    ),
  },
  {
    key: 'checkin',
    title: '🔑 เช็คอิน / เช็คเอ้าท์',
    content: (
      <div className="help-section-body">
        <h4>ขั้นตอนเช็คอิน</h4>
        <ol className="help-steps">
          <li>คลิกห้องที่มีสถานะ <strong>จองแล้ว</strong> (สีส้ม)</li>
          <li>กด <strong>✅ เช็คอิน</strong></li>
          <li>ห้องจะเปลี่ยนเป็นสีแดง (เข้าพักแล้ว)</li>
        </ol>
        <h4>ขั้นตอนเช็คเอ้าท์</h4>
        <ol className="help-steps">
          <li>คลิกห้องที่มีสถานะ <strong>เข้าพักแล้ว</strong> (สีแดง)</li>
          <li>กด <strong>🚪 เช็คเอ้าท์</strong></li>
          <li>ห้องจะเปลี่ยนเป็น <strong>ทำความสะอาด</strong> (สีม่วง)</li>
          <li>เมื่อทำความสะอาดเสร็จ กด <strong>✨ ทำความสะอาดแล้ว</strong></li>
        </ol>
        <div className="help-tip">
          💡 สามารถพิมพ์ใบจองได้หลังจองสำเร็จ หรือกดปุ่ม 🖨️ ใบจอง ในหน้าจัดการห้อง
        </div>
      </div>
    ),
  },
  {
    key: 'multibook',
    title: '🏠+ จองหลายห้องพร้อมกัน',
    content: (
      <div className="help-section-body">
        <ol className="help-steps">
          <li>กดปุ่ม <strong>🏠+ หลายห้อง</strong> ในแถบด้านบน</li>
          <li>คลิกเลือกห้องว่างที่ต้องการ (ติ๊กถูกสีน้ำเงิน)</li>
          <li>แถบสีเข้มด้านล่างจะแสดงห้องที่เลือกอยู่</li>
          <li>กด <strong>✅ จอง N ห้อง</strong></li>
          <li>กรอกข้อมูลครั้งเดียว ระบบจะสร้างการจองให้ทุกห้อง</li>
        </ol>
        <div className="help-tip">
          💡 เหมาะสำหรับทัวร์กรุ๊ป หรือครอบครัวที่ต้องการหลายห้อง
        </div>
      </div>
    ),
  },
  {
    key: 'timeline',
    title: '📅 ตารางจอง (Timeline)',
    content: (
      <div className="help-section-body">
        <p>แสดงภาพรวมการจองทุกห้องในรูปแบบ Gantt Chart</p>
        <ul className="help-list">
          <li><strong>◀ ▶</strong> — เลื่อนดูวันก่อนหน้า/ถัดไปทีละ 1 วัน</li>
          <li><strong>วันนี้</strong> — กลับมาดูตั้งแต่เมื่อวาน</li>
          <li><strong>เลือกวันที่</strong> — กำหนดวันเริ่มต้นเอง</li>
          <li><strong>7/14/30 วัน</strong> — เปลี่ยนช่วงเวลาที่แสดง</li>
          <li>คลิก <strong>ช่องว่าง</strong> → เปิดฟอร์มจองพร้อมวันที่</li>
          <li>คลิก <strong>แถบสี</strong> → ดูรายละเอียดการจอง</li>
        </ul>
        <div className="help-tip">
          💡 กรองโซนหรือค้นหาเลขห้องได้ที่แถบด้านบนของตาราง
        </div>
      </div>
    ),
  },
  {
    key: 'dateview',
    title: '📆 ดูห้องพักตามวันที่',
    content: (
      <div className="help-section-body">
        <p>ใช้ <strong>📅 ดูห้องพักวันที่</strong> ด้านบนเพื่อดูสถานะห้องในอนาคตหรืออดีต</p>
        <ul className="help-list">
          <li>เลือกวันที่ → การ์ดห้องแสดงสถานะ ณ วันนั้น</li>
          <li>กด <strong>กลับวันนี้</strong> เพื่อดูสถานะปัจจุบัน</li>
          <li>🟢 แสดงสถานะ Real-time = ดูวันนี้</li>
        </ul>
      </div>
    ),
  },
  {
    key: 'stock',
    title: '📦 ระบบสต็อกสินค้า',
    content: (
      <div className="help-section-body">
        <ul className="help-list">
          <li><strong>สต็อกปัจจุบัน</strong> — ดูจำนวนสินค้าที่มีอยู่ทั้งหมด</li>
          <li><strong>+ รับ</strong> — บันทึกรับสินค้าเข้า (ซื้อเพิ่ม)</li>
          <li><strong>− เบิก</strong> — บันทึกการเบิกสินค้าออก</li>
          <li><strong>ประวัติ</strong> — ดูรายการรับ/เบิกย้อนหลัง</li>
        </ul>
        <div className="help-status-grid" style={{ marginTop: 8 }}>
          <div className="help-status-item">
            <span className="help-dot" style={{ background: '#fca5a5', borderRadius: 4, width: 16, height: 16 }} />
            <div><strong>สีแดง</strong> = สต็อกต่ำกว่าจำนวนขั้นต่ำ</div>
          </div>
          <div className="help-status-item">
            <span className="help-dot" style={{ background: '#fde68a', borderRadius: 4, width: 16, height: 16 }} />
            <div><strong>สีเหลือง</strong> = สต็อกใกล้หมด</div>
          </div>
        </div>
        <div className="help-tip">
          💡 Admin สามารถเพิ่ม/แก้ไข/ลบรายการสินค้าได้
        </div>
      </div>
    ),
  },
  {
    key: 'roles',
    title: '👥 สิทธิ์การใช้งาน',
    content: (
      <div className="help-section-body">
        <div className="help-role-grid">
          <div className="help-role-card">
            <div className="help-role-badge admin">👑 Admin</div>
            <ul className="help-list">
              <li>จอง / เช็คอิน / เช็คเอ้าท์</li>
              <li>ยกเลิกการจอง</li>
              <li>แก้ไขข้อมูลการจอง</li>
              <li>ดูรายงาน / ประวัติ</li>
              <li>จัดการสต็อก (เพิ่ม/ลบรายการ)</li>
              <li>ลบข้อมูลตามช่วงวันที่</li>
            </ul>
          </div>
          <div className="help-role-card">
            <div className="help-role-badge staff">👤 Staff</div>
            <ul className="help-list">
              <li>จอง / เช็คอิน / เช็คเอ้าท์</li>
              <li>แก้ไขข้อมูลการจอง</li>
              <li>ดูรายงาน / ประวัติ</li>
              <li>รับ/เบิกสต็อก</li>
            </ul>
          </div>
          <div className="help-role-card">
            <div className="help-role-badge guest">👁️ ดูอย่างเดียว</div>
            <ul className="help-list">
              <li>ดูสถานะห้องพัก</li>
              <li>ไม่สามารถจองหรือแก้ไขได้</li>
              <li>ไม่เห็นชื่อผู้เข้าพัก</li>
            </ul>
          </div>
        </div>
      </div>
    ),
  },
]

export default function HelpModal({ onClose }) {
  const [activeSection, setActiveSection] = useState('status')
  const current = SECTIONS.find(s => s.key === activeSection)

  return (
    <div className="modal-overlay" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="help-modal" onMouseDown={e => e.stopPropagation()}>
        <div className="help-modal-header">
          <h2>📖 คู่มือการใช้งาน</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="help-modal-body">
          {/* Sidebar */}
          <nav className="help-nav">
            {SECTIONS.map(s => (
              <button
                key={s.key}
                className={`help-nav-btn ${activeSection === s.key ? 'active' : ''}`}
                onClick={() => setActiveSection(s.key)}
              >
                {s.title}
              </button>
            ))}
          </nav>
          {/* Content */}
          <div className="help-content">
            <h3 className="help-content-title">{current.title}</h3>
            {current.content}
          </div>
        </div>
      </div>
    </div>
  )
}
