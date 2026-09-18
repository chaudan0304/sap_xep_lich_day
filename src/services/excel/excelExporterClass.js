// src/services/excel/excelExporterClass.js
// Xuất Thời Khóa Biểu Từng Lớp In A4 (ExcelJS)

import ExcelJS from 'exceljs';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../../constants/subjects.js';
import { DAYS_OF_WEEK } from '../../constants/defaultCurriculum.js';
import { 
  BORDER_THIN, 
  BORDER_HEADER, 
  FILL_NAVY_HEADER, 
  FILL_MORNING, 
  FILL_AFTERNOON, 
  FILL_LUNCH, 
  FILL_ZEBRA, 
  FILL_WHITE, 
  saveExcelJSWorkbook 
} from './excelStyles.js';

export const exportClassTimetables = async (
  timetable, 
  classes = [], 
  teachers = [], 
  subjects = {}, 
  schoolInfo = {}
) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const sName = schoolInfo.name || 'Trường Tiểu Học Ánh Dương';
  const sYear = schoolInfo.year || 'Năm học 2026 - 2027';
  const teacherMap = new Map((teachers || []).map(t => [t.id, t]));

  const wb = new ExcelJS.Workbook();
  wb.creator = 'EduTimetable Tiểu Học';

  classes.forEach(cls => {
    const ws = wb.addWorksheet(`Lop_${cls.name.replace(/[^a-zA-Z0-9]/g, '_')}`, {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
    });

    const gvHome = teacherMap.get(cls.homeroomTeacherId);
    const gvName = gvHome ? `${gvHome.name} (${gvHome.code})` : 'Chưa gán';

    // Cấu hình cột
    ws.columns = [
      { key: 'session', width: 13 },
      { key: 'period', width: 12 },
      { key: 'time', width: 17 },
      { key: 'd2', width: 27 },
      { key: 'd3', width: 27 },
      { key: 'd4', width: 27 },
      { key: 'd5', width: 27 },
      { key: 'd6', width: 27 }
    ];

    // Header Trường
    ws.mergeCells('A1:H1');
    const r1 = ws.getCell('A1');
    const sDistrict = (schoolInfo.district || 'Phòng GD&ĐT').toUpperCase();
    r1.value = `${sDistrict} — ${sName.toUpperCase()}`;
    r1.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 22;

    // Tiêu Đề Lớp
    ws.mergeCells('A2:H2');
    const r2 = ws.getCell('A2');
    r2.value = `THỜI KHÓA BIỂU — ${cls.name.toUpperCase()}`;
    r2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
    r2.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 34;

    // Năm học
    ws.mergeCells('A3:H3');
    const r3 = ws.getCell('A3');
    r3.value = `${sYear.toUpperCase()} — (Áp dụng chính thức từ Tuần 01)`;
    r3.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } };
    r3.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(3).height = 20;

    // Thông tin GVCN & Phòng
    ws.mergeCells('A4:C4');
    const r4_1 = ws.getCell('A4');
    r4_1.value = `👨‍🏫 GVCN: ${gvName}`;
    r4_1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_1.alignment = { vertical: 'middle', horizontal: 'left' };

    ws.mergeCells('D4:F4');
    const r4_2 = ws.getCell('D4');
    r4_2.value = `🏫 Phòng học: ${cls.mainRoom || (cls.name.startsWith('Lớp ') ? cls.name.replace('Lớp ', 'P.') : `P.${cls.name}`)}`;
    r4_2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_2.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('G4:H4');
    const r4_3 = ws.getCell('G4');
    r4_3.value = `👥 Sĩ số: ${cls.studentCount || 35} học sinh`;
    r4_3.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_3.alignment = { vertical: 'middle', horizontal: 'right' };
    ws.getRow(4).height = 24;

    // Spacing
    ws.getRow(5).height = 8;

    // Table Header (Row 6)
    const headerRow = ws.getRow(6);
    headerRow.height = 30;
    const headers = ['Buổi', 'Tiết', 'Thời Gian', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu'];
    headers.forEach((h, i) => {
      const cell = headerRow.getCell(i + 1);
      cell.value = h;
      cell.fill = FILL_NAVY_HEADER;
      cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = BORDER_HEADER;
    });

    // Buổi Sáng: Tiết 1..4 (Rows 7..10)
    const morningPeriods = [
      { id: 1, name: 'Tiết 1', time: '07:15 - 07:55' },
      { id: 2, name: 'Tiết 2', time: '07:55 - 08:35' },
      { id: 3, name: 'Tiết 3', time: '09:00 - 09:40' },
      { id: 4, name: 'Tiết 4', time: '09:40 - 10:20' }
    ];

    morningPeriods.forEach((p, idx) => {
      const rowIdx = 7 + idx;
      const row = ws.getRow(rowIdx);
      row.height = 42; // Rộng rãi thoáng đãng

      row.getCell(1).value = 'SÁNG';
      row.getCell(2).value = p.name;
      row.getCell(3).value = p.time;

      DAYS_OF_WEEK.forEach((d, dIdx) => {
        const colIdx = 4 + dIdx;
        const slot = timetable[cls.id]?.[d.id]?.[p.id];
        const cell = row.getCell(colIdx);

        if (slot && slot.subjectId) {
          const sub = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
          const tch = teacherMap.get(slot.teacherId);
          const tCode = slot.teacherRaw || (tch ? tch.code : '');
          cell.value = `${sub}\n(${tCode})`;
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
        } else {
          cell.value = '-';
          cell.font = { name: 'Arial', size: 11, color: { argb: 'FF94A3B8' } };
        }

        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = idx % 2 === 1 ? FILL_ZEBRA : FILL_WHITE;
        cell.border = BORDER_THIN;
      });

      row.getCell(2).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).border = BORDER_THIN;

      row.getCell(3).font = { name: 'Arial', size: 9.5, color: { argb: 'FF475569' } };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).border = BORDER_THIN;
    });

    // Merge SÁNG
    ws.mergeCells('A7:A10');
    const morningBadge = ws.getCell('A7');
    morningBadge.fill = FILL_MORNING;
    morningBadge.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1E40AF' } };
    morningBadge.alignment = { vertical: 'middle', horizontal: 'center' };
    morningBadge.border = BORDER_THIN;

    // Row 11: NGHỈ TRƯA
    ws.mergeCells('A11:H11');
    const lunchRow = ws.getRow(11);
    lunchRow.height = 22;
    const lunchCell = ws.getCell('A11');
    lunchCell.value = '🍽️ NGHỈ TRƯA (10:30 - 14:00)';
    lunchCell.fill = FILL_LUNCH;
    lunchCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
    lunchCell.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = 1; c <= 8; c++) lunchRow.getCell(c).border = BORDER_THIN;

    // Buổi Chiều: Tiết 5..7 (Rows 12..14)
    const afternoonPeriods = [
      { id: 5, name: 'Tiết 1', time: '14:00 - 14:40' },
      { id: 6, name: 'Tiết 2', time: '14:40 - 15:20' },
      { id: 7, name: 'Tiết 3', time: '15:40 - 16:20' }
    ];

    afternoonPeriods.forEach((p, idx) => {
      const rowIdx = 12 + idx;
      const row = ws.getRow(rowIdx);
      row.height = 42;

      row.getCell(1).value = 'CHIỀU';
      row.getCell(2).value = p.name;
      row.getCell(3).value = p.time;

      DAYS_OF_WEEK.forEach((d, dIdx) => {
        const colIdx = 4 + dIdx;
        const slot = timetable[cls.id]?.[d.id]?.[p.id];
        const cell = row.getCell(colIdx);

        if (slot && slot.subjectId) {
          const sub = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
          const tch = teacherMap.get(slot.teacherId);
          const tCode = slot.teacherRaw || (tch ? tch.code : '');
          cell.value = `${sub}\n(${tCode})`;
          cell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
        } else {
          cell.value = '-';
          cell.font = { name: 'Arial', size: 11, color: { argb: 'FF94A3B8' } };
        }

        cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        cell.fill = idx % 2 === 1 ? FILL_ZEBRA : FILL_WHITE;
        cell.border = BORDER_THIN;
      });

      row.getCell(2).font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E293B' } };
      row.getCell(2).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(2).border = BORDER_THIN;

      row.getCell(3).font = { name: 'Arial', size: 9.5, color: { argb: 'FF475569' } };
      row.getCell(3).alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell(3).border = BORDER_THIN;
    });

    // Merge CHIỀU
    ws.mergeCells('A12:A14');
    const afternoonBadge = ws.getCell('A12');
    afternoonBadge.fill = FILL_AFTERNOON;
    afternoonBadge.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFC2410C' } };
    afternoonBadge.alignment = { vertical: 'middle', horizontal: 'center' };
    afternoonBadge.border = BORDER_THIN;

    // Chữ ký (Rows 16..21)
    ws.getRow(15).height = 12;

    ws.mergeCells('F16:H16');
    const sigDate = ws.getCell('F16');
    sigDate.value = `${schoolInfo.address ? schoolInfo.address.split(',')[0].trim() : 'Ngày 05 tháng 09 năm 2026'}`;
    sigDate.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
    sigDate.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('B17:C17');
    const sig1 = ws.getCell('B17');
    sig1.value = 'GIÁO VIÊN CHỦ NHIỆM';
    sig1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sig1.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('F17:H17');
    const sig2 = ws.getCell('F17');
    sig2.value = 'HIỆU TRƯỞNG';
    sig2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sig2.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('B18:C18');
    const sigSub1 = ws.getCell('B18');
    sigSub1.value = '(Ký và ghi rõ họ tên)';
    sigSub1.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
    sigSub1.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('F18:H18');
    const sigSub2 = ws.getCell('F18');
    sigSub2.value = '(Ký và đóng dấu)';
    sigSub2.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FF64748B' } };
    sigSub2.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.getRow(19).height = 20;
    ws.getRow(20).height = 20;

    ws.mergeCells('B21:C21');
    const sigName1 = ws.getCell('B21');
    sigName1.value = gvHome ? gvHome.name : '';
    sigName1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sigName1.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('F21:H21');
    const sigName2 = ws.getCell('F21');
    sigName2.value = schoolInfo.principal || 'Thầy Nguyễn Văn An';
    sigName2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sigName2.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  await saveExcelJSWorkbook(wb, 'Thoi_Khoa_Bieu_Tung_Lop_In_A4.xlsx');
};
