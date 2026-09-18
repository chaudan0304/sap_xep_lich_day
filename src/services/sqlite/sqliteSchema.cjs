// src/services/sqlite/sqliteSchema.cjs
// Định nghĩa Schema 10 bảng SQLite chuẩn và xử lý migration an toàn

/**
 * Khởi tạo Schema đầy đủ cho cơ sở dữ liệu EduTimetable
 * Bảo toàn 100% các trường: code, shortName, vị trí, nhiệm vụ, định mức, phòng học, khóa tiết
 * @param {Object} db - SQLite database instance từ sql.js
 */
function createSchema(db) {
  db.run(`
    -- 1. Bảng thông tin trường học
    CREATE TABLE IF NOT EXISTS school_info (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      name TEXT NOT NULL,
      district TEXT,
      school_year TEXT,
      principal TEXT,
      scheduler TEXT,
      address TEXT,
      lunch_break TEXT,
      updated_at TEXT,
      extra_data TEXT
    );

    -- 2. Bảng cấu hình khung giờ tiết học
    CREATE TABLE IF NOT EXISTS periods (
      period_number INTEGER PRIMARY KEY,
      name TEXT,
      session TEXT NOT NULL,
      time TEXT NOT NULL,
      session_label TEXT,
      is_active INTEGER DEFAULT 1,
      extra_data TEXT
    );

    -- 3. Bảng danh mục môn học
    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      raw_id TEXT,
      name TEXT NOT NULL,
      short_name TEXT,
      category TEXT,
      color TEXT,
      bg TEXT,
      border TEXT,
      text_color TEXT,
      icon TEXT,
      default_room TEXT,
      description TEXT,
      extra_data TEXT
    );

    -- 4. Bảng metadata định mức khối
    CREATE TABLE IF NOT EXISTS grade_metadata (
      grade INTEGER PRIMARY KEY,
      grade_name TEXT,
      target_weekly_periods INTEGER DEFAULT 32,
      extra_data TEXT
    );

    -- Bảng định mức môn học theo khối
    CREATE TABLE IF NOT EXISTS grade_quotas (
      grade INTEGER NOT NULL,
      subject_id TEXT NOT NULL,
      weekly_periods INTEGER NOT NULL,
      max_morning INTEGER DEFAULT 0,
      max_afternoon INTEGER DEFAULT 0,
      allow_double INTEGER DEFAULT 0,
      room_type TEXT,
      extra_data TEXT,
      PRIMARY KEY (grade, subject_id)
    );

    -- 5. Bảng danh sách lớp học
    CREATE TABLE IF NOT EXISTS classes (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      grade INTEGER NOT NULL,
      student_count INTEGER DEFAULT 35,
      main_room TEXT,
      extra_data TEXT
    );

    -- 5b. Bảng danh mục Tổ Chuyên Môn / Văn Phòng động
    CREATE TABLE IF NOT EXISTS departments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      is_office INTEGER DEFAULT 0,
      created_at TEXT,
      updated_at TEXT,
      extra_data TEXT
    );

    -- 6. Bảng danh sách giáo viên (đầy đủ code / short_name / nhiệm vụ / định mức / department_id)
    CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY,
      tt INTEGER,
      name TEXT NOT NULL,
      code TEXT,
      short_name TEXT,
      department TEXT,
      department_id TEXT,
      position TEXT,
      task TEXT,
      assigned_periods INTEGER DEFAULT 0,
      dinh_muc INTEGER DEFAULT 23,
      max_periods_per_day INTEGER DEFAULT 7,
      max_periods_per_week INTEGER DEFAULT 23,
      off_sessions TEXT,
      fixed_days_off TEXT,
      phone TEXT,
      email TEXT,
      is_homeroom INTEGER DEFAULT 0,
      homeroom_class_id TEXT,
      color TEXT,
      extra_data TEXT
    );

    -- 7. Bảng phòng học chức năng (đầy đủ code, isSpecialized, allowMultiple)
    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT,
      type TEXT,
      capacity INTEGER DEFAULT 40,
      is_specialized INTEGER DEFAULT 0,
      allow_multiple INTEGER DEFAULT 0,
      extra_data TEXT
    );

    -- 8. Bảng phân công chuyên môn
    CREATE TABLE IF NOT EXISTS assignments (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      subject_id TEXT NOT NULL,
      teacher_id TEXT,
      weekly_periods INTEGER NOT NULL,
      room_type TEXT,
      allow_double INTEGER DEFAULT 0,
      extra_data TEXT
    );

    -- 9. Bảng ma trận thời khóa biểu (bảo toàn teacherCode, teacherName, teacherRaw, isLocked, note)
    CREATE TABLE IF NOT EXISTS timetable_slots (
      id TEXT PRIMARY KEY,
      class_id TEXT NOT NULL,
      day_of_week INTEGER NOT NULL,
      period INTEGER NOT NULL,
      subject_id TEXT,
      teacher_id TEXT,
      teacher_code TEXT,
      teacher_name TEXT,
      teacher_raw TEXT,
      subject_raw TEXT,
      room_id TEXT,
      is_locked INTEGER DEFAULT 0,
      note TEXT,
      extra_data TEXT
    );

    -- Bảng metadata ứng dụng
    CREATE TABLE IF NOT EXISTS app_metadata (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  // Migration an toàn cho các DB SQLite cũ: bổ sung cột department_id nếu chưa có
  try {
    db.run("ALTER TABLE teachers ADD COLUMN department_id TEXT;");
  } catch (e) {
    // Bảng mới tạo hoặc cột đã tồn tại
  }
}

module.exports = {
  createSchema
};
