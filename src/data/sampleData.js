// src/data/sampleData.js
// Dữ liệu mẫu trường Tiểu học Ánh Dương (Chuẩn CTGDPT 2018)

export const SAMPLE_ROOMS = [
  { id: 'PHONG_TIN_HOC', name: 'Phòng Tin học 1', code: 'TIN-01', capacity: 35, isSpecialized: true },
  { id: 'SAN_THE_CHAT', name: 'Nhà thi đấu / Sân Thể chất', code: 'SAN-TC', capacity: 100, isSpecialized: true, allowMultiple: true }
];

export const SAMPLE_CLASSES = [
  { id: '1A1', name: 'Lớp 1A1', grade: 1, homeroomTeacherId: 'GV01', mainRoom: 'P.101', studentCount: 32 },
  { id: '1A2', name: 'Lớp 1A2', grade: 1, homeroomTeacherId: 'GV02', mainRoom: 'P.102', studentCount: 30 },
  { id: '2A1', name: 'Lớp 2A1', grade: 2, homeroomTeacherId: 'GV03', mainRoom: 'P.201', studentCount: 34 },
  { id: '2A2', name: 'Lớp 2A2', grade: 2, homeroomTeacherId: 'GV04', mainRoom: 'P.202', studentCount: 33 },
  { id: '3A1', name: 'Lớp 3A1', grade: 3, homeroomTeacherId: 'GV05', mainRoom: 'P.301', studentCount: 35 },
  { id: '3A2', name: 'Lớp 3A2', grade: 3, homeroomTeacherId: 'GV06', mainRoom: 'P.302', studentCount: 35 },
  { id: '4A1', name: 'Lớp 4A1', grade: 4, homeroomTeacherId: 'GV07', mainRoom: 'P.401', studentCount: 36 },
  { id: '4A2', name: 'Lớp 4A2', grade: 4, homeroomTeacherId: 'GV08', mainRoom: 'P.402', studentCount: 35 },
  { id: '5A1', name: 'Lớp 5A1', grade: 5, homeroomTeacherId: 'GV09', mainRoom: 'P.501', studentCount: 33 },
  { id: '5A2', name: 'Lớp 5A2', grade: 5, homeroomTeacherId: 'GV10', mainRoom: 'P.502', studentCount: 34 }
];

