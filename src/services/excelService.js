// src/services/excelService.js
// Xử lý Toàn diện Nhập & Xuất File Excel (SheetJS XLSX)
// Tương thích cả định dạng chuẩn Bộ GD&ĐT và định dạng STKB thực tế nhiều Sheet (Khối 1 -> 5, Phân công chuyên môn)

import * as XLSX from 'xlsx';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import { DAYS_OF_WEEK, PERIODS, DEFAULT_GRADE_QUOTAS } from '../constants/defaultCurriculum';
import { SAMPLE_ROOMS, SAMPLE_CLASSES, SAMPLE_TEACHERS, generateSampleAssignments } from '../data/sampleData';

/**
 * 1. TẢI FILE MẪU CHUẨN ĐỊNH MỨC (.xlsx)
 */
export const downloadExcelTemplate = () => {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Định Mức Theo Khối
  const quotaRows = [];
  Object.values(DEFAULT_GRADE_QUOTAS).forEach(g => {
    g.subjects.forEach(s => {
      quotaRows.push({
        'Khối': g.grade,
        'Mã Môn': s.subjectId,
        'Tên Môn Học': DEFAULT_SUBJECTS[s.subjectId]?.name || s.subjectId,
        'Số Tiết / Tuần': s.weeklyPeriods,
        'Số Tiết Sáng Tối Đa': s.maxMorning,
        'Số Tiết Chiều Tối Đa': s.maxAfternoon,
        'Cho Phép Tiết Kép (2T)': s.allowDouble ? 'CÓ' : 'KHÔNG',
        'Phòng Chức Năng Yêu Cầu': s.roomType || 'LOP_HOC'
      });
    });
  });
  const wsQuota = XLSX.utils.json_to_sheet(quotaRows);
  XLSX.utils.book_append_sheet(wb, wsQuota, 'Dinh_Muc_Theo_Khoi');

  // Sheet 2: Danh Sách Giáo Viên
  const teacherRows = SAMPLE_TEACHERS.map(t => ({
    'Mã GV': t.id,
    'Họ và Tên': t.name,
    'Mã Viết Tắt': t.code,

    'Là GV Chủ Nhiệm (CÓ/KHÔNG)': t.isHomeroom ? 'CÓ' : 'KHÔNG',
    'Chủ Nhiệm Lớp': t.homeroomClassId || '',
    'Số Điện Thoại': t.phone || '',
    'Email': t.email || '',
    'Số Tiết Tối Đa / Ngày': t.maxPeriodsPerDay || 6,
    'Buổi Đăng Ký Nghỉ': (t.offSessions || []).join(', ')
  }));
  const wsTeacher = XLSX.utils.json_to_sheet(teacherRows);
  XLSX.utils.book_append_sheet(wb, wsTeacher, 'Danh_Sach_Giao_Vien');

  // Sheet 3: Danh Sách Lớp
  const classRows = SAMPLE_CLASSES.map(c => ({
    'Mã Lớp': c.id,
    'Tên Lớp': c.name,
    'Khối': c.grade,
    'Mã GVCN': c.homeroomTeacherId,
    'Phòng Học Chính': c.mainRoom || 'P.101',
    'Sĩ Số Học Sinh': c.studentCount || 35
  }));
  const wsClass = XLSX.utils.json_to_sheet(classRows);
  XLSX.utils.book_append_sheet(wb, wsClass, 'Danh_Sach_Lop');

  // Sheet 4: Phòng Chức Năng
  const roomRows = SAMPLE_ROOMS.map(r => ({
    'Mã Phòng': r.id,
    'Tên Phòng Chức Năng': r.name,
    'Mã Ký Hiệu': r.code,
    'Sức Chứa (Học Sinh)': r.capacity
  }));
  const wsRoom = XLSX.utils.json_to_sheet(roomRows);
  XLSX.utils.book_append_sheet(wb, wsRoom, 'Phong_Chuc_Nang');

  // Sheet 5: Phân Công Giảng Dạy Mẫu
  const sampleAsg = generateSampleAssignments(SAMPLE_CLASSES, DEFAULT_GRADE_QUOTAS, SAMPLE_TEACHERS);
  const asgRows = sampleAsg.map(a => ({
    'Mã Lớp': a.classId,
    'Khối': a.grade,
    'Mã Môn Học': a.subjectId,
    'Mã Giáo Viên Phụ Trách': a.teacherId,
    'Số Tiết / Tuần': a.weeklyPeriods,
    'Phòng Chức Năng': a.roomType
  }));
  const wsAsg = XLSX.utils.json_to_sheet(asgRows);
  XLSX.utils.book_append_sheet(wb, wsAsg, 'Phan_Cong_Giang_Day');

  XLSX.writeFile(wb, 'Mau_Thoi_Khoa_Bieu_Tieu_Hoc.xlsx');
};

