import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

// 1. Parse teachers from 'Phân công chuyên môn'
const pcSheet = wb.Sheets['Phân công chuyên môn'];
const pcData = XLSX.utils.sheet_to_json(pcSheet, { header: 1, defval: '' });

const teachers = [];
const teacherByName = new Map();
const teacherByCode = new Map();
const teacherByShortName = new Map();

for (let i = 8; i < pcData.length; i++) {
  const row = pcData[i];
  if (!row || !row[1]) continue;
  const rawTt = row[0];
  const name = String(row[1]).trim();
  const task = String(row[2] || '').trim();
  const totalP = Number(row[12]) || 0;
  const kiemNhiem = Number(row[13]) || 0;
  const dinhMuc = Number(row[14]) || 23;
  const tietThua = Number(row[15]) || 0;
  const note = String(row[16] || '').trim();

  let dept = 'Giáo viên';
  let isHomeroom = false;
  let homeroomClassId = null;

  const matchHome = task.match(/Chủ nhiệm\s+([1-5]A[1-5])/i);
  if (matchHome) {
    isHomeroom = true;
    homeroomClassId = matchHome[1].toUpperCase();
  }

  // Fix known Excel typo where Hồ Thị Nhung says "Chủ nhiệm 5A3" instead of 5A2
  if (name.includes('Hồ Thị Nhung')) {
    homeroomClassId = '5A2';
    isHomeroom = true;
  }
  // Nguyễn Văn Trí says "Chủ nhiệm 4A3" -> 4A3
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
  } else {
    dept = 'Giáo viên';
  }

  const nameParts = name.split(/\s+/);
  const lastName = nameParts[nameParts.length - 1];
  const initials = nameParts.slice(0, -1).map(p => p[0]).join('');
  const code = `${lastName.toUpperCase()}.${initials.toUpperCase()}`;

  let id;
  if (rawTt && !isNaN(rawTt)) {
    id = `GV_${String(rawTt).padStart(2, '0')}`;
  } else {
    // For Nguyễn Thị An who had empty TT in Excel
    id = `GV_AN`;
  }

  const tObj = {
    id,
    tt: Number(rawTt) || 26, // around there
    name,
    code,
    department: dept,
    position: dept === 'Ban Giám Hiệu' ? (rawTt === 1 ? 'Hiệu Trưởng' : 'Phó Hiệu Trưởng') : (isHomeroom ? `GVCN Lớp ${homeroomClassId}` : (dept === 'Tổ Văn Phòng' ? task : 'Giáo Viên')),
    isHomeroom,
    homeroomClassId,
    task,
    assignedPeriods: totalP,
    dinhMuc,
    maxPeriodsPerDay: 6,
    offSessions: [],
    color: '#3b82f6'
  };

  teachers.push(tObj);
  teacherByName.set(name.toLowerCase(), tObj);
  // Also index short versions like "Nguyễn Nga", "Lê Thủy", "Hồ Thương", "Châu Đàn", "Trần Mừng", "Lữ Sinh", "Trần Thủy", "Đặng Ba", "Hồ Duy", etc.
  const shortName = `${nameParts[0]} ${nameParts[nameParts.length - 1]}`.toLowerCase(); // e.g. "nguyễn nga"
  const singleLast = lastName.toLowerCase();
  teacherByShortName.set(shortName, tObj);
  teacherByShortName.set(name.toLowerCase(), tObj);
}

console.log(`Total teachers: ${teachers.length}`);

