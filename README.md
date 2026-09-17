# 🏫 EduTimetable Tiểu Học - Phần Mềm Xếp Thời Khóa Biểu & Quản Lý Giảng Dạy Chuẩn GDPT 2018

> **Giải pháp sắp xếp thời khóa biểu thông minh, tự động, toàn diện và tối ưu cho các trường Tiểu học theo đúng chuẩn Chương trình Giáo dục Phổ thông 2018 (CTGDPT 2018 - 32 tiết/tuần).**

---

## 🌟 1. Giới Thiệu Tổng Quan

**EduTimetable Tiểu Học** là phần mềm quản lý giảng dạy và xếp thời khóa biểu chuyên biệt dành cho Ban Giám Hiệu, Tổ Chuyên Môn và Cán bộ phụ trách xếp lịch tại các trường Tiểu học.

Phần mềm tích hợp thuật toán giải bài toán thỏa mãn ràng buộc nâng cao (**Constraint Satisfaction Problem - CSP + Heuristic Scoring**), giúp tự động tính toán, phân bổ và xếp lịch cho toàn bộ các lớp trong trường trong vòng vài giây mà không bao giờ bị trùng giờ giáo viên, trùng phòng chức năng hay vi phạm buổi đăng ký nghỉ của giáo viên.

Toàn bộ dữ liệu được quản trị an toàn bằng **Cơ sở dữ liệu SQLite cục bộ (`edutimetable.db`)**, hoạt động hoàn toàn ngoại tuyến (offline), bảo mật tuyệt đối và có thể đóng gói thành ứng dụng Desktop Windows (`.exe`) để cài đặt hoặc chạy trực tiếp không cần mạng Internet.

---

## ✨ 2. Các Tính Năng Nổi Bật & Nâng Cấp Mới

### 🗄️ 2.1. Cơ Sở Dữ Liệu SQLite Cục Bộ (`edutimetable.db`)
- Quản lý toàn diện 9 bảng dữ liệu quan hệ: `school_info`, `periods`, `subjects`, `grade_metadata`, `grade_quotas`, `classes`, `teachers`, `rooms`, `assignments`, `timetable_slots`.
- Cơ chế ghi theo **SQL Transaction (ACID)** an toàn 100%, không lo mất dữ liệu khi mất điện đột ngột hoặc tắt máy.
- Hỗ trợ công cụ **Xuất / Nhập file CSDL SQLite (.db)** trực tiếp trên giao diện để sao lưu hoặc chuyển đổi giữa các máy tính.

### 🔬 2.2. Danh Mục Môn Học Chuẩn Hóa & Tách Độc Lập Khoa Học, Sử - Địa
- Phân định rõ ràng 2 môn học chuyên biệt ở Khối 4 và Khối 5 theo quy định mới nhất của Bộ GD&ĐT:
  - 🔬 **Khoa học** (`KHOA_HOC`): 2 tiết/tuần.
  - 🌏 **Lịch sử và Địa lí** (`LS_DL`): 2 tiết/tuần.
- Cho phép phân công 2 giáo viên khác nhau và bố trí linh hoạt các tiết trên thời khóa biểu.
- Hệ thống màu sắc nhận diện sang trọng, thẻ môn học trực quan, hiển thị rõ ràng mã viết tắt trên từng ô TKB.

### 📚 2.3. Quản Lý Định Mức Số Tiết Theo Khối & Thêm Môn Trực Quan
- Cấu hình chuẩn định mức **32 tiết/tuần** cho toàn bộ 5 khối (Khối 1 đến Khối 5).
- **Tính năng Thêm Môn thông minh**:
  - Tự động lọc và hiển thị danh sách các **môn học chưa có trong khối đang chọn**.
  - Cho phép người dùng chủ động chọn môn học mong muốn từ danh sách trực quan.
  - Thiết lập ngay: Số tiết/tuần (1-15 tiết), tùy chọn ghép tiết kép (2 tiết liền nhau) và phòng chức năng bộ môn yêu cầu.
  - Môn vừa thêm sẽ tự động được loại trừ khỏi danh sách môn chưa học, đảm bảo không bị trùng môn trong khối.

