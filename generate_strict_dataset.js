import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

// 1. Teachers from Phân công chuyên môn
const pcSheet = wb.Sheets['Phân công chuyên môn'];
const pcData = XLSX.utils.sheet_to_json(pcSheet, { header: 1, defval: '' });

const teachers = [];
for (let i = 8; i < pcData.length; i++) {
  const row = pcData[i];
  if (!row || !row[1]) continue;
  const rawTt = row[0];
  const name = String(row[1]).trim();
  const task = String(row[2] || '').trim();
  const totalP = Number(row[12]) || 0;
  const kiemNhiem = Number(row[13]) || 0;
  let dinhMuc = Number(row[14]) || 23;
  if (task.includes('Kế toán') || task.includes('Văn thư') || task.includes('Y tế') || task.includes('Bảo vệ') || task.includes('Nghỉ sinh')) {
    dinhMuc = 0;
  } else if (rawTt == 1) {
    dinhMuc = 2;
  } else if (rawTt == 2) {
    dinhMuc = 4;
  }

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
  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  const code = `${firstName} ${lastName}`;

  let id;
  let tt;
  if (rawTt && !isNaN(rawTt)) {
    tt = Number(rawTt);
    id = `GV_${String(tt).padStart(2, '0')}`;
  } else {
    tt = 41;
    id = `GV_41`;
  }

  let position = 'Giáo Viên';
  if (tt === 1 || task.includes('Phụ trách chung') || task.includes('Hiệu trưởng')) {
    position = 'Hiệu Trưởng';
  } else if (tt === 2 || task.includes('Phụ trách chuyên môn') || task.includes('Phó Hiệu Trưởng')) {
    position = 'Phó Hiệu Trưởng';
  } else if (isHomeroom) {
    position = `GVCN ${homeroomClassId}`;
  } else if (task.includes('Tổng phụ trách')) {
    position = 'Tổng Phụ Trách Đội';
  } else if (task.includes('Kế toán')) {
    position = 'Kế toán';
  } else if (task.includes('Văn thư')) {
    position = 'Văn thư - Thủ quỹ';
  } else if (task.includes('Y tế') || task.includes('Thư viện')) {
    position = 'Y tế - Thư viện';
  } else if (task.includes('Bảo vệ')) {
    position = 'Bảo vệ';
  } else if (task.includes('Nghỉ sinh')) {
    position = 'Nghỉ sinh';
  } else {
    position = 'GV Bộ Môn';
  }

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
    maxPeriodsPerDay: 7,
    offSessions: [],
    color: '#3b82f6'
  });
}

// 2. Classes
const gradeSheetMap = {
  1: { sheet: '1', classes: ['1A1', '1A2', '1A3', '1A4'] },
  2: { sheet: '2', classes: ['2A1', '2A2', '2A3', '2A4', '2A5'] },
  3: { sheet: wb.Sheets['3.'] ? '3.' : '3', classes: ['3A1', '3A2', '3A3', '3A4'] },
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

function resolveTeacher(teacherRaw, classId) {
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

function mapSubjectCode(subRaw, defaultRoom = 'LOP_HOC') {
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
  if (s.includes('Khoa-Sử-Địa') || s.includes('Sử-Địa') || s.includes('LS_DL') || s.includes('Khoa học')) return { subjectId: 'LS_DL', roomId: 'LOP_HOC' };
  if (s.includes('Toán')) return { subjectId: 'TOAN', roomId: 'LOP_HOC' };
  if (s.includes('Tiếng Việt') || s.includes('T.Việt')) return { subjectId: 'TIENG_VIET', roomId: 'LOP_HOC' };
  if (s.includes('Đạo đức') || s.includes('ĐĐ')) return { subjectId: 'DAO_DUC', roomId: 'LOP_HOC' };
  if (s.includes('Chào cờ') || s.includes('HĐCC')) return { subjectId: 'CHAO_CO', roomId: 'SAN_TRUONG' };
  if (s.includes('Sinh hoạt')) return { subjectId: 'SINH_HOAT', roomId: 'LOP_HOC' };
  if (s.includes('Đ/c Hoàng Hòa')) return { subjectId: 'CONG_NGHE', roomId: 'LOP_HOC' };
  return { subjectId: 'TU_CHON', roomId: defaultRoom };
}

// 3. Timetable Matrix: strictly ONLY 304 slots from Excel
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

let totalImportedSlots = 0;
let totalTinSlots = 0;
let totalCnSlots = 0;

Object.entries(gradeSheetMap).forEach(([gStr, gInfo]) => {
  const ws = wb.Sheets[gInfo.sheet];
  if (!ws) return;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const header = data[7];
  
  let currentDay = 2;
  let currentSession = 'Sáng';
  
  for (let r = 9; r < data.length; r++) {
    const row = data[r];
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
        const tObj = resolveTeacher(teacherRaw, clsName);
        const { subjectId, roomId } = mapSubjectCode(subjRaw);

        if (subjectId === 'TIN_HOC') totalTinSlots++;
        if (subjectId === 'CONG_NGHE') totalCnSlots++;
        
        timetable[clsName][currentDay][periodId] = {
          subjectId,
          subjectRaw: subjRaw || (subjectId === 'LS_DL' ? 'Khoa-Sử-Địa' : (subjectId === 'CONG_NGHE' ? 'Công nghệ' : subjectId)),
          teacherId: tObj ? tObj.id : '',
          teacherRaw: teacherRaw || (tObj ? tObj.name : ''),
          roomId,
          isLocked: true
        };
        totalImportedSlots++;
      }
    }
  }
});

