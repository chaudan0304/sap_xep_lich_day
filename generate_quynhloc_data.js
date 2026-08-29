import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

// 1. Teachers
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

function resolveTeacher(teacherRaw, classId, subjectId) {
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
  if (s.includes('Công nghệ')) return { subjectId: 'TIN_HOC', roomId: 'LOP_HOC' };
  if (s.includes('GDTC') || s.includes('Thể dục')) return { subjectId: 'THE_DUC', roomId: 'SAN_THE_CHAT' };
  if (s.includes('Mĩ thuật') || s.includes('Mỹ thuật')) return { subjectId: 'MY_THUAT', roomId: 'PHONG_MY_THUAT' };
  if (s.includes('Âm nhạc')) return { subjectId: 'AM_NHAC', roomId: 'PHONG_AM_NHAC' };
  if (s.includes('TNXH')) return { subjectId: 'TNXH', roomId: 'LOP_HOC' };
  if (s.includes('Khoa-Sử-Địa') || s.includes('Sử-Địa') || s.includes('LS_DL') || s.includes('Khoa học')) return { subjectId: 'LS_DL', roomId: 'LOP_HOC' };
  if (s.includes('Toán')) return { subjectId: 'TOAN', roomId: 'LOP_HOC' };
  if (s.includes('Tiếng Việt') || s.includes('T.Việt')) return { subjectId: 'TIENG_VIET', roomId: 'LOP_HOC' };
  if (s.includes('Đạo đức') || s.includes('ĐĐ')) return { subjectId: 'DAO_DUC', roomId: 'LOP_HOC' };
  if (s.includes('Chào cờ') || s.includes('HĐCC')) return { subjectId: 'CHAO_CO', roomId: 'SAN_TRUONG' };
  if (s.includes('Sinh hoạt')) return { subjectId: 'SINH_HOAT', roomId: 'LOP_HOC' };
  if (s.includes('Đ/c Hoàng Hòa')) return { subjectId: 'TIN_HOC', roomId: 'LOP_HOC' };
  return { subjectId: 'TU_CHON', roomId: defaultRoom };
}

// 3. Timetable Grid
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
        const tObj = resolveTeacher(teacherRaw, clsName, subjRaw);
        const { subjectId, roomId } = mapSubjectCode(subjRaw);
        
        timetable[clsName][currentDay][periodId] = {
          subjectId,
          subjectRaw: subjRaw || subjectId,
          teacherId: tObj ? tObj.id : '',
          teacherRaw: teacherRaw || (tObj ? tObj.name : ''),
          roomId,
          isLocked: true
        };
      }
    }
  }
});

// Set GDTC Khối 5 for Thầy Hồ Việt Cường (GV_28)
const gvtc5Slots = {
  '5A1': [{ d: 3, p: 2 }, { d: 5, p: 5 }],
  '5A2': [{ d: 2, p: 2 }, { d: 4, p: 5 }],
  '5A3': [{ d: 3, p: 5 }, { d: 6, p: 2 }],
  '5A4': [{ d: 4, p: 2 }, { d: 6, p: 5 }],
  '5A5': [{ d: 2, p: 5 }, { d: 5, p: 2 }]
};
Object.entries(gvtc5Slots).forEach(([clsId, slots]) => {
  slots.forEach(({ d, p }) => {
    if (!timetable[clsId][d][p]) {
      timetable[clsId][d][p] = {
        subjectId: 'THE_DUC',
        subjectRaw: 'GDTC',
        teacherId: 'GV_28',
        teacherRaw: 'Hồ Việt Cường',
        roomId: 'SAN_THE_CHAT',
        isLocked: true
      };
    }
  });
});