/**
 * Helper: Ánh xạ tên môn viết tắt trong Excel sang mã chuẩn và phòng học
 */
export function mapSubjectCodeAndRoom(subRaw, defaultRoom = 'LOP_HOC') {
  if (!subRaw) return { subjectId: 'TU_CHON', roomId: defaultRoom };
  const s = String(subRaw).trim();
  if (s.includes('HĐTN')) return { subjectId: 'HDTN', roomId: 'LOP_HOC' };
  if (s.includes('Tiếng Anh') || s.includes('T.Anh')) return { subjectId: 'TIENG_ANH', roomId: 'LOP_HOC' };
  if (s.includes('Tin học') || s.includes('Tin')) return { subjectId: 'TIN_HOC', roomId: 'PHONG_TIN_HOC' };
  if (s.includes('Công nghệ') || s === 'CN') return { subjectId: 'CONG_NGHE', roomId: 'LOP_HOC' };
  if (s.includes('GDTC') || s.includes('Thể dục')) return { subjectId: 'THE_DUC', roomId: 'SAN_THE_CHAT' };
  if (s.includes('Mĩ thuật') || s.includes('Mỹ thuật')) return { subjectId: 'MY_THUAT', roomId: 'LOP_HOC' };
  if (s.includes('Âm nhạc')) return { subjectId: 'AM_NHAC', roomId: 'LOP_HOC' };
  if (s.includes('TNXH')) return { subjectId: 'TNXH', roomId: 'LOP_HOC' };
  // KH và LS_DL là 1 môn (Khoa-Sử-Địa)
  if (s.includes('Khoa-Sử-Địa') || s.includes('Sử-Địa') || s.includes('LS_DL') || s.includes('Khoa học')) {
    return { subjectId: 'LS_DL', roomId: 'LOP_HOC' };
  }
  if (s.includes('Toán')) return { subjectId: 'TOAN', roomId: 'LOP_HOC' };
  if (s.includes('Tiếng Việt') || s.includes('T.Việt')) return { subjectId: 'TIENG_VIET', roomId: 'LOP_HOC' };
  if (s.includes('Đạo đức') || s.includes('ĐĐ')) return { subjectId: 'DAO_DUC', roomId: 'LOP_HOC' };
  if (s.includes('Công dân số') || s.includes('công dân số') || s.includes('GDCDS') || s.includes('GDKNCD')) {
    return { subjectId: 'GD_CONG_DAN_SO', roomId: 'LOP_HOC' };
  }
  if (s.includes('Củng cố') || s.includes('củng cố') || s.includes('HĐ củng cố') || s.includes('Hoạt động củng cố') || s === 'HĐCC') {
    return { subjectId: 'HD_CUNG_CO', roomId: 'LOP_HOC' };
  }
  if (s.includes('Đọc thư viện') || s.includes('Thư viện') || s.includes('Đọc TV') || s.includes('ĐTV')) {
    return { subjectId: 'DOC_THU_VIEN', roomId: 'LOP_HOC' };
  }

  if (s.includes('Đ/c Hoàng Hòa')) return { subjectId: 'CONG_NGHE', roomId: 'LOP_HOC' };
  return { subjectId: 'TU_CHON', roomId: defaultRoom };
}

