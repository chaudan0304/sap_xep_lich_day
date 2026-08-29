// src/services/excelParser.js
// Trình bóc tách dữ liệu bảng tính Excel chuyên dụng (SheetJS XLSX)
// Hỗ trợ cả định dạng STKB thực tế (Nhiều sheet: Khối 1..5, Phân công chuyên môn, Tiết đọc TV) và định dạng Mẫu chuẩn

import * as XLSX from 'xlsx';
import { DEFAULT_GRADE_QUOTAS } from '../constants/defaultCurriculum.js';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects.js';

/**
 * Chuẩn hóa chuỗi tiếng Việt Unicode NFC và loại bỏ khoảng trắng thừa
 */
export function normalizeStr(str) {
  if (str === undefined || str === null) return '';
  return String(str).trim().normalize('NFC');
}

/**
 * Ánh xạ tên môn học trong ô Excel sang mã môn và phòng học chuẩn
 */
export function mapSubjectCodeAndRoom(subRaw, defaultRoom = 'LOP_HOC') {
  if (!subRaw) return { subjectId: 'TU_CHON', roomId: defaultRoom };
  const s = normalizeStr(subRaw);

  if (s.includes('HĐTN') || s.includes('Hoạt động trải nghiệm')) return { subjectId: 'HDTN', roomId: 'LOP_HOC' };
  if (s.includes('Tiếng Anh') || s.includes('T.Anh')) return { subjectId: 'TIENG_ANH', roomId: 'LOP_HOC' };
  if (s.includes('Tin học') || s.includes('Tin')) return { subjectId: 'TIN_HOC', roomId: 'PHONG_TIN_HOC' };
  if (s.includes('Công nghệ') || s === 'CN') return { subjectId: 'CONG_NGHE', roomId: 'LOP_HOC' };
  if (s.includes('GDTC') || s.includes('Thể dục')) return { subjectId: 'THE_DUC', roomId: 'SAN_THE_CHAT' };
  if (s.includes('Mĩ thuật') || s.includes('Mỹ thuật')) return { subjectId: 'MY_THUAT', roomId: 'LOP_HOC' };
  if (s.includes('Âm nhạc')) return { subjectId: 'AM_NHAC', roomId: 'LOP_HOC' };
  if (s.includes('TNXH') || s.includes('Tự nhiên')) return { subjectId: 'TNXH', roomId: 'LOP_HOC' };
  if (s.includes('Khoa-Sử-Địa') || s.includes('Sử-Địa') || s.includes('LS_DL') || s.includes('Khoa học') || s.includes('Lịch sử')) {
    return { subjectId: 'LS_DL', roomId: 'LOP_HOC' };
  }
  if (s.includes('Toán')) return { subjectId: 'TOAN', roomId: 'LOP_HOC' };
  if (s.includes('Tiếng Việt') || s.includes('T.Việt')) return { subjectId: 'TIENG_VIET', roomId: 'LOP_HOC' };
  if (s.includes('Đạo đức') || s.includes('ĐĐ')) return { subjectId: 'DAO_DUC', roomId: 'LOP_HOC' };
  if (s.includes('Công dân số') || s.includes('công dân số') || s.includes('GDCDS') || s.includes('GDKNCDS') || s.includes('GDKNCD')) {
    return { subjectId: 'GD_CONG_DAN_SO', roomId: 'LOP_HOC' };
  }
  if (s.includes('Củng cố') || s.includes('củng cố') || s.includes('HĐ củng cố') || s.includes('Hoạt động củng cố') || s === 'HĐCC') {
    return { subjectId: 'HD_CUNG_CO', roomId: 'LOP_HOC' };
  }
  if (s.includes('Đọc thư viện') || s.includes('Thư viện') || s.includes('Đọc TV') || s.includes('ĐTV')) {
    return { subjectId: 'DOC_THU_VIEN', roomId: 'LOP_HOC' };
  }
  return { subjectId: 'TU_CHON', roomId: defaultRoom };
}

/**
 * Tìm kiếm giáo viên tương ứng từ tên viết tắt trong cell Excel
 */
