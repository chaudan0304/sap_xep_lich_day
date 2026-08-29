import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

// 1. Parse teachers from 'Phân công chuyên môn'
const pcSheet = wb.Sheets['Phân công chuyên môn'];
const pcData = XLSX.utils.sheet_to_json(pcSheet, { header: 1, defval: '' });

const teachers = [];
const teacherMap = new Map();

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

  // Known Excel fixes
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
    id = `GV_${teachers.length + 1}`;
  }

  const tObj = {
    id,
    tt: Number(rawTt) || (teachers.length + 1),
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
  teacherMap.set(id, tObj);
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

console.log(`Parsed ${classes.length} classes.`);

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
  if (s.includes('Tiếng Anh') || s.includes('T.Anh')) return { subjectId: 'TIENG_ANH', roomId: 'PHONG_NGOAI_NGU' };
  if (s.includes('Tin học') || s.includes('Tin')) return { subjectId: 'TIN_HOC', roomId: 'PHONG_TIN_HOC' };
  if (s.includes('Công nghệ')) return { subjectId: 'TIN_HOC', roomId: 'PHONG_TIN_HOC' }; // or LOP_HOC
  if (s.includes('GDTC') || s.includes('Thể dục')) return { subjectId: 'THE_DUC', roomId: 'SAN_THE_CHAT' };
  if (s.includes('Mĩ thuật') || s.includes('Mỹ thuật')) return { subjectId: 'MY_THUAT', roomId: 'PHONG_MY_THUAT' };
  if (s.includes('Âm nhạc')) return { subjectId: 'AM_NHAC', roomId: 'PHONG_AM_NHAC' };
  if (s.includes('TNXH')) return { subjectId: 'TNXH', roomId: 'LOP_HOC' };
  if (s.includes('Khoa-Sử-Địa') || s.includes('Sử-Địa') || s.includes('LS_DL')) return { subjectId: 'LS_DL', roomId: 'LOP_HOC' };
  if (s.includes('Khoa học')) return { subjectId: 'KHOA_HOC', roomId: 'LOP_HOC' };
  if (s.includes('Toán')) return { subjectId: 'TOAN', roomId: 'LOP_HOC' };
  if (s.includes('Tiếng Việt') || s.includes('T.Việt')) return { subjectId: 'TIENG_VIET', roomId: 'LOP_HOC' };
  if (s.includes('Đạo đức') || s.includes('ĐĐ')) return { subjectId: 'DAO_DUC', roomId: 'LOP_HOC' };
  if (s.includes('Chào cờ') || s.includes('HĐCC')) return { subjectId: 'CHAO_CO', roomId: 'SAN_TRUONG' };
  if (s.includes('Sinh hoạt')) return { subjectId: 'SINH_HOAT', roomId: 'LOP_HOC' };
  if (s.includes('Đ/c Hoàng Hòa')) return { subjectId: 'TIN_HOC', roomId: 'PHONG_TIN_HOC' };
  return { subjectId: 'TU_CHON', roomId: defaultRoom };
}

// 3. Build Full Timetable Matrix
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
    if (periodId > 7) continue; // max 7 periods (4 morning + 3 afternoon)
    
    for (let c = 3; c < row.length; c += 2) {
      const clsName = (header[c] || '').trim();
      if (!gInfo.classes.includes(clsName)) continue;
      
      const subjRaw = (row[c] || '').trim();
      const teacherRaw = (row[c + 1] || '').trim();
      
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

// Check teacher scheduled counts vs assigned
console.log('\n--- Teacher Scheduled Lessons vs Assigned ---');
teachers.forEach(t => {
  let scheduled = 0;
  classes.forEach(c => {
    for (let d = 2; d <= 6; d++) {
      for (let p = 1; p <= 7; p++) {
        const slot = timetable[c.id]?.[d]?.[p];
        if (slot && slot.teacherId === t.id && slot.subjectId !== 'CHAO_CO') {
          scheduled++;
        }
      }
    }
  });
  if (scheduled > 0 || t.assignedPeriods > 0) {
    console.log(`${t.id} (${t.name}): Scheduled = ${scheduled} / Assigned = ${t.assignedPeriods}`);
  }
});

// Check for any teacher conflict (same teacher scheduled in 2 classes at same day & period)
console.log('\n--- Checking Teacher Conflicts ---');
let teacherConflicts = 0;
for (let d = 2; d <= 6; d++) {
  for (let p = 1; p <= 7; p++) {
    const teacherSlots = {};
    classes.forEach(c => {
      const slot = timetable[c.id]?.[d]?.[p];
      if (slot && slot.teacherId && slot.subjectId !== 'CHAO_CO') {
        if (teacherSlots[slot.teacherId]) {
          console.log(`CONFLICT for ${slot.teacherId} (${slot.teacherRaw}) at T${d} P${p}: Classes ${teacherSlots[slot.teacherId]} AND ${c.id}`);
          teacherConflicts++;
        } else {
          teacherSlots[slot.teacherId] = c.id;
        }
      }
    });
  }
}
if (teacherConflicts === 0) {
  console.log('✅ ZERO teacher conflicts found in the Excel timetable!');
}

// Check for Room Conflicts
console.log('\n--- Checking Room Conflicts ---');
let roomConflicts = 0;
const specializedRooms = ['PHONG_TIN_HOC', 'PHONG_NGOAI_NGU', 'PHONG_AM_NHAC', 'PHONG_MY_THUAT'];
for (let d = 2; d <= 6; d++) {
  for (let p = 1; p <= 7; p++) {
    specializedRooms.forEach(room => {
      const occupants = [];
      classes.forEach(c => {
        const slot = timetable[c.id]?.[d]?.[p];
        if (slot && slot.roomId === room) {
          occupants.push(`${c.id} (${slot.subjectId} - ${slot.teacherId})`);
        }
      });
      if (occupants.length > 1) {
        console.log(`Room CONFLICT in ${room} at T${d} P${p}: ${occupants.join(' vs ')}`);
        roomConflicts++;
      }
    });
  }
}
if (roomConflicts === 0) {
  console.log('✅ ZERO specialized room conflicts found in the Excel timetable!');
}