/**
 * Helper: Tìm giáo viên từ tên viết tắt trong cell Excel
 */
export function resolveTeacher(teacherRaw, classId, teachers) {
  if (!teacherRaw) {
    const homeroomTeacher = teachers.find(t => t.homeroomClassId === classId);
    return homeroomTeacher || null;
  }

  let clean = teacherRaw.replace(/^Đ\/c\s+/i, '').trim().toLowerCase();

  if (clean === 'nguyễn nga') {
    if (classId && classId.startsWith('5')) {
      return teachers.find(t => t.name.includes('Nga A')) || teachers.find(t => t.homeroomClassId === '5A3');
    }
    return teachers.find(t => t.homeroomClassId === '1A1') || teachers.find(t => t.name === 'Nguyễn Thị Nga');
  }
  if (clean === 'nguyễn minh' || clean === 'bùi việt') {
    return teachers.find(t => t.name.includes('Bùi Văn Việt')) || teachers.find(t => t.id === 'GV_01');
  }
  if (clean === 'lê quỳnh') {
    if (classId === '4A3') {
      return teachers.find(t => t.homeroomClassId === '4A3') || teachers.find(t => t.name.includes('Nguyễn Văn Trí'));
    }
    return teachers.find(t => t.name.includes('Lê Như Quỳnh'));
  }
  if (clean === 'lữ sinh') return teachers.find(t => t.name.includes('Lữ Đặng Sinh'));
  if (clean === 'châu đàn') return teachers.find(t => t.name.includes('Châu Đàn'));
  if (clean === 'hồ huyền') return teachers.find(t => t.name.includes('Hồ Thị Huyền') || t.name.includes('Hồ Thị Huyền'));
  if (clean === 'hồ hằng') return teachers.find(t => t.name.includes('Hồ Thị Hằng'));
  if (clean === 'trần mừng') return teachers.find(t => t.name.includes('Trần Thị Mừng'));
  if (clean === 'trần thủy') return teachers.find(t => t.name.includes('Trần Thị Thủy'));
  if (clean === 'đặng ba') return teachers.find(t => t.name.includes('Đặng Thị Ba'));
  if (clean === 'hồ duy') return teachers.find(t => t.name.includes('Hồ Quốc Duy'));
  if (clean === 'hoàng hòa') return teachers.find(t => t.name.includes('Hoàng Thị Hòa'));
  if (clean === 'nguyễn an') return teachers.find(t => t.name === 'Nguyễn Thị An');
  if (clean === 'hồ cường' || clean === 'việt cường') return teachers.find(t => t.name.includes('Hồ Việt Cường'));

  for (const t of teachers) {
    const tLower = t.name.toLowerCase();
    if (tLower === clean || tLower.endsWith(clean) || tLower.includes(clean)) {
      return t;
    }
  }

  const homeroomTeacher = teachers.find(t => t.homeroomClassId === classId);
  return homeroomTeacher || null;
}

/**
 * 2. ĐỌC FILE EXCEL ĐƯỢC TẢI LÊN (HỖ TRỢ CẢ ĐỊNH DẠNG CHUẨN VÀ ĐỊNH DẠNG BẢNG TOÀN TRƯỜNG THỰC TẾ)
 */