### 🤖 2.4. Thuật Toán Xếp Lịch Tự Động Thông Minh (AI Auto-Scheduler)
- Tự động xếp lịch toàn trường hoặc từng khối lớp chỉ trong 1 lần bấm.
- Đảm bảo 100% các ràng buộc cứng:
  - Không trùng giờ giáo viên (1 giáo viên không dạy 2 lớp cùng 1 tiết).
  - Không trùng phòng chức năng độc quyền (*Phòng Tin học, Sân Thể chất*).
  - Không xếp vào buổi đăng ký nghỉ của giáo viên (*ví dụ: nghỉ Sáng Thứ 2, Chiều Thứ 6*).
  - Tự động tránh xếp lịch vào các buổi sinh hoạt chung (*Chiều Thứ 4 toàn trường nghỉ sinh hoạt chuyên môn*).
  - Ưu tiên các môn văn hóa chính (*Toán, Tiếng Việt, Tiếng Anh*) vào buổi sáng; môn vận động, rèn luyện, củng cố vào buổi chiều.
  - Bảo toàn tuyệt đối các tiết học đã được bấm **Khóa cố định (🔒)**.

### 🛡️ 2.5. Bảng Kiểm Tra & Cảnh Báo Trùng Lịch Chi Tiết (Conflict Inspector)
- Cảnh báo tức thì theo thời gian thực (Real-time Conflict Detection):
  - **Trùng giờ dạy giáo viên**: Chỉ rõ tiết, thứ, giáo viên và các lớp bị trùng.
  - **Trùng phòng chức năng**: Cảnh báo khi có 2 lớp cùng sử dụng phòng bộ môn.
  - **Dạy vào buổi đăng ký nghỉ**: Hiển thị buổi nghỉ mà giáo viên đã đăng ký.
  - **Xếp vượt số tiết phân công**: Liệt kê chi tiết toàn bộ các vị trí tiết đang xếp trên TKB (*ví dụ: Thứ Hai (Tiết 1, Tiết 2) • Thứ Ba (Tiết 1)...*), giáo viên phụ trách và số tiết vượt định mức.
- Tích hợp nút **[Đến Lớp →]** trên từng thẻ lỗi để chuyển ngay vào Studio của lớp đó và chỉnh sửa tức thời.

### 🎨 2.6. Timetable Studio & Ma Trận Toàn Trường (Master Matrix)
- **Timetable Studio**: Kéo thả, bấm chọn thay đổi tiết học, hoán vị 2 tiết (Swap), khóa tiết (`Lock/Unlock`), kiểm tra định mức môn đã xếp so với phân công.
- **Master Matrix View**: Toàn cảnh thời khóa biểu 23 lớp học trên 1 màn hình duy nhất, lọc theo khối, xem theo buổi sáng/chiều, hỗ trợ rà soát nhanh.

### 📑 2.7. Xuất Bảng Tính Excel Đa Dạng & In Ấn A4 Chuẩn Văn Bản Hành Chính
- Xuất Excel chuyên nghiệp với thư viện `ExcelJS`:
  - Thời khóa biểu Toàn trường (Master Matrix).
  - Thời khóa biểu từng Lớp học.
  - Thời khóa biểu từng Giáo viên.
  - Bảng phân công chuyên môn và thống kê số tiết giảng dạy.
- In ấn A4 tối ưu: Tự động ngắt trang, tùy chọn hiển thị chữ ký Hiệu trưởng & Người lập biểu, dòng nghỉ trưa bán trú.

---

## 📋 3. Bảng Định Mức Chương Trình Chuẩn (32 tiết/tuần)

