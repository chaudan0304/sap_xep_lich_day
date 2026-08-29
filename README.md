# 🏫 EduTimetable Studio - Hệ Thống Xếp Thời Khóa Biểu & Quản Lý Giảng Dạy Tiểu Học

> **Giải pháp xếp thời khóa biểu thông minh, tự động và toàn diện chuẩn Chương trình Giáo dục Phổ thông 2018 (CTGDPT 2018) cho các trường Tiểu học.**

---

## 🌟 1. Giới Thiệu

**EduTimetable Studio** là ứng dụng web hiện đại giúp Ban Giám Hiệu và Tổ Chuyên Môn các trường Tiểu học dễ dàng quản lý phân công giảng dạy, cấu hình định mức chuyên môn theo khối lớp và tự động giải bài toán xếp thời khóa biểu phức tạp trong vài giây.

Dự án tích hợp thuật toán giải ràng buộc thông minh (**Constraint Satisfaction Problem - CSP + Heuristic Scoring**), loại bỏ hoàn toàn tình trạng trùng giờ giáo viên, trùng phòng máy/phòng chức năng, đồng thời hỗ trợ quản lý lịch nghỉ, phân bổ đều buổi sáng - chiều theo chuẩn sư phạm.

---

## ✨ 2. Tính Năng Nổi Bật

### 🤖 2.1. Thuật Toán Xếp Lịch Tự Động Thông Minh (Auto Scheduler)
- **Tự động xếp lịch toàn trường hoặc từng khối/lớp**: Giải quyết hàng trăm tiết học chỉ trong 1 lần click.
- **Tối ưu ràng buộc chặt chẽ**:
  - Không trùng giờ giáo viên dạy cùng lúc ở nhiều lớp.
  - Không trùng phòng chức năng chuyên dụng (*Phòng Tin học, Sân Thể chất...*).
  - Tôn trọng buổi nghỉ/ngày nghỉ đăng ký của từng giáo viên.
  - Tự động tránh xếp lịch vào các buổi nghỉ chung (*ví dụ: Chiều Thứ 4 sinh hoạt chuyên môn*).
  - Giới hạn số tiết tối đa trong ngày của mỗi giáo viên và phân bổ hợp lý các môn văn hóa chính (*Toán, Tiếng Việt*).

### 🎨 2.2. Studio Xếp Lịch Tương Tác Trực Quan (Timetable Studio)
- Giao diện trực quan với bảng lưới 5 ngày (Thứ Hai → Thứ Sáu), 7 tiết/ngày (4 tiết sáng, 3 tiết chiều).
- Cho phép xếp nhanh từng ô, khóa tiết cố định (`isLocked`), kiểm tra xung đột thời gian thực (**Real-time Conflict Detector**).
- Thẻ môn học được thiết kế sang trọng với màu sắc nhận diện chuẩn, biểu tượng trực quan.

### 📚 2.3. Danh Mục Môn Học Chuẩn CTGDPT 2018
Đầy đủ các môn học và hoạt động giáo dục:
* **Môn Cơ bản**: Tiếng Việt, Toán, Tự nhiên và Xã hội (TNXH), Lịch sử và Địa lí - Khoa học (LS-ĐL), Đạo đức, Hoạt động củng cố (HĐCC).
* **Môn Ngoại ngữ & Chuyên biệt**: Tiếng Anh, Tin học, Công nghệ, Giáo dục thể chất (GDTC), Âm nhạc, Mĩ thuật.
* **Hoạt động Giáo dục & Kỹ năng**: Hoạt động trải nghiệm (HĐTN), Đọc thư viện (Đọc TV), Giáo dục kĩ năng công dân số (GDKNCDS).

### 📊 2.4. Bảng Định Mức Số Tiết Chuẩn Theo Từng Khối Lớp (32 tiết/tuần)
Hệ thống được cấu hình định mức chính xác theo đúng chương trình thực tế của nhà trường:

