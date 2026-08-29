import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const ws = wb.Sheets['Phân công chuyên môn'];
const data = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

console.log('Phân công chuyên môn rows:');
for (let i = 5; i < data.length; i++) {
  const r = data[i];
  if (r[0] || r[1]) {
    console.log(`[TT ${r[0]}] ${r[1]} | Task: ${r[2]} | T2:(${r[3]},${r[4]}) | T3:(${r[5]},${r[6]}) | T4:(${r[7]}) | T5:(${r[8]},${r[9]}) | T6:(${r[10]},${r[11]}) | Tiet:${r[12]} | DinhMuc:${r[14]}`);
  }
}
