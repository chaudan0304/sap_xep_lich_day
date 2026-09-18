// src/services/excel/excelExporterDirectory.js
// Xuất bảng tổng hợp danh bạ giáo viên và định mức giảng dạy ra Excel

import ExcelJS from 'exceljs';
import { getTeacherShortName } from '../excelParser.js';
import {
  BORDER_THIN,
  BORDER_HEADER,
  FILL_NAVY_HEADER,
  FILL_ZEBRA,
  FILL_MORNING,
  saveExcelJSWorkbook
} from './excelStyles.js';

export const exportTeacherDirectory = async (teachers = [], assignments = [], timetable = {}, classes = [], schoolInfo = {}) => {
  const sName = schoolInfo.name || 'Trường Tiểu Học Ánh Dương';
  const sYear = schoolInfo.year || 'Năm học 2026 - 2027';

  const wb = new ExcelJS.Workbook();
  wb.creator = 'EduTimetable Tiểu Học';

  const ws = wb.addWorksheet('Danh_Ba_Dinh_Muc_Giao_Vien');

  ws.columns = [
    { key: 'stt', width: 8 },
    { key: 'id', width: 11 },
    { key: 'name', width: 26 },
    { key: 'code', width: 18 },
    { key: 'department', width: 25 },
    { key: 'task', width: 36 },
    { key: 'dinhMuc', width: 22 },
    { key: 'assigned', width: 20 },
    { key: 'scheduled', width: 20 },
    { key: 'diff', width: 18 },
    { key: 'off', width: 22 }
  ];

  // Header Title
  ws.mergeCells('A1:K1');
  const r1 = ws.getCell('A1');
  const sDistrict = (schoolInfo.district || 'Phòng Giáo Dục & Đào Tạo').toUpperCase();
  r1.value = `${sDistrict} — ${sName.toUpperCase()}`;
  r1.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
  r1.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(1).height = 22;

  ws.mergeCells('A2:K2');
  const r2 = ws.getCell('A2');
  r2.value = `BẢNG TỔNG HỢP DANH BẠ & ĐỊNH MỨC GIẢNG DẠY — ${sYear.toUpperCase()}`;
  r2.font = { name: 'Arial', size: 16, bold: true, color: { argb: 'FF1E3A8A' } };
  r2.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(2).height = 34;

  ws.mergeCells('A3:K3');
  const r3 = ws.getCell('A3');
  r3.value = '(Thống kê đối soát phân công chuyên môn và số tiết giảng dạy thực tế trên Thời khóa biểu)';
  r3.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF64748B' } };
  r3.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(3).height = 20;

  ws.getRow(4).height = 8;

  // Table Headers (Row 5)
  const headerRow = ws.getRow(5);
  headerRow.height = 30;
  const headers = [
    'STT', 
    'Mã GV', 
    'Họ và Tên', 
    'Tên Viết Tắt TKB', 
    'Tổ Chuyên Môn', 
    'Nhiệm Vụ / Phân Công', 
    'Định Mức Chuẩn (T/Tuần)', 
    'Số Tiết Phân Công', 
    'Số Tiết Đã Xếp Lịch', 
    'Chênh Lệch / Trạng Thái', 
    'Buổi Đăng Ký Nghỉ'
  ];

  headers.forEach((h, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = h;
    cell.fill = FILL_NAVY_HEADER;
    cell.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = BORDER_HEADER;
  });

  let totalDinhMuc = 0;
  let totalAssigned = 0;
  let totalScheduled = 0;

  teachers.forEach((t, idx) => {
    const assigned = assignments
      .filter(a => a.teacherId === t.id)
      .reduce((sum, a) => sum + (Number(a.weeklyPeriods) || 0), 0) || t.assignedPeriods || 0;

    let scheduled = 0;
    classes.forEach(c => {
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          if (timetable[c.id]?.[d]?.[p]?.teacherId === t.id) scheduled++;
        }
      }
    });

    const dinhMuc = t.dinhMuc || 23;
    const diff = scheduled - dinhMuc;
    const diffLabel = diff === 0 ? 'Đủ định mức' : (diff > 0 ? `Thừa +${diff}t` : `Thiếu ${diff}t`);

    totalDinhMuc += dinhMuc;
    totalAssigned += assigned;
    totalScheduled += scheduled;

    const row = ws.addRow({
      stt: t.tt || (idx + 1),
      id: t.id,
      name: t.name,
      code: t.code || getTeacherShortName(t.name, t.homeroomClassId, t.task),
      department: t.department,
      task: t.task || (t.isHomeroom ? `GVCN Lớp ${t.homeroomClassId}` : t.position),
      dinhMuc: `${dinhMuc} tiết`,
      assigned: `${assigned} tiết`,
      scheduled: `${scheduled} tiết`,
      diff: diffLabel,
      off: (t.offSessions || []).join(', ') || 'Không'
    });

    row.height = 24;
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('name').font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF0F172A' } };
    row.getCell('task').alignment = { vertical: 'middle', horizontal: 'left' };

    row.getCell('scheduled').font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };

    if (diff > 0) {
      row.getCell('diff').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF2563EB' } };
    } else if (diff < 0) {
      row.getCell('diff').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFDC2626' } };
    } else {
      row.getCell('diff').font = { name: 'Arial', size: 10, color: { argb: 'FF16A34A' } };
    }

    if (idx % 2 === 1) {
      row.eachCell(c => { c.fill = FILL_ZEBRA; });
    }
    row.eachCell(c => { c.border = BORDER_THIN; });
  });

  // Dòng Tổng Cộng
  const totalRow = ws.addRow({
    stt: '',
    id: 'TỔNG',
    name: `Toàn trường: ${teachers.length} Giáo viên`,
    code: '',
    department: '',
    task: '',
    dinhMuc: `${totalDinhMuc} tiết`,
    assigned: `${totalAssigned} tiết`,
    scheduled: `${totalScheduled} tiết`,
    diff: totalScheduled === totalDinhMuc ? 'Cân bằng' : `${totalScheduled - totalDinhMuc}t`,
    off: ''
  });

  totalRow.height = 28;
  totalRow.eachCell(c => {
    c.fill = FILL_MORNING;
    c.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF1E3A8A' } };
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = {
      top: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      bottom: { style: 'medium', color: { argb: 'FF1E3A8A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
    };
  });

  // Chân trang ký tên
  const sigRowIdx = ws.rowCount + 2;
  ws.mergeCells(sigRowIdx, 8, sigRowIdx, 11);
  const sigDate = ws.getCell(sigRowIdx, 8);
  sigDate.value = 'Ngày 05 tháng 09 năm 2026';
  sigDate.font = { name: 'Arial', size: 11, italic: true, color: { argb: 'FF475569' } };
  sigDate.alignment = { vertical: 'middle', horizontal: 'center' };

  const sigTitleRowIdx = sigRowIdx + 1;
  ws.mergeCells(sigTitleRowIdx, 2, sigTitleRowIdx, 4);
  const s1 = ws.getCell(sigTitleRowIdx, 2);
  s1.value = 'NGƯỜI LẬP BIỂU';
  s1.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  s1.alignment = { vertical: 'middle', horizontal: 'center' };

  ws.mergeCells(sigTitleRowIdx, 8, sigTitleRowIdx, 11);
  const s2 = ws.getCell(sigTitleRowIdx, 8);
  s2.value = 'HIỆU TRƯỞNG';
  s2.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  s2.alignment = { vertical: 'middle', horizontal: 'center' };

  const sigNameRowIdx = sigTitleRowIdx + 4;
  ws.mergeCells(sigNameRowIdx, 8, sigNameRowIdx, 11);
  const nameCell = ws.getCell(sigNameRowIdx, 8);
  nameCell.value = schoolInfo.principal || 'Thầy Nguyễn Văn An';
  nameCell.font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FF0F172A' } };
  nameCell.alignment = { vertical: 'middle', horizontal: 'center' };

  await saveExcelJSWorkbook(wb, 'Danh_Ba_Dinh_Muc_Giao_Vien.xlsx');
};
