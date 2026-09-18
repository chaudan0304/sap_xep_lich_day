// src/services/excel/excelExporterTeacher.js
// Xuất Lịch Giảng Dạy Từng Giáo Viên (ExcelJS)

import ExcelJS from 'exceljs';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../../constants/subjects.js';
import { DAYS_OF_WEEK, PERIODS } from '../../constants/defaultCurriculum.js';
import { getTeacherShortName } from '../excelParser.js';
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

export const exportTeacherTimetables = async (
  timetable, 
  teachers = [], 
  classes = [], 
  subjects = {}, 
  schoolInfo = {}
) => {
  const _subjects = subjects || DEFAULT_SUBJECTS;
  const sName = schoolInfo.name || 'Trường Tiểu Học Ánh Dương';
  const sYear = schoolInfo.year || 'Năm học 2026 - 2027';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'EduTimetable Tiểu Học';

  // Sheet 1: Bảng tổng hợp
  const wsSum = wb.addWorksheet('Tong_Hop_Giao_Vien');
  wsSum.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã GV', key: 'id', width: 11 },
    { header: 'Họ và Tên', key: 'name', width: 26 },
    { header: 'Tên TKB', key: 'code', width: 17 },
    { header: 'Tổ Chuyên Môn', key: 'department', width: 25 },
    { header: 'Nhiệm Vụ Phân Công', key: 'task', width: 35 },
    { header: 'Tổng Tiết/Tuần', key: 'total', width: 18 }
  ];

  wsSum.getRow(1).height = 28;
  wsSum.getRow(1).fill = FILL_NAVY_HEADER;
  wsSum.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  wsSum.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  teachers.forEach((t, idx) => {
    let count = 0;
    classes.forEach(c => {
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          if (timetable[c.id]?.[d]?.[p]?.teacherId === t.id) count++;
        }
      }
    });

    const row = wsSum.addRow({
      stt: t.tt || (idx + 1),
      id: t.id,
      name: t.name,
      code: t.code || getTeacherShortName(t.name, t.homeroomClassId, t.task),
      department: t.department,
      task: t.task || (t.isHomeroom ? `GVCN Lớp ${t.homeroomClassId}` : t.position),
      total: `${count} tiết`
    });
    row.height = 22;
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('task').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('total').font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
    row.eachCell(c => { c.border = BORDER_THIN; });
  });

  // Sheet riêng từng Giáo viên
  teachers.forEach(teacher => {
    let totalScheduled = 0;
    const tSchedule = {};

    DAYS_OF_WEEK.forEach(day => {
      tSchedule[day.id] = {};
      PERIODS.forEach(p => {
        let lessonFound = null;
        classes.forEach(cls => {
          const slot = timetable[cls.id]?.[day.id]?.[p.id];
          if (slot && slot.teacherId === teacher.id) {
            const subName = _subjects[slot.subjectId]?.name || slot.subjectRaw || slot.subjectId;
            lessonFound = `${subName}\n(${cls.name})`;
            totalScheduled++;
          }
        });
        tSchedule[day.id][p.id] = lessonFound;
      });
    });

    if (totalScheduled === 0 && !teacher.isHomeroom && teacher.department === 'Tổ Văn Phòng') return;

    const safeSheetName = (teacher.code || teacher.name).replace(/[^a-zA-Z0-9]/g, '_').substring(0, 28);
    const ws = wb.addWorksheet(safeSheetName, {
      pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 1 }
    });

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

    ws.mergeCells('A1:H1');
    const r1 = ws.getCell('A1');
    const sDistrict = (schoolInfo.district || 'Phòng GD&ĐT').toUpperCase();
    r1.value = `${sDistrict} — ${sName.toUpperCase()}`;
    r1.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
    r1.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(1).height = 22;

    ws.mergeCells('A2:H2');
    const r2 = ws.getCell('A2');
    r2.value = `LỊCH GIẢNG DẠY CÁ NHÂN — ${teacher.name.toUpperCase()}`;
    r2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
    r2.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(2).height = 34;

    ws.mergeCells('A3:H3');
    const r3 = ws.getCell('A3');
    r3.value = `${sYear.toUpperCase()} — (Áp dụng chính thức từ Tuần 01)`;
    r3.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } };
    r3.alignment = { vertical: 'middle', horizontal: 'center' };
    ws.getRow(3).height = 20;

    ws.mergeCells('A4:C4');
    const r4_1 = ws.getCell('A4');
    r4_1.value = `👨‍🏫 Giáo viên: ${teacher.name} (${teacher.code})`;
    r4_1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_1.alignment = { vertical: 'middle', horizontal: 'left' };

    ws.mergeCells('D4:F4');
    const r4_2 = ws.getCell('D4');
    const pos = (teacher.position || '').trim();
    const isGenericPos = !pos || pos.toLowerCase().includes('bộ môn') || pos.toLowerCase() === 'giáo viên';
    const posText = !isGenericPos ? ` | ${teacher.task || pos}` : '';
    r4_2.value = `🏢 Tổ: ${teacher.department}${posText}`;
    r4_2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_2.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('G4:H4');
    const r4_3 = ws.getCell('G4');
    r4_3.value = `⏰ Tổng số tiết dạy: ${totalScheduled} tiết/tuần`;
    r4_3.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E293B' } };
    r4_3.alignment = { vertical: 'middle', horizontal: 'right' };
    ws.getRow(4).height = 24;

    ws.getRow(5).height = 8;

    // Header
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

    // Sáng
    const morningPeriods = [
      { id: 1, name: 'Tiết 1', time: '07:15 - 07:55' },
      { id: 2, name: 'Tiết 2', time: '07:55 - 08:35' },
      { id: 3, name: 'Tiết 3', time: '09:00 - 09:40' },
      { id: 4, name: 'Tiết 4', time: '09:40 - 10:20' }
    ];

    morningPeriods.forEach((p, idx) => {
      const rowIdx = 7 + idx;
      const row = ws.getRow(rowIdx);
      row.height = 42;

      row.getCell(1).value = 'SÁNG';
      row.getCell(2).value = p.name;
      row.getCell(3).value = p.time;

      DAYS_OF_WEEK.forEach((d, dIdx) => {
        const colIdx = 4 + dIdx;
        const lesson = tSchedule[d.id]?.[p.id];
        const cell = row.getCell(colIdx);

        if (lesson) {
          cell.value = lesson;
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

    ws.mergeCells('A7:A10');
    const mBadge = ws.getCell('A7');
    mBadge.fill = FILL_MORNING;
    mBadge.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FF1E40AF' } };
    mBadge.alignment = { vertical: 'middle', horizontal: 'center' };
    mBadge.border = BORDER_THIN;

    // Nghỉ trưa
    ws.mergeCells('A11:H11');
    const lunchRow = ws.getRow(11);
    lunchRow.height = 22;
    const lunchCell = ws.getCell('A11');
    lunchCell.value = '🍽️ NGHỈ TRƯA (10:30 - 14:00)';
    lunchCell.fill = FILL_LUNCH;
    lunchCell.font = { name: 'Arial', size: 10, italic: true, color: { argb: 'FF64748B' } };
    lunchCell.alignment = { vertical: 'middle', horizontal: 'center' };
    for (let c = 1; c <= 8; c++) lunchRow.getCell(c).border = BORDER_THIN;

    // Chiều
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
        const lesson = tSchedule[d.id]?.[p.id];
        const cell = row.getCell(colIdx);

        if (lesson) {
          cell.value = lesson;
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

    ws.mergeCells('A12:A14');
    const aBadge = ws.getCell('A12');
    aBadge.fill = FILL_AFTERNOON;
    aBadge.font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFC2410C' } };
    aBadge.alignment = { vertical: 'middle', horizontal: 'center' };
    aBadge.border = BORDER_THIN;

    // Chữ ký
    ws.getRow(15).height = 12;

    ws.mergeCells('F16:H16');
    const sigDate = ws.getCell('F16');
    sigDate.value = `${schoolInfo.address ? schoolInfo.address.split(',')[0].trim() : 'Ngày 05 tháng 09 năm 2026'}`;
    sigDate.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
    sigDate.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('B17:C17');
    const sig1 = ws.getCell('B17');
    sig1.value = 'GIÁO VIÊN';
    sig1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sig1.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('F17:H17');
    const sig2 = ws.getCell('F17');
    sig2.value = 'HIỆU TRƯỞNG';
    sig2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sig2.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.getRow(18).height = 20;
    ws.getRow(19).height = 20;

    ws.mergeCells('B20:C20');
    const sigName1 = ws.getCell('B20');
    sigName1.value = teacher.name;
    sigName1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sigName1.alignment = { vertical: 'middle', horizontal: 'center' };

    ws.mergeCells('F20:H20');
    const sigName2 = ws.getCell('F20');
    sigName2.value = schoolInfo.principal || 'Thầy Nguyễn Văn An';
    sigName2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
    sigName2.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  await saveExcelJSWorkbook(wb, 'Lich_Giang_Day_Tung_Giao_Vien.xlsx');
};