export const importExcelData = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const errors = [];
        const result = {};

        // TRƯỜNG HỢP 1: File định dạng thực tế (Có Sheet 'Phân công chuyên môn' và các Sheet '1', '2', '3.', '4', '5')
        if (workbook.Sheets['Phân công chuyên môn']) {
          const pcSheet = workbook.Sheets['Phân công chuyên môn'];
          const pcData = XLSX.utils.sheet_to_json(pcSheet, { header: 1, defval: '' });

          // 1. Phân tích danh sách 41 Cán bộ / Giáo viên
          const teachers = [];
          for (let i = 8; i < pcData.length; i++) {
            const row = pcData[i];
            if (!row || !row[1]) continue;
            const rawTt = row[0];
            const name = String(row[1]).trim();
            const task = String(row[2] || '').trim();
            const totalP = Number(row[12]) || 0;
            const dinhMuc = Number(row[14]) || 23;

            let dept = 'Giáo viên';
            let isHomeroom = false;
            let homeroomClassId = null;

            const matchHome = task.match(/Chủ nhiệm\s+([1-5]A[1-5])/i);
            if (matchHome) {
              isHomeroom = true;
              homeroomClassId = matchHome[1].toUpperCase();
            }

            if (name.includes('Hồ Thị Nhung')) {
              homeroomClassId = '5A2';
              isHomeroom = true;
            }
            if (name.includes('Nguyễn Văn Trí')) {
              homeroomClassId = '4A3';
              isHomeroom = true;
            }

            if (task.includes('Phụ trách chung') || task.includes('Hiệu trưởng')) {
              dept = 'Ban Giám Hiệu';
            } else if (task.includes('Phụ trách chuyên môn')) {
              dept = 'Ban Giám Hiệu';
            } else if (task.includes('Kế toán') || task.includes('Văn thư') || task.includes('Y tế') || task.includes('Bảo vệ')) {
              dept = 'Tổ Văn Phòng';
            } else if (task.includes('Tổng phụ trách')) {
              dept = 'Tổ Chuyên Môn';
            } else if (task.includes('Tiếng Anh')) {
              dept = 'Tổ Ngoại Ngữ';
            } else if (task.includes('Tin Khối') || task.includes('Tin học')) {
              dept = 'Tổ Tin Học';
            } else if (task.includes('Âm nhạc') || task.includes('Mỹ thuật') || task.includes('Mĩ thuật') || task.includes('GDTC')) {
              dept = 'Tổ Thể Chất - Nghệ Thuật';
            } else {
              dept = 'Giáo viên';
            }

            const nameParts = name.split(/\s+/);
            const lastName = nameParts[nameParts.length - 1];
            const initials = nameParts.slice(0, -1).map(p => p[0]).join('');
            const code = `${lastName.toUpperCase()}.${initials.toUpperCase()}`;

            let id;
            let tt;
            if (rawTt && !isNaN(rawTt)) {
              tt = Number(rawTt);
              id = `GV_${String(tt).padStart(2, '0')}`;
            } else {
              tt = 41;
              id = `GV_41`;
            }

            const position = dept === 'Ban Giám Hiệu' 
              ? (tt === 1 ? 'Hiệu Trưởng' : 'Phó Hiệu Trưởng') 
              : (isHomeroom ? `GVCN Lớp ${homeroomClassId}` : (dept === 'Tổ Văn Phòng' ? task : (dept.includes('Tổ') ? 'GV Bộ Môn' : 'Giáo Viên')));

            teachers.push({
              id,
              tt,
              name,
              code,
              department: dept,
              position,
              isHomeroom,
              homeroomClassId,
              task,
              assignedPeriods: totalP,
              dinhMuc,
              maxPeriodsPerDay: 6,
              offSessions: [],
              color: '#3b82f6'
            });
          }
          result.teachers = teachers;

          // 2. Danh sách 23 Lớp học
          const gradeSheetMap = {
            1: { sheet: '1', classes: ['1A1', '1A2', '1A3', '1A4'] },
            2: { sheet: '2', classes: ['2A1', '2A2', '2A3', '2A4', '2A5'] },
            3: { sheet: workbook.Sheets['3.'] ? '3.' : '3', classes: ['3A1', '3A2', '3A3', '3A4'] },
            4: { sheet: '4', classes: ['4A1', '4A2', '4A3', '4A4', '4A5'] },
            5: { sheet: '5', classes: ['5A1', '5A2', '5A3', '5A4', '5A5'] }
          };

          const classes = [];
          Object.entries(gradeSheetMap).forEach(([gStr, gInfo]) => {
            const grade = Number(gStr);
            gInfo.classes.forEach(cName => {
              const teacher = teachers.find(t => t.homeroomClassId === cName);
              classes.push({
                id: cName,
                name: `Lớp ${cName}`,
                grade,
                homeroomTeacherId: teacher ? teacher.id : 'GV_01',
                mainRoom: `P.${cName}`,
                studentCount: 35
              });
            });
          });
          result.classes = classes;

          // 3. Khởi tạo Ma Trận Thời Khóa Biểu
          const timetable = {};
          classes.forEach(c => {
            timetable[c.id] = {
              2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
              3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
              4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
              5: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
              6: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null }
            };
          });

          // Trích xuất tiết dạy từ Sheet Khối 1 -> 5
          Object.entries(gradeSheetMap).forEach(([gStr, gInfo]) => {
            const ws = workbook.Sheets[gInfo.sheet];
            if (!ws) return;
            const sData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
            const header = sData[7];

            let currentDay = 2;
            let currentSession = 'Sáng';

            for (let r = 9; r < sData.length; r++) {
              const row = sData[r];
              if (!row || row.length === 0) continue;
              if (typeof row[0] === 'string' && row[0].includes('Tân Mai')) break;

              if (row[0] && !isNaN(row[0])) currentDay = Number(row[0]);
              if (row[1] && typeof row[1] === 'string' && row[1].trim()) currentSession = row[1].trim();
              const rawPeriod = Number(row[2]);
              if (!rawPeriod || isNaN(rawPeriod)) continue;

              const periodId = currentSession.toLowerCase().includes('chiều') ? (4 + rawPeriod) : rawPeriod;
              if (periodId > 7) continue;

              for (let c = 3; c < row.length; c += 2) {
                const clsName = (header[c] || '').trim();
                if (!gInfo.classes.includes(clsName)) continue;

                let subjRaw = (row[c] || '').trim();
                let teacherRaw = (row[c + 1] || '').trim();

                if (subjRaw === 'Đ/c Hoàng Hòa' && !teacherRaw) {
                  subjRaw = 'Công nghệ';
                  teacherRaw = 'Đ/c Hoàng Hòa';
                }

                if (subjRaw || teacherRaw) {
                  const tObj = resolveTeacher(teacherRaw, clsName, teachers);
                  const { subjectId, roomId } = mapSubjectCodeAndRoom(subjRaw);

                  timetable[clsName][currentDay][periodId] = {
                    subjectId,
                    subjectRaw: subjRaw || (subjectId === 'LS_DL' ? 'Khoa-Sử-Địa' : subjectId),
                    teacherId: tObj ? tObj.id : '',
                    teacherRaw: teacherRaw || (tObj ? tObj.name : ''),
                    roomId,
                    isLocked: true
                  };
                }
              }
            }
          });

          result.timetable = timetable;

          // 4. Sinh Danh Sách Phân Công Chuyên Môn (assignments)
          const assignments = [];
          classes.forEach(cls => {
            const gvHome = teachers.find(t => t.id === cls.homeroomTeacherId);
            const homeId = gvHome ? gvHome.id : 'GV_01';
            const gQuota = DEFAULT_GRADE_QUOTAS[cls.grade];

            gQuota.subjects.forEach(sub => {
              let assignedTeacher = homeId;

              // Specialist mapping from Phân công chuyên môn
              if (sub.subjectId === 'TIENG_ANH') {
                if (cls.grade === 1 || cls.grade === 2 || cls.id === '3A1' || cls.id === '3A2') assignedTeacher = 'GV_33'; // Hồ Quốc Duy
                else if (cls.id === '3A3' || cls.grade === 4) assignedTeacher = 'GV_32'; // Đặng Thị Ba
                else if (cls.id === '3A4' || cls.grade === 5) assignedTeacher = 'GV_31'; // Trần Thị Thủy
              } else if (sub.subjectId === 'TIN_HOC') {
                assignedTeacher = 'GV_34'; // Nguyễn Văn Châu Đàn
              } else if (sub.subjectId === 'CONG_NGHE') {
                if (cls.grade === 3 || cls.grade === 5) assignedTeacher = 'GV_27'; // Hoàng Thị Hòa (K3, K5)
                else assignedTeacher = homeId; // Khối 4 do GVCN dạy
              } else if (sub.subjectId === 'AM_NHAC') {
                assignedTeacher = 'GV_29'; // Hồ Thị Hằng
              } else if (sub.subjectId === 'MY_THUAT') {
                assignedTeacher = 'GV_30'; // Hồ Thị Huyền
              } else if (sub.subjectId === 'THE_DUC') {
                if (cls.grade === 1 || ['2A4', '2A5', '4A2', '4A3', '4A4'].includes(cls.id)) assignedTeacher = 'GV_26'; // Trần Thị Mừng
                else if (['2A1', '2A2'].includes(cls.id)) assignedTeacher = 'GV_02'; // Lữ Đặng Sinh
                else if (cls.id === '2A3') assignedTeacher = 'GV_41'; // Nguyễn Thị An
                else if (cls.id === '4A1') assignedTeacher = 'GV_01'; // Bùi Văn Việt
                else if (cls.grade === 5) assignedTeacher = 'GV_28'; // Hồ Việt Cường
                else assignedTeacher = homeId;
              } else if (sub.subjectId === 'TNXH') {
                if (['1A1', '1A2', '1A3'].includes(cls.id)) assignedTeacher = 'GV_26'; // Trần Thị Mừng
                else if (cls.id === '1A4' || cls.grade === 2 || cls.id === '3A4') assignedTeacher = 'GV_27'; // Hoàng Thị Hòa
                else assignedTeacher = homeId;
              } else if (sub.subjectId === 'DAO_DUC') {
                if (['2A2', '3A1', '3A2', '3A3'].includes(cls.id)) assignedTeacher = 'GV_41'; // Nguyễn Thị An
                else assignedTeacher = homeId;
              }

              assignments.push({
                id: `ASG_${cls.id}_${sub.subjectId}`,
                classId: cls.id,
                grade: cls.grade,
                subjectId: sub.subjectId,
                teacherId: assignedTeacher,
                weeklyPeriods: sub.weeklyPeriods,
                roomType: sub.roomType,
                allowDouble: sub.allowDouble
              });
            });
          });

          result.assignments = assignments;
          result.gradeQuotas = JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS));
          result.rooms = [
            { id: 'PHONG_TIN_HOC', name: 'Phòng Tin học 1', code: 'TIN-01', capacity: 35, isSpecialized: true },
            { id: 'SAN_THE_CHAT', name: 'Nhà thi đấu / Sân Thể chất', code: 'SAN-TC', capacity: 100, isSpecialized: true, allowMultiple: true }
          ];

          resolve({ success: true, data: result, errors });
          return;
        }

        // TRƯỜNG HỢP 2: File theo Sheet Mẫu Chuẩn
        if (workbook.Sheets['Danh_Sach_Giao_Vien']) {
          const rawTeachers = XLSX.utils.sheet_to_json(workbook.Sheets['Danh_Sach_Giao_Vien']);
          result.teachers = rawTeachers.map(r => {
            const offSessionsStr = String(r['Buổi Đăng Ký Nghỉ'] || r['Buổi Đăng Ký Nghỉ (VD: 4_morning, 2_afternoon)'] || '');
            const offSessions = offSessionsStr ? offSessionsStr.split(',').map(s => s.trim()).filter(Boolean) : [];
            const isHome = String(r['Là GV Chủ Nhiệm (CÓ/KHÔNG)']).toUpperCase().includes('CÓ');

            return {
              id: String(r['Mã GV'] || '').trim(),
              name: String(r['Họ và Tên'] || '').trim(),
              code: String(r['Mã Viết Tắt'] || '').trim(),
              department: String(r['Tổ Chuyên Môn'] || 'Giáo viên').trim(),
              isHomeroom: isHome,
              homeroomClassId: r['Chủ Nhiệm Lớp'] ? String(r['Chủ Nhiệm Lớp']).trim() : null,
              phone: String(r['Số Điện Thoại'] || '').trim(),
              email: String(r['Email'] || '').trim(),
              maxPeriodsPerDay: Number(r['Số Tiết Tối Đa / Ngày']) || 6,
              offSessions,
              color: '#3b82f6'
            };
          }).filter(t => t.id && t.name);
        }

        if (workbook.Sheets['Danh_Sach_Lop']) {
          const rawClasses = XLSX.utils.sheet_to_json(workbook.Sheets['Danh_Sach_Lop']);
          result.classes = rawClasses.map(r => ({
            id: String(r['Mã Lớp'] || '').trim(),
            name: String(r['Tên Lớp'] || '').trim(),
            grade: Number(r['Khối']) || 1,
            homeroomTeacherId: String(r['Mã GVCN'] || '').trim(),
            mainRoom: String(r['Phòng Học Chính'] || 'P.101').trim(),
            studentCount: Number(r['Sĩ Số Học Sinh']) || 35
          })).filter(c => c.id && c.name);
        }

        resolve({ success: true, data: result, errors });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });
};