| STT | Môn Học / Hoạt Động Giáo Dục | Khối 1 | Khối 2 | Khối 3 | Khối 4 | Khối 5 | Ghi chú & Phòng học |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | **Tiếng Việt** | 12 | 10 | 7 | 7 | 7 | Phòng học tại lớp |
| 2 | **Toán** | 3 | 5 | 5 | 5 | 5 | Phòng học tại lớp |
| 3 | **Tiếng Anh** | 2 | 2 | 4 | 4 | 4 | GV chuyên trách Ngoại ngữ |
| 4 | **Tự nhiên và Xã hội (TNXH)** | 2 | 2 | 2 | - | - | Khối 1, 2, 3 |
| 5 | **Khoa học** | - | - | - | 2 | 2 | Khối 4, 5 (Môn chuyên biệt) |
| 6 | **Lịch sử và Địa lí** | - | - | - | 2 | 2 | Khối 4, 5 (Môn chuyên biệt) |
| 7 | **Công nghệ** | - | - | 1 | 1 | 1 | Khối 3, 4, 5 |
| 8 | **Tin học** | 1 | 1 | 1 | 1 | 1 | **Phòng máy tính chuyên dụng** |
| 9 | **Giáo dục thể chất (GDTC)** | 2 | 2 | 2 | 2 | 2 | **Sân trường / Sân thể chất** |
| 10 | **Đạo đức** | 1 | 1 | 1 | 1 | 1 | Phòng học tại lớp |
| 11 | **Âm nhạc** | 1 | 1 | 1 | 1 | 1 | GV chuyên trách Âm nhạc |
| 12 | **Mĩ thuật** | 1 | 1 | 1 | 1 | 1 | GV chuyên trách Mĩ thuật |
| 13 | **Hoạt động trải nghiệm (HĐTN)** | 3 | 3 | 3 | 3 | 3 | Chào cờ, HĐTN, Sinh hoạt lớp |
| 14 | **Đọc thư viện (Đọc TV)** | 1 | 1 | 1 | 1 | 1 | Lịch phòng Thư viện |
| 15 | **Hoạt động củng cố (HĐCC)** | 2 | 2 | 2 | - | - | Bổ trợ củng cố Khối 1, 2, 3 |
| 16 | **Kỹ năng công dân số (GDKNCDS)** | 1 | 1 | 1 | 1 | 1 | Giáo dục năng lực số Tiểu học |
| | **TỔNG CỘNG TIẾT / TUẦN** | **32** | **32** | **32** | **32** | **32** | **Đúng chuẩn 32 tiết/tuần** |

---

## 🧭 4. Quy Trình 5 Bước Sử Dụng Chuẩn

1. **Bước 1: Cài đặt trường học & Khung giờ tiết:**
   - Vào mục **[Thông Tin Trường]** để nhập tên trường, hiệu trưởng, người lập biểu, năm học và số tiết sáng/chiều.
2. **Bước 2: Cập nhật Danh bạ Giáo viên & Buổi đăng ký nghỉ:**
   - Vào tab **[Danh Sách Giáo Viên]** kiểm tra tên viết tắt, mã giáo viên, gán GVCN và tích chọn các buổi nghỉ cố định của giáo viên.
3. **Bước 3: Thiết lập Định Mức Khối & Phân Công Chuyên Môn:**
   - Kiểm tra định mức 32 tiết ở tab **[Định Mức Khối]**. Nếu cần bổ sung môn học, bấm **[+ Thêm Môn]** để chọn từ danh sách môn chưa học.
   - Nhấn **[Đồng Bộ Vào Phân Công GV]** để tự động tạo danh sách phân công tương ứng cho từng lớp.
4. **Bước 4: Xếp Lịch Tự Động Bằng AI & Khóa Tiết Cố Định:**
   - Tại tab **[Studio Xếp Lịch]**, khóa các tiết cố định (như Chào cờ sáng Thứ Hai, Sinh hoạt lớp chiều Thứ Sáu).
   - Bấm **[🤖 Tự Động Xếp Lịch]** $\rightarrow$ Hệ thống tự động xếp lịch toàn trường trong vài giây.
5. **Bước 5: Rà Soát Xung Đột, Xuất Excel & In Ấn A4:**
   - Mở **[Bảng Kiểm Tra Trùng Lịch]** để kiểm tra và xử lý dứt điểm các cảnh báo (nếu có).
   - Xuất file Excel lưu trữ hoặc in bản A4 gửi giáo viên và học sinh.

---

## 💻 5. Hướng Dẫn Cài Đặt, Phát Triển & Xuất File .EXE

### 5.1. Chạy trên môi trường phát triển (Web Dev)
```bash
# Cài đặt thư viện phụ thuộc
npm install

# Khởi chạy server phát triển
npm run dev
```
Truy cập trình duyệt: `http://localhost:5173`.

