// src/services/excelParser.js
// Trình bóc tách dữ liệu bảng tính Excel chuyên dụng (ExcelJS)
// Hỗ trợ định dạng STKB thực tế nhiều sheet (Khối 1..5, Phân công chuyên môn, Tiết đọc TV),
// định dạng Ma Trận Toàn Trường (TKB_Toan_Truong) và định dạng Mẫu chuẩn của hệ thống

import ExcelJS from 'exceljs';
import { DEFAULT_GRADE_QUOTAS } from '../constants/defaultCurriculum.js';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects.js';

function getCellStringValue(cell) {
  if (!cell || cell.value === null || cell.value === undefined) return '';
  const val = cell.value;
  if (typeof val === 'object') {
    if (val.result !== undefined && val.result !== null) return String(val.result);
    if (val.text !== undefined && val.text !== null) return String(val.text);
    if (Array.isArray(val.richText)) {
      return val.richText.map(r => r.text || '').join('');
    }
    return '';
  }
  return String(val);
}

export function sheetTo2DArray(worksheet) {
  if (!worksheet) return [];
  if (Array.isArray(worksheet)) return worksheet;
  const rows = [];
  const maxRow = worksheet.rowCount || 0;

  for (let r = 1; r <= maxRow; r++) {
    const row = worksheet.getRow(r);
    const rowValues = [];
    const cellCount = row.cellCount || 0;
    const maxCol = Math.max(cellCount, 30);
    for (let c = 1; c <= maxCol; c++) {
      rowValues.push(getCellStringValue(row.getCell(c)));
    }
    rows.push(rowValues);
  }
  return rows;
}

export function sheetToJsonObjects(worksheet) {
  if (!worksheet) return [];
  const rows2D = Array.isArray(worksheet) ? worksheet : sheetTo2DArray(worksheet);
  if (rows2D.length < 2) return [];
  const headers = rows2D[0];
  const results = [];
  for (let r = 1; r < rows2D.length; r++) {
    const row = rows2D[r];
    if (!row || row.every(c => !c)) continue;
    const obj = {};
    headers.forEach((h, idx) => {
      const cleanH = normalizeStr(h);
      if (cleanH) obj[cleanH] = row[idx] || '';
    });
    results.push(obj);
  }
  return results;
}

/**
 * Chuẩn hóa chuỗi tiếng Việt Unicode NFC và loại bỏ khoảng trắng thừa
 */
export function normalizeStr(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .trim()
    .replace(/\s+/g, ' ')
    .normalize('NFC')
    .replace(/òa/gi, 'oà').replace(/óa/gi, 'oá').replace(/ỏa/gi, 'oả').replace(/õa/gi, 'oã').replace(/ọa/gi, 'oạ')
    .replace(/òe/gi, 'oè').replace(/óe/gi, 'oé').replace(/ỏe/gi, 'oẻ').replace(/õe/gi, 'oẽ').replace(/ọe/gi, 'oẹ')
    .replace(/ùy/gi, 'uỳ').replace(/úy/gi, 'uý').replace(/ủy/gi, 'uỷ').replace(/ũy/gi, 'uỹ').replace(/ụy/gi, 'uỵ');
}

/**
 * Ánh xạ tên môn học trong ô Excel sang mã môn và phòng học chuẩn
 */