export function resolveTeacher(teacherRaw, classId, teachers) {
  if (!teacherRaw) {
    return teachers.find(t => t.homeroomClassId === classId) || null;
  }
  const clean = normalizeStr(teacherRaw).replace(/^Đ\/c\s+/i, '').trim().toLowerCase();

  if (clean.includes('nguyễn nga (a)') || clean.includes('nguyễn nga a') || clean.includes('nga a')) {
    return teachers.find(t => t.homeroomClassId === '5A3') || teachers.find(t => t.name.includes('Nga (A)'));
  }
  if (clean === 'nguyễn nga') {
    if (classId && classId.startsWith('5')) {
      return teachers.find(t => t.homeroomClassId === '5A3') || teachers.find(t => t.name.includes('Nga (A)'));
    }
    return teachers.find(t => t.homeroomClassId === '1A1') || teachers.find(t => t.name === 'Nguyễn Thị Nga');
  }
  if (clean === 'nguyễn an' || clean === 'an') {
    return teachers.find(t => t.name === 'Nguyễn Thị An') || teachers.find(t => t.id === 'GV_41');
  }
  if (clean === 'nguyễn minh' || clean === 'bùi việt' || clean.includes('bùi văn việt')) {
    return teachers.find(t => t.name.includes('Bùi Văn Việt')) || teachers.find(t => t.id === 'GV_01');
  }

  // Khớp chính xác theo từng từ hoàn chỉnh (Whole Words)
  const words = clean.split(/\s+/).filter(Boolean);
  for (const t of teachers) {
    const tLower = normalizeStr(t.name).toLowerCase();
    const tWords = tLower.split(/\s+/).filter(Boolean);

    if (tLower === clean || (words.length >= 2 && words.every(w => tWords.includes(w)))) {
      return t;
    }
  }

  // Khớp theo tên gọi chính (Last Name)
  if (words.length === 1) {
    for (const t of teachers) {
      const tLower = normalizeStr(t.name).toLowerCase();
      const tWords = tLower.split(/\s+/).filter(Boolean);
      if (tWords.length > 0 && tWords[tWords.length - 1] === words[0]) {
        return t;
      }
    }
  }

  return teachers.find(t => t.homeroomClassId === classId) || null;
}

/**
 * Bóc tách sheet 'Phân công chuyên môn'
 */
export function parseAssignmentSheet(ws) {
  if (!ws) return [];
  const pcData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const teachers = [];
  const usedIds = new Set();

  for (let r = 8; r < pcData.length; r++) {
    const row = pcData[r];
    if (!row || !row[1] || typeof row[1] !== 'string') continue;
    const rawTt = row[0];
    const name = normalizeStr(row[1]);
    const task = normalizeStr(row[2] || '');
    const totalPeriods = Number(row[12]) || 0;
    const dinhMuc = Number(row[14]) || 23;

    if (!name || name.includes('UBND') || name.includes('CỘNG HÒA') || name.includes('TRƯỜNG')) continue;

    let isHomeroom = false;
    let homeroomClassId = null;
    const matchHome = task.match(/Chủ nhiệm\s+([1-5]A[1-5])/i);
    if (matchHome) {
      isHomeroom = true;
      homeroomClassId = matchHome[1].toUpperCase();
    }
    if (name.includes('Hồ Thị Nhung')) {
      isHomeroom = true;
      homeroomClassId = '5A2';
    }

    let dept = 'Giáo viên';
    if (task.includes('Phụ trách chung') || task.includes('Hiệu trưởng') || task.includes('Phụ trách chuyên môn')) {
      dept = 'Ban Giám Hiệu';
    } else if (task.includes('Kế toán') || task.includes('Văn thư') || task.includes('Y tế') || task.includes('Bảo vệ')) {
      dept = 'Tổ Văn Phòng';
    } else if (task.includes('Tiếng Anh')) {
      dept = 'Tổ Ngoại Ngữ';
    } else if (task.includes('Tin Khối') || task.includes('Tin học')) {
      dept = 'Tổ Tin Học';
    } else if (task.includes('Âm nhạc') || task.includes('Mỹ thuật') || task.includes('Mĩ thuật') || task.includes('GDTC')) {
      dept = 'Tổ Thể Chất - Nghệ Thuật';
    }

    let tt = !isNaN(rawTt) && rawTt !== '' ? Number(rawTt) : (name === 'Nguyễn Thị An' ? 41 : (teachers.length + 1));
    let id = `GV_${String(tt).padStart(2, '0')}`;

    if (usedIds.has(id)) {
      tt = teachers.length + 1;
      id = `GV_${String(tt).padStart(2, '0')}`;
    }
    usedIds.add(id);

    const nameParts = name.split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];
    const initials = nameParts.slice(0, -1).map(p => p[0]).join('');
    const code = `${lastName.toUpperCase()}.${initials.toUpperCase()}`;

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
      assignedPeriods: totalPeriods,
      dinhMuc,
      maxPeriodsPerDay: 6,
      offSessions: [],
      color: '#3b82f6'
    });
  }

  return teachers;
}

