import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });
const pcSheet = wb.Sheets['Phân công chuyên môn'];
const pcData = XLSX.utils.sheet_to_json(pcSheet, { header: 1, defval: '' });

console.log('--- Schedule columns in Phân công chuyên môn ---');
for (let i = 8; i < pcData.length; i++) {
  const r = pcData[i];
  const name = r[1];
  if (!name) continue;
  const colSchedule = [
    r[3] ? `T2-S:${r[3]}` : '',
    r[4] ? `T2-C:${r[4]}` : '',
    r[5] ? `T3-S:${r[5]}` : '',
    r[6] ? `T3-C:${r[6]}` : '',
    r[7] ? `T4:${r[7]}` : '',
    r[8] ? `T5-S:${r[8]}` : '',
    r[9] ? `T5-C:${r[9]}` : '',
    r[10] ? `T6-S:${r[10]}` : '',
    r[11] ? `T6-C:${r[11]}` : '',
  ].filter(Boolean).join(' | ');

  if (colSchedule) {
    console.log(`[${r[0] || ' '}] ${name} => ${colSchedule}`);
  }
}