/**
 * 3. XUẤT THỜI KHÓA BIỂU MA TRẬN TOÀN TRƯỜNG
 */
export const exportMasterTimetable = (timetable, classes, teachers, subjects) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const wb = XLSX.utils.book_new();
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  const rows = [];

  classes.forEach(cls => {
    for (let period = 1; period <= 7; period++) {
      const periodName = period <= 4 ? `Sáng - Tiết ${period}` : `Chiều - Tiết ${period - 4}`;
      const row = {
        'Lớp': cls.name,
        'Khối': cls.grade,
        'Tiết Học': periodName
      };

      DAYS_OF_WEEK.forEach(day => {
        const slot = timetable[cls.id]?.[day.id]?.[period];
        if (slot && slot.subjectId) {
          const sName = _subjects[slot.subjectId]?.name || DEFAULT_SUBJECTS[slot.subjectId]?.name || slot.subjectId;
          const tName = teacherMap.get(slot.teacherId)?.code || slot.teacherId || '';
          row[day.name] = `${sName} (${tName})`;
        } else {
          row[day.name] = '-';
        }
      });

      rows.push(row);
    }
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'TKB_Toan_Truong_Matrix');
  XLSX.writeFile(wb, 'Thoi_Khoa_Bieu_Toan_Truong.xlsx');
};