export function mapSubjectCodeAndRoom(subRaw, defaultRoom = 'LOP_HOC') {
  if (!subRaw) return { subjectId: 'TU_CHON', roomId: defaultRoom };
  const s = normalizeStr(subRaw);
  const sLower = s.toLowerCase();

  // 1. Hoạt động trải nghiệm / Chào cờ / Sinh hoạt lớp
  if (s.includes('HĐTN') || sLower.includes('trải nghiệm') || sLower.includes('trai nghiem')) {
    return { subjectId: 'HDTN', roomId: 'LOP_HOC' };
  }
  if (sLower.includes('chào cờ') || sLower.includes('chao co') || sLower === 'shdc' || sLower.includes('dưới cờ')) {
    return { subjectId: 'HDTN', roomId: 'SAN_TRUONG' };
  }
  if (sLower.includes('sinh hoạt') || sLower === 'shl' || sLower.includes('sinh hoat')) {
    return { subjectId: 'HDTN', roomId: 'LOP_HOC' };
  }

  // 2. Tiếng Anh / Ngoại ngữ
  if (sLower.includes('tiếng anh') || sLower.includes('t.anh') || sLower.includes('t. anh') || 
      sLower.includes('anh văn') || sLower.includes('ngoại ngữ') || s === 'TA' || s === 'NN1') {
    return { subjectId: 'TIENG_ANH', roomId: 'LOP_HOC' };
  }

  // 3. Tin học
  if (sLower.includes('tin học') || sLower.includes('tin hoc') || sLower === 'tin' || s === 'TH') {
    return { subjectId: 'TIN_HOC', roomId: 'PHONG_TIN_HOC' };
  }

  // 4. Công nghệ
  if (sLower.includes('công nghệ') || sLower.includes('cong nghe') || s === 'CN' || sLower.includes('kỹ thuật')) {
    return { subjectId: 'CONG_NGHE', roomId: 'LOP_HOC' };
  }

  // 5. Thể dục / GDTC
  if (s.includes('GDTC') || sLower.includes('thể chất') || sLower.includes('thể dục') || sLower.includes('the duc') || s === 'TD') {
    return { subjectId: 'THE_DUC', roomId: 'SAN_THE_CHAT' };
  }

  // 6. Mĩ thuật / Mỹ thuật
  if (sLower.includes('mĩ thuật') || sLower.includes('mỹ thuật') || sLower.includes('mi thuat') || sLower.includes('my thuat') || s === 'MT') {
    return { subjectId: 'MY_THUAT', roomId: 'LOP_HOC' };
  }

  // 7. Âm nhạc
  if (sLower.includes('âm nhạc') || sLower.includes('am nhac') || sLower === 'nhạc' || s === 'AN') {
    return { subjectId: 'AM_NHAC', roomId: 'LOP_HOC' };
  }

  // 8. Tự nhiên & Xã hội
  if (s.includes('TNXH') || sLower.includes('tự nhiên') || sLower.includes('tu nhien') || s.includes('TN&XH') || s.includes('TN-XH')) {
    return { subjectId: 'TNXH', roomId: 'LOP_HOC' };
  }

  // 9. Khoa học
  if (sLower.includes('khoa học') || sLower.includes('khoa hoc') || s === 'KH' || s === 'KHOA_HOC' || sLower === 'khoa') {
    return { subjectId: 'KHOA_HOC', roomId: 'LOP_HOC' };
  }

  // 10. Lịch sử & Địa lí
  if (s.includes('Sử-Địa') || s.includes('LS_DL') || s.includes('LS-ĐL') || s.includes('LS&ĐL') ||
      sLower.includes('lịch sử') || sLower.includes('địa lí') || sLower.includes('địa lý') || sLower.includes('lich su') || sLower.includes('dia li') || sLower.includes('dia ly') || s === 'LS' || s === 'ĐL') {
    return { subjectId: 'LS_DL', roomId: 'LOP_HOC' };
  }

  // 10. Toán
  if (sLower.includes('toán') || sLower.includes('toan') || s === 'T') {
    return { subjectId: 'TOAN', roomId: 'LOP_HOC' };
  }

  // 11. Tiếng Việt
  if (sLower.includes('tiếng việt') || sLower.includes('t.việt') || sLower.includes('t. việt') || sLower.includes('tieng viet') || s === 'TV') {
    return { subjectId: 'TIENG_VIET', roomId: 'LOP_HOC' };
  }

  // 12. Đạo đức
  if (sLower.includes('đạo đức') || sLower.includes('dao duc') || s === 'ĐĐ' || s === 'DD') {
    return { subjectId: 'DAO_DUC', roomId: 'LOP_HOC' };
  }

  // 13. Kỹ năng công dân số
  if (sLower.includes('công dân số') || sLower.includes('cong dan so') || 
      s.includes('GDCDS') || s.includes('GDKNCDS') || s.includes('GDKNCD') || sLower.includes('kĩ năng số') || sLower.includes('kỹ năng số')) {
    return { subjectId: 'GD_CONG_DAN_SO', roomId: 'LOP_HOC' };
  }

  // 14. Hoạt động củng cố / Ôn tập
  if (sLower.includes('củng cố') || sLower.includes('cung co') || s.includes('HĐCC') || sLower.includes('ôn tập')) {
    return { subjectId: 'HD_CUNG_CO', roomId: 'LOP_HOC' };
  }

  // 15. Tiết đọc thư viện
  if (sLower.includes('đọc thư viện') || sLower.includes('thư viện') || sLower.includes('đọc tv') || sLower.includes('doc tv') || s.includes('ĐTV') || s.includes('DTV')) {
    return { subjectId: 'DOC_THU_VIEN', roomId: 'LOP_HOC' };
  }

  // 16. Kỹ năng sống
  if (sLower.includes('kỹ năng sống') || sLower.includes('kĩ năng sống') || sLower.includes('kns')) {
    return { subjectId: 'KY_NANG_SONG', roomId: 'LOP_HOC' };
  }

  // 17. Giáo dục STEM
  if (sLower.includes('stem')) {
    return { subjectId: 'STEM', roomId: 'LOP_HOC' };
  }

  // 18. Tự chọn / Phát triển năng lực
  if (sLower.includes('năng lực') || s.includes('PTNL') || sLower.includes('tự chọn') || sLower.includes('tự học')) {
    return { subjectId: 'TU_CHON', roomId: defaultRoom };
  }

  // 19. Nếu chuỗi đã khớp trực tiếp mã môn có trong DEFAULT_SUBJECTS
  const sUpper = s.toUpperCase().replace(/\s+/g, '_');
  if (DEFAULT_SUBJECTS && DEFAULT_SUBJECTS[sUpper]) {
    return { subjectId: sUpper, roomId: DEFAULT_SUBJECTS[sUpper].defaultRoom || defaultRoom };
  }

  // 20. Nếu là môn học riêng biệt khác, tạo slugId chuẩn hóa
  const slugId = s.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toUpperCase()
    .trim()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 24);

  if (slugId && slugId.length >= 2 && !slugId.startsWith('TIET') && !slugId.startsWith('BUOI')) {
    return { subjectId: slugId, roomId: defaultRoom };
  }

  return { subjectId: 'TU_CHON', roomId: defaultRoom };
}