### 5.2. Chạy thử nghiệm ứng dụng Desktop Electron
```bash
npm run electron:dev
```

### 5.3. Xuất file thực thi Windows (.EXE)

Dự án cung cấp các phương thức đóng gói file thực thi độc lập:

#### Cách 1: Xuất file EXE Portable (Chạy ngay, không cần cài đặt) - Khuyên dùng:
```bash
npm run electron:build:portable
```
File thực thi sẽ được tạo tại thư mục `release/EduTimetable Tiểu Học 1.0.5.exe`. Bạn chỉ cần copy file này vào USB hoặc máy tính bất kỳ để mở lên chạy ngay.

#### Cách 2: Xuất file Cài Đặt Setup (NSIS Installer):
```bash
npm run electron:build:installer
```
File cài đặt sẽ được tạo tại thư mục `release/EduTimetable Tiểu Học Setup 1.0.5.exe`, hỗ trợ tạo shortcut ngoài màn hình Desktop và Start Menu.

#### Cách 3: Đóng gói Desktop tiêu chuẩn:
```bash
npm run desktop:build
```
Thư mục phần mềm hoàn chỉnh sẽ nằm trong `dist-desktop/EduTimetable_TieuHoc-win32-x64/EduTimetable_TieuHoc.exe`.

---

## 📂 6. Cấu Trúc Mã Nguồn

```plaintext
sap_xep_lich_day/
├── electron/                   # Backend Electron Desktop App
│   ├── main.cjs                # Tiến trình chính Electron & IPC Database SQLite
│   └── preload.cjs             # Cầu nối an toàn Context Bridge
├── src/
│   ├── components/             # Các thành phần giao diện React
│   │   ├── AssignmentManager.jsx    # Phân công chuyên môn từng lớp
│   │   ├── AutoScheduleModal.jsx    # Thuật toán AI xếp lịch tự động
│   │   ├── ConflictModal.jsx        # Bảng kiểm tra & cảnh báo trùng lịch
│   │   ├── GradeQuotaManager.jsx    # Định mức khối & modal thêm môn học
│   │   ├── MasterMatrixView.jsx     # Ma trận TKB toàn trường
│   │   ├── SubjectManager.jsx       # Quản lý danh mục môn học
│   │   ├── TeacherDirectory.jsx     # Danh bạ & hồ sơ giáo viên
│   │   ├── TimetableStudio.jsx      # Studio xếp lịch chi tiết từng lớp
│   │   └── UserGuideModal.jsx       # Sổ tay hướng dẫn sử dụng tương tác
│   ├── constants/              # Hằng số chuẩn GDPT 2018
│   │   ├── defaultCurriculum.js     # Định mức 32 tiết chuẩn của 5 khối
│   │   └── subjects.js              # Danh mục môn học, màu sắc, phòng học
│   ├── data/
│   │   ├── edutimetable.db          # Cơ sở dữ liệu SQLite cục bộ
│   │   └── savedData.json           # Dữ liệu dự phòng
│   ├── services/               # Xử lý nghiệp vụ lõi & thuật toán
│   │   ├── autoScheduler.js         # Thuật toán giải ràng buộc CSP AI
│   │   ├── conflictDetector.js      # Kiểm tra và định vị xung đột
│   │   ├── dbService.js             # API kết nối CSDL SQLite đa nền tảng
│   │   ├── excelService.js          # Xuất nhập bảng tính ExcelJS
│   │   └── sqliteManager.cjs        # Động cơ SQLite chuẩn WebAssembly (sql.js)
│   ├── App.jsx                 # Ứng dụng chính & điều phối dữ liệu
│   └── main.jsx                # Điểm khởi động React
├── package.json                # Cấu hình dự án & Scripts đóng gói
└── vite.config.js              # Cấu hình Vite & API SQLite Dev Server
```

---

## 👨‍💻 7. Bản Quyền & Tác Giả

- **Tác giả phát triển**: Châu Đàn (`chaudan0304`)
- **Kho lưu trữ GitHub**: [https://github.com/chaudan0304/sap_xep_lich_day](https://github.com/chaudan0304/sap_xep_lich_day)
- Phát triển phục vụ công tác chuyển đổi số và nâng cao hiệu quả quản trị giáo dục Tiểu học.
