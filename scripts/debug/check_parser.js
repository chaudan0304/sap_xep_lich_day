import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

console.log('--- Checking Sheet 1..5 vs Phân công chuyên môn ---');

// Let's parse all lessons from sheets 1..5
const sheetGradeMap = {
  '1': ['1A1', '1A2', '1A3', '1A4'],
  '2': ['2A1', '2A2', '2A3', '2A4', '2A5'],
  '3.': ['3A1', '3A2', '3A3', '3A4'],
  '4': ['4A1', '4A2', '4A3', '4A4', '4A5'],
  '5': ['5A1', '5A2', '5A3', '5A4', '5A5']
};

const timetableGrid = {}; // [classId][day][period] = { subject, teacherRaw }

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
    
    if (row[0] && !isNaN(row[0])) {
      currentDay = Number(row[0]);
    }
    if (row[1] && typeof row[1] === 'string' && row[1].trim()) {
      currentSession = row[1].trim();
    }
    const rawPeriod = Number(row[2]);
    if (!rawPeriod || isNaN(rawPeriod)) continue;
    
    // Period mapping: Sáng 1..4 -> 1..4, Chiều 1..3 or 1..4 -> 4 + rawPeriod
    // Wait, let's see how periods are numbered:
    // In our system: Morning is periods 1, 2, 3, 4. Afternoon is 5, 6, 7 (or 8).
    // In Excel: Sáng has Tiết 1, 2, 3, 4. Chiều has Tiết 1, 2, 3 (or 4).
    const periodId = currentSession.toLowerCase().includes('chiều') ? (4 + rawPeriod) : rawPeriod;
    
    for (let c = 3; c < row.length; c += 2) {
      const clsName = (header[c] || '').trim();
      if (!classList.includes(clsName)) continue;
      
      const subj = (row[c] || '').trim();
      const teacher = (row[c + 1] || '').trim();
      
      if (!timetableGrid[clsName]) timetableGrid[clsName] = {};
      if (!timetableGrid[clsName][currentDay]) timetableGrid[clsName][currentDay] = {};
      
      timetableGrid[clsName][currentDay][periodId] = {
        subject: subj,
        teacher: teacher,
        session: currentSession,
        rawPeriod: rawPeriod,
        row: r
      };
    }
  }
});

console.log('Total classes parsed in sheets 1..5:', Object.keys(timetableGrid).length);
Object.keys(timetableGrid).forEach(c => {
  let count = 0;
  let withSubj = 0;
  let withTeacher = 0;
  for (let d = 2; d <= 6; d++) {
    for (let p = 1; p <= 7; p++) {
      const slot = timetableGrid[c]?.[d]?.[p];
      if (slot) {
        count++;
        if (slot.subject) withSubj++;
        if (slot.teacher) withTeacher++;
      }
    }
  }
  console.log(`Class ${c}: slots=${count}, withSubject=${withSubj}, withTeacher=${withTeacher}`);
});