/**
 * Bóc tách sheet 'Tiết đọc TV'
 */
export function parseReadingScheduleSheet(ws) {
  if (!ws) return [];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const readingSlots = [];

  for (let r = 5; r < rows.length; r++) {
    const row = rows[r];
    if (!row) continue;
    const timeText = normalizeStr(row[0]);
    for (let c = 1; c < row.length; c++) {
      const cellVal = normalizeStr(row[c]);
      const match = cellVal.match(/T(\d)\s*-\s*([1-5]A[1-5])/i) || cellVal.match(/([1-5]A[1-5])/i);
      if (match) {
        readingSlots.push({
          row: r + 1,
          col: c + 1,
          timeText,
          period: match[1] ? Number(match[1]) : c,
          classId: (match[2] || match[1]).toUpperCase(),
          rawText: cellVal
        });
      }
    }
  }
  return readingSlots;
}

/**
 * Hàm chính: Đọc và phân tích toàn bộ Workbook Excel
 */
export function parseExcelWorkbook(dataOrBuffer) {
  const workbook = XLSX.read(dataOrBuffer, { type: 'array' });
  const sheetNames = workbook.SheetNames || [];
  
  const parsed = {
    format: 'UNKNOWN',
    sheetNames,
    teachers: [],
    classes: [],
    timetable: {},
    rawSlots: [],
    readingSlots: [],
    assignments: [],
    gradeQuotas: JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS)),
    rooms: [
      { id: 'PHONG_TIN_HOC', name: 'Phòng Tin học (30 máy)', code: 'TIN-01', capacity: 35, isSpecialized: true, allowMultiple: false },
      { id: 'SAN_THE_CHAT', name: 'Sân / Nhà đa năng Thể chất', code: 'SAN-TC', capacity: 100, isSpecialized: true, allowMultiple: true }
    ],
    schoolInfo: {
      name: 'Trường TH Quỳnh Lộc B',
      year: 'Năm học 2026 - 2027'
    }
  };

  // PHÁT HIỆN ĐỊNH DẠNG
  const hasPC = sheetNames.some(s => normalizeStr(s).toLowerCase().includes('phân công'));
  const hasGradeSheets = ['1', '2', '4', '5'].every(k => sheetNames.some(s => normalizeStr(s).startsWith(k)));

  if (hasPC || hasGradeSheets) {
    parsed.format = 'REAL_SCHOOL_MULTISHEET';

    // 1. Phân tích giáo viên
    const pcSheetName = sheetNames.find(s => normalizeStr(s).toLowerCase().includes('phân công'));
    if (pcSheetName) {
      parsed.teachers = parseAssignmentSheet(workbook.Sheets[pcSheetName]);
    }

    // 2. Phân tích tiết đọc thư viện
    const tvSheetName = sheetNames.find(s => normalizeStr(s).toLowerCase().includes('đọc tv'));
    if (tvSheetName) {
      parsed.readingSlots = parseReadingScheduleSheet(workbook.Sheets[tvSheetName]);
    }

    // 3. Phân tích các sheet khối lớp (1, 2, 3/3., 4, 5)
    const gradeSheets = [
      { grade: 1, sheetName: sheetNames.find(s => normalizeStr(s) === '1') },
      { grade: 2, sheetName: sheetNames.find(s => normalizeStr(s) === '2') },
      { grade: 3, sheetName: sheetNames.find(s => normalizeStr(s) === '3' || normalizeStr(s) === '3.') },
      { grade: 4, sheetName: sheetNames.find(s => normalizeStr(s) === '4') },
      { grade: 5, sheetName: sheetNames.find(s => normalizeStr(s) === '5') }
    ];

    const classesMap = new Map();

    gradeSheets.forEach(({ grade, sheetName }) => {
      if (!sheetName || !workbook.Sheets[sheetName]) return;
      const ws = workbook.Sheets[sheetName];
      const sData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

      // Tìm dòng tiêu đề chứa các lớp
      let headerRowIdx = -1;
      const classCols = [];
      for (let r = 0; r < Math.min(15, sData.length); r++) {
        const row = sData[r];
        if (row && row.some(c => typeof c === 'string' && c.match(/^[1-5]A[1-5]$/))) {
          headerRowIdx = r;
          row.forEach((cell, cIdx) => {
            const cleanCell = normalizeStr(cell);
            if (cleanCell.match(/^[1-5]A[1-5]$/)) {
              classCols.push({ classId: cleanCell, colSub: cIdx, colTch: cIdx + 1 });
              if (!classesMap.has(cleanCell)) {
                const homeTch = parsed.teachers.find(t => t.homeroomClassId === cleanCell);
                classesMap.set(cleanCell, {
                  id: cleanCell,
                  name: `Lớp ${cleanCell}`,
                  grade: Number(cleanCell[0]),
                  homeroomTeacherId: homeTch ? homeTch.id : 'GV_01',
                  mainRoom: `P.${cleanCell}`,
                  studentCount: 35
                });
              }
            }
          });
          break;
        }
      }

      if (headerRowIdx === -1) return;

      // Khởi tạo khung thời khóa biểu cho các lớp tìm thấy
      classCols.forEach(({ classId }) => {
        if (!parsed.timetable[classId]) {
          parsed.timetable[classId] = {
            2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
            3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
            4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
            5: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
            6: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null }
          };
        }
      });

      // Duyệt qua từng dòng tiết học
      let currentDay = null;
      let currentSession = null;

      for (let r = headerRowIdx + 1; r < sData.length; r++) {
        const row = sData[r];
        if (!row || row.length === 0) continue;

        // Bỏ qua dòng chữ ký / footer
        const fullRowText = row.join(' ');
        if (fullRowText.includes('Tân Mai') || fullRowText.includes('HIỆU TRƯỞNG') || fullRowText.includes('Bùi Văn Việt')) continue;

        // Kiểm tra Thứ (Cột 0)
        const col0 = normalizeStr(row[0]);
        if (col0 && col0.match(/[2-6]/)) {
          currentDay = Number(col0.match(/[2-6]/)[0]);
        }

        // Kiểm tra Buổi (Cột 1)
        const col1 = normalizeStr(row[1]);
        if (col1.includes('Sáng') || col1.includes('Chiều')) {
          currentSession = col1.includes('Sáng') ? 'Sáng' : 'Chiều';
        }

        // Kiểm tra Tiết (Cột 2)
        const rawPeriod = Number(row[2]);
        if (!rawPeriod || isNaN(rawPeriod) || !currentDay || !currentSession) continue;

        const periodId = currentSession.toLowerCase().includes('chiều') ? (4 + rawPeriod) : rawPeriod;
        if (periodId < 1 || periodId > 7) continue;

        classCols.forEach(({ classId, colSub, colTch }) => {
          let subjRaw = normalizeStr(row[colSub]);
          let teacherRaw = normalizeStr(row[colTch]);

          if (subjRaw === 'Đ/c Hoàng Hòa' && !teacherRaw) {
            subjRaw = 'Công nghệ';
            teacherRaw = 'Đ/c Hoàng Hòa';
          }

          if (subjRaw) {
            const { subjectId, roomId } = mapSubjectCodeAndRoom(subjRaw);
            const teacherObj = resolveTeacher(teacherRaw, classId, parsed.teachers);

            const slotItem = {
              sheet: sheetName,
              row: r + 1,
              col: colSub + 1,
              classId,
              day: currentDay,
              session: currentSession,
              period: periodId,
              rawPeriod,
              subjectId,
              subjectRaw: subjRaw,
              teacherId: teacherObj ? teacherObj.id : '',
              teacherRaw: teacherRaw || (teacherObj ? teacherObj.name : ''),
              teacherName: teacherObj ? teacherObj.name : '',
              roomId,
              isLocked: true
            };

            parsed.rawSlots.push(slotItem);

            if (parsed.timetable[classId]) {
              parsed.timetable[classId][currentDay][periodId] = {
                subjectId,
                subjectRaw: subjRaw,
                teacherId: teacherObj ? teacherObj.id : '',
                teacherRaw: teacherRaw || (teacherObj ? teacherObj.name : ''),
                roomId,
                isLocked: true
              };
            }
          }
        });
      }
    });

    parsed.classes = Array.from(classesMap.values());

    // 4. Sinh assignments (Phân công chuyên môn)
    const asgList = [];
    parsed.classes.forEach(cls => {
      const gQuota = DEFAULT_GRADE_QUOTAS[cls.grade];
      if (!gQuota) return;

      gQuota.subjects.forEach(sub => {
        // Tìm giáo viên thực tế đã dạy môn này nhiều nhất trong TKB của lớp
        let foundTchId = '';
        parsed.rawSlots.forEach(s => {
          if (s.classId === cls.id && s.subjectId === sub.subjectId && s.teacherId) {
            foundTchId = s.teacherId;
          }
        });

        if (!foundTchId) {
          foundTchId = cls.homeroomTeacherId;
        }

        asgList.push({
          id: `ASG_${cls.id}_${sub.subjectId}`,
          classId: cls.id,
          grade: cls.grade,
          subjectId: sub.subjectId,
          teacherId: foundTchId,
          weeklyPeriods: sub.weeklyPeriods,
          roomType: sub.roomType || 'LOP_HOC',
          allowDouble: sub.allowDouble || false
        });
      });
    });

    parsed.assignments = asgList;
  } else if (sheetNames.includes('Danh_Sach_Giao_Vien')) {
    parsed.format = 'TEMPLATE_FORMAT';
    // Parser for standard template sheets
    const rawTeachers = XLSX.utils.sheet_to_json(workbook.Sheets['Danh_Sach_Giao_Vien']);
    parsed.teachers = rawTeachers.map(r => ({
      id: normalizeStr(r['Mã GV']),
      name: normalizeStr(r['Họ và Tên']),
      code: normalizeStr(r['Mã Viết Tắt']),
      department: normalizeStr(r['Tổ Chuyên Môn'] || 'Giáo viên'),
      isHomeroom: normalizeStr(r['Là GV Chủ Nhiệm (CÓ/KHÔNG)']).toUpperCase().includes('CÓ'),
      homeroomClassId: r['Chủ Nhiệm Lớp'] ? normalizeStr(r['Chủ Nhiệm Lớp']) : null,
      phone: normalizeStr(r['Số Điện Thoại'] || ''),
      email: normalizeStr(r['Email'] || ''),
      maxPeriodsPerDay: Number(r['Số Tiết Tối Đa / Ngày']) || 6,
      offSessions: (r['Buổi Đăng Ký Nghỉ'] || '').split(',').map(s => s.trim()).filter(Boolean),
      color: '#3b82f6'
    }));

    if (workbook.Sheets['Danh_Sach_Lop']) {
      const rawClasses = XLSX.utils.sheet_to_json(workbook.Sheets['Danh_Sach_Lop']);
      parsed.classes = rawClasses.map(c => ({
        id: normalizeStr(c['Mã Lớp']),
        name: normalizeStr(c['Tên Lớp'] || `Lớp ${c['Mã Lớp']}`),
        grade: Number(c['Khối']) || Number(String(c['Mã Lớp'])[0]) || 1,
        homeroomTeacherId: normalizeStr(c['Mã GVCN']),
        mainRoom: normalizeStr(c['Phòng Học Chính'] || `P.${c['Mã Lớp']}`),
        studentCount: Number(c['Sĩ Số Học Sinh']) || 35
      }));
    }
  }

  return parsed;
}
