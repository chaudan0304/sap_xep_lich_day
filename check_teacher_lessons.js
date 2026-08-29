import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

// Build map from sheets 1..5
const sheetGradeMap = {
  '1': ['1A1', '1A2', '1A3', '1A4'],
  '2': ['2A1', '2A2', '2A3', '2A4', '2A5'],
  '3.': ['3A1', '3A2', '3A3', '3A4'],
  '4': ['4A1', '4A2', '4A3', '4A4', '4A5'],
  '5': ['5A1', '5A2', '5A3', '5A4', '5A5']
};

const sheetLessons = []; // { classId, day, session, rawPeriod, periodId, subjectRaw, teacherRaw }

Object.entries(sheetGradeMap).forEach(([sheetName, classList]) => {
  const ws = wb.Sheets[sheetName];
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
    
    for (let c = 3; c < row.length; c += 2) {
      const clsName = (header[c] || '').trim();
      if (!classList.includes(clsName)) continue;
      
      const subj = (row[c] || '').trim();
      const teacher = (row[c + 1] || '').trim();
      
      if (subj || teacher) {
        sheetLessons.push({
          classId: clsName,
          day: currentDay,
          session: currentSession,
          rawPeriod,
          periodId,
          subjectRaw: subj,
          teacherRaw: teacher
        });
      }
    }
  }
});

console.log(`Total lesson slots with subject/teacher in sheets 1..5: ${sheetLessons.length}`);
console.log(`Specialist/explicit teacher slots: ${sheetLessons.filter(l => l.teacherRaw).length}`);

// Group by teacherRaw
const byTeacher = {};
sheetLessons.filter(l => l.teacherRaw).forEach(l => {
  byTeacher[l.teacherRaw] = byTeacher[l.teacherRaw] || [];
  byTeacher[l.teacherRaw].push(l);
});

Object.keys(byTeacher).sort().forEach(t => {
  console.log(`${t}: ${byTeacher[t].length} lessons -> ${byTeacher[t].map(l => `T${l.day} B${l.session[0]} P${l.rawPeriod} (${l.classId} ${l.subjectRaw})`).join(', ')}`);
});
