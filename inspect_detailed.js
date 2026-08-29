import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

['1', '2', '3.', '4', '5'].forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n================== DETAILED SHEET ${sheetName} ==================`);
  
  // Header is row 7
  const header = data[7];
  console.log('Classes header row 7:', header.filter(c => c && c !== 'Thứ' && c !== 'Buổi' && c !== 'Tiết'));
  
  for (let r = 9; r < data.length; r++) {
    const row = data[r];
    if (!row || row.length === 0) continue;
    if (typeof row[0] === 'string' && row[0].includes('Tân Mai')) break;
    
    const thu = row[0];
    const buoi = row[1];
    const tiet = row[2];
    
    const nonEmp = [];
    for (let c = 3; c < row.length; c += 2) {
      const clsName = header[c] || `Col${c}`;
      const subj = row[c];
      const gv = row[c+1];
      if (subj || gv) {
        nonEmp.push(`${clsName}: [${subj || ''}] (${gv || ''})`);
      }
    }
    if (thu || buoi || tiet || nonEmp.length > 0) {
      console.log(`R${r} T${thu || ''} B${buoi || ''} P${tiet || ''} => ${nonEmp.join(' | ')}`);
    }
  }
});
