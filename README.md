# Visual Control System v2.0 - Drawing Mode

ระบบตรวจสอบตำแหน่งและการเอียงของกล่องด้วย Computer Vision พร้อมระบบลากวางกรอบแบบ Interactive

## 🆕 คุณสมบัติใหม่ใน v2.0

### 📦 ระบบลากวางกรอบ (Drawing Mode)
- **ปุ่มที่ 1**: ลากวางกรอบรอบกล่องแบบคลี่ (สี่เหลี่ยมผืนผ้า)
- **ปุ่มที่ 2**: ลากวางกรอบจุดสำคัญสำหรับตรวจสอบการเอียงและเคลื่อน
- **การนับกล่อง**: กล่อง 1 หลุดหน้าจอ → กล่อง 2 เลื่อนเข้ามา

### 🎯 ระบบตรวจจับที่ปรับปรุงใหม่
- ตรวจจับในพื้นที่เฉพาะที่กำหนดด้วยการลากวาง
- ความแม่นยำสูงขึ้นด้วยการระบุจุดสำคัญ
- รองรับทั้งโหมดใหม่และโหมดเดิม (Legacy Mode)

## 🚀 การติดตั้งและรัน

```bash
# Clone โปรเจกต์
git clone [your-repo-url]
cd visual-control-system

# ติดตั้ง dependencies
npm install

# รันโปรเจกต์
npm start
```

## 🎮 วิธีการใช้งาน

### 1. เตรียมความพร้อม
1. เปิดแอปพลิเคชัน
2. กดปุ่ม **"🎥 เปิดกล้อง"**
3. ตรวจสอบภาพจากกล้องว่าชัดเจน

### 2. ตั้งค่ากรอบอ้างอิง
1. **กรอบกล่อง**: กดปุ่ม **"📦 1. วางกรอบกล่อง"** → ลากเมาส์รอบกล่อง
2. **กรอบจุดสำคัญ**: กดปุ่ม **"🎯 2. วางกรอบจุดสำคัญ"** → ลากเมาส์ในจุดที่ต้องการตรวจสอบ

### 3. เริ่มตรวจสอบ
1. กดปุ่ม **"▶️ เริ่มตรวจสอบ"**
2. ระบบจะแจ้งเตือนเมื่อพบความผิดปกติ
3. ดูสถิติการทำงานได้ที่ส่วน **"📊 ข้อมูลการตรวจสอบ"**

## 📋 คุณสมบัติหลัก

### ✅ ระบบตรวจจับ
- ตรวจสอบตำแหน่งกล่องแบบเรียลไทม์
- ตรวจจับการเอียงและการเลื่อนตำแหน่ง
- ปรับค่าความไวได้ตามต้องการ

### 🔊 ระบบแจ้งเตือน
- แจ้งเตือนผ่านเสียง (Web Audio API)
- รองรับลำโพง Bluetooth (แบบจำลอง)
- แจ้งเตือนแบบ Visual บนหน้าจอ

### 📊 ระบบสถิติ
- นับจำนวนกล่องที่ผ่าน
- แยกสถิติกล่องปกติ/ผิดปกติ
- คำนวณความแม่นยำ

### ⚙️ การตั้งค่า
- **ความเอียง**: 1-15 องศา
- **การเลื่อนตำแหน่ง**: 5-100 พิกเซล
- **เกณฑ์การตรวจจับ**: 10-90%

## 🛠️ เทคโนโลยีที่ใช้

### Frontend
- **HTML5**: Canvas API สำหรับวาดกรอบ
- **CSS3**: Flexbox/Grid และ Animation
- **JavaScript ES6+**: Modules และ Classes

### APIs
- **Web Camera API**: เข้าถึงกล้อง
- **Web Audio API**: เล่นเสียงเตือน
- **Web Bluetooth API**: เชื่อมต่อลำโพง (แบบจำลอง)
- **Canvas API**: วาดกรอบและการตรวจจับ

### Computer Vision
- **Edge Detection**: Canny Algorithm
- **Contour Detection**: รูปร่างและขอบเขต
- **Feature Extraction**: วิเคราะห์จุดสำคัญ

## 📁 โครงสร้างไฟล์

