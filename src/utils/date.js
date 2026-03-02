// วันที่ใน local timezone (ไม่ใช่ UTC) — แก้บัค UTC+7 ทำให้วันที่ผิด

// แปลง Date object เป็น YYYY-MM-DD ตาม local timezone
export function localDateStr(d = new Date()) {
  const yyyy = d.getFullYear()
  const mm   = String(d.getMonth() + 1).padStart(2, '0')
  const dd   = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// วันนี้เป็น YYYY-MM-DD (local timezone)
export const todayLocal = () => localDateStr(new Date())

// เพิ่ม n วันให้ YYYY-MM-DD string (local timezone)
export function addDaysLocal(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00') // parse as local midnight
  d.setDate(d.getDate() + n)
  return localDateStr(d)
}
