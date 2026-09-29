# เชื่อม Google Sheets API กับ Dashboard

หน้าเว็บรองรับการอ่านสดผ่าน **Google Sheets API v4** แล้ว เหลือแค่ใส่ API key

## ขั้นตอน (ทำครั้งเดียว ~5 นาที)

1. เปิด <https://console.cloud.google.com/> → สร้างโปรเจกต์ใหม่ เช่น `content-dashboard`
2. **APIs & Services → Library** → ค้นหา **Google Sheets API** → กด **Enable**
3. **APIs & Services → Credentials → Create credentials → API key** → คัดลอกคีย์
4. กด **Edit API key** แล้วจำกัดการใช้งาน (สำคัญ เพราะคีย์จะอยู่ในหน้าเว็บสาธารณะ)
   - **Application restrictions** → *Websites* → เพิ่ม
     - `https://annk9p.github.io/*`
     - `http://localhost:8765/*` (ไว้ทดสอบในเครื่อง)
   - **API restrictions** → *Restrict key* → เลือก **Google Sheets API** อย่างเดียว
5. ใส่คีย์ใน `index.html` บรรทัด `const GOOGLE_API_KEY = '';` → `const GOOGLE_API_KEY = 'AIza…';`
6. commit + push → GitHub Pages deploy → กดปุ่ม "รีเฟรชข้อมูล" จะเห็นข้อมูลสดทันที

ชีตต้องยังแชร์แบบ **"ทุกคนที่มีลิงก์ดูได้"** เพราะ API key ใช้อ่านได้เฉพาะไฟล์สาธารณะ

## หน้าเว็บทำงานอย่างไร

ลำดับการอ่านข้อมูล (`loadSheet` ใน `index.html`):

| ลำดับ | วิธี | ได้อะไร |
|---|---|---|
| 1 | **Sheets API v4** (ถ้ามี `GOOGLE_API_KEY`) | สดทันที ครบทุกแถวรวมแถวที่ยุบกลุ่ม |
| 2 | `PUB_CSV_URL` (เผยแพร่เป็น CSV) | สด ครบทุกแถว |
| 3 | `data_sheet.js` snapshot จาก GitHub Actions | ช้าได้ถึง 10 นาที |
| 4 | gviz JSONP | สด แต่เห็นเฉพาะแถวที่ไม่ยุบกลุ่ม |

เรียกจริง 2 คำขอต่อชีต:

```
GET /v4/spreadsheets/{id}?fields=sheets.properties(sheetId,title)&key=…   → หาชื่อแท็บจาก gid
GET /v4/spreadsheets/{id}/values/'ชื่อแท็บ'?majorDimension=ROWS&valueRenderOption=FORMATTED_VALUE&key=…
```

A1 notation ใช้ **ชื่อแท็บ** ไม่ใช่ gid จึงต้องขอ metadata ก่อน (ผลลัพธ์ถูก cache ไว้ในหน่วยความจำต่อการโหลดหนึ่งครั้ง)
`FORMATTED_VALUE` ทำให้วันที่ออกมาเป็น `M/D/YYYY` เหมือน CSV เดิม โค้ด parse เดิมจึงใช้ได้ทันที
API ตัดเซลล์ว่างท้ายแถวทิ้ง โค้ดเลยเติมความกว้างให้ทุกแถวเท่ากันก่อนส่งเข้า `parseRows`

ถ้าอ่านผ่าน API ไม่สำเร็จ หน้าเว็บจะขึ้นแถบเหลืองบอกสาเหตุ แล้วใช้ข้อมูลสำรองลำดับถัดไปโดยอัตโนมัติ

## โควต้า

Sheets API ฟรี: อ่าน 300 คำขอ/นาที ต่อโปรเจกต์ และ 60 คำขอ/นาที ต่อผู้ใช้
หน้านี้ใช้ 4 คำขอต่อการโหลด (2 ชีต × 2 คำขอ) และรีโหลดอัตโนมัติทุก 15 นาที จึงห่างจากลิมิตมาก

## ถ้าต้องการให้ชีตเป็นส่วนตัว หรือให้เว็บเขียนกลับชีตได้

API key ทำไม่ได้ ต้องเลือกอย่างใดอย่างหนึ่ง:

