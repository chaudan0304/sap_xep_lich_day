import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

const wsNames = ['1', '2', '3.', '4', '5'];
const tinSlots = {};

wsNames.forEach(sheet => {
  const ws = wb.Sheets[sheet];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  const header = data[7];
  let curDay = 2, curSession = 'Sáng';
  for (let r = 9; r < data.length; r++) {
    const row = data[r];
    if (typeof row[0] === 'string' && row[0].includes('Tân Mai')) break;
    if (row[0] && !isNaN(row[0])) curDay = Number(row[0]);
    if (row[1] && typeof row[1] === 'string' && row[1].trim()) curSession = row[1].trim();
    const rawP = Number(row[2]);
    if (!rawP) continue;
    const pId = curSession.includes('Chiều') ? 4 + rawP : rawP;
    for (let c = 3; c < row.length; c += 2) {
      const cls = header[c];
      const subj = (row[c] || '').trim();
      if (subj === 'Tin học' || subj === 'Tin') {
        const key = `T${curDay}_P${pId}`;
        if (tinSlots[key]) {
          console.log(`Tin conflict at ${key}: ${tinSlots[key]} and ${cls}`);
        } else {
          tinSlots[key] = cls;
        }
      }
    }
  }
});
console.log('Total Tin hoc slots:', Object.keys(tinSlots).length);
