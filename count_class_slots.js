import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

const gradeSheetMap = {
  1: { sheet: '1', classes: ['1A1', '1A2', '1A3', '1A4'] },
  2: { sheet: '2', classes: ['2A1', '2A2', '2A3', '2A4', '2A5'] },
  3: { sheet: wb.Sheets['3.'] ? '3.' : '3', classes: ['3A1', '3A2', '3A3', '3A4'] },
  4: { sheet: '4', classes: ['4A1', '4A2', '4A3', '4A4', '4A5'] },
  5: { sheet: '5', classes: ['5A1', '5A2', '5A3', '5A4', '5A5'] }
};

Object.entries(gradeSheetMap).forEach(([gStr, gInfo]) => {
  const ws = wb.Sheets[gInfo.sheet];
  if (!ws) return;
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const header = data[7];
  
  gInfo.classes.forEach(cName => {
    let specSlots = 0;
    let explicitSubj = 0;
    
    for (let r = 9; r < data.length; r++) {
      const row = data[r];
      if (typeof row[0] === 'string' && row[0].includes('Tân Mai')) break;
      const rawPeriod = Number(row[2]);
      if (!rawPeriod || isNaN(rawPeriod)) continue;
      
      const cIdx = header.indexOf(cName);
      if (cIdx === -1) continue;
      
      const subj = (row[cIdx] || '').trim();
      const teacher = (row[cIdx + 1] || '').trim();
      
      if (subj) explicitSubj++;
      if (teacher) specSlots++;
    }
    console.log(`Grade ${gStr} Class ${cName}: explicitSubj = ${explicitSubj}, specialistTeacher = ${specSlots}`);
  });
});