export const SAMPLE_TEACHERS = [
  // GVCN
  { id: 'GV01', name: 'Cô Nguyễn Thị Mai', code: 'MAI.NT', department: 'Tổ Khối 1', isHomeroom: true, homeroomClassId: '1A1', phone: '0912.111.001', email: 'mai.nguyen@anhduong.edu.vn', maxPeriodsPerDay: 6, offSessions: [], color: '#3b82f6' },
  { id: 'GV02', name: 'Cô Trần Thu Trang', code: 'TRANG.TT', department: 'Tổ Khối 1', isHomeroom: true, homeroomClassId: '1A2', phone: '0912.111.002', email: 'trang.tran@anhduong.edu.vn', maxPeriodsPerDay: 6, offSessions: ['4_afternoon'], color: '#ec4899' },
  { id: 'GV03', name: 'Cô Lê Hoàng Yến', code: 'YEN.LH', department: 'Tổ Khối 2', isHomeroom: true, homeroomClassId: '2A1', phone: '0912.111.003', email: 'yen.le@anhduong.edu.vn', maxPeriodsPerDay: 6, offSessions: [], color: '#8b5cf6' },
  { id: 'GV04', name: 'Thầy Phạm Văn Hùng', code: 'HUNG.PV', department: 'Tổ Khối 2', isHomeroom: true, homeroomClassId: '2A2', phone: '0912.111.004', email: 'hung.pham@anhduong.edu.vn', maxPeriodsPerDay: 6, offSessions: ['3_afternoon'], color: '#10b981' },
  { id: 'GV05', name: 'Cô Bùi Minh Ngọc', code: 'NGOC.BM', department: 'Tổ Khối 3', isHomeroom: true, homeroomClassId: '3A1', phone: '0912.111.005', email: 'ngoc.bui@anhduong.edu.vn', maxPeriodsPerDay: 6, offSessions: [], color: '#f59e0b' },
  { id: 'GV06', name: 'Thầy Đỗ Quốc Bình', code: 'BINH.DQ', department: 'Tổ Khối 3', isHomeroom: true, homeroomClassId: '3A2', phone: '0912.111.006', email: 'binh.do@anhduong.edu.vn', maxPeriodsPerDay: 6, offSessions: ['5_morning'], color: '#06b6d4' },
  { id: 'GV07', name: 'Cô Đặng Thùy Dương', code: 'DUONG.DT', department: 'Tổ Khối 4-5', isHomeroom: true, homeroomClassId: '4A1', phone: '0912.111.007', email: 'duong.dang@anhduong.edu.vn', maxPeriodsPerDay: 6, offSessions: [], color: '#6366f1' },
  { id: 'GV08', name: 'Thầy Vũ Minh Tuấn', code: 'TUAN.VM', department: 'Tổ Khối 4-5', isHomeroom: true, homeroomClassId: '4A2', phone: '0912.111.008', email: 'tuan.vu@anhduong.edu.vn', maxPeriodsPerDay: 6, offSessions: ['2_afternoon'], color: '#14b8a6' },
  { id: 'GV09', name: 'Cô Phan Kiều Oanh', code: 'OANH.PK', department: 'Tổ Khối 4-5', isHomeroom: true, homeroomClassId: '5A1', phone: '0912.111.009', email: 'oanh.phan@anhduong.edu.vn', maxPeriodsPerDay: 6, offSessions: [], color: '#d946ef' },
  { id: 'GV10', name: 'Thầy Hoàng Đức Nam', code: 'NAM.HD', department: 'Tổ Khối 4-5', isHomeroom: true, homeroomClassId: '5A2', phone: '0912.111.010', email: 'nam.hoang@anhduong.edu.vn', maxPeriodsPerDay: 6, offSessions: [], color: '#f97316' },

  // GV Bộ Môn Ngoại Ngữ
  { id: 'GV11', name: 'Cô Jennifer Hoàng Lan', code: 'LAN.JH', department: 'Tổ Ngoại Ngữ', isHomeroom: false, homeroomClassId: null, phone: '0912.222.011', email: 'lan.english@anhduong.edu.vn', maxPeriodsPerDay: 5, offSessions: ['6_afternoon'], color: '#7c3aed' },
  { id: 'GV12', name: 'Thầy Nguyễn Trí Dũng', code: 'DUNG.NT', department: 'Tổ Ngoại Ngữ', isHomeroom: false, homeroomClassId: null, phone: '0912.222.012', email: 'dung.english@anhduong.edu.vn', maxPeriodsPerDay: 5, offSessions: ['2_afternoon'], color: '#a855f7' },

  // GV Bộ Môn Tin Học & Công Nghệ
  { id: 'GV13', name: 'Thầy Trần Đình Trọng', code: 'TRONG.TD', department: 'Tổ Tin Học', isHomeroom: false, homeroomClassId: null, phone: '0912.333.013', email: 'trong.tin@anhduong.edu.vn', maxPeriodsPerDay: 5, offSessions: ['4_morning'], color: '#0284c7' },
  { id: 'GV14', name: 'Cô Phạm Thị Thu', code: 'THU.PT', department: 'Tổ Tin Học', isHomeroom: false, homeroomClassId: null, phone: '0912.333.014', email: 'thu.tin@anhduong.edu.vn', maxPeriodsPerDay: 5, offSessions: [], color: '#38bdf8' },

  // GV Bộ Môn Giáo Dục Thể Chất
  { id: 'GV15', name: 'Thầy Ngô Quốc Toàn', code: 'TOAN.NQ', department: 'Tổ Thể Chất - Nghệ Thuật', isHomeroom: false, homeroomClassId: null, phone: '0912.444.015', email: 'toan.gdtc@anhduong.edu.vn', maxPeriodsPerDay: 5, offSessions: [], color: '#059669' },
  { id: 'GV16', name: 'Thầy Lý Văn Long', code: 'LONG.LV', department: 'Tổ Thể Chất - Nghệ Thuật', isHomeroom: false, homeroomClassId: null, phone: '0912.444.016', email: 'long.gdtc@anhduong.edu.vn', maxPeriodsPerDay: 5, offSessions: ['5_afternoon'], color: '#10b981' },

  // GV Bộ Môn Âm Nhạc
  { id: 'GV17', name: 'Cô Vũ Khánh Linh', code: 'LINH.VK', department: 'Tổ Thể Chất - Nghệ Thuật', isHomeroom: false, homeroomClassId: null, phone: '0912.555.017', email: 'linh.music@anhduong.edu.vn', maxPeriodsPerDay: 5, offSessions: [], color: '#d97706' },

  // GV Bộ Môn Mỹ Thuật
  { id: 'GV18', name: 'Thầy Hà Huy Hoàng', code: 'HOANG.HH', department: 'Tổ Thể Chất - Nghệ Thuật', isHomeroom: false, homeroomClassId: null, phone: '0912.555.018', email: 'hoang.art@anhduong.edu.vn', maxPeriodsPerDay: 5, offSessions: [], color: '#ea580c' },

  // GV Tự chọn / Bồi dưỡng kỹ năng sống
  { id: 'GV19', name: 'Cô Trịnh Thanh Thảo', code: 'THAO.TT', department: 'Tổ Kỹ Năng Sống', isHomeroom: false, homeroomClassId: null, phone: '0912.666.019', email: 'thao.kns@anhduong.edu.vn', maxPeriodsPerDay: 6, offSessions: [], color: '#65a30d' }
];