/**
 * Tìm kiếm giáo viên tương ứng từ tên viết tắt hoặc chuỗi trong cell Excel
 */
export function resolveTeacher(teacherRaw, classId, teachers = []) {
  if (!teachers || teachers.length === 0) return null;

  if (!teacherRaw || typeof teacherRaw !== 'string' || !teacherRaw.trim()) {
    return null; // Giữ nguyên trống, tuyệt đối không tự ý gán GVCN
  }

  // Làm sạch tiền tố xưng hô
  let clean = normalizeStr(teacherRaw)
    .replace(/^(?:Đ\/c\.|Đ\/c|Đc\.|Đc|Đ\.c|Thầy\s+giáo|Thầy|Cô\s+giáo|Cô|GV|Đ\/C)\s+/i, '')
    .trim()
    .toLowerCase();

  if (!clean) return null;

  const cleanBase = clean.replace(/\s*\([a-z0-9]\)\s*/gi, '').trim();

  // 1. Tìm tất cả ứng viên khớp theo mã TKB (code) hoặc Họ tên (name)
  const candidates = teachers.filter(t => {
    const c = normalizeStr(t.code).toLowerCase();
    const cBase = c.replace(/\s*\([a-z0-9]\)\s*/gi, '').trim();
    const n = normalizeStr(t.name).toLowerCase();
    const nBase = n.replace(/\s*\([a-z0-9]\)\s*/gi, '').trim();
    return c === clean || n === clean || cBase === cleanBase || nBase === cleanBase;
  });

  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    // Nếu có ứng viên là GVCN của chính lớp này, ưu tiên chọn đúng GVCN của lớp
    if (classId) {
      const homeMatch = candidates.find(t => t.homeroomClassId === classId);
      if (homeMatch) return homeMatch;
    }
    // Ưu tiên khớp chính xác tuyệt đối cả mã hoặc tên (kể cả dấu ngoặc)
    const exactCode = candidates.find(t => normalizeStr(t.code).toLowerCase() === clean || normalizeStr(t.name).toLowerCase() === clean);
    if (exactCode) return exactCode;
    return candidates[0];
  }

  // 2. Khớp chính xác theo từng từ hoàn chỉnh (Whole Words)
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const wordMatches = teachers.filter(t => {
      const tWords = normalizeStr(t.name).toLowerCase().split(/\s+/).filter(Boolean);
      return words.every(w => tWords.includes(w));
    });
    if (wordMatches.length === 1) return wordMatches[0];
    if (wordMatches.length > 1 && classId) {
      const home = wordMatches.find(t => t.homeroomClassId === classId);
      if (home) return home;
      return wordMatches[0];
    }
  }

  // 3. Khớp theo Họ + Tên gọi chính (Họ và Tên)
  if (words.length >= 2) {
    const firstWord = words[0];
    const lastWord = words[words.length - 1];
    const firstLastMatches = teachers.filter(t => {
      const tWords = normalizeStr(t.name).toLowerCase().split(/\s+/).filter(Boolean);
      return tWords.length >= 2 && tWords[0] === firstWord && tWords[tWords.length - 1] === lastWord;
    });
    if (firstLastMatches.length === 1) return firstLastMatches[0];
    if (firstLastMatches.length > 1 && classId) {
      const home = firstLastMatches.find(t => t.homeroomClassId === classId);
      if (home) return home;
      return firstLastMatches[0];
    }
  }

  // 4. Khớp theo Tên gọi duy nhất (Last Name)
  if (words.length === 1) {
    const singleName = words[0];
    const matches = teachers.filter(t => {
      const tWords = normalizeStr(t.name).toLowerCase().split(/\s+/).filter(Boolean);
      return tWords.length > 0 && tWords[tWords.length - 1] === singleName;
    });

    if (matches.length === 1) return matches[0];
    if (matches.length > 1 && classId) {
      const homeroomTeacher = matches.find(t => t.homeroomClassId === classId);
      if (homeroomTeacher) return homeroomTeacher;
    }
  }

  // Nếu không khớp với bất kỳ giáo viên nào trong danh mục: trả về null (KHÔNG TỰ Ý ĐOÁN HOẶC THAY THẾ BẰNG GVCN!)
  return null;
}

/**
 * Tạo tên viết tắt sư phạm hiển thị trên ô Thời khóa biểu
 */