/**
 * 4. XUẤT THỜI KHÓA BIỂU TỪNG LỚP (MỖI LỚP 1 SHEET IN A4)
 */
export const exportClassTimetables = (timetable, classes, teachers, subjects) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const wb = XLSX.utils.book_new();
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  classes.forEach(cls => {
    const rows = [];
    const gvHome = teacherMap.get(cls.homeroomTeacherId);

    rows.push({ 'Buổi': 'TRƯỜNG TIỂU HỌC QUỲNH LỘC B', 'Tiết': '', 'Thời Gian': '', 'Thứ Hai': `THỜI KHÓA BIỂU ${cls.name.toUpperCase()}`, 'Thứ Ba': '', 'Thứ Tư': '', 'Thứ Năm': '', 'Thứ Sáu': '' });
    rows.push({ 'Buổi': `GVCN: ${gvHome?.name || ''}`, 'Tiết': `Phòng: ${cls.mainRoom || ''}`, 'Thời Gian': '', 'Thứ Hai': '', 'Thứ Ba': '', 'Thứ Tư': '', 'Thứ Năm': '', 'Thứ Sáu': '' });
    rows.push({});

    PERIODS.forEach(p => {
      const row = {
        'Buổi': p.session === 'morning' ? 'SÁNG' : 'CHIỀU',
        'Tiết': p.name,
        'Thời Gian': p.time
      };

      DAYS_OF_WEEK.forEach(day => {
        const slot = timetable[cls.id]?.[day.id]?.[p.id];
        if (slot && slot.subjectId) {
          const sName = _subjects[slot.subjectId]?.name || DEFAULT_SUBJECTS[slot.subjectId]?.name || slot.subjectId;
          const tName = teacherMap.get(slot.teacherId)?.name || '';
          row[day.name] = `${sName}\n(${tName})`;
        } else {
          row[day.name] = '';
        }
      });

      rows.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, cls.name.replace(/[^a-zA-Z0-9]/g, '_'));
  });

  XLSX.writeFile(wb, 'Thoi_Khoa_Bieu_Cac_Lop.xlsx');
};

