import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

['1', '2', '3.', '4', '5'].forEach(sheetName => {
  const ws = wb.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
  console.log(`\n================== SHEET ${sheetName} ==================`);
  for (let r = 7; r < data.length; r++) {
    const row = data[r];
    if (row && row.some(cell => cell !== '')) {
      console.log(`Row ${r}:`, JSON.stringify(row));
    }
  }
});