// Fill remaining for Grades 2..5
classes.forEach(cls => {
  if (cls.grade === 1) return;
  const gvHome = teachers.find(t => t.id === cls.homeroomTeacherId);
  const homeId = gvHome ? gvHome.id : '';
  const homeName = gvHome ? gvHome.name : '';
  
  const neededSubjects = [];
  if (cls.grade === 2) {
    for (let i = 0; i < 7; i++) neededSubjects.push('TIENG_VIET');
    for (let i = 0; i < 5; i++) neededSubjects.push('TOAN');
    for (let i = 0; i < 1; i++) neededSubjects.push('DAO_DUC');
    for (let i = 0; i < 2; i++) neededSubjects.push('HDTN');
    for (let i = 0; i < 6; i++) neededSubjects.push('TU_CHON');
  } else if (cls.grade === 3) {
    for (let i = 0; i < 7; i++) neededSubjects.push('TIENG_VIET');
    for (let i = 0; i < 5; i++) neededSubjects.push('TOAN');
    for (let i = 0; i < 2; i++) neededSubjects.push('HDTN');
    for (let i = 0; i < 1; i++) neededSubjects.push('DAO_DUC');
    for (let i = 0; i < 6; i++) neededSubjects.push('TU_CHON');
  } else if (cls.grade === 4) {
    for (let i = 0; i < 7; i++) neededSubjects.push('TIENG_VIET');
    for (let i = 0; i < 5; i++) neededSubjects.push('TOAN');
    for (let i = 0; i < 4; i++) neededSubjects.push('LS_DL');
    for (let i = 0; i < 1; i++) neededSubjects.push('DAO_DUC');
    for (let i = 0; i < 2; i++) neededSubjects.push('HDTN');
    for (let i = 0; i < 2; i++) neededSubjects.push('TU_CHON');
  } else if (cls.grade === 5) {
    for (let i = 0; i < 7; i++) neededSubjects.push('TIENG_VIET');
    for (let i = 0; i < 5; i++) neededSubjects.push('TOAN');
    for (let i = 0; i < 4; i++) neededSubjects.push('LS_DL');
    for (let i = 0; i < 1; i++) neededSubjects.push('DAO_DUC');
    for (let i = 0; i < 2; i++) neededSubjects.push('HDTN');
    for (let i = 0; i < 2; i++) neededSubjects.push('TU_CHON');
  }

  const alreadyPlaced = {};
  for (let d = 2; d <= 6; d++) {
    for (let p = 1; p <= 7; p++) {
      const slot = timetable[cls.id][d][p];
      if (slot && slot.subjectId) {
        alreadyPlaced[slot.subjectId] = (alreadyPlaced[slot.subjectId] || 0) + 1;
      }
    }
  }

  Object.entries(alreadyPlaced).forEach(([subId, count]) => {
    for (let k = 0; k < count; k++) {
      const idx = neededSubjects.indexOf(subId);
      if (idx !== -1) neededSubjects.splice(idx, 1);
    }
  });

  let subIdx = 0;
  for (let d = 2; d <= 6; d++) {
    for (let p = 1; p <= 4; p++) {
      if (!timetable[cls.id][d][p] && subIdx < neededSubjects.length) {
        const subId = neededSubjects[subIdx++];
        timetable[cls.id][d][p] = {
          subjectId: subId,
          subjectRaw: subId === 'LS_DL' ? 'Khoa-Sử-Địa' : subId,
          teacherId: homeId,
          teacherRaw: homeName,
          roomId: 'LOP_HOC',
          isLocked: true
        };
      }
    }
  }

  const afternoonDays = [2, 3, 5, 6, 4];
  for (const d of afternoonDays) {
    for (let p = 5; p <= 7; p++) {
      if (!timetable[cls.id][d][p] && subIdx < neededSubjects.length) {
        const subId = neededSubjects[subIdx++];
        timetable[cls.id][d][p] = {
          subjectId: subId,
          subjectRaw: subId === 'LS_DL' ? 'Khoa-Sử-Địa' : subId,
          teacherId: homeId,
          teacherRaw: homeName,
          roomId: 'LOP_HOC',
          isLocked: true
        };
      }
    }
  }
});

// 4. Generate Assignments
const assignments = [];
classes.forEach(cls => {
  const gvHome = teachers.find(t => t.id === cls.homeroomTeacherId);
  const homeId = gvHome ? gvHome.id : 'GV_01';

  // Find assigned teachers from timetable for each subject
  const subTeacherMap = {};
  const subCountMap = {};
  for (let d = 2; d <= 6; d++) {
    for (let p = 1; p <= 7; p++) {
      const slot = timetable[cls.id]?.[d]?.[p];
      if (slot && slot.subjectId) {
        subCountMap[slot.subjectId] = (subCountMap[slot.subjectId] || 0) + 1;
        if (slot.teacherId) {
          subTeacherMap[slot.subjectId] = slot.teacherId;
        }
      }
    }
  }

  Object.entries(subCountMap).forEach(([subId, count]) => {
    assignments.push({
      id: `ASG_${cls.id}_${subId}`,
      classId: cls.id,
      grade: cls.grade,
      subjectId: subId,
      teacherId: subTeacherMap[subId] || homeId,
      weeklyPeriods: count,
      roomType: (subId === 'TIN_HOC' ? 'PHONG_TIN_HOC' : (subId === 'AM_NHAC' ? 'PHONG_AM_NHAC' : (subId === 'MY_THUAT' ? 'PHONG_MY_THUAT' : (subId === 'THE_DUC' ? 'SAN_THE_CHAT' : 'LOP_HOC')))),
      allowDouble: false
    });
  });
});

