import XLSX from 'xlsx';
import fs from 'fs';

const buf = fs.readFileSync('public/data/STKB thực hiện từ tuần 01 (Thầy Trí).xlsx');
const wb = XLSX.read(buf, { type: 'buffer' });

// 1. Parse teachers from 'Phân công chuyên môn'
const pcSheet = wb.Sheets['Phân công chuyên môn'];
const pcData = XLSX.utils.sheet_to_json(pcSheet, { header: 1, defval: '' });

const teachers = [];
for (let i = 8; i < pcData.length; i++) {
  const row = pcData[i];
  if (!row || !row[1]) continue;
  const tt = row[0];
  const name = String(row[1]).trim();
  const task = String(row[2] || '').trim();
  const totalP = Number(row[12]) || 0;
  const kiemNhiem = Number(row[13]) || 0;
  const dinhMuc = Number(row[14]) || 23;
  const tietThua = Number(row[15]) || 0;
  const note = String(row[16] || '').trim();

  if (name && (tt || isNaN(tt))) {
    let dept = 'Giáo viên';
    let isHomeroom = false;
    let homeroomClassId = null;

    const matchHome = task.match(/Chủ nhiệm\s+([1-5]A[1-5])/i);
    if (matchHome) {
      isHomeroom = true;
      homeroomClassId = matchHome[1].toUpperCase();
    }

    if (task.includes('Phụ trách chung') || task.includes('Hiệu trưởng')) {
      dept = 'Ban Giám Hiệu';
    } else if (task.includes('Phụ trách chuyên môn')) {
      dept = 'Ban Giám Hiệu';
    } else if (task.includes('Kế toán') || task.includes('Văn thư') || task.includes('Y tế') || task.includes('Bảo vệ')) {
      dept = 'Tổ Văn Phòng';
    } else if (task.includes('Tổng phụ trách')) {
      dept = 'Tổ Chuyên Môn';
    } else {
      dept = 'Giáo viên';
    }

    const nameParts = name.split(/\s+/);
    const lastName = nameParts[nameParts.length - 1];
    const initials = nameParts.slice(0, -1).map(p => p[0]).join('');
    const code = `${lastName.toUpperCase()}.${initials.toUpperCase()}`;

    teachers.push({
      id: tt ? `GV_${String(tt).padStart(2, '0')}` : `GV_${teachers.length + 1}`,
      tt: Number(tt) || (teachers.length + 1),
      name,
      code,
      department: dept,
      position: dept === 'Ban Giám Hiệu' ? (tt === 1 ? 'Hiệu Trưởng' : 'Phó Hiệu Trưởng') : (isHomeroom ? `GVCN Lớp ${homeroomClassId}` : (dept === 'Tổ Văn Phòng' ? task : 'Giáo Viên')),
      isHomeroom,
      homeroomClassId,
      task,
      assignedPeriods: totalP,
      dinhMuc,
      maxPeriodsPerDay: 6,
      offSessions: [],
      scheduleColumns: {
        t2: { morning: row[3], afternoon: row[4] },
        t3: { morning: row[5], afternoon: row[6] },
        t4: { full: row[7] },
        t5: { morning: row[8], afternoon: row[9] },
        t6: { morning: row[10], afternoon: row[11] }
      },
      color: '#3b82f6'
    });
  }
}

console.log(`Parsed ${teachers.length} teachers.`);
teachers.forEach(t => console.log(`${t.id} (${t.code}): ${t.name} - ${t.isHomeroom ? 'CN ' + t.homeroomClassId : t.task.slice(0, 40)} | periods: ${t.assignedPeriods}`));
