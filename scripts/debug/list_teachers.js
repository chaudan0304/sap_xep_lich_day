import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const pcSheet = wb.Sheets['Phân công chuyên môn'];
const pcData = XLSX.utils.sheet_to_json(pcSheet, { header: 1, defval: '' });

for (let i = 8; i < pcData.length; i++) {
  const r = pcData[i];
  if (r[1]) {
    console.log(`Index ${i} | TT: [${r[0]}] | Name: [${r[1]}] | Task: [${r[2]}]`);
  }
}