export function getTeacherShortName(fullName, homeroomClassId, _task = '') {
  const name = normalizeStr(fullName);
  if (name.includes('Nga (A)')) return 'Nguyễn Nga (A)';
  if (name === 'Nguyễn Thị Nga' && homeroomClassId === '1A1') return 'Nguyễn Nga';
  if (name === 'Bùi Văn Việt') return 'Bùi Việt';
  if (name === 'Lữ Đặng Sinh') return 'Lữ Sinh';
  if (name === 'Nguyễn Văn Châu Đàn') return 'Châu Đàn';
  if (name === 'Nguyễn Thị Huyền Trang') return 'Huyền Trang';
  if (name === 'Thái Thị Hoa Mai') return 'Thái Mai';
  if (name === 'Lê Thị Thúy Hải') return 'Lê Hải';
  if (name === 'Lê Như Quỳnh') return 'Lê Quỳnh';
  if (name === 'Đặng Phương Linh') return 'Đặng Linh';
  if (name === 'Nguyễn Thảo Vy') return 'Nguyễn Vy';
  if (name === 'Phan Hạnh Huyền') return 'Hạnh Huyền';

  // Quy tắc chuẩn: Họ + Tên gọi (ví dụ: Lê Thủy, Hồ Thương, Trần Mừng, Hoàng Hòa)
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]} ${parts[parts.length - 1]}`;
  }
  return name;
}

/**
 * Bóc tách sheet 'Phân công chuyên môn' với cơ chế dò tìm header động và chống sai lệch cột
 */
export function parseAssignmentSheet(ws) {
  if (!ws) return [];
  const pcData = Array.isArray(ws) ? ws : sheetTo2DArray(ws);
  const teachers = [];
  const usedIds = new Set();

  let headerRow = -1;
  let colTt = 0;
  let colName = 1;
  let colTask = 2;
  let colTotal = 12;
  let colQuota = 14;

  // 1. Dò tìm đúng dòng header bảng (chứa TT hoặc Họ tên)
  for (let r = 0; r < Math.min(15, pcData.length); r++) {
    const row = pcData[r];
    if (!row || !Array.isArray(row)) continue;
    
    // Header bảng thật sự phải có cột Họ tên / Họ và tên (không phải dòng tiêu đề quyết định)
    const hasNameCol = row.some(c => {
      const s = normalizeStr(c).toLowerCase();
      return s === 'họ tên' || s === 'họ và tên' || s.startsWith('họ và tên') || s.startsWith('họ tên');
    });

    if (hasNameCol) {
      headerRow = r;
      row.forEach((cell, cIdx) => {
        const cLower = normalizeStr(cell).toLowerCase();
        if (cLower === 'tt' || cLower === 'stt') colTt = cIdx;
        if (cLower.includes('họ và tên') || cLower.includes('họ tên')) colName = cIdx;
        if (cLower.includes('nhiệm vụ') && !cLower.includes('phân công chuyên môn')) colTask = cIdx;
        if (cLower.includes('số tiết') || (cLower.includes('tổng') && cLower.includes('tiết'))) colTotal = cIdx;
        if (cLower.includes('định mức')) colQuota = cIdx;
      });
      break;
    }
  }

  // 2. Tìm dòng bắt đầu có dữ liệu giáo viên (dòng đầu tiên có STT = 1 hoặc có tên người)
  let firstDataRow = headerRow !== -1 ? headerRow + 1 : 8;
  for (let r = firstDataRow; r < Math.min(firstDataRow + 5, pcData.length); r++) {
    const row = pcData[r];
    if (!row) continue;
    const ttVal = Number(row[colTt]);
    const nameVal = normalizeStr(row[colName]);
    if (ttVal === 1 || (nameVal && !['sáng', 'chiều', 'thứ 2', 'thứ 3'].includes(nameVal.toLowerCase()))) {
      firstDataRow = r;
      break;
    }
  }

  for (let r = firstDataRow; r < pcData.length; r++) {
    const row = pcData[r];
    if (!row || !row[colName] || typeof row[colName] !== 'string') continue;
    const rawTt = row[colTt];
    const name = normalizeStr(row[colName]);
    const task = normalizeStr(row[colTask] || '');
    const totalPeriods = Number(row[colTotal]) || 0;
    const dinhMuc = Number(row[colQuota]) || 23;

    if (!name || name.includes('UBND') || name.includes('CỘNG HÒA') || name.includes('TRƯỜNG') || name.includes('Tổng cộng')) continue;

    let isHomeroom = false;
    let homeroomClassId = null;

    // Nhận diện lớp chủ nhiệm: "Chủ nhiệm 1A1", "GVCN 1A1", "CN 1A1", "Chủ nhiệm lớp 1A1", v.v.
    const matchHome = task.match(/(?:Chủ nhiệm|GVCN|CN)\s*(?:lớp\s*)?([1-5]A[1-5])/i);
    if (matchHome) {
      isHomeroom = true;
      homeroomClassId = matchHome[1].toUpperCase();
    }
    if (name.includes('Hồ Thị Nhung')) {
      isHomeroom = true;
      homeroomClassId = '5A2';
    }
    if (name.includes('Nguyễn Văn Trí')) {
      isHomeroom = true;
      homeroomClassId = '4A3';
    }

    let dept = 'Giáo viên';
    const taskLower = task.toLowerCase();
    if (taskLower.includes('phụ trách chung') || taskLower.includes('hiệu trưởng') || taskLower.includes('phụ trách chuyên môn')) {
      dept = 'Ban Giám Hiệu';
    } else if (taskLower.includes('kế toán') || taskLower.includes('văn thư') || taskLower.includes('y tế') || taskLower.includes('bảo vệ')) {
      dept = 'Tổ Văn Phòng';
    } else if (taskLower.includes('tiếng anh')) {
      dept = 'Tổ Ngoại Ngữ';
    } else if (taskLower.includes('tin khối') || taskLower.includes('tin học')) {
      dept = 'Tổ Tin Học';
    } else if (taskLower.includes('âm nhạc') || taskLower.includes('mỹ thuật') || taskLower.includes('mĩ thuật') || taskLower.includes('gdtc') || taskLower.includes('thể dục')) {
      dept = 'Tổ Thể Chất - Nghệ Thuật';
    }

    let tt = !isNaN(rawTt) && rawTt !== '' && Number(rawTt) > 0 ? Number(rawTt) : (name === 'Nguyễn Thị An' ? 41 : (teachers.length + 1));
    let id = `GV_${String(tt).padStart(2, '0')}`;

    if (usedIds.has(id)) {
      tt = teachers.length + 1;
      id = `GV_${String(tt).padStart(2, '0')}`;
    }
    usedIds.add(id);

    const code = getTeacherShortName(name, homeroomClassId, task);

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
      maxPeriodsPerDay: 7,
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
  const rows = Array.isArray(ws) ? ws : sheetTo2DArray(ws);
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
 * Bóc tách một trang tính chứa các cột lớp học và tiết học
 */
function parseScheduleGridSheet(ws, sheetName, classesMap, teachers, timetable, rawSlots) {
  if (!ws) return;
  const sData = Array.isArray(ws) ? ws : sheetTo2DArray(ws);
  if (!sData || sData.length === 0) return;

  // 1. Tìm dòng tiêu đề chứa mã lớp (1A1 -> 5A5)
  let headerRowIdx = -1;
  const classCols = [];

  for (let r = 0; r < Math.min(15, sData.length); r++) {
    const row = sData[r];
    if (row && row.some(c => typeof c === 'string' && normalizeStr(c).match(/([1-5]A[1-5])/i))) {
      headerRowIdx = r;
      row.forEach((cell, cIdx) => {
        const cleanCell = normalizeStr(cell);
        const matchClass = cleanCell.match(/([1-5]A[1-5])/i);
        if (matchClass) {
          const classId = matchClass[1].toUpperCase();
          const alreadyAdded = classCols.some(col => col.classId === classId);
          if (!alreadyAdded) {
            classCols.push({ classId, colSub: cIdx, colTch: cIdx + 1 });
            if (!classesMap.has(classId)) {
              const homeTch = teachers.find(t => t.homeroomClassId === classId);
              classesMap.set(classId, {
                id: classId,
                name: `Lớp ${classId}`,
                grade: Number(classId[0]),
                homeroomTeacherId: homeTch ? homeTch.id : 'GV_01',
                mainRoom: `P.${classId}`,
                studentCount: 35
              });
            }
          }
        }
      });
      break;
    }
  }

  if (headerRowIdx === -1 || classCols.length === 0) return;

  // 2. Khởi tạo khung thời khóa biểu
  classCols.forEach(({ classId }) => {
    if (!timetable[classId]) {
      timetable[classId] = {
        2: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
        3: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
        4: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
        5: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
        6: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null }
      };
    }
  });

  // 3. Duyệt qua từng dòng tiết học
  let currentDay = null;
  let currentSession = null;

  for (let r = headerRowIdx + 1; r < sData.length; r++) {
    const row = sData[r];
    if (!row || row.length === 0) continue;

    // Bỏ qua dòng footer / chữ ký
    const fullRowText = row.join(' ');
    if (fullRowText.includes('Tân Mai') || fullRowText.includes('HIỆU TRƯỞNG') || fullRowText.includes('Bùi Văn Việt')) continue;

    // Cột 0: Thứ (Thứ 2..6)
    const col0 = normalizeStr(row[0]);
    if (col0 && col0.match(/[2-6]/)) {
      currentDay = Number(col0.match(/[2-6]/)[0]);
    }

    // Cột 1: Buổi (Sáng / Chiều)
    const col1 = normalizeStr(row[1]);
    if (col1.toLowerCase().includes('sáng') || col1.toLowerCase().includes('sang')) {
      currentSession = 'Sáng';
    } else if (col1.toLowerCase().includes('chiều') || col1.toLowerCase().includes('chieu')) {
      currentSession = 'Chiều';
    }

    // Cột 2: Tiết (1..4)
    const rawPeriod = Number(row[2]);
    if (!rawPeriod || isNaN(rawPeriod) || !currentDay) continue;

    // Tự động nội suy Buổi nếu ô buổi bị merge/trống
    if (!currentSession) {
      currentSession = rawPeriod <= 4 ? 'Sáng' : 'Chiều';
    }

    const periodId = currentSession === 'Chiều' ? (4 + rawPeriod) : rawPeriod;
    if (periodId < 1 || periodId > 7) continue;

    classCols.forEach(({ classId, colSub, colTch }) => {
      let subjRaw = normalizeStr(row[colSub]);
      let teacherRaw = normalizeStr(row[colTch]);

      if (subjRaw) {
        const { subjectId, roomId } = mapSubjectCodeAndRoom(subjRaw);
        const teacherObj = resolveTeacher(teacherRaw, classId, teachers);
        const cleanTeacherName = teacherObj ? teacherObj.code : (teacherRaw ? teacherRaw.replace(/^(?:Đ\/c\.|Đ\/c|Đc\.|Đc|Thầy|Cô)\s+/i, '').trim() : '');

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
          teacherRaw: cleanTeacherName,
          teacherName: teacherObj ? teacherObj.name : cleanTeacherName,
          teacherCode: cleanTeacherName,
          roomId,
          isLocked: true
        };

        rawSlots.push(slotItem);

        if (timetable[classId]) {
          timetable[classId][currentDay][periodId] = {
            subjectId,
            subjectRaw: subjRaw,
            teacherId: teacherObj ? teacherObj.id : '',
            teacherRaw: cleanTeacherName,
            roomId,
            isLocked: true
          };
        }
      }
    });
  }
}

/**
 * Hàm chính: Đọc và phân tích toàn bộ Workbook Excel một cách thông minh và linh hoạt
 */
export async function parseExcelWorkbook(dataOrBuffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(dataOrBuffer);
  const sheetNames = (workbook.worksheets || []).map(ws => ws.name);
  
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
      name: 'Trường TH Quỳnh Lộc',
      year: 'Năm học 2026 - 2027'
    }
  };

  const classesMap = new Map();

  // Helper tìm sheet không phân biệt hoa thường hoặc theo điều kiện
  const findWs = (predicateOrName) => {
    if (typeof predicateOrName === 'string') {
      const direct = workbook.getWorksheet(predicateOrName);
      if (direct) return direct;
      const targetClean = normalizeStr(predicateOrName).toLowerCase();
      return (workbook.worksheets || []).find(ws => normalizeStr(ws.name).toLowerCase() === targetClean);
    }
    if (typeof predicateOrName === 'function') {
      return (workbook.worksheets || []).find(predicateOrName);
    }
    return null;
  };

  // 1. Phân tích sheet Phân công chuyên môn (nếu có)
  const pcSheet = findWs(ws => {
    const sLow = normalizeStr(ws.name).toLowerCase();
    return sLow.includes('phân công') || sLow.includes('phan cong') || sLow.includes('chuyên môn') || sLow === 'pc';
  });
  if (pcSheet) {
    parsed.teachers = parseAssignmentSheet(pcSheet);
  }

  // 2. Phân tích sheet Tiết đọc TV (nếu có)
  const tvSheet = findWs(ws => {
    const sLow = normalizeStr(ws.name).toLowerCase();
    return sLow.includes('đọc tv') || sLow.includes('doc tv') || sLow.includes('thư viện');
  });
  if (tvSheet) {
    parsed.readingSlots = parseReadingScheduleSheet(tvSheet);
  }

  // 3. Phân tích theo các khối lớp (1..5) hoặc ma trận
  const gradeSheetCandidates = [];
  for (let g = 1; g <= 5; g++) {
    const matchedSheet = (workbook.worksheets || []).find(ws => {
      const cleanS = normalizeStr(ws.name);
      const regex = new RegExp(`^(?:Khối|Khoi|K|Lớp|Lop)?\\s*${g}(?:\\.|_|\\s|$)`, 'i');
      return regex.test(cleanS);
    });
    if (matchedSheet) {
      gradeSheetCandidates.push({ grade: g, sheet: matchedSheet });
    }
  }

  // Tìm sheet Ma trận toàn trường (nếu có)
  const masterSheet = findWs(ws => {
    const sLow = normalizeStr(ws.name).toLowerCase();
    return sLow.includes('tkb_toan_truong') || sLow.includes('toàn trường') || sLow.includes('toan truong') || sLow === 'tkb';
  });

  const templateTeacherSheet = findWs('Danh_Sach_Giao_Vien');

  if (gradeSheetCandidates.length > 0) {
    parsed.format = 'REAL_SCHOOL_MULTISHEET';
    gradeSheetCandidates.forEach(({ sheet }) => {
      parseScheduleGridSheet(sheet, sheet.name, classesMap, parsed.teachers, parsed.timetable, parsed.rawSlots);
    });
  } else if (masterSheet) {
    parsed.format = 'MASTER_MATRIX';
    parseScheduleGridSheet(masterSheet, masterSheet.name, classesMap, parsed.teachers, parsed.timetable, parsed.rawSlots);
  } else if (templateTeacherSheet) {
    parsed.format = 'TEMPLATE_FORMAT';
    // Đọc từ file mẫu hệ thống
    const rawTeachers = sheetToJsonObjects(templateTeacherSheet);
    parsed.teachers = rawTeachers.map(r => ({
      id: normalizeStr(r['Mã GV'] || r['Ma GV']),
      name: normalizeStr(r['Họ và Tên'] || r['Ho va Ten']),
      code: normalizeStr(r['Tên TKB (Viết tắt)'] || r['Mã Viết Tắt'] || r['Họ và Tên']),
      department: normalizeStr(r['Tổ Chuyên Môn'] || 'Giáo viên'),
      isHomeroom: normalizeStr(r['Chủ Nhiệm'] || r['Là GV Chủ Nhiệm (CÓ/KHÔNG)']).toUpperCase().includes('CÓ') || normalizeStr(r['Chủ Nhiệm']).includes('Lớp'),
      homeroomClassId: r['Chủ Nhiệm'] ? normalizeStr(r['Chủ Nhiệm']).replace('Lớp ', '').trim() : (r['Chủ Nhiệm Lớp'] ? normalizeStr(r['Chủ Nhiệm Lớp']) : null),
      phone: normalizeStr(r['Số Điện Thoại'] || ''),
      email: normalizeStr(r['Email'] || ''),
      maxPeriodsPerDay: Number(r['Số Tiết Tối Đa / Ngày']) || 7,
      offSessions: (r['Buổi Đăng Ký Nghỉ'] || '').split(',').map(s => s.trim()).filter(Boolean),
      color: '#3b82f6'
    }));

    const templateClassSheet = findWs('Danh_Sach_Lop');
    if (templateClassSheet) {
      const rawClasses = sheetToJsonObjects(templateClassSheet);
      rawClasses.forEach(c => {
        const cId = normalizeStr(c['Mã Lớp'] || c['Mã Lớp Học'] || c['Ma Lop']);
        if (cId) {
          classesMap.set(cId, {
            id: cId,
            name: normalizeStr(c['Tên Lớp Học'] || c['Tên Lớp'] || `Lớp ${cId}`),
            grade: Number(c['Khối Lớp'] || c['Khối']) || Number(String(cId)[0]) || 1,
            homeroomTeacherId: normalizeStr(c['Mã GVCN']),
            mainRoom: normalizeStr(c['Phòng Học Chính'] || `P.${cId}`),
            studentCount: Number(c['Sĩ Số Học Sinh'] || c['Sĩ Số']) || 35
          });
        }
      });
    }

    // Nếu có sheet TKB_Toan_Truong trong template
    const templateTkbSheet = findWs('TKB_Toan_Truong');
    if (templateTkbSheet) {
      parseScheduleGridSheet(templateTkbSheet, 'TKB_Toan_Truong', classesMap, parsed.teachers, parsed.timetable, parsed.rawSlots);
    }
  }

  // Cập nhật danh sách lớp học
  parsed.classes = Array.from(classesMap.values());

  // ★ AUTO-DISCOVERY: Tự động bổ sung & ánh xạ giáo viên từ ô Thời khóa biểu nếu chưa có trong danh mục
  const teacherCodeMap = new Map();
  parsed.teachers.forEach(t => {
    if (t.code) teacherCodeMap.set(normalizeStr(t.code).toLowerCase(), t);
    if (t.name) teacherCodeMap.set(normalizeStr(t.name).toLowerCase(), t);
  });

  const newlyDiscoveredTeachers = new Map();

  parsed.rawSlots.forEach(s => {
    const rawName = (s.teacherRaw || '').trim();
    if (!rawName) return;
    const cleanName = rawName.replace(/^(?:Đ\/c\.|Đ\/c|Đc\.|Đc|Thầy|Cô)\s+/i, '').trim();
    if (!cleanName || cleanName.length < 2) return;
    const key = cleanName.toLowerCase();

    // Nếu slot chưa có teacherId hoặc teacherId không tồn tại trong parsed.teachers
    const currentTeacherExists = parsed.teachers.some(t => t.id === s.teacherId);
    if (!currentTeacherExists) {
      let matchedTeacher = teacherCodeMap.get(key);
      if (!matchedTeacher) {
        matchedTeacher = parsed.teachers.find(t => {
          const tCode = normalizeStr(t.code).toLowerCase();
          const tName = normalizeStr(t.name).toLowerCase();
          return tCode === key || tName === key || tName.endsWith(key) || key.endsWith(tCode);
        });
      }

      if (!matchedTeacher) {
        if (!newlyDiscoveredTeachers.has(key)) {
          const nextTt = parsed.teachers.length + newlyDiscoveredTeachers.size + 1;
          const newTch = {
            id: `GV_${String(nextTt).padStart(2, '0')}`,
            tt: nextTt,
            name: cleanName,
            code: cleanName,
            shortName: cleanName,
            department: 'Giáo viên',
            position: 'Giáo Viên',
            isHomeroom: false,
            homeroomClassId: null,
            task: '',
            assignedPeriods: 0,
            dinhMuc: 23,
            maxPeriodsPerDay: 7,
            offSessions: [],
            color: '#3b82f6'
          };
          newlyDiscoveredTeachers.set(key, newTch);
          teacherCodeMap.set(key, newTch);
        }
        matchedTeacher = newlyDiscoveredTeachers.get(key);
      }

      if (matchedTeacher) {
        s.teacherId = matchedTeacher.id;
        s.teacherCode = matchedTeacher.code || cleanName;
        s.teacherName = matchedTeacher.name || cleanName;
        if (parsed.timetable[s.classId]?.[s.day]?.[s.period]) {
          parsed.timetable[s.classId][s.day][s.period].teacherId = matchedTeacher.id;
          parsed.timetable[s.classId][s.day][s.period].teacherCode = matchedTeacher.code || cleanName;
          parsed.timetable[s.classId][s.day][s.period].teacherName = matchedTeacher.name || cleanName;
        }
      }
    }
  });

  if (newlyDiscoveredTeachers.size > 0) {
    newlyDiscoveredTeachers.forEach(tch => {
      parsed.teachers.push(tch);
    });
  }

  // 4. Sinh assignments (Phân công chuyên môn)
  const asgList = [];
  parsed.classes.forEach(cls => {
    const gQuota = DEFAULT_GRADE_QUOTAS[cls.grade];
    if (!gQuota) return;

    gQuota.subjects.forEach(sub => {
      // Tìm giáo viên thực tế đã dạy môn này trong TKB của lớp
      let foundTchId = '';
      let placedCount = 0;

      parsed.rawSlots.forEach(s => {
        if (s.classId === cls.id && s.subjectId === sub.subjectId) {
          placedCount++;
          if (s.teacherId && !foundTchId) foundTchId = s.teacherId;
        }
      });

      asgList.push({
        id: `ASG_${cls.id}_${sub.subjectId}`,
        classId: cls.id,
        grade: cls.grade,
        subjectId: sub.subjectId,
        teacherId: foundTchId || '',
        weeklyPeriods: placedCount > 0 ? placedCount : sub.weeklyPeriods,
        roomType: sub.roomType || 'LOP_HOC',
        allowDouble: sub.allowDouble || false
      });
    });
  });

  parsed.assignments = asgList;

  // 5. Trích xuất danh mục môn học thực tế từ TKB và dữ liệu
  const subjectsMap = { ...DEFAULT_SUBJECTS };
  const COLOR_PALETTES = [
    { color: '#2563eb', bg: '#eff6ff', border: '#93c5fd', text: '#1e40af' },
    { color: '#ef4444', bg: '#fef2f2', border: '#fca5a5', text: '#991b1b' },
    { color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd', text: '#5b21b6' },
    { color: '#0284c7', bg: '#f0f9ff', border: '#7dd3fc', text: '#075985' },
    { color: '#059669', bg: '#ecfdf5', border: '#6ee7b7', text: '#065f46' },
    { color: '#10b981', bg: '#f0fdf4', border: '#86efac', text: '#166534' },
    { color: '#0d9488', bg: '#f0fdfa', border: '#5eead4', text: '#115e59' },
    { color: '#b45309', bg: '#fffbeb', border: '#fcd34d', text: '#78350f' },
    { color: '#d97706', bg: '#fffbeb', border: '#fde68a', text: '#92400e' },
    { color: '#ea580c', bg: '#fff7ed', border: '#fdba74', text: '#9a3412' },
    { color: '#4f46e5', bg: '#eef2ff', border: '#a5b4fc', text: '#3730a3' },
    { color: '#db2777', bg: '#fdf2f8', border: '#fbcfe8', text: '#9d174d' },
    { color: '#65a30d', bg: '#f7fee7', border: '#bef264', text: '#3f6212' }
  ];

  parsed.rawSlots.forEach(slot => {
    if (slot.subjectId && !subjectsMap[slot.subjectId]) {
      const pIndex = Object.keys(subjectsMap).length % COLOR_PALETTES.length;
      const palette = COLOR_PALETTES[pIndex];
      const sRaw = slot.subjectRaw || slot.subjectId;
      subjectsMap[slot.subjectId] = {
        id: slot.subjectId,
        name: sRaw,
        shortName: sRaw.length > 8 ? sRaw.substring(0, 8) : sRaw,
        category: 'Cơ bản',
        color: palette.color,
        bg: palette.bg,
        border: palette.border,
        text: palette.text,
        icon: 'BookOpen',
        defaultRoom: slot.roomId || 'LOP_HOC',
        description: `Môn học trích xuất từ Thời khóa biểu (${sRaw})`
      };
    }
  });

  parsed.subjects = subjectsMap;

  return parsed;
}