/**
 * 5. XUẤT THỜI KHÓA BIỂU CÁ NHÂN GIÁO VIÊN
 */
export const exportTeacherTimetables = (timetable, teachers, classes, subjects) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const wb = XLSX.utils.book_new();

  teachers.forEach(teacher => {
    const rows = [];
    PERIODS.forEach(p => {
      const row = {
        'Buổi': p.session === 'morning' ? 'SÁNG' : 'CHIỀU',
        'Tiết': p.name,
        'Thời Gian': p.time
      };

      DAYS_OF_WEEK.forEach(day => {
        let lessonFound = null;

        classes.forEach(cls => {
          const slot = timetable[cls.id]?.[day.id]?.[p.id];
          if (slot && slot.teacherId === teacher.id) {
            const sName = _subjects[slot.subjectId]?.name || DEFAULT_SUBJECTS[slot.subjectId]?.name || slot.subjectId;
            lessonFound = `${sName} - ${cls.name}`;
          }
        });

        row[day.name] = lessonFound || '-';
      });

      rows.push(row);
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const sheetName = (teacher.code || teacher.name).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  XLSX.writeFile(wb, 'Thoi_Khoa_Bieu_Giao_Vien.xlsx');
};

/**
 * 6. XUẤT DANH SÁCH GIÁO VIÊN VÀ THỐNG KÊ ĐỊNH MỨC
 */
export const exportTeacherDirectory = (teachers, assignments, timetable, classes) => {
  const wb = XLSX.utils.book_new();

  const rows = teachers.map((t, idx) => {
    const assignedPeriods = assignments
      .filter(a => a.teacherId === t.id)
      .reduce((sum, a) => sum + (Number(a.weeklyPeriods) || 0), 0);

    let actualScheduled = 0;
    classes.forEach(cls => {
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          const slot = timetable[cls.id]?.[d]?.[p];
          if (slot && slot.teacherId === t.id) {
            actualScheduled++;
          }
        }
      }
    });

    return {
      'STT': t.tt || (idx + 1),
      'Mã GV': t.id,
      'Họ và Tên': t.name,
      'Mã Viết Tắt': t.code,

      'Nhiệm Vụ': t.task || (t.isHomeroom ? `GVCN Lớp ${t.homeroomClassId}` : 'GV Bộ Môn'),
      'Định Mức Tiết/Tuần': t.dinhMuc || t.weeklyQuota || 23,
      'Tổng Số Tiết Phân Công / Tuần': assignedPeriods || t.assignedPeriods || 0,
      'Số Tiết Đã Xếp Lịch': actualScheduled,
      'Buổi Đăng Ký Nghỉ': (t.offSessions || []).join(', ')
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'Danh_Sach_Giao_Vien');
  XLSX.writeFile(wb, 'Danh_Sach_Giao_Vien_Quynh_Loc_B.xlsx');
};