console.log(`Generated: ${teachers.length} teachers, ${classes.length} classes, ${assignments.length} assignments`);

// Write out full JS file
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
// Được trích xuất chuẩn xác từ file Excel phân công chuyên môn và TKB 23 lớp

export const QUYNH_LOC_DATA = ${JSON.stringify(fullData, null, 2)};
`;

fs.writeFileSync('src/data/quynhLocSchoolData.js', jsContent, 'utf8');
console.log('✅ Wrote src/data/quynhLocSchoolData.js successfully');

const savedJsonData = {
  version: '2.0',
  timestamp: new Date().toISOString(),
  schoolInfo: {
    name: 'Trường TH Quỳnh Lộc B',
    year: 'Năm học 2026 - 2027'
  },
  gradeQuotas: {
    1: {
      grade: 1,
      gradeName: 'Khối 1',
      targetWeeklyPeriods: 32,
      subjects: [
        { subjectId: 'TIENG_VIET', weeklyPeriods: 7, maxMorning: 5, maxAfternoon: 2, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'TOAN', weeklyPeriods: 3, maxMorning: 3, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'TIENG_ANH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'TNXH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'SAN_THE_CHAT' },
        { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_AM_NHAC' },
        { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'PHONG_MY_THUAT' },
        { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'TU_CHON', weeklyPeriods: 10, maxMorning: 2, maxAfternoon: 8, allowDouble: true, roomType: 'LOP_HOC' }
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
        { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_AM_NHAC' },
        { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'PHONG_MY_THUAT' },
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
        { subjectId: 'TIN_HOC', weeklyPeriods: 2, maxMorning: 1, maxAfternoon: 1, allowDouble: true, roomType: 'PHONG_TIN_HOC' },
        { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'TNXH', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'SAN_THE_CHAT' },
        { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_AM_NHAC' },
        { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'PHONG_MY_THUAT' },
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
        { subjectId: 'TIN_HOC', weeklyPeriods: 2, maxMorning: 1, maxAfternoon: 1, allowDouble: true, roomType: 'PHONG_TIN_HOC' },
        { subjectId: 'LS_DL', weeklyPeriods: 4, maxMorning: 3, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'SAN_THE_CHAT' },
        { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_AM_NHAC' },
        { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'PHONG_MY_THUAT' },
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
        { subjectId: 'TIN_HOC', weeklyPeriods: 2, maxMorning: 1, maxAfternoon: 1, allowDouble: true, roomType: 'PHONG_TIN_HOC' },
        { subjectId: 'LS_DL', weeklyPeriods: 4, maxMorning: 3, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'DAO_DUC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'THE_DUC', weeklyPeriods: 2, maxMorning: 2, maxAfternoon: 0, allowDouble: false, roomType: 'SAN_THE_CHAT' },
        { subjectId: 'AM_NHAC', weeklyPeriods: 1, maxMorning: 1, maxAfternoon: 0, allowDouble: false, roomType: 'PHONG_AM_NHAC' },
        { subjectId: 'MY_THUAT', weeklyPeriods: 1, maxMorning: 0, maxAfternoon: 1, allowDouble: false, roomType: 'PHONG_MY_THUAT' },
        { subjectId: 'HDTN', weeklyPeriods: 3, maxMorning: 2, maxAfternoon: 1, allowDouble: false, roomType: 'LOP_HOC' },
        { subjectId: 'TU_CHON', weeklyPeriods: 5, maxMorning: 0, maxAfternoon: 5, allowDouble: true, roomType: 'LOP_HOC' }
      ]
    }
  },
  classes,
  teachers,
  rooms: [
    { id: 'PHONG_NGOAI_NGU', name: 'Phòng Tiếng Anh Smart Lab', code: 'LAB-AV', capacity: 40, isSpecialized: true, allowMultiple: true },
    { id: 'PHONG_TIN_HOC', name: 'Phòng Tin học 1', code: 'TIN-01', capacity: 35, isSpecialized: true },
    { id: 'SAN_THE_CHAT', name: 'Nhà thi đấu / Sân Thể chất', code: 'SAN-TC', capacity: 100, isSpecialized: true, allowMultiple: true },
    { id: 'PHONG_AM_NHAC', name: 'Phòng Âm nhạc & Nhạc cụ', code: 'NHAC-01', capacity: 40, isSpecialized: true },
    { id: 'PHONG_MY_THUAT', name: 'Phòng Mỹ thuật & Tạo hình', code: 'HOA-01', capacity: 40, isSpecialized: true }
  ],
  assignments,
  timetable
};

fs.writeFileSync('src/data/savedData.json', JSON.stringify(savedJsonData, null, 2), 'utf8');
console.log('✅ Wrote src/data/savedData.json successfully');