| STT | Môn Học / Hoạt Động Giáo Dục | Khối 1 | Khối 2 | Khối 3 | Khối 4 | Khối 5 | Ghi chú & Phòng học |
| :---: | :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| 1 | **Tiếng Việt** | 12 | 10 | 7 | 7 | 7 | Phòng học tại lớp |
| 2 | **Toán** | 3 | 5 | 5 | 5 | 5 | Phòng học tại lớp |
| 3 | **Tiếng Anh** | 2 | 2 | 4 | 4 | 4 | GV chuyên trách Ngoại ngữ |
| 4 | **Tự nhiên và Xã hội (TNXH)** | 2 | 2 | 2 | - | - | Khối 1, 2, 3 |
| 5 | **Lịch sử - Địa lí & Khoa học** | - | - | - | 4 | 4 | Khối 4, 5 (Khoa học 2t + Sử-Địa 2t) |
| 6 | **Công nghệ** | - | - | 1 | 1 | 1 | Khối 3, 4, 5 |
| 7 | **Tin học** | 1 | 1 | 1 | 1 | 1 | **Phòng máy vi tính chuyên dụng** |
| 8 | **Giáo dục thể chất (GDTC)** | 2 | 2 | 2 | 2 | 2 | **Sân / Nhà đa năng thể chất** |
| 9 | **Đạo đức** | 1 | 1 | 1 | 1 | 1 | Phòng học tại lớp |
| 10 | **Âm nhạc** | 1 | 1 | 1 | 1 | 1 | GV chuyên trách Âm nhạc |
| 11 | **Mĩ thuật** | 1 | 1 | 1 | 1 | 1 | GV chuyên trách Mĩ thuật |
| 12 | **Hoạt động trải nghiệm (HĐTN)** | 3 | 3 | 3 | 3 | 3 | Sinh hoạt dưới cờ, HĐTN, SH lớp |
| 13 | **Đọc thư viện (Đọc TV)** | 1 | 1 | 1 | 1 | 1 | Theo lịch phân phòng Thư viện |
| 14 | **Hoạt động củng cố (HĐCC)** | 2 | 2 | 2 | - | - | Bổ trợ rèn luyện Khối 1, 2, 3 |
| 15 | **Kỹ năng công dân số (GDKNCDS)** | 1 | 1 | 1 | 1 | 1 | Giáo dục năng lực số Tiểu học |
| | **TỔNG CỘNG TIẾT / TUẦN** | **32** | **32** | **32** | **32** | **32** | **Đúng chuẩn 32 tiết/tuần** |

### 👩‍🏫 2.5. Quản Lý Giáo Viên & Phân Công Chuyên Môn
- Quản lý thông tin hồ sơ giáo viên, tổ chuyên môn, định mức tiết chuẩn/tuần.
- Phân định rõ ràng: **Giáo viên Chủ nhiệm (GVCN)** và **Giáo viên Bộ môn (Chuyên trách)**.
- Bảng thống kê định mức thời gian thực: So sánh số tiết phân công với số tiết thực tế đã xếp trên thời khóa biểu.
- Cấu hình các buổi nghỉ cố định của từng giáo viên.

### 🏫 2.5. Quản Lý Phòng Chức Năng (Room Timetable View)
- Theo dõi lịch sử dụng riêng biệt cho từng phòng học: *Phòng Tin học, Nhà thi đấu đa năng / Sân Thể chất, Sân trường...*
- Cảnh báo tức thì nếu 2 lớp trùng lịch sử dụng phòng chuyên môn độc quyền.

### 📊 2.6. Ma Trận Toàn Trường (Master Matrix View)
- Bảng tổng thể toàn bộ các lớp trong trường theo từng ngày, từng tiết.
- Giúp Ban Giám hiệu có cái nhìn bao quát 100% thời khóa biểu toàn trường trên một màn hình duy nhất.

### 📑 2.7. Nhập & Xuất File Excel / In Ấn Chuẩn A4
- **Xuất Excel đa dạng**:
  - Thời khóa biểu từng lớp học.
  - Thời khóa biểu cá nhân của từng giáo viên.
  - Ma trận TKB toàn trường.
  - Danh sách giáo viên và thống kê định mức giảng dạy.
- **Nhập dữ liệu Excel linh hoạt**: Tự động nhận diện cấu trúc file Excel TKB sẵn có của nhà trường.
- **In ấn A4 tối ưu**: Tự động ngắt trang, bố cục chuẩn văn bản hành chính sư phạm.

---

## 📂 3. Cấu Trúc Dữ Liệu Đầu Vào & Regex Phân Tích Excel

Cấu trúc thư mục dữ liệu mẫu: `public/data/` chứa các file Excel phục vụ việc trích xuất và đồng bộ dữ liệu vào hệ thống.

### 3.1. Danh Sách Các Tệp Excel Dữ Liệu

| Tên file | Mô tả |
|----------|--------|
| `Cơ sở vật chất Tân Mai.xlsx` | Danh sách phòng chức năng và khả năng sử dụng của các phòng học. |
| `Phân công chuyên môn 23-24 (GVCN).xlsx` | Phân công giáo viên chủ nhiệm cho các lớp trong năm học 2023-2024. |
| `STKB thực hiện từ tuần 01 (Thầy Trí).xlsx` | Thời khóa biểu thực hiện từ tuần 01, do Thầy Trí phụ trách. |
| `TKB các lớp - GVBM 23-24.xlsx` | Thời khóa biểu các lớp theo khối và giáo viên bộ môn trong năm học 2023-2024. |

