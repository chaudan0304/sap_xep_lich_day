import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

// 1. Gather all unique teacher strings in sheets 1..5
const teacherStrings = new Set();
const subjectStrings = new Set();

const sheetGradeMap = {
  '1': ['1A1', '1A2', '1A3', '1A4'],
  '2': ['2A1', '2A2', '2A3', '2A4', '2A5'],
  '3.': ['3A1', '3A2', '3A3', '3A4'],
  '4': ['4A1', '4A2', '4A3', '4A4', '4A5'],
  '5': ['5A1', '5A2', '5A3', '5A4', '5A5']
};

Object.entries(sheetGradeMap).forEach(([sheetName, classList]) => {
  const ws = wb.Sheets[sheetName];
  if (!ws) return;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const header = data[7];
  
  for (let r = 9; r < data.length; r++) {
    const row = data[r];
    if (!row || row.length === 0) continue;
    if (typeof row[0] === 'string' && row[0].includes('Tân Mai')) break;
    
    for (let c = 3; c < row.length; c += 2) {
      const subj = (row[c] || '').trim();
      const teacher = (row[c + 1] || '').trim();
      if (subj) subjectStrings.add(subj);
      if (teacher) teacherStrings.add(teacher);
    }
  }
});

console.log('Unique subjects in sheets 1..5:', Array.from(subjectStrings));
console.log('Unique teacher strings in sheets 1..5:', Array.from(teacherStrings));