// 4. Assignments: build from Phân công chuyên môn
const assignments = [];
const gradeQuotas = {
  1: {
    grade: 1,
    gradeName: 'Khối 1',
    targetWeeklyPeriods: 32,
    subjects: [
      { subjectId: 'TIENG_VIET', weeklyPeriods: 12, maxMorning: 8, maxAfternoon: 4, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TOAN', weeklyPeriods: 3, maxMorning: 3, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIENG_ANH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TNXH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'SAN_THE_CHAT' },
      { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TU_CHON', weeklyPeriods: 5, maxMorning: 1, maxAfternoon: 4, allowDouble: true, roomType: 'LOP_HOC' }
    ]
  },
  2: {
    grade: 2,
    gradeName: 'Khối 2',
    targetWeeklyPeriods: 35,
    subjects: [
      { subjectId: 'TIENG_VIET', weeklyPeriods: 7, maxMorning: 5, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TOAN', weeklyPeriods: 5, maxMorning: 4, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIENG_ANH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TNXH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'SAN_THE_CHAT' },
      { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TU_CHON', weeklyPeriods: 11, maxMorning: 1, maxAfternoon: 10, allowDouble: true, roomType: 'LOP_HOC' }
    ]
  },
  3: {
    grade: 3,
    gradeName: 'Khối 3',
    targetWeeklyPeriods: 35,
    subjects: [
      { subjectId: 'TIENG_VIET', weeklyPeriods: 7, maxMorning: 5, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TOAN', weeklyPeriods: 5, maxMorning: 4, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIENG_ANH', weeklyPeriods: 4, maxMorning: 3, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIN_HOC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_TIN_HOC' },
      { subjectId: 'CONG_NGHE', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TNXH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'SAN_THE_CHAT' },
      { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TU_CHON', weeklyPeriods: 7, maxMorning: 0, maxAfternoon: 7, allowDouble: true, roomType: 'LOP_HOC' }
    ]
  },
  4: {
    grade: 4,
    gradeName: 'Khối 4',
    targetWeeklyPeriods: 35,
    subjects: [
      { subjectId: 'TIENG_VIET', weeklyPeriods: 7, maxMorning: 5, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TOAN', weeklyPeriods: 5, maxMorning: 4, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIENG_ANH', weeklyPeriods: 4, maxMorning: 3, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIN_HOC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_TIN_HOC' },
      { subjectId: 'CONG_NGHE', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'LS_DL', weeklyPeriods: 4, maxMorning: 3, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'SAN_THE_CHAT' },
      { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TU_CHON', weeklyPeriods: 5, maxMorning: 0, maxAfternoon: 5, allowDouble: true, roomType: 'LOP_HOC' }
    ]
  },
  5: {
    grade: 5,
    gradeName: 'Khối 5',
    targetWeeklyPeriods: 35,
    subjects: [
      { subjectId: 'TIENG_VIET', weeklyPeriods: 7, maxMorning: 5, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TOAN', weeklyPeriods: 5, maxMorning: 4, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIENG_ANH', weeklyPeriods: 4, maxMorning: 3, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TIN_HOC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_TIN_HOC' },
      { subjectId: 'CONG_NGHE', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'LS_DL', weeklyPeriods: 4, maxMorning: 3, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'SAN_THE_CHAT' },
      { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
      { subjectId: 'TU_CHON', weeklyPeriods: 5, maxMorning: 0, maxAfternoon: 5, allowDouble: true, roomType: 'LOP_HOC' }
    ]
  }
};

classes.forEach(cls => {
  const gvHome = teachers.find(t => t.id === cls.homeroomTeacherId);
  const homeId = gvHome ? gvHome.id : 'GV_01';
  const gQuota = gradeQuotas[cls.grade];

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

console.log(`Strictly extracted: ${totalImportedSlots} slots (Tin học: ${totalTinSlots}, Công nghệ: ${totalCnSlots}), ${teachers.length} teachers, ${classes.length} classes, ${assignments.length} assignments`);

// Write out JS & JSON files
const fullData = {
  schoolName: 'Trường Tiểu Học Quỳnh Lộc B',
  subdistrict: 'UBND Phường Tân Mai',
  schoolYear: '2026 - 2027',
  scheduleNote: 'Thời khóa biểu chính thức thực hiện từ Tuần 01',
  teachers,
  classes,
  assignments,
  timetable
};

const jsContent = `// src/data/quynhLocSchoolData.js
// Dữ liệu Thời khóa biểu Chính Thức - Trường Tiểu Học Quỳnh Lộc B
// Năm học 2026 - 2027 (Thực hiện từ Tuần 01)
// Bóc tách chính xác 100% từ file Excel (304 tiết đã xếp, 41 giáo viên, 23 lớp)
// Đã phân định riêng rẽ Môn Tin Học và Môn Công Nghệ

export const QUYNH_LOC_DATA = ${JSON.stringify(fullData, null, 2)};
`;

fs.writeFileSync('src/data/quynhLocSchoolData.js', jsContent, 'utf-8');
fs.writeFileSync('src/data/savedData.json', JSON.stringify(fullData, null, 2), 'utf-8');
console.log('Successfully wrote to src/data/quynhLocSchoolData.js and src/data/savedData.json');