```
visual-control-system/
├── index.html              # หน้าหลัก
├── css/
│   ├── style.css          # สไตล์หลัก
│   ├── components.css     # คอมโพเนนต์
│   └── responsive.css     # Responsive Design
├── js/
│   ├── main.js           # แอปพลิเคชันหลัก
│   ├── camera.js         # จัดการกล้อง
│   ├── detection.js      # ระบบตรวจจับ
│   ├── audio.js          # ระบบเสียง
│   ├── bluetooth.js      # Bluetooth (จำลอง)
│   └── utils.js          # ฟังก์ชันเสริม
├── assets/               # ไฟล์สื่อ
├── config/              # การตั้งค่า
├── docs/                # เอกสาร
└── lib/                 # ไลบรารี่เสริม
```

## ⌨️ คีย์บอร์ดช็อตคัท

- **Space**: เริ่ม/หยุดการตรวจสอบ
- **Ctrl+B**: วางกรอบกล่อง
- **Ctrl+K**: วางกรอบจุดสำคัญ
- **Ctrl+C**: ล้างกรอบทั้งหมด
- **Ctrl+T**: ทดสอบเสียง
- **Escape**: ออกจากโหมดเต็มจอ

## 🔧 การตั้งค่าขั้นสูง

### 1. ปรับค่าความไว
```javascript
// ในไฟล์ main.js
this.settings = {
    rotationSensitivity: 5,    // องศา
    positionSensitivity: 20,   // พิกเซล
    detectionThreshold: 50     // เปอร์เซ็นต์
};
```

### 2. ปรับการตรวจจับ
```javascript
// ในไฟล์ detection.js
this.config = {
    gaussianBlur: 5,      // ความเบลอ
    cannyLower: 50,       // เกณฑ์ขอบล่าง
    cannyUpper: 150,      // เกณฑ์ขอบบน
    morphKernel: 3        // ขนาด Kernel
};
```

## 📱 การรองรับ

### เบราว์เซอร์
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+
- ✅ Edge 80+

### อุปกรณ์
- ✅ Desktop/Laptop
- ✅ Tablet
- ✅ Mobile (จอใหญ่)

### ฟีเจอร์
- ✅ Web Camera
- ✅ Web Audio
- ⚠️ Web Bluetooth (ใช้แบบจำลอง)
- ✅ Fullscreen
- ✅ Responsive Design

## 🐛 การแก้ไขปัญหา

### ปัญหาที่พบบ่อย

1. **กล้องไม่เปิด**
   ```
   - ตรวจสอบ Permission
   - ใช้ HTTPS (บังคับสำหรับ Camera API)
   - รีโหลดหน้าเว็บ
   ```

2. **ไม่มีเสียงเตือน**
   ```
   - กดปุ่มใดๆ เพื่อ Resume Audio Context
   - ตรวจสอบ Volume
   - ลองปุ่ม "ทดสอบเสียง"
   ```

3. **การลากวางไม่ทำงาน**
   ```
   - ตรวจสอบว่าเปิดกล้องแล้ว
   - กดปุ่มวางกรอบก่อนลาก
   - ลองรีเฟรชหน้าเว็บ
   ```

4. **ตรวจจับไม่แม่นยำ**
   ```
   - ปรับค่าความไวในการตั้งค่า
   - ตรวจสอบแสงส่อง
   - วางกรอบใหม่ให้ชัดเจน
   ```

## 📈 Performance Tips

1. **ความเร็ว**
   - ปิด Tab อื่นๆ ที่ไม่ใช้
   - ใช้ Resolution กล้องที่เหมาะสม
   - ปรับ Detection Threshold

2. **ความแม่นยำ**
   - แสงส่องเพียงพอและสม่ำเสมอ
   - วางกรอบในตำแหน่งที่มีคอนทราสต์ชัด
   - หลีกเลี่ยงการสั่นไหวของกล้อง

## 🔮 อนาคต (Roadmap)

### v2.1
- [ ] บันทึกวิดีโอเมื่อพบปัญหา
- [ ] Export รายงาน PDF
- [ ] การตั้งค่าโปรไฟล์หลายแบบ

### v2.2
- [ ] Machine Learning Detection
- [ ] Cloud Storage Integration
- [ ] Multi-Camera Support

### v3.0
- [ ] Real-time Analytics Dashboard
- [ ] API Integration
- [ ] Mobile App

## 📞 ติดต่อและสนับสนุน

- **Email**: developer@example.com
- **Documentation**: [docs.example.com](docs.example.com)
- **Issues**: [GitHub Issues](https://github.com/yourname/visual-control-system/issues)

## 📜 License

MIT License - ใช้งานได้อย่างเสรี

---

**Visual Control System v2.0** - Made with ❤️ for Manufacturing Quality Control