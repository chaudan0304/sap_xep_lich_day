// src/services/excel/excelTemplate.js
// Tải file mẫu chuẩn định mức & dữ liệu (.xlsx)

import ExcelJS from 'exceljs';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../../constants/subjects.js';
import { DEFAULT_GRADE_QUOTAS } from '../../constants/defaultCurriculum.js';
import {
  SAMPLE_TEACHERS,
  SAMPLE_CLASSES,
  SAMPLE_SCHOOL_INFO,
  generateSampleAssignments
} from '../../data/sampleData.js';
import { renderMatrixHelper } from './excelExporterMaster.js';
import {
  BORDER_THIN,
  FILL_NAVY_HEADER,
  saveExcelJSWorkbook
} from './excelStyles.js';

export const downloadExcelTemplate = async () => {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'EduTimetable Tiểu Học';

  const teachers = SAMPLE_TEACHERS || [];
  const classes = SAMPLE_CLASSES || [];
  const timetable = {};
  const gradeQuotas = DEFAULT_GRADE_QUOTAS;
  const assignments = generateSampleAssignments(classes, gradeQuotas, teachers);
  const teacherMap = new Map(teachers.map(t => [t.id, t]));
  const schoolInfo = {
    name: SAMPLE_SCHOOL_INFO.name || 'Trường Tiểu Học Ánh Dương',
    year: SAMPLE_SCHOOL_INFO.year || 'Năm học 2026 - 2027',
    district: SAMPLE_SCHOOL_INFO.district || 'Phòng Giáo Dục & Đào Tạo',
    principal: SAMPLE_SCHOOL_INFO.principal || 'Thầy Nguyễn Văn An'
  };

  // Sheet 1: Huong_Dan_Su_Dung
  const wsGuide = wb.addWorksheet('Huong_Dan_Su_Dung');
  wsGuide.columns = [
    { header: 'Mục / Trang Tính', key: 'section', width: 28 },
    { header: 'Nội Dung Hướng Dẫn & Quy Định Nhập Chuẩn CTGDPT 2018', key: 'content', width: 85 }
  ];
  wsGuide.getRow(1).height = 32;
  wsGuide.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  wsGuide.getRow(1).fill = FILL_NAVY_HEADER;
  wsGuide.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  const guideItems = [
    { section: '1. Danh_Sach_Giao_Vien', content: 'Khai báo danh sách cán bộ giáo viên, mã GV (GV01, GV02...), họ tên, tên viết tắt hiển thị trên TKB, chức vụ, lớp chủ nhiệm, tổ chuyên môn và định mức số tiết dạy/tuần.' },
    { section: '2. Danh_Sach_Lop', content: 'Khai báo cơ cấu lớp học toàn trường (1A1 -> 5A5), chọn đúng khối lớp (1 đến 5), giáo viên chủ nhiệm, sĩ số học sinh và phòng học chính.' },
    { section: '3. Dinh_Muc_Theo_Khoi', content: 'Khung định mức số tiết các môn học của Khối 1 đến Khối 5 theo Chuẩn Chương trình GDPT 2018 (Toán, Tiếng Việt, Tiếng Anh, TNXH, LS-DL, Tin học, GDTC, Âm nhạc, Mĩ thuật...).' },
    { section: '4. Phan_Cong_Chuyen_Mon', content: 'Chỉ định giáo viên phụ trách và phòng bộ môn cho từng môn học của từng lớp học trong trường.' },
    { section: '5. TKB_Toan_Truong & Khoi_1..5', content: 'Bảng ma trận thời khóa biểu mẫu hoàn chỉnh 100%. Bạn có thể chỉnh sửa trực tiếp trên file Excel này hoặc nạp vào phần mềm để xếp lịch và kiểm tra trùng giờ tự động.' }
  ];

  guideItems.forEach(item => {
    const row = wsGuide.addRow(item);
    row.height = 32;
    row.alignment = { vertical: 'middle', wrapText: true };
    row.getCell('section').alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    row.getCell('section').font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF1E3A8A' } };
    row.getCell('content').font = { name: 'Arial', size: 10, color: { argb: 'FF334155' } };
    row.eachCell(c => { c.border = BORDER_THIN; });
  });

  // Sheet 2: Danh_Sach_Giao_Vien
  const wsTeacher = wb.addWorksheet('Danh_Sach_Giao_Vien');
  wsTeacher.columns = [
    { header: 'STT', key: 'tt', width: 8 },
    { header: 'Mã GV', key: 'id', width: 12 },
    { header: 'Họ và Tên', key: 'name', width: 26 },
    { header: 'Tên TKB (Viết tắt)', key: 'code', width: 18 },
    { header: 'Chức Vụ / Vị Trí', key: 'position', width: 20 },
    { header: 'Chủ Nhiệm', key: 'homeroom', width: 14 },
    { header: 'Tổ Chuyên Môn', key: 'department', width: 22 },
    { header: 'Định Mức (Tiết/Tuần)', key: 'dinhMuc', width: 22 },
    { header: 'Buổi Đăng Ký Nghỉ', key: 'off', width: 22 },
    { header: 'Ghi Chú', key: 'note', width: 35 }
  ];
  wsTeacher.getRow(1).height = 30;
  wsTeacher.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  wsTeacher.getRow(1).fill = FILL_NAVY_HEADER;
  wsTeacher.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  teachers.forEach((t, idx) => {
    const row = wsTeacher.addRow({
      tt: t.tt || idx + 1,
      id: t.id,
      name: t.name,
      code: t.code || t.name,
      position: t.position || 'Giáo Viên',
      homeroom: t.isHomeroom && t.homeroomClassId ? `Lớp ${t.homeroomClassId}` : 'Không',
      department: t.department || 'Giáo viên',
      dinhMuc: t.dinhMuc || 23,
      off: (t.offSessions || []).join(', ') || 'Không',
      note: t.note || t.task || ''
    });
    row.height = 24;
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('position').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('department').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('note').alignment = { vertical: 'middle', horizontal: 'left' };
    row.eachCell(c => { c.border = BORDER_THIN; });
  });

  // Sheet 3: Danh_Sach_Lop
  const wsClass = wb.addWorksheet('Danh_Sach_Lop');
  wsClass.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Mã Lớp', key: 'id', width: 14 },
    { header: 'Khối Lớp', key: 'grade', width: 12 },
    { header: 'Tên Lớp Học', key: 'name', width: 20 },
    { header: 'Mã GVCN', key: 'gvcnId', width: 14 },
    { header: 'Họ Tên GVCN', key: 'gvcnName', width: 26 },
    { header: 'Sĩ Số Học Sinh', key: 'students', width: 16 },
    { header: 'Phòng Học Chính', key: 'room', width: 18 }
  ];
  wsClass.getRow(1).height = 30;
  wsClass.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  wsClass.getRow(1).fill = FILL_NAVY_HEADER;
  wsClass.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  classes.forEach((c, idx) => {
    const tch = teacherMap.get(c.homeroomTeacherId);
    const row = wsClass.addRow({
      stt: idx + 1,
      id: c.id,
      grade: `Khối ${c.grade}`,
      name: c.name || `Lớp ${c.id}`,
      gvcnId: c.homeroomTeacherId || '',
      gvcnName: tch ? tch.name : '',
      students: c.studentCount || 35,
      room: c.mainRoom || `Phòng ${c.id}`
    });
    row.height = 24;
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('name').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('gvcnName').alignment = { vertical: 'middle', horizontal: 'left' };
    row.eachCell(c => { c.border = BORDER_THIN; });
  });

  // Sheet 4: Dinh_Muc_Theo_Khoi
  const wsQuota = wb.addWorksheet('Dinh_Muc_Theo_Khoi');
  wsQuota.columns = [
    { header: 'Khối Lớp', key: 'grade', width: 14 },
    { header: 'Mã Môn', key: 'subjectId', width: 18 },
    { header: 'Tên Môn Học & HĐGD', key: 'subjectName', width: 30 },
    { header: 'Số Tiết / Tuần', key: 'weeklyPeriods', width: 18 },
    { header: 'Sáng Tối Đa', key: 'maxMorning', width: 15 },
    { header: 'Chiều Tối Đa', key: 'maxAfternoon', width: 15 },
    { header: 'Phòng Bộ Môn', key: 'roomType', width: 24 }
  ];
  wsQuota.getRow(1).height = 30;
  wsQuota.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  wsQuota.getRow(1).fill = FILL_NAVY_HEADER;
  wsQuota.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  Object.values(gradeQuotas).forEach(g => {
    (g.subjects || []).forEach(s => {
      const subInfo = DEFAULT_SUBJECTS[s.subjectId] || {};
      const row = wsQuota.addRow({
        grade: `Khối ${g.grade}`,
        subjectId: s.subjectId,
        subjectName: subInfo.name || s.subjectId,
        weeklyPeriods: s.weeklyPeriods,
        maxMorning: s.maxMorning,
        maxAfternoon: s.maxAfternoon,
        roomType: s.roomType || 'LOP_HOC'
      });
      row.height = 22;
      row.alignment = { vertical: 'middle', horizontal: 'center' };
      row.getCell('subjectName').alignment = { vertical: 'middle', horizontal: 'left' };
      row.eachCell(c => { c.border = BORDER_THIN; });
    });
  });

  // Sheet 5: Phan_Cong_Chuyen_Mon
  const wsAsg = wb.addWorksheet('Phan_Cong_Chuyen_Mon');
  wsAsg.columns = [
    { header: 'STT', key: 'stt', width: 8 },
    { header: 'Lớp', key: 'classId', width: 12 },
    { header: 'Khối', key: 'grade', width: 10 },
    { header: 'Tên Môn Học', key: 'subjectName', width: 26 },
    { header: 'Mã Môn', key: 'subjectId', width: 16 },
    { header: 'Mã GV', key: 'teacherId', width: 12 },
    { header: 'Giáo Viên Phụ Trách', key: 'teacherName', width: 24 },
    { header: 'Số Tiết / Tuần', key: 'weeklyPeriods', width: 16 },
    { header: 'Phòng Học', key: 'roomId', width: 18 }
  ];
  wsAsg.getRow(1).height = 30;
  wsAsg.getRow(1).font = { name: 'Arial', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  wsAsg.getRow(1).fill = FILL_NAVY_HEADER;
  wsAsg.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

  assignments.forEach((asg, idx) => {
    const tch = teacherMap.get(asg.teacherId);
    const sub = DEFAULT_SUBJECTS[asg.subjectId] || {};
    const row = wsAsg.addRow({
      stt: idx + 1,
      classId: asg.classId,
      grade: asg.grade ? `Khối ${asg.grade}` : '',
      subjectName: sub.name || asg.subjectId,
      subjectId: asg.subjectId,
      teacherId: asg.teacherId || '',
      teacherName: tch ? tch.name : '',
      weeklyPeriods: asg.weeklyPeriods || 1,
      roomId: asg.roomId || 'LOP_HOC'
    });
    row.height = 22;
    row.alignment = { vertical: 'middle', horizontal: 'center' };
    row.getCell('subjectName').alignment = { vertical: 'middle', horizontal: 'left' };
    row.getCell('teacherName').alignment = { vertical: 'middle', horizontal: 'left' };
    row.eachCell(c => { c.border = BORDER_THIN; });
  });

  // Sheet 6: TKB_Toan_Truong & Sheets Khối 1..5
  const wsMaster = wb.addWorksheet('TKB_Toan_Truong');
  renderMatrixHelper(wsMaster, classes, `Toàn Trường (${classes.length} Lớp)`, timetable, teacherMap, DEFAULT_SUBJECTS, schoolInfo);

  for (let g = 1; g <= 5; g++) {
    const gradeClasses = classes.filter(c => c.grade === g);
    if (gradeClasses.length > 0) {
      const wsGrade = wb.addWorksheet(`Khoi_${g}`);
      renderMatrixHelper(wsGrade, gradeClasses, `Khối ${g}`, timetable, teacherMap, DEFAULT_SUBJECTS, schoolInfo);
    }
  }

  await saveExcelJSWorkbook(wb, 'File_Mau_Thoi_Khoa_Bieu_Chuan.xlsx');
};
