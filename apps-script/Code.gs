/**
 * เขียนสถานะ (คอลัมน์ K) กลับชีต "Tiktok Post Plan 2025" จากหน้า Dashboard
 *
 * วิธีติดตั้ง — ดู SHEETS-API.md ในโปรเจกต์ (สรุปสั้น)
 *   1. เปิดชีต → ส่วนขยาย (Extensions) → Apps Script → วางไฟล์นี้แทนโค้ดเดิม
 *   2. แก้ TOKEN ให้เป็นข้อความลับของคุณเอง (สุ่มยาว ๆ) แล้วบันทึก
 *   3. Deploy → New deployment → ประเภท Web app
 *        Execute as: Me   ·   Who has access: Anyone
 *   4. คัดลอกลิงก์ที่ลงท้าย /exec ไปใส่ใน index.html ที่ SHEET_WRITE_URL
 *      และใส่ TOKEN เดียวกันที่ SHEET_WRITE_TOKEN
 *
 * ความปลอดภัย: ใครที่รู้ลิงก์ + token เขียนได้ จึงเก็บ token ไว้อย่าให้หลุด
 * และสคริปต์นี้เขียนได้เฉพาะคอลัมน์ K ของแท็บที่ระบุเท่านั้น
 */

var TOKEN = 'เปลี่ยนเป็นข้อความลับของคุณ';
var SHEET_ID = '139OFW8jnXZ6PgelZ6zEVo9Fp0bRUbnbaVvvaM56jBuA';
var TAB_NAME = 'Tiktok Post Plan 2025';
var STATUS_COL = 11;   // K
var TOPIC_COL = 7;     // G — ใช้ตรวจว่าเขียนถูกแถว
var ALLOWED = ['Done', 'In Progress', 'Draft', 'Reject', 'Stuck'];

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (TOKEN && body.token !== TOKEN) return out({ ok: false, error: 'bad token' });

    var row = parseInt(body.row, 10);
    if (!row || row < 2) return out({ ok: false, error: 'bad row' });
    if (ALLOWED.indexOf(body.status) < 0) return out({ ok: false, error: 'bad status' });

    var sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(TAB_NAME);
    if (!sheet) return out({ ok: false, error: 'tab not found' });
    if (row > sheet.getLastRow()) return out({ ok: false, error: 'row out of range' });

    // กันเขียนผิดแถว: หัวข้อในชีตต้องตรงกับที่หน้าเว็บเห็นตอนกด
    var topic = String(sheet.getRange(row, TOPIC_COL).getValue() || '').trim();
    var expect = String(body.expectTopic || '').trim();
    if (expect && topic !== expect) return out({ ok: false, error: 'row changed — reload the dashboard' });

    var before = String(sheet.getRange(row, STATUS_COL).getValue() || '').trim();
    sheet.getRange(row, STATUS_COL).setValue(body.status);
    return out({ ok: true, row: row, before: before, after: body.status });
  } catch (err) {
    return out({ ok: false, error: String(err) });
  }
}

function doGet() {
  return out({ ok: true, service: 'content-2026 status writer' });
}

function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