- **Service account** (อ่านอย่างเดียว ชีตเป็นส่วนตัวได้) — สร้าง service account → แชร์ชีตให้อีเมลของมัน → เก็บ JSON key เป็น GitHub secret → ให้ `update_data.sh` ใน GitHub Actions ใช้ token แทน CSV ข้อมูลยังมาทาง snapshot (ช้าได้ถึง 10 นาที) แต่ชีตไม่ต้องเปิดสาธารณะ
- **OAuth (Google Identity Services)** — ผู้ใช้กด "เชื่อมบัญชี Google" บนหน้าเว็บ แล้วเว็บเขียนกลับชีตได้ในสิทธิ์ของคนนั้น เหมาะกับการบันทึกแผนจากหน้าปฏิทินลงชีตโดยตรง ใช้ scope `spreadsheets` และ OAuth client แบบ Web application (ไม่มี client secret ในหน้าเว็บ)
- **Google Apps Script Web App** — ทางที่เร็วที่สุดสำหรับการเขียนกลับ ไม่ต้องตั้ง Google Cloud project

---

# แก้สถานะจากหน้าเว็บแล้วเขียนกลับชีต (คอลัมน์ K)

API key อ่านได้อย่างเดียว การเขียนกลับจึงผ่าน **Google Apps Script Web App** ที่รันด้วยบัญชีเจ้าของชีต
โค้ดฝั่งสคริปต์อยู่ที่ `apps-script/Code.gs` ส่วนหน้าเว็บพร้อมใช้งานแล้ว รอแค่ลิงก์

## ขั้นตอน (~5 นาที)

1. เปิด Google Sheet "Tiktok Post Plan" → เมนู **ส่วนขยาย (Extensions) → Apps Script**
2. ลบโค้ดเดิมในไฟล์ `Code.gs` แล้ววางเนื้อหาจาก `apps-script/Code.gs` ในโปรเจกต์นี้
3. แก้บรรทัด `var TOKEN = '…'` เป็นข้อความลับของคุณเอง (สุ่มยาว ๆ เช่น `ct2026-7f3ad9b1c4`) แล้วกดบันทึก
4. กด **Deploy → New deployment** → เลือกชนิด **Web app**
   - **Execute as:** Me (บัญชีคุณ)
   - **Who has access:** Anyone
   - กด Deploy แล้วอนุญาตสิทธิ์ (ครั้งแรกจะมีหน้าเตือน "Google hasn't verified" → Advanced → Go to … (unsafe) เพราะเป็นสคริปต์ของคุณเอง)
5. คัดลอก **Web app URL** ที่ลงท้ายด้วย `/exec`
6. ใส่ใน `index.html`:
   - `const SHEET_WRITE_URL = 'https://script.google.com/macros/s/…/exec';`
   - `const SHEET_WRITE_TOKEN = 'ข้อความลับเดียวกับใน Code.gs';`
7. commit + push → หน้าเว็บจะเปลี่ยนป้ายสถานะในตารางเป็นเมนูเลือกได้ทันที

## หน้าเว็บทำงานอย่างไร

- ทุกคลิปจำ **เลขแถวจริงในชีต** (`sheetRow`) ตั้งแต่ตอน parse ข้อมูล
- เลือกสถานะใหม่ → หน้าเว็บอัปเดตทันที แล้ว POST `{token, row, status, expectTopic, expectStatus}` ไปที่ Apps Script
- ส่งแบบ `text/plain` เพื่อเลี่ยง CORS preflight ที่ Apps Script ไม่รองรับ
- Apps Script ตรวจ token → ตรวจว่าสถานะอยู่ในรายการที่อนุญาต → **ตรวจว่า Topic ในแถวนั้นตรงกับที่หน้าเว็บเห็น** (กันเขียนผิดแถวถ้ามีคนแทรก/ลบแถวในชีต) → เขียนคอลัมน์ K
- ถ้าพลาด หน้าเว็บคืนค่าสถานะเดิมและขึ้นข้อความบอกสาเหตุ
- เมนูจะแสดงเฉพาะเมื่ออ่านข้อมูลผ่าน Sheets API / CSV / snapshot เท่านั้น (โหมด gviz เลขแถวไม่ตรงเพราะข้ามแถวที่ซ่อน จึงล็อกเป็นอ่านอย่างเดียว)

## ข้อควรรู้เรื่องความปลอดภัย

Web app แบบ "Anyone" = ใครรู้ลิงก์ก็ยิงได้ จึงต้องมี token กำกับ และสคริปต์จำกัดไว้แล้วว่าเขียนได้เฉพาะ **คอลัมน์ K ของแท็บเดียว** เท่านั้น
token จะอยู่ในหน้าเว็บสาธารณะเช่นเดียวกับ API key — ถ้าไม่อยากให้เป็นแบบนั้น ทางเลือกคือใช้ OAuth (ผู้ใช้ล็อกอิน Google ก่อนแก้) ซึ่งทำเพิ่มได้ภายหลัง