// Function to match a raw string like "Đ/c Nguyễn Nga", "Đ/c Lê Thủy", "Đ/c Hồ Duy", "Đ/c Nguyễn Minh"
function resolveTeacher(teacherRaw, classId, subjectId) {
  if (!teacherRaw) {
    // If no teacher specified, it defaults to the Homeroom Teacher of that class
    const homeroomTeacher = teachers.find(t => t.homeroomClassId === classId);
    return homeroomTeacher || null;
  }

  let clean = teacherRaw.replace(/^Đ\/c\s+/i, '').trim().toLowerCase();

  // Special cases:
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
  if (clean === 'lữ sinh') {
    return teachers.find(t => t.name.includes('Lữ Đặng Sinh'));
  }
  if (clean === 'châu đàn') {
    return teachers.find(t => t.name.includes('Châu Đàn'));
  }
  if (clean === 'hồ huyền') {
    return teachers.find(t => t.name.includes('Hồ Thị Huyền') || t.name.includes('Hồ Thị Huyền'));
  }
  if (clean === 'hồ hằng') {
    return teachers.find(t => t.name.includes('Hồ Thị Hằng'));
  }
  if (clean === 'trần mừng') {
    return teachers.find(t => t.name.includes('Trần Thị Mừng'));
  }
  if (clean === 'trần thủy') {
    return teachers.find(t => t.name.includes('Trần Thị Thủy'));
  }
  if (clean === 'đặng ba') {
    return teachers.find(t => t.name.includes('Đặng Thị Ba'));
  }
  if (clean === 'hồ duy') {
    return teachers.find(t => t.name.includes('Hồ Quốc Duy'));
  }
  if (clean === 'hoàng hòa') {
    return teachers.find(t => t.name.includes('Hoàng Thị Hòa'));
  }
  if (clean === 'nguyễn an') {
    return teachers.find(t => t.name === 'Nguyễn Thị An');
  }
  if (clean === 'hồ cường' || clean === 'việt cường') {
    return teachers.find(t => t.name.includes('Hồ Việt Cường'));
  }

  // General matching
  for (const t of teachers) {
    const tLower = t.name.toLowerCase();
    if (tLower === clean || tLower.endsWith(clean) || tLower.includes(clean)) {
      return t;
    }
  }

  return null;
}

// Map Subject strings to Subject IDs
function mapSubject(subjRaw, classId, teacherObj) {
  if (!subjRaw) return null;
  const s = String(subjRaw).trim();
  if (s.includes('HĐTN')) return 'HDTN';
  if (s.includes('Tiếng Anh') || s.includes('T.Anh')) return 'TIENG_ANH';
  if (s.includes('Tin học') || s.includes('Tin')) return 'TIN_HOC';
  if (s.includes('Công nghệ')) return 'TIN_HOC'; // or CONG_NGHE
  if (s.includes('GDTC') || s.includes('Thể dục')) return 'THE_DUC';
  if (s.includes('Mĩ thuật') || s.includes('Mỹ thuật')) return 'MY_THUAT';
  if (s.includes('Âm nhạc')) return 'AM_NHAC';
  if (s.includes('TNXH')) return 'TNXH';
  if (s.includes('Khoa-Sử-Địa') || s.includes('Sử-Địa') || s.includes('LS_DL')) return 'LS_DL';
  if (s.includes('Khoa học')) return 'KHOA_HOC';
  if (s.includes('Toán')) return 'TOAN';
  if (s.includes('Tiếng Việt') || s.includes('T.Việt')) return 'TIENG_VIET';
  if (s.includes('Đạo đức') || s.includes('ĐĐ')) return 'DAO_DUC';
  if (s.includes('Chào cờ') || s.includes('HĐCC')) return 'CHAO_CO';
  if (s.includes('Sinh hoạt')) return 'SINH_HOAT';
  if (s.includes('PTNL') || s.includes('Đọc Thư viện') || s.includes('HDTH') || s.includes('TU_CHON')) return 'TU_CHON';
  
  if (s.includes('Đ/c Hoàng Hòa')) return 'TIN_HOC'; // in 5A5
  return 'TU_CHON';
}

console.log('Test resolveTeacher:');
console.log('Đ/c Nguyễn Nga (1A1) =>', resolveTeacher('Đ/c Nguyễn Nga', '1A1')?.name);
console.log('Đ/c Nguyễn Nga (5A3) =>', resolveTeacher('Đ/c Nguyễn Nga', '5A3')?.name);
console.log('Đ/c Châu Đàn =>', resolveTeacher('Đ/c Châu Đàn')?.name);
console.log('Đ/c Hồ Duy =>', resolveTeacher('Đ/c Hồ Duy')?.name);
console.log('Đ/c Nguyễn Minh =>', resolveTeacher('Đ/c Nguyễn Minh')?.name);
console.log('Đ/c Nguyễn An =>', resolveTeacher('Đ/c Nguyễn An')?.name);
console.log('Đ/c Trần Mừng =>', resolveTeacher('Đ/c Trần Mừng')?.name);
console.log('Empty teacher (1A2) =>', resolveTeacher('', '1A2')?.name);
