// src/components/TeacherTimetablePrintModal.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toPng, toBlob } from 'html-to-image';
import {
  Printer,
  FileSpreadsheet,
  X,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Layers,
  School,
  Info,
  Search,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { DAYS_OF_WEEK, PERIODS as DEFAULT_PERIODS } from '../constants/defaultCurriculum';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import { exportTeacherTimetables } from '../services/excelService';
import { triggerAppPrint } from '../services/printService';
import { DEFAULT_DEPARTMENTS } from '../services/departmentService';

export const TEACHER_GROUPS = DEFAULT_DEPARTMENTS.map(d => d.name);

export const getTeacherDepartment = (teacher) => {
  if (!teacher) return 'Giáo viên bộ môn';

  const d = (teacher.department || '').trim();
  if (d) {
    return d;
  }

  // Phân loại qua lớp chủ nhiệm
  if (teacher.isHomeroom && teacher.homeroomClassId) {
    const match = String(teacher.homeroomClassId).match(/([1-5])/);
    if (match) {
      const g = parseInt(match[1], 10);
      return g <= 3 ? 'Tổ 1, 2, 3' : 'Tổ 4, 5';
    }
  }

  // Phân loại BGH nếu có
  const pos = (teacher.position || '').toLowerCase();
  const task = (teacher.task || '').toLowerCase();
  if (pos.includes('hiệu trưởng') || task.includes('hiệu trưởng') || pos.includes('bgh')) {
    if (task.includes('4-5') || pos.includes('4-5')) return 'Tổ 4, 5';
    if (task.includes('1,2,3') || pos.includes('1,2,3')) return 'Tổ 1, 2, 3';
  }

  return 'Giáo viên bộ môn';
};

export const getTeacherPositionTitle = (teacher) => {
  if (!teacher) return '';
  const pos = (teacher.position || '').trim();
  const task = (teacher.task || '').trim();

  // 1. Chức vụ quản lý BGH
  if (pos.toLowerCase().includes('hiệu trưởng') || pos.toLowerCase().includes('ht')) return pos;
  
  // 2. Chức vụ công tác Đội / Đoàn
  if (pos.toLowerCase().includes('tổng phụ trách') || pos.toLowerCase().includes('tpt')) return pos;
  if (task.toLowerCase().includes('tổng phụ trách') || task.toLowerCase().includes('tpt')) return 'Tổng Phụ Trách Đội';
  
  // 3. Chức vụ tổ trưởng / tổ phó
  if (pos.toLowerCase().includes('tổ trưởng') || pos.toLowerCase().includes('tổ phó')) return pos;
  
  // 4. Khối văn phòng nếu có
  if (pos.toLowerCase().includes('kế toán') || pos.toLowerCase().includes('văn thư') || pos.toLowerCase().includes('thủ quỹ')) return pos;

  // 5. Giáo viên chủ nhiệm
  if (teacher.isHomeroom && teacher.homeroomClassId) {
    const clsName = String(teacher.homeroomClassId).replace(/^Lớp\s+/i, '');
    return `GVCN Lớp ${clsName}`;
  }

  // 6. Nếu vị trí chỉ là các từ chung chung như "GV Bộ Môn", "Giáo Viên", "GV", "Bộ Môn" -> Bỏ trống để tránh lặp với Tổ chuyên môn
  const lowerPos = pos.toLowerCase();
  if (
    !lowerPos ||
    lowerPos.includes('bộ môn') ||
    lowerPos === 'giáo viên' ||
    lowerPos === 'gv'
  ) {
    return '';
  }

  return pos;
};

export const TeacherTimetablePrintModal = ({
  isOpen,
  onClose,
  teachers = [],
  departments = [],
  classes = [],
  timetable = {},
  subjects = DEFAULT_SUBJECTS,
  periods = DEFAULT_PERIODS,
  schoolInfo = {},
  assignments = [],
  initialTeacherId = null
}) => {
  // 1. In Scope: 'current' | 'all' | 'department' | 'custom'
  const [printScope, setPrintScope] = useState(() => initialTeacherId ? 'current' : 'all');
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');
  const [selectedTeacherIds, setSelectedTeacherIds] = useState(() => {
    return initialTeacherId ? [initialTeacherId] : (teachers[0] ? [teachers[0].id] : []);
  });
  const [teacherSearch, setTeacherSearch] = useState('');

  // 2. Preview navigation state
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(100); // 75 | 90 | 100 | 115

  // 3. Print Meta Config (editable for print)
  const [printMeta, setPrintMeta] = useState({
    district: schoolInfo.district || 'UBND PHƯỜNG TÂN MAI',
    schoolName: schoolInfo.name || 'TRƯỜNG TIỂU HỌC QUỲNH LỘC',
    year: schoolInfo.year || 'Năm học 2026 - 2027',
    effectiveDate: 'Áp dụng từ ngày 05/09/2026',
    signLocationDate: 'Tân Mai, ngày 05 tháng 09 năm 2026',
    scheduler: (schoolInfo?.scheduler && schoolInfo.scheduler !== 'Châu Đàn') ? schoolInfo.scheduler : '',
    principal: schoolInfo.principal || 'Bùi Văn Việt',
    lunchBreak: schoolInfo.lunchBreak || '10:30 - 14:00'
  });

  // 4. Display options
  const [displayOptions, setDisplayOptions] = useState({
    showHeader: true,
    showSignatures: true,
    signatureType: 'teacher_principal', // 'teacher_principal' | 'scheduler_principal'
    showPosition: true,
    showTeacherMeta: true,
    showRoom: true,
    showPeriodTime: true,
    showLunchBreak: true,
    fontScale: 'normal' // 'compact' | 'normal' | 'large'
  });

  const [activeTab, setActiveTab] = useState('scope'); // 'scope' | 'meta' | 'options'
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const previewSheetRef = useRef(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Sync initialTeacherId if changed
  useEffect(() => {
    if (initialTeacherId) {
      setSelectedTeacherIds([initialTeacherId]);
      setPrintScope('current');
    }
  }, [initialTeacherId]);

  // Calculate stats for teachers (scheduled slots)
  const teacherStats = useMemo(() => {
    const stats = {};
    teachers.forEach(t => {
      let scheduled = 0;
      classes.forEach(c => {
        for (let d = 2; d <= 6; d++) {
          for (let p = 1; p <= 7; p++) {
            if (timetable[c.id]?.[d]?.[p]?.teacherId === t.id) {
              scheduled++;
            }
          }
        }
      });
      stats[t.id] = { scheduled };
    });
    return stats;
  }, [teachers, classes, timetable]);

  // Determine target teachers based on scope
  const targetTeachers = useMemo(() => {
    if (printScope === 'current') {
      const curId = selectedTeacherIds[0] || initialTeacherId || teachers[0]?.id;
      const t = teachers.find(item => item.id === curId) || teachers[0];
      return t ? [t] : [];
    }
    if (printScope === 'all') {
      return [...teachers];
    }
    if (printScope === 'department') {
      if (selectedDepartment === 'ALL') return [...teachers];
      return teachers.filter(t => t.departmentId === selectedDepartment || (t.department || '').trim() === selectedDepartment || getTeacherDepartment(t) === selectedDepartment);
    }
    if (printScope === 'custom') {
      return teachers.filter(t => selectedTeacherIds.includes(t.id));
    }
    return teachers;
  }, [printScope, selectedDepartment, selectedTeacherIds, teachers, initialTeacherId]);

  // Keep preview index in bounds
  useEffect(() => {
    if (previewIndex >= targetTeachers.length) {
      setPreviewIndex(Math.max(0, targetTeachers.length - 1));
    }
  }, [targetTeachers.length, previewIndex]);

  const currentPreviewTeacher = targetTeachers[previewIndex] || targetTeachers[0] || teachers[0];

  // Quick teacher toggles for custom scope
  const handleToggleTeacher = (teacherId) => {
    setSelectedTeacherIds(prev => {
      if (prev.includes(teacherId)) {
        if (prev.length === 1) return prev; // Keep at least 1
        return prev.filter(id => id !== teacherId);
      } else {
        return [...prev, teacherId];
      }
    });
  };

  const handleSelectAllCustom = () => {
    setSelectedTeacherIds(teachers.map(t => t.id));
  };

  const handleDeselectAllCustom = () => {
    if (teachers[0]) setSelectedTeacherIds([teachers[0].id]);
  };

  // Xuất file ảnh PNG nét cao (2.5x) để gửi qua Zalo
  const handleExportZaloImage = async () => {
    if (!previewSheetRef.current || !currentPreviewTeacher) return;
    try {
      setIsExportingImage(true);
      const dataUrl = await toPng(previewSheetRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      const safeName = (currentPreviewTeacher.name || 'GiaoVien').replace(/\s+/g, '_');
      link.download = `TKB_GV_${safeName}_Zalo.png`;
      link.href = dataUrl;
      link.click();
      showToast(`Đã tải ảnh TKB Thầy/Cô ${currentPreviewTeacher.name} nét cao cho Zalo!`);
    } catch (err) {
      console.error('Lỗi xuất ảnh:', err);
      alert('Không thể tạo file ảnh. Vui lòng thử lại!');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Sao chép ảnh trực tiếp vào Clipboard (nhấn Ctrl+V dán ngay vào Zalo chat)
  const handleCopyZaloImage = async () => {
    if (!previewSheetRef.current || !currentPreviewTeacher) return;
    try {
      setIsCopyingImage(true);
      const blob = await toBlob(previewSheetRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff'
      });
      if (!blob) throw new Error('Không thể tạo dữ liệu ảnh blob');

      if (navigator.clipboard && window.ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        showToast(`Đã sao chép ảnh TKB ${currentPreviewTeacher.name}! Nhấn Ctrl+V để dán vào Zalo.`);
      } else {
        handleExportZaloImage();
      }
    } catch (err) {
      console.error('Lỗi copy ảnh clipboard:', err);
      handleExportZaloImage();
    } finally {
      setIsCopyingImage(false);
    }
  };

  const handlePrint = async () => {
    document.body.classList.add('printing-modal-active');
    try {
      await triggerAppPrint();
    } finally {
      setTimeout(() => {
        document.body.classList.remove('printing-modal-active');
      }, 1200);
    }
  };

  const handleExportExcel = async () => {
    if (!targetTeachers || targetTeachers.length === 0) return;
    try {
      setIsExportingExcel(true);
      await exportTeacherTimetables(
        timetable,
        targetTeachers,
        classes,
        subjects,
        {
          name: printMeta.schoolName,
          year: printMeta.year,
          district: printMeta.district,
          principal: printMeta.principal,
          scheduler: printMeta.scheduler,
          lunchBreak: printMeta.lunchBreak
        }
      );
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      alert('Đã xảy ra lỗi khi xuất Excel lịch giảng dạy giáo viên.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Helper to render an individual A4 Printable Teacher Sheet
  const renderTeacherSheet = (t, isPreview = false) => {
    if (!t) return null;

    // Get list of classes taught by this teacher
    const taughtClasses = (() => {
      const nameSet = new Set();
      if (t.isHomeroom && t.homeroomClassId) {
        const c = classes.find(item => item.id === t.homeroomClassId || item.name === t.homeroomClassId);
        nameSet.add(c ? c.name : t.homeroomClassId);
      }
      (assignments || []).forEach(a => {
        if (a.teacherId === t.id && a.classId) {
          const c = classes.find(item => item.id === a.classId || item.name === a.classId);
          nameSet.add(c ? c.name : a.classId);
        }
      });
      if (Array.isArray(t.subjectAssignments)) {
        t.subjectAssignments.forEach(cfg => {
          (cfg.classIds || []).forEach(cid => {
            const c = classes.find(item => item.id === cid || item.name === cid);
            nameSet.add(c ? c.name : cid);
          });
        });
      }
      classes.forEach(cls => {
        for (let dayId = 2; dayId <= 6; dayId++) {
          for (let pId = 1; pId <= 7; pId++) {
            if (timetable[cls.id]?.[dayId]?.[pId]?.teacherId === t.id) {
              nameSet.add(cls.name);
            }
          }
        }
      });
      return Array.from(nameSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    })();

    const getFontSizeTable = () => {
      if (displayOptions.fontScale === 'compact') return { table: '8pt', header: '8pt', sub: '7.5pt', cls: '7.5pt' };
      if (displayOptions.fontScale === 'large') return { table: '9.5pt', header: '9.5pt', sub: '9.5pt', cls: '8.5pt' };
      return { table: '8.5pt', header: '9pt', sub: '8.5pt', cls: '8pt' };
    };
    const fSizes = getFontSizeTable();

    return (
      <div
        className={isPreview ? 'preview-sheet' : 'printable-sheet page-break'}
        style={{
          width: '100%',
          maxWidth: isPreview ? '100%' : '210mm',
          margin: '0 auto',
          background: '#ffffff',
          color: '#000000',
          fontFamily: '"Times New Roman", Times, serif',
          padding: isPreview ? '24px 28px' : '0',
          boxSizing: 'border-box'
        }}
      >
        {/* 1. National / School Header */}
        {displayOptions.showHeader && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1.5px solid #000',
            paddingBottom: '6px',
            marginBottom: '10px'
          }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ fontSize: '9.5pt', textTransform: 'uppercase', fontWeight: 700 }}>
                {printMeta.district || 'UBND PHƯỜNG TÂN MAI'}
              </div>
              <div style={{ fontSize: '10.5pt', textTransform: 'uppercase', fontWeight: 800 }}>
                {printMeta.schoolName || 'TRƯỜNG TIỂU HỌC QUỲNH LỘC'}
              </div>
            </div>
            <div style={{ textAlign: 'center', width: '50%' }}>
              <div style={{ fontSize: '9.5pt', fontWeight: 800 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
              <div style={{ fontSize: '9pt', fontStyle: 'italic', textDecoration: 'underline', marginTop: '2px' }}>
                Độc lập - Tự do - Hạnh phúc
              </div>
            </div>
          </div>
        )}

        {/* 2. Timetable Title & Teacher Profile */}
        <div style={{ textAlign: 'center', margin: '8px 0 10px 0' }}>
          <h1 style={{
            fontSize: '15pt',
            fontWeight: 900,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            LỊCH GIẢNG DẠY CÁ NHÂN
          </h1>
          <div style={{ fontSize: '12pt', fontWeight: 800, marginTop: '3px', color: '#000' }}>
            Giáo viên: {t.name} {t.code ? `(${t.code})` : (t.id ? `(${t.id})` : '')}
          </div>
          {(() => {
            const deptName = getTeacherDepartment(t);
            const posTitle = displayOptions.showPosition ? getTeacherPositionTitle(t) : '';
            // Chỉ hiển thị Chức vụ khi có chức vụ thực tế và không trùng lặp từ với Tổ
            const shouldShowPos = Boolean(
              posTitle &&
              !posTitle.toLowerCase().includes('bộ môn') &&
              posTitle.toLowerCase() !== 'giáo viên' &&
              posTitle.toLowerCase() !== deptName.toLowerCase()
            );

            const metaParts = [
              shouldShowPos ? `Chức vụ: ${posTitle}` : null,
              deptName,
              printMeta.effectiveDate,
              printMeta.year
            ].filter(Boolean);

            return (
              <div style={{ fontSize: '9pt', fontStyle: 'italic', marginTop: '2px' }}>
                {metaParts.join(' • ')}
              </div>
            );
          })()}

          {displayOptions.showTeacherMeta && taughtClasses.length > 0 && (
            <div style={{
              fontSize: '8.5pt',
              fontWeight: 700,
              marginTop: '4px',
              color: '#000'
            }}>
              Danh sách các lớp giảng dạy ({taughtClasses.length} lớp):{' '}
              <span style={{ fontWeight: 800 }}>
                {taughtClasses.join(', ')}
              </span>
              {displayOptions.showPosition && t.isHomeroom && t.homeroomClassId && (
                <span style={{ fontStyle: 'italic', marginLeft: '6px' }}>
                  (Chủ nhiệm: {classes.find(c => c.id === t.homeroomClassId)?.name || t.homeroomClassId})
                </span>
              )}
            </div>
          )}
        </div>

        {/* 3. Official Printable Table */}
        <table style={{
          width: '100%',
          tableLayout: 'fixed',
          borderCollapse: 'collapse',
          border: '1.5px solid #000',
          textAlign: 'center',
          fontSize: fSizes.table
        }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #000' }}>
              <th style={{ border: '1px solid #000', width: '52px', padding: '5px 2px', fontWeight: 800 }}>Buổi</th>
              <th style={{ border: '1px solid #000', width: '32px', padding: '5px 2px', fontWeight: 800 }}>Tiết</th>
              {displayOptions.showPeriodTime && (
                <th style={{ border: '1px solid #000', width: '68px', padding: '5px 2px', fontWeight: 800 }}>Thời gian</th>
              )}
              {DAYS_OF_WEEK.map(d => (
                <th key={d.id} style={{ border: '1px solid #000', padding: '5px 2px', fontWeight: 800 }}>
                  {d.name.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map(period => {
              const isLunch = period.id === 4;

              return (
                <React.Fragment key={period.id}>
                  <tr>
                    {period.id === 1 && (
                      <td
                        rowSpan={4}
                        style={{
                          border: '1px solid #000',
                          fontWeight: 800,
                          verticalAlign: 'middle',
                          textAlign: 'center',
                          fontSize: fSizes.header,
                          padding: '2px 4px',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap',
                          boxSizing: 'border-box',
                          background: '#fafafa'
                        }}
                      >
                        SÁNG
                      </td>
                    )}
                    {period.id === 5 && (
                      <td
                        rowSpan={3}
                        style={{
                          border: '1px solid #000',
                          fontWeight: 800,
                          verticalAlign: 'middle',
                          textAlign: 'center',
                          fontSize: fSizes.header,
                          padding: '2px 4px',
                          letterSpacing: '0.5px',
                          whiteSpace: 'nowrap',
                          boxSizing: 'border-box',
                          background: '#fafafa'
                        }}
                      >
                        CHIỀU
                      </td>
                    )}

                    <td style={{
                      border: '1px solid #000',
                      fontWeight: 800,
                      verticalAlign: 'middle',
                      fontSize: '9.5pt'
                    }}>
                      {period.id <= 4 ? period.id : (period.id - 4)}
                    </td>

                    {displayOptions.showPeriodTime && (
                      <td style={{
                        border: '1px solid #000',
                        fontSize: '7.5pt',
                        verticalAlign: 'middle',
                        color: '#222'
                      }}>
                        {period.time}
                      </td>
                    )}

                    {DAYS_OF_WEEK.map(day => {
                      let matchSlot = null;
                      let matchClass = null;

                      classes.forEach(cls => {
                        const slot = timetable[cls.id]?.[day.id]?.[period.id];
                        if (slot && slot.teacherId === t.id) {
                          matchSlot = slot;
                          matchClass = cls;
                        }
                      });

                      const sub = matchSlot ? ((subjects && subjects[matchSlot.subjectId]) || DEFAULT_SUBJECTS[matchSlot.subjectId] || { name: matchSlot.subjectRaw || matchSlot.subjectId }) : null;
                      const isWedOff = day.id === 4 && period.id > 4;

                      if (isWedOff) {
                        return (
                          <td
                            key={day.id}
                            style={{
                              border: '1px solid #000',
                              fontStyle: 'italic',
                              color: '#555',
                              background: '#f8fafc',
                              height: '35px',
                              verticalAlign: 'middle'
                            }}
                          >
                            Nghỉ
                          </td>
                        );
                      }

                      return (
                        <td
                          key={day.id}
                          style={{
                            border: '1px solid #000',
                            height: '36px',
                            padding: '2px 2px',
                            verticalAlign: 'middle',
                            wordBreak: 'break-word'
                          }}
                        >
                          {matchSlot ? (
                            <div>
                              <div style={{
                                fontWeight: 800,
                                fontSize: fSizes.sub,
                                color: '#000',
                                lineHeight: 1.15
                              }}>
                                {sub?.name || matchSlot.subjectId}
                              </div>
                              <div style={{
                                fontSize: fSizes.cls,
                                fontWeight: 800,
                                color: '#0f172a',
                                marginTop: '1px',
                                background: '#e0e7ff',
                                padding: '1px 4px',
                                borderRadius: '3px',
                                display: 'inline-block'
                              }}>
                                {matchClass?.name}
                              </div>
                              {displayOptions.showRoom && matchSlot.roomId && (
                                <div style={{ fontSize: '7pt', color: '#64748b', fontStyle: 'italic' }}>
                                  ({matchSlot.roomId})
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#cbd5e1' }}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Lunch break row */}
                  {displayOptions.showLunchBreak && isLunch && (
                    <tr style={{ background: '#f8fafc', border: '1px solid #000' }}>
                      <td
                        colSpan={displayOptions.showPeriodTime ? 8 : 7}
                        style={{
                          border: '1px solid #000',
                          padding: '3px',
                          fontSize: '8pt',
                          fontWeight: 800,
                          fontStyle: 'italic',
                          color: '#334155'
                        }}
                      >
                        🍱 NGHỈ TRƯA BÁN TRÚ ({printMeta.lunchBreak || '10:30 - 14:00'})
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* 4. Footer Signatures */}
        {displayOptions.showSignatures && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '16px',
            fontSize: '8.5pt'
          }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>
                {displayOptions.signatureType === 'scheduler_principal' ? 'NGƯỜI LẬP BIỂU' : 'GIÁO VIÊN'}
              </div>
              <div style={{ fontStyle: 'italic', fontSize: '7.5pt', marginTop: '2px' }}>(Ký và ghi rõ họ tên)</div>
              <div style={{ height: '38px' }} />
              <div style={{ fontWeight: 800 }}>
                {displayOptions.signatureType === 'scheduler_principal' ? (printMeta.scheduler || '') : t.name}
              </div>
            </div>

            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ fontStyle: 'italic', fontSize: '8pt' }}>
                {printMeta.signLocationDate}
              </div>
              <div style={{ fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>HIỆU TRƯỞNG</div>
              <div style={{ fontStyle: 'italic', fontSize: '7.5pt', marginTop: '2px' }}>(Ký và đóng dấu)</div>
              <div style={{ height: '38px' }} />
              <div style={{ fontWeight: 800 }}>{printMeta.principal || ''}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return createPortal(
    <div
      className="portal-print-modal"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
    >
      <div
        className="no-print"
        style={{
          width: '98vw',
          maxWidth: '1500px',
          height: '95vh',
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* ─────── TOP HEADER BAR ─────── */}
        <div style={{
          padding: '12px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#ffffff'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#ffffff',
              boxShadow: '0 4px 10px rgba(79, 70, 229, 0.3)'
            }}>
              <Printer size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                In Thời Khóa Biểu Giáo Viên (A4)
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: '20px',
                  background: '#e0e7ff',
                  color: '#4338ca'
                }}>
                  {targetTeachers.length} bản in
                </span>
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Xem trước trang in chuẩn quy cách giáo dục, hỗ trợ in từng giáo viên, theo tổ chuyên môn hoặc toàn trường.
              </p>
            </div>
          </div>

          {/* Top Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Copy Image Button */}
            <button
              onClick={handleCopyZaloImage}
              disabled={isCopyingImage || !currentPreviewTeacher}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1d4ed8',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: isCopyingImage ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Sao chép ảnh TKB đang xem vào Clipboard. Mở Zalo và nhấn Ctrl+V để gửi ngay cho giáo viên!"
            >
              <Copy size={16} />
              <span>{isCopyingImage ? 'Đang copy...' : 'Copy Ảnh (Dán Zalo)'}</span>
            </button>

            {/* Download Zalo Image Button */}
            <button
              onClick={handleExportZaloImage}
              disabled={isExportingImage || !currentPreviewTeacher}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: '#fdf4ff',
                border: '1px solid #f5d0fe',
                color: '#a21caf',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: isExportingImage ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Tải file ảnh PNG sắc nét (High-DPI) để gửi qua Zalo hoặc in ảnh"
            >
              <ImageIcon size={16} />
              <span>{isExportingImage ? 'Đang tạo...' : 'Tải Ảnh Zalo (PNG)'}</span>
            </button>

            {/* Export Excel Button */}
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel || targetTeachers.length === 0}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                color: '#15803d',
                fontSize: '0.85rem',
                fontWeight: 700,
                cursor: isExportingExcel ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Xuất các giáo viên đã chọn ra file Excel"
            >
              <FileSpreadsheet size={16} />
              <span>{isExportingExcel ? 'Đang xuất...' : `Xuất Excel (${targetTeachers.length})`}</span>
            </button>

            {/* Primary Print Button */}
            <button
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                transition: 'transform 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Printer size={16} />
              <span>In Ngay / PDF ({targetTeachers.length} trang)</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              style={{
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '10px',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#64748b'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Main Body (Split Layout: Left Controls, Right Live Preview) */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
          {/* ─────── LEFT CONTROLS PANEL ─────── */}
          <div style={{
            width: '380px',
            borderRight: '1px solid #e2e8f0',
            display: 'flex',
            flexDirection: 'column',
            background: '#ffffff'
          }}>
            {/* Control Tabs */}
            <div style={{
              display: 'flex',
              borderBottom: '1px solid #e2e8f0',
              padding: '6px 12px 0 12px',
              background: '#f8fafc',
              gap: '4px'
            }}>
              <button
                onClick={() => setActiveTab('scope')}
                style={{
                  padding: '8px 12px',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                  border: 'none',
                  background: activeTab === 'scope' ? '#ffffff' : 'transparent',
                  color: activeTab === 'scope' ? '#4f46e5' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'scope' ? '2px solid #4f46e5' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Layers size={14} />
                <span>1. Phạm vi in</span>
              </button>

              <button
                onClick={() => setActiveTab('meta')}
                style={{
                  padding: '8px 12px',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                  border: 'none',
                  background: activeTab === 'meta' ? '#ffffff' : 'transparent',
                  color: activeTab === 'meta' ? '#4f46e5' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'meta' ? '2px solid #4f46e5' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <School size={14} />
                <span>2. Tiêu đề & Ký</span>
              </button>

              <button
                onClick={() => setActiveTab('options')}
                style={{
                  padding: '8px 12px',
                  borderTopLeftRadius: '8px',
                  borderTopRightRadius: '8px',
                  border: 'none',
                  background: activeTab === 'options' ? '#ffffff' : 'transparent',
                  color: activeTab === 'options' ? '#4f46e5' : '#64748b',
                  fontWeight: 700,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  borderBottom: activeTab === 'options' ? '2px solid #4f46e5' : '2px solid transparent',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sliders size={14} />
                <span>3. Tùy chọn</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '18px' }}>
              {/* TAB 1: SCOPE */}
              {activeTab === 'scope' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#334155', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
                      Chọn chế độ in ấn:
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {/* Current Teacher */}
                      <button
                        onClick={() => setPrintScope('current')}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: printScope === 'current' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: printScope === 'current' ? '#eef2ff' : '#ffffff',
                          color: printScope === 'current' ? '#4338ca' : '#475569',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>📌 GV hiện tại</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Chỉ in Thầy/Cô {currentPreviewTeacher?.name || 'đang chọn'} (1 trang)
                        </div>
                      </button>

                      {/* All Teachers */}
                      <button
                        onClick={() => setPrintScope('all')}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: printScope === 'all' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: printScope === 'all' ? '#eef2ff' : '#ffffff',
                          color: printScope === 'all' ? '#4338ca' : '#475569',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>👨‍🏫 Toàn trường</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Tất cả {teachers.length} giáo viên
                        </div>
                      </button>

                      {/* By Department */}
                      <button
                        onClick={() => setPrintScope('department')}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: printScope === 'department' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: printScope === 'department' ? '#eef2ff' : '#ffffff',
                          color: printScope === 'department' ? '#4338ca' : '#475569',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>🏢 Theo tổ CM</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Tổ 1, 2, 3; Tổ 4, 5; GV bộ môn
                        </div>
                      </button>

                      {/* Custom Selected */}
                      <button
                        onClick={() => setPrintScope('custom')}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: printScope === 'custom' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: printScope === 'custom' ? '#eef2ff' : '#ffffff',
                          color: printScope === 'custom' ? '#4338ca' : '#475569',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>✍️ Tùy chọn</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Tự chọn từng GV ({selectedTeacherIds.length} người)
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Sub-selectors depending on scope */}
                  {printScope === 'current' && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                        Đang chọn giáo viên:
                      </label>
                      <select
                        value={selectedTeacherIds[0] || ''}
                        onChange={(e) => setSelectedTeacherIds([e.target.value])}
                        style={{
                          width: '100%',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          background: '#ffffff'
                        }}
                      >
                        {teachers.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} ({t.code || t.id}) - {getTeacherDepartment(t)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {printScope === 'department' && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '0.78rem', fontWeight: 800, color: '#334155', display: 'block', marginBottom: '8px' }}>
                        Chọn tổ chuyên môn cần in:
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(() => {
                          const base = Array.isArray(departments) && departments.length > 0
                            ? departments.map(d => d.name)
                            : ['Tổ 1, 2, 3', 'Tổ 4, 5', 'Giáo viên bộ môn', 'Tổ Văn Phòng'];
                          const fromT = (teachers || []).map(t => getTeacherDepartment(t)).filter(Boolean);
                          const allDepts = Array.from(new Set([...base, ...fromT])).sort((a, b) => {
                            if (a.toLowerCase().includes('văn phòng')) return 1;
                            if (b.toLowerCase().includes('văn phòng')) return -1;
                            return a.localeCompare(b, 'vi', { numeric: true });
                          });

                          return [
                            { id: 'ALL', label: 'Tất cả các tổ', icon: '👨‍🏫', desc: `Toàn bộ ${teachers.length} giáo viên / nhân sự trong trường` },
                            ...allDepts.map(dept => {
                              const isOffice = dept.toLowerCase().includes('văn phòng');
                              const count = teachers.filter(t => getTeacherDepartment(t) === dept).length;
                              return {
                                id: dept,
                                label: dept,
                                icon: isOffice ? '🏢' : (dept.includes('bộ môn') ? '🎨' : '🏫'),
                                desc: isOffice ? `Cán bộ, nhân viên văn phòng (${count} người)` : `Danh sách (${count} GV)`
                              };
                            })
                          ].map(group => {
                          const isSel = selectedDepartment === group.id;
                          return (
                            <button
                              key={group.id}
                              onClick={() => setSelectedDepartment(group.id)}
                              style={{
                                padding: '10px 14px',
                                borderRadius: '10px',
                                border: isSel ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                                background: isSel ? '#eef2ff' : '#ffffff',
                                color: isSel ? '#4338ca' : '#334155',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                cursor: 'pointer',
                                textAlign: 'left',
                                transition: 'all 0.15s ease'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '1.25rem' }}>{group.icon}</span>
                                <div>
                                  <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>{group.label}</div>
                                  <div style={{ fontSize: '0.72rem', color: isSel ? '#6366f1' : '#64748b' }}>{group.desc}</div>
                                </div>
                              </div>
                              {isSel && (
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 800,
                                  background: '#4f46e5',
                                  color: '#ffffff',
                                  padding: '2px 10px',
                                  borderRadius: '20px'
                                }}>
                                  Đang chọn
                                </span>
                              )}
                            </button>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                  {printScope === 'custom' && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                          Chọn danh sách giáo viên ({selectedTeacherIds.length}/{teachers.length}):
                        </span>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button
                            onClick={handleSelectAllCustom}
                            style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#e2e8f0', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Tất cả
                          </button>
                          <button
                            onClick={handleDeselectAllCustom}
                            style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#e2e8f0', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                          >
                            Bỏ chọn
                          </button>
                        </div>
                      </div>

                      {/* Search */}
                      <div style={{ position: 'relative', marginBottom: '8px' }}>
                        <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
                        <input
                          type="text"
                          placeholder="Tìm theo tên hoặc mã GV..."
                          value={teacherSearch}
                          onChange={e => setTeacherSearch(e.target.value)}
                          style={{
                            width: '100%',
                            padding: '6px 10px 6px 30px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            fontSize: '0.78rem',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      {/* Teacher Checkbox List */}
                      <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {teachers
                          .filter(t => 
                            t.name.toLowerCase().includes(teacherSearch.toLowerCase()) || 
                            (t.code && t.code.toLowerCase().includes(teacherSearch.toLowerCase())) ||
                            t.id.toLowerCase().includes(teacherSearch.toLowerCase())
                          )
                          .map(t => {
                            const isChecked = selectedTeacherIds.includes(t.id);
                            const stat = teacherStats[t.id] || { scheduled: 0 };
                            return (
                              <label
                                key={t.id}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px',
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  background: isChecked ? '#ffffff' : 'transparent',
                                  border: isChecked ? '1px solid #cbd5e1' : '1px solid transparent',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  fontWeight: isChecked ? 700 : 500
                                }}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleTeacher(t.id)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span>{t.name}</span>
                                <span style={{ color: '#64748b', fontSize: '0.72rem' }}>
                                  ({t.code || t.id})
                                </span>
                                <span style={{ color: '#059669', fontSize: '0.72rem', marginLeft: 'auto', fontWeight: 700 }}>
                                  {stat.scheduled} tiết
                                </span>
                              </label>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {/* Summary Box */}
                  <div style={{
                    padding: '12px',
                    borderRadius: '10px',
                    background: '#eff6ff',
                    border: '1px solid #bfdbfe',
                    color: '#1e40af',
                    fontSize: '0.78rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px'
                  }}>
                    <div style={{ fontWeight: 800, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Info size={15} />
                      <span>Thông tin trang in:</span>
                    </div>
                    <div>• Tổng số trang in dự kiến: <strong>{targetTeachers.length} trang A4</strong></div>
                    <div>• Tự động tách trang (Page-Break) chuẩn xác 1 giáo viên / 1 trang A4 đứng.</div>
                  </div>
                </div>
              )}

              {/* TAB 2: METADATA & SIGNATURES */}
              {activeTab === 'meta' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Đơn vị cấp trên / Phường:
                    </label>
                    <input
                      type="text"
                      value={printMeta.district}
                      onChange={e => setPrintMeta({ ...printMeta, district: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Tên trường:
                    </label>
                    <input
                      type="text"
                      value={printMeta.schoolName}
                      onChange={e => setPrintMeta({ ...printMeta, schoolName: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Năm học:
                      </label>
                      <input
                        type="text"
                        value={printMeta.year}
                        onChange={e => setPrintMeta({ ...printMeta, year: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Ngày áp dụng:
                      </label>
                      <input
                        type="text"
                        value={printMeta.effectiveDate}
                        onChange={e => setPrintMeta({ ...printMeta, effectiveDate: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Địa danh & Ngày ký (chân trang):
                    </label>
                    <input
                      type="text"
                      value={printMeta.signLocationDate}
                      onChange={e => setPrintMeta({ ...printMeta, signLocationDate: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Người lập biểu:
                      </label>
                      <input
                        type="text"
                        value={printMeta.scheduler}
                        onChange={e => setPrintMeta({ ...printMeta, scheduler: e.target.value })}
                        placeholder="Để trống hoặc nhập họ tên"
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                        Hiệu trưởng:
                      </label>
                      <input
                        type="text"
                        value={printMeta.principal}
                        onChange={e => setPrintMeta({ ...printMeta, principal: e.target.value })}
                        style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>
                      Giờ nghỉ trưa bán trú:
                    </label>
                    <input
                      type="text"
                      value={printMeta.lunchBreak}
                      onChange={e => setPrintMeta({ ...printMeta, lunchBreak: e.target.value })}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', boxSizing: 'border-box' }}
                    />
                  </div>
                </div>
              )}

              {/* TAB 3: DISPLAY OPTIONS */}
              {activeTab === 'options' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Signature Type */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Kiểu chữ ký chân trang:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="signatureType"
                          value="teacher_principal"
                          checked={displayOptions.signatureType === 'teacher_principal'}
                          onChange={() => setDisplayOptions({ ...displayOptions, signatureType: 'teacher_principal' })}
                        />
                        <span>Giáo viên & Hiệu trưởng (chuẩn thời khóa biểu cá nhân)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="signatureType"
                          value="scheduler_principal"
                          checked={displayOptions.signatureType === 'scheduler_principal'}
                          onChange={() => setDisplayOptions({ ...displayOptions, signatureType: 'scheduler_principal' })}
                        />
                        <span>Người lập biểu & Hiệu trưởng (chuẩn quản lý)</span>
                      </label>
                    </div>
                  </div>

                  {/* Other toggles */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, color: '#0f172a' }}>
                      <input
                        type="checkbox"
                        checked={displayOptions.showHeader}
                        onChange={e => setDisplayOptions({ ...displayOptions, showHeader: e.target.checked })}
                      />
                      <span>Hiển thị tiêu đề Quốc hiệu & UBND / Tên trường</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, color: '#0f172a' }}>
                      <input
                        type="checkbox"
                        checked={displayOptions.showSignatures}
                        onChange={e => setDisplayOptions({ ...displayOptions, showSignatures: e.target.checked })}
                      />
                      <span>Hiển thị phần Chữ ký duyệt</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={displayOptions.showPosition}
                        onChange={e => setDisplayOptions({ ...displayOptions, showPosition: e.target.checked })}
                      />
                      <span>Hiển thị chức vụ giáo viên (Chức vụ / Vị trí)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={displayOptions.showTeacherMeta}
                        onChange={e => setDisplayOptions({ ...displayOptions, showTeacherMeta: e.target.checked })}
                      />
                      <span>Hiển thị danh sách các lớp giảng dạy của GV</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={displayOptions.showRoom}
                        onChange={e => setDisplayOptions({ ...displayOptions, showRoom: e.target.checked })}
                      />
                      <span>Hiển thị phòng học / phòng chức năng</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={displayOptions.showPeriodTime}
                        onChange={e => setDisplayOptions({ ...displayOptions, showPeriodTime: e.target.checked })}
                      />
                      <span>Hiển thị cột khung giờ từng tiết</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={displayOptions.showLunchBreak}
                        onChange={e => setDisplayOptions({ ...displayOptions, showLunchBreak: e.target.checked })}
                      />
                      <span>Hiển thị dòng Nghỉ trưa & Ăn bán trú</span>
                    </label>
                  </div>

                  {/* Font Scale */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Cỡ chữ bảng in:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      {['compact', 'normal', 'large'].map(scale => {
                        const labels = { compact: 'Nhỏ gọn', normal: 'Chuẩn A4', large: 'Lớn rõ' };
                        const isSel = displayOptions.fontScale === scale;
                        return (
                          <button
                            key={scale}
                            onClick={() => setDisplayOptions({ ...displayOptions, fontScale: scale })}
                            style={{
                              padding: '6px 8px',
                              borderRadius: '6px',
                              border: isSel ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                              background: isSel ? '#eef2ff' : '#ffffff',
                              color: isSel ? '#4338ca' : '#475569',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            {labels[scale]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Panel Actions */}
            <div style={{ padding: '14px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <button
                onClick={handlePrint}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
                }}
              >
                <Printer size={18} />
                <span>In Bản In Này ({targetTeachers.length} GV)</span>
              </button>
            </div>
          </div>

          {/* ─────── RIGHT LIVE PREVIEW PANEL ─────── */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#64748b',
            overflow: 'hidden'
          }}>
            {/* Preview Toolbar */}
            <div style={{
              padding: '8px 20px',
              background: '#334155',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}>
              {/* Page Navigator */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#cbd5e1' }}>Xem trước trang:</span>
                <button
                  onClick={() => setPreviewIndex(prev => Math.max(0, prev - 1))}
                  disabled={previewIndex === 0}
                  style={{
                    background: '#1e293b',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    color: previewIndex === 0 ? '#64748b' : '#ffffff',
                    cursor: previewIndex === 0 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ChevronLeft size={16} />
                </button>

                <select
                  value={previewIndex}
                  onChange={e => setPreviewIndex(parseInt(e.target.value, 10))}
                  style={{
                    background: '#1e293b',
                    border: '1px solid #475569',
                    color: '#ffffff',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  {targetTeachers.map((t, idx) => (
                    <option key={t.id} value={idx}>
                      Trang {idx + 1}/{targetTeachers.length}: {t.name} ({t.code || t.id})
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setPreviewIndex(prev => Math.min(targetTeachers.length - 1, prev + 1))}
                  disabled={previewIndex >= targetTeachers.length - 1}
                  style={{
                    background: '#1e293b',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    color: previewIndex >= targetTeachers.length - 1 ? '#64748b' : '#ffffff',
                    cursor: previewIndex >= targetTeachers.length - 1 ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <ChevronRight size={16} />
                </button>
              </div>

              {/* Zoom Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  onClick={() => setPreviewZoom(prev => Math.max(75, prev - 10))}
                  style={{ background: '#1e293b', border: 'none', borderRadius: '6px', padding: '4px 8px', color: '#fff', cursor: 'pointer' }}
                  title="Thu nhỏ"
                >
                  <ZoomOut size={15} />
                </button>
                <span style={{ fontSize: '0.78rem', minWidth: '40px', textAlign: 'center', fontWeight: 600 }}>{previewZoom}%</span>
                <button
                  onClick={() => setPreviewZoom(prev => Math.min(130, prev + 10))}
                  style={{ background: '#1e293b', border: 'none', borderRadius: '6px', padding: '4px 8px', color: '#fff', cursor: 'pointer' }}
                  title="Phóng to"
                >
                  <ZoomIn size={15} />
                </button>
                <button
                  onClick={() => setPreviewZoom(100)}
                  style={{ background: '#1e293b', border: 'none', borderRadius: '6px', padding: '4px 8px', color: '#cbd5e1', fontSize: '0.75rem', cursor: 'pointer' }}
                >
                  100%
                </button>
              </div>
            </div>

            {/* A4 Paper Canvas Container */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '28px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}>
              <div
                ref={previewSheetRef}
                style={{
                  width: '210mm',
                  minHeight: '297mm',
                  background: '#ffffff',
                  boxShadow: '0 15px 35px rgba(0, 0, 0, 0.45)',
                  borderRadius: '2px',
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease',
                  boxSizing: 'border-box'
                }}
              >
                {renderTeacherSheet(currentPreviewTeacher, true)}
              </div>
            </div>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 999999,
            background: '#059669',
            color: '#ffffff',
            padding: '12px 20px',
            borderRadius: '12px',
            fontWeight: 700,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.25)',
            animation: 'slideInRight 0.2s ease-out'
          }}>
            <CheckCircle2 size={18} />
            <span>{toastMessage}</span>
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* HIDDEN PRINT DOM (ACTIVE DURING BROWSER WINDOW.PRINT)         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="printable-batch-container">
        {targetTeachers.map((t) => (
          <React.Fragment key={t.id}>
            {renderTeacherSheet(t, false)}
          </React.Fragment>
        ))}
      </div>
    </div>,
    document.body
  );
};
export default TeacherTimetablePrintModal;