---

### 3.2. Cấu Trúc Chi Tiết Của Từng Tệp Excel

#### A. `Cơ sở vật chất Tân Mai.xlsx`
**Mục đích:** Định nghĩa các phòng học và số lượng cơ bản (máy tính/chỗ ngồi).

| **Cột A** (Mã phòng) | **Cột B** (Tên phòng) | **Cột D** (Khả năng) | **Cột E** (Số lượng) |
|----------------------|-----------------------|-----------------------|-----------------------|
| `PH_CNTT_01`         | `Phòng học máy tính` | `phòng chức năng`      | `30` (máy tính)       |
| `PH_AM_NHAC`         | `Phòng học nhạc cụ`    | `phòng chức năng`      | `1`                   |

#### B. `Phân công chuyên môn 23-24 (GVCN).xlsx`
**Mục đích:** Phân công giáo viên chủ nhiệm (GVCN) cho từng lớp.

| **Cột A** (Mã lớp) | **Cột B** (Lớp) | **Cột C** (Tên GVCN) |
|----------------------|-----------------|----------------------|
| `1A1`                | `1A1`           | `NGUYỄN THỊ HƯƠNG`   |
| `1A2`                | `1A2`           | `TRẦN VĂN ĐẠT`      | 

#### C. `STKB thực hiện từ tuần 01 (Thầy Trí).xlsx`
**Mục đích:** Chứa thời khóa biểu chi tiết của 23 lớp học, bao gồm môn học, tiết học, buổi học, ngày học và giáo viên bộ môn (GVBM).

| **Cột A** (Thứ) | **Cột B** (Buổi) | **Cột C** (Tiết) | **Cột D** (1A1 - CN) | **Cột E** (1A1 - GV) | ... | **Cột AH** (5A5 - CN) | **Cột AI** (5A5 - GV) |
|------------------|-------------------|-----------------|---------------------|----------------------|-----|---------------------|----------------------|
| (Thứ 2..6)       | (Sáng/Chiều)      | (Tiết 1..7)     | (Môn học)           | (GVBM)               | ... | (Môn học)           | (GVBM)               |

#### D. `TKB các lớp - GVBM 23-24.xlsx`
**Mục đích:** Cung cấp định mức số tiết học cho từng môn của từng khối lớp trong năm học.

| **Cột A** (Môn học) | **Cột B** (Mã môn học) | **Cột C** (Khối 1) | **Cột D** (Khối 2) | **Cột E** (Khối 3) | **Cột F** (Khối 4) | **Cột G** (Khối 5) |
|----------------------|-------------------------|--------------------|--------------------|--------------------|--------------------|--------------------|
| `Toán`               | `TOAN`                  | `3`                | `5`                | `5`                | `5`                | `5`                |
| `Tiếng Việt`         | `TIENG_VIET`            | `12`               | `7`                | `7`                | `7`                | `7`                |

---

### 3.3. Các Biểu Thức Chính Quy (Regex) Phân Tích Dữ Liệu Excel

#### 🔹 Phân tích Môn học và Giáo viên Bộ môn (GVBM)
* **Regex:** `([A-Z0-9_]+)\s*\(?(.*?)\)?`
* **Ý nghĩa:**
  * Nhóm 1 `[A-Z0-9_]+`: Bắt mã hoặc tên viết tắt môn học (VD: `TOAN`, `TIENG_VIET`, `AM_NHAC`).
  * Nhóm 2 `\(.*?\)`: Bắt tên hoặc mã giáo viên trong ngoặc đơn (VD: `(Thầy Trí)`, `(Cô Mai)`).

#### 🔹 Phân tích Mã Phòng Học Chức Năng
* **Regex:** `(PH_\w+|SAN_\w+)`
* **Ý nghĩa:** Bắt các mã phòng bắt đầu bằng tiền tố `PH_` hoặc `SAN_` theo sau là các ký tự chữ/số.

#### 🔹 Phân tích Họ và Tên Giáo Viên Tiếng Việt
* **Regex:** `^([A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+(?:\s+[A-ZÀÁẠẢÃÂẦẤẬẨẪĂẰẮẶẲẴÈÉẸẺẼÊỀẾỆỂỄÌÍỊỈĨÒÓỌỎÕÔỒỐỘỔỖƠỜỚỢỞỠÙÚỤỦŨƯỪỨỰỬỮỲÝỴỶỸĐ][a-zàáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]+)*)$`
* **Ý nghĩa:** Chuẩn hóa và nhận diện chính xác họ tên đầy đủ có dấu tiếng Việt của cán bộ giáo viên.