// Hàm tự động sinh phân công chuyên môn thông minh và an toàn
export const generateSampleAssignments = (classes, gradeQuotas, teachers) => {
  const assignments = [];

  const englishTeachers = teachers.filter(t => t.department?.includes('Ngoại Ngữ') || t.name.includes('Anh') || t.task?.includes('Tiếng Anh') || t.id === 'GV11' || t.id === 'GV12');
  const itTeachers = teachers.filter(t => t.department?.includes('Tin') || t.name.includes('Châu Đàn') || t.task?.includes('Tin') || t.id === 'GV13' || t.id === 'GV14');
  const sportTeachers = teachers.filter(t => t.department?.includes('Thể Chất') || t.name.includes('Mừng') || t.name.includes('Cường') || t.task?.includes('GDTC') || t.id === 'GV15' || t.id === 'GV16');
  const musicTeachers = teachers.filter(t => t.name.includes('Hằng') || t.task?.includes('Âm nhạc') || t.id === 'GV17');
  const artTeachers = teachers.filter(t => t.name.includes('Huyền') || t.task?.includes('Mỹ thuật') || t.task?.includes('Mĩ thuật') || t.id === 'GV18');

  const fallbackTeacherId = teachers[0]?.id || 'GV01';

  classes.forEach((cls, index) => {
    const quota = gradeQuotas[cls.grade];
    if (!quota) return;

    const gvHome = teachers.find(t => t.id === cls.homeroomTeacherId || t.homeroomClassId === cls.id);
    const defaultHomeId = gvHome ? gvHome.id : fallbackTeacherId;

    quota.subjects.forEach(sub => {
      let teacherId = defaultHomeId;

      // Phân bổ GV bộ môn luân phiên
      if (sub.subjectId === 'TIENG_ANH') {
        if (englishTeachers.length > 0) {
          teacherId = englishTeachers[index % englishTeachers.length].id;
        }
      } else if (sub.subjectId === 'TIN_HOC') {
        if (itTeachers.length > 0) {
          teacherId = itTeachers[index % itTeachers.length].id;
        }
      } else if (sub.subjectId === 'THE_DUC') {
        if (sportTeachers.length > 0) {
          teacherId = sportTeachers[index % sportTeachers.length].id;
        }
      } else if (sub.subjectId === 'AM_NHAC') {
        if (musicTeachers.length > 0) {
          teacherId = musicTeachers[index % musicTeachers.length].id;
        }
      } else if (sub.subjectId === 'MY_THUAT') {
        if (artTeachers.length > 0) {
          teacherId = artTeachers[index % artTeachers.length].id;
        }
      }

      assignments.push({
        id: `ASG_${cls.id}_${sub.subjectId}`,
        classId: cls.id,
        grade: cls.grade,
        subjectId: sub.subjectId,
        weeklyPeriods: sub.weeklyPeriods,
        teacherId: teacherId || defaultHomeId,
        roomType: sub.roomType,
        allowDouble: sub.allowDouble,
        maxMorning: sub.maxMorning,
        maxAfternoon: sub.maxAfternoon
      });
    });
  });

  return assignments;
};

// Khởi tạo thời khóa biểu rỗng
export const initializeEmptyTimetable = (classes) => {
  const timetable = {};

  classes.forEach(cls => {
    timetable[cls.id] = {};
    for (let day = 2; day <= 6; day++) {
      timetable[cls.id][day] = {};
      for (let period = 1; period <= 7; period++) {
        timetable[cls.id][day][period] = null;
      }
    }
  });

  return timetable;
};