#### 🔹 Phân tích Số lượng máy tính / Sức chứa phòng học
* **Regex:** `(\d+)\s*(?:máy|máy tính|chỗ|học sinh)?`
* **Ý nghĩa:** Trích xuất số lượng thiết bị hoặc dung lượng chỗ ngồi khả dụng từ chuỗi mô tả.

---

## 🛠️ 4. Công Nghệ Sử Dụng

- **Frontend Core**: [React 18](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Xử lý Excel**: [SheetJS (xlsx)](https://docs.sheetjs.com/)
- **Hiệu ứng**: [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Kiến trúc CSS**: Vanilla CSS Design Tokens, Glassmorphism, Micro-animations, HSL Colors.

---

## 🚀 5. Hướng Dẫn Cài Đặt & Chạy Ứng Dụng

### 1. Yêu cầu môi trường
- [Node.js](https://nodejs.org/) (phiên bản 18.x trở lên)
- Trình quản lý gói `npm` hoặc `yarn` / `pnpm`

### 2. Cài đặt các thư viện phụ thuộc
```bash
git clone https://github.com/chaudan0304/sap_xep_lich_day.git
cd sap_xep_lich_day
npm install
```

### 3. Khởi chạy môi trường phát triển (Dev Server)
```bash
npm run dev
```
Mở trình duyệt tại đường dẫn `http://localhost:5173` để trải nghiệm ứng dụng.

### 4. Đóng gói cho Production
```bash
npm run build
```

---

## 📁 6. Cấu Trúc Thư Mục Dự Án

```plaintext
sap_xep_lich_day/
├── public/                     # Static assets & dữ liệu Excel mẫu
│   └── data/                   # Các file Excel đầu vào
├── src/
│   ├── components/             # React UI Components
│   │   ├── AssignmentManager.jsx    # Quản lý phân công chuyên môn
│   │   ├── AutoScheduleModal.jsx    # Modal thuật toán xếp TKB tự động
│   │   ├── ConflictModal.jsx        # Bảng chi tiết cảnh báo xung đột
│   │   ├── ExcelModal.jsx           # Import / Export Excel
│   │   ├── GradeQuotaManager.jsx    # Cấu hình định mức môn theo khối
│   │   ├── Header.jsx               # Thanh điều hướng chính
│   │   ├── MasterMatrixView.jsx     # Ma trận TKB toàn trường
│   │   ├── RoomTimetableView.jsx    # TKB theo phòng chức năng
│   │   ├── SubjectManager.jsx       # Quản lý danh mục môn học
│   │   ├── TeacherDirectory.jsx     # Danh bạ & hồ sơ giáo viên
│   │   └── TimetableStudio.jsx      # Studio xếp TKB từng lớp
│   ├── constants/              # Hằng số & Cấu hình mặc định
│   │   ├── defaultCurriculum.js     # Khung định mức 32 tiết CTGDPT 2018
│   │   └── subjects.js              # Danh mục môn học & thuộc tính giao diện
│   ├── data/                   # Dữ liệu mẫu & mẫu trường thực tế
│   │   ├── quynhLocSchoolData.js    # Dữ liệu thực tế Tiểu học Quỳnh Lộc B
│   │   ├── sampleData.js            # Trình tạo dữ liệu mẫu
│   │   └── savedData.json           # Dữ liệu sao lưu
│   ├── services/               # Nghiệp vụ & Thuật toán
│   │   ├── autoScheduler.js         # Thuật toán xếp lịch tự động (CSP Solver)
│   │   ├── conflictDetector.js      # Kiểm tra xung đột thời gian thực
│   │   └── excelService.js          # Xử lý đọc/ghi bảng tính Excel
│   ├── App.jsx                 # Ứng dụng chính & đồng bộ dữ liệu
│   ├── index.css               # Hệ thống Style & Token
│   └── main.jsx                # Điểm khởi chạy React
├── package.json
├── vite.config.js
└── README.md
```

---

## 👨‍💻 7. Tác Giả & Bản Quyền

- **Tác giả**: [chaudan0304](https://github.com/chaudan0304)
- **Kho lưu trữ GitHub**: [https://github.com/chaudan0304/sap_xep_lich_day](https://github.com/chaudan0304/sap_xep_lich_day)
- Phát triển phục vụ công tác chuyển đổi số và tối ưu hóa quản lý thời khóa biểu giáo dục tiểu học.
