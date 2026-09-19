// src/components/MasterTimetablePrintModal.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toPng, toBlob } from 'html-to-image';
import {
  Printer,
  FileSpreadsheet,
  X,
  Sliders,
  Layers,
  School,
  Search,
  ZoomIn,
  ZoomOut,
  Image as ImageIcon,
  Copy,
  CheckCircle2,
  Grid3X3
} from 'lucide-react';
import { DAYS_OF_WEEK, PERIODS as DEFAULT_PERIODS } from '../constants/defaultCurriculum';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import { exportMasterTimetable } from '../services/excelService';
import { triggerAppPrint } from '../services/printService';

export const MasterTimetablePrintModal = ({
  isOpen,
  onClose,
  classes = [],
  teachers = [],
  timetable = {},
  subjects = DEFAULT_SUBJECTS,
  periods = DEFAULT_PERIODS,
  schoolInfo = {}
}) => {
  // 1. Layout Mode: 'excel' (Hàng là Thứ/Tiết, Cột là Lớp) | 'matrix' (Hàng là Lớp, Cột là Thứ/Tiết)
  const [matrixLayout, setMatrixLayout] = useState('excel');

  // 2. Zoom & Orientation & Paper Size
  const [previewZoom, setPreviewZoom] = useState(85);
  const [paperOrientation, setPaperOrientation] = useState('landscape'); // 'landscape' | 'portrait'
  const [paperSize, setPaperSize] = useState('a4'); // 'a4' | 'a3'

  // 3. Print Scope Filtering
  const [scopeGrade, setScopeGrade] = useState('ALL'); // 'ALL' | '1' | '2' | '3' | '4' | '5' | 'custom'
  const [scopeDay, setScopeDay] = useState('ALL'); // 'ALL' | '2' | '3' | '4' | '5' | '6'
  const [scopeSession, setScopeSession] = useState('ALL'); // 'ALL' | 'morning' | 'afternoon'
  const [selectedClassIds, setSelectedClassIds] = useState(classes.map(c => c.id));
  const [classSearch, setClassSearch] = useState('');

  // 4. Print Meta
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

  // 5. Display options
  const [displayOptions, setDisplayOptions] = useState({
    showHeader: true,
    showSignatures: true,
    showBellSchedule: true,
    showLunchRow: true,
    teacherDisplay: 'code', // 'code' | 'name' | 'none'
    fontScale: 'normal' // 'compact' | 'normal' | 'large'
  });

  const [activeTab, setActiveTab] = useState('scope'); // 'scope' | 'meta' | 'options'
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [isExportingImage, setIsExportingImage] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const previewSheetRef = useRef(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  const teacherMap = useMemo(() => new Map((teachers || []).map(t => [t.id, t])), [teachers]);

  // Extract available grades
  const availableGrades = useMemo(() => {
    const gradeSet = new Set();
    classes.forEach(c => {
      if (c.grade) gradeSet.add(c.grade);
      else {
        const match = c.name?.match(/(\d+)/);
        if (match) gradeSet.add(parseInt(match[1], 10));
      }
    });
    return Array.from(gradeSet).sort((a, b) => a - b);
  }, [classes]);

  // Target Classes
  const targetClasses = useMemo(() => {
    if (scopeGrade === 'ALL') return classes;
    if (scopeGrade === 'custom') return classes.filter(c => selectedClassIds.includes(c.id));
    return classes.filter(c => {
      const g = c.grade || (c.name?.match(/(\d+)/) ? parseInt(c.name.match(/(\d+)/)[1], 10) : null);
      return g === Number(scopeGrade);
    });
  }, [scopeGrade, selectedClassIds, classes]);

  // Target Days
  const targetDays = useMemo(() => {
    if (scopeDay === 'ALL') return DAYS_OF_WEEK;
    return DAYS_OF_WEEK.filter(d => d.id === Number(scopeDay));
  }, [scopeDay]);

  // Target Periods
  const targetPeriods = useMemo(() => {
    if (scopeSession === 'morning') return periods.filter(p => p.session === 'morning');
    if (scopeSession === 'afternoon') return periods.filter(p => p.session === 'afternoon');
    return periods;
  }, [scopeSession, periods]);

  // Quick class toggles
  const handleToggleClass = (classId) => {
    setSelectedClassIds(prev => {
      if (prev.includes(classId)) {
        if (prev.length === 1) return prev;
        return prev.filter(id => id !== classId);
      } else {
        return [...prev, classId];
      }
    });
  };

  const handleSelectAllCustom = () => {
    setSelectedClassIds(classes.map(c => c.id));
  };

  const handleDeselectAllCustom = () => {
    if (classes[0]) setSelectedClassIds([classes[0].id]);
  };

  // Xuất file ảnh PNG độ nét cao (2.5x) để gửi qua Zalo
  const handleExportZaloImage = async () => {
    if (!previewSheetRef.current) return;
    try {
      setIsExportingImage(true);
      const dataUrl = await toPng(previewSheetRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      link.download = `MaTran_TKB_ToanTruong_Zalo.png`;
      link.href = dataUrl;
      link.click();
      showToast(`Đã tải ảnh ma trận thời khóa biểu toàn trường cho Zalo!`);
    } catch (err) {
      console.error('Lỗi xuất ảnh ma trận:', err);
      alert('Không thể tạo file ảnh. Vui lòng thử lại!');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Sao chép ảnh trực tiếp vào Clipboard (nhấn Ctrl+V dán ngay vào Zalo chat)
  const handleCopyZaloImage = async () => {
    if (!previewSheetRef.current) return;
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
        showToast(`Đã sao chép ảnh Ma trận TKB! Nhấn Ctrl+V để dán vào Zalo.`);
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

  const handleExportExcel = async () => {
    try {
      setIsExportingExcel(true);
      await exportMasterTimetable(timetable, targetClasses, teachers, subjects, schoolInfo);
      showToast(`Đã xuất file Excel Ma trận TKB thành công!`);
    } catch (err) {
      console.error('Lỗi xuất Excel:', err);
      alert('Đã xảy ra lỗi khi xuất Excel ma trận.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handlePrint = async () => {
    const isLandscape = paperOrientation === 'landscape';
    const pageSize = paperSize === 'a3' 
      ? (isLandscape ? 'A3 landscape' : 'A3 portrait')
      : (isLandscape ? 'A4 landscape' : 'A4 portrait');
    
    document.body.classList.add('printing-modal-active');
    try {
      await triggerAppPrint({ landscape: isLandscape, size: pageSize });
    } finally {
      setTimeout(() => {
        document.body.classList.remove('printing-modal-active');
      }, 1200);
    }
  };

  // Get font sizes according to scale
  const getFontSizes = () => {
    if (displayOptions.fontScale === 'compact') {
      return { 
        table: '6pt', 
        subject: '6.2pt', 
        teacher: '5.2pt', 
        cellHeight: '17px', 
        padding: '1px 1px', 
        headerPadding: '2.5px 1px' 
      };
    }
    if (displayOptions.fontScale === 'large') {
      return { 
        table: '8pt', 
        subject: '8.5pt', 
        teacher: '7pt', 
        cellHeight: '26px', 
        padding: '2.5px 2px', 
        headerPadding: '5px 2px' 
      };
    }
    // Normal: perfectly calibrated to fit full schedule cleanly
    return { 
      table: '6.8pt', 
      subject: '7.2pt', 
      teacher: '5.8pt', 
      cellHeight: '20px', 
      padding: '1.5px 2px', 
      headerPadding: '3.5px 2px' 
    };
  };
  const fSizes = getFontSizes();

  // Paper Dimensions Style
  const getPaperDimensions = () => {
    if (paperSize === 'a3') {
      return paperOrientation === 'landscape' 
        ? { width: '420mm', minHeight: '297mm' } 
        : { width: '297mm', minHeight: '420mm' };
    }
    // A4 Default
    return paperOrientation === 'landscape' 
      ? { width: '297mm', minHeight: '210mm' } 
      : { width: '210mm', minHeight: '297mm' };
  };
  const paperDims = getPaperDimensions();

  // ─────────────────────────────────────────────────────────────
  // RENDER DẠNG 1: CHUẨN XUẤT FILE EXCEL (HÀNG: THỨ/TIẾT • CỘT: LỚP)
  // ─────────────────────────────────────────────────────────────
  const renderExcelStyleTable = () => {
    return (
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
            <th style={{ border: '1px solid #000', width: '52px', fontWeight: 800, padding: '5px 2px' }}>
              Thứ
            </th>
            <th style={{ border: '1px solid #000', width: '48px', fontWeight: 800, padding: '5px 2px' }}>
              Buổi
            </th>
            <th style={{ border: '1px solid #000', width: '38px', fontWeight: 800, padding: '5px 2px' }}>
              Tiết
            </th>
            {targetClasses.map(cls => (
              <th
                key={cls.id}
                style={{
                  border: '1px solid #000',
                  fontWeight: 800,
                  padding: '5px 2px',
                  fontSize: '8.5pt',
                  background: '#f1f5f9'
                }}
              >
                {cls.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {targetDays.map(day => {
            const morningPeriods = targetPeriods.filter(p => p.session === 'morning');
            const afternoonPeriods = targetPeriods.filter(p => p.session === 'afternoon');
            const dayPeriodCount = targetPeriods.length + (displayOptions.showLunchRow && morningPeriods.length > 0 && afternoonPeriods.length > 0 ? 1 : 0);

            let hasRenderedDayCell = false;

            return (
              <React.Fragment key={day.id}>
                {/* 1. SÁNG */}
                {morningPeriods.map((p, pIdx) => {
                  const isFirstOfMorning = pIdx === 0;
                  return (
                    <tr key={`${day.id}_${p.id}`} style={{ background: pIdx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      {/* Day Column (Rowspan cả ngày) */}
                      {!hasRenderedDayCell && (
                        (() => {
                          hasRenderedDayCell = true;
                          return (
                            <td
                              rowSpan={dayPeriodCount}
                              style={{
                                border: '1px solid #000',
                                fontWeight: 800,
                                verticalAlign: 'middle',
                                textAlign: 'center',
                                background: '#f8fafc',
                                fontSize: '9pt'
                              }}
                            >
                              {day.name}
                            </td>
                          );
                        })()
                      )}

                      {/* Session Column (Rowspan buổi sáng) */}
                      {isFirstOfMorning && (
                        <td
                          rowSpan={morningPeriods.length}
                          style={{
                            border: '1px solid #000',
                            fontWeight: 800,
                            verticalAlign: 'middle',
                            textAlign: 'center',
                            fontSize: '8.5pt',
                            background: '#fafafa',
                            letterSpacing: '0.5px'
                          }}
                        >
                          SÁNG
                        </td>
                      )}

                      {/* Period Number Column */}
                      <td style={{
                        border: '1px solid #000',
                        fontWeight: 800,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        fontSize: '9pt'
                      }}>
                        {p.id}
                      </td>

                      {/* Class Slots */}
                      {targetClasses.map(cls => {
                        const slot = timetable[cls.id]?.[day.id]?.[p.id];
                        const sub = slot ? ((subjects && subjects[slot.subjectId]) || DEFAULT_SUBJECTS[slot.subjectId] || { shortName: slot.subjectRaw || slot.subjectId, name: slot.subjectId }) : null;
                        const teacher = slot ? teacherMap.get(slot.teacherId) : null;

                        return (
                          <td
                            key={cls.id}
                            style={{
                              border: '1px solid #000',
                              padding: '2px 2px',
                              height: fSizes.cellHeight,
                              verticalAlign: 'middle',
                              textAlign: 'center',
                              lineHeight: 1.15
                            }}
                          >
                            {slot ? (
                              <div>
                                <div style={{ fontWeight: 800, fontSize: fSizes.subject, color: '#000' }}>
                                  {sub?.shortName || sub?.name || slot.subjectId}
                                </div>
                                {displayOptions.teacherDisplay !== 'none' && (
                                  <div style={{ fontSize: fSizes.teacher, color: '#333', marginTop: '1px' }}>
                                    {displayOptions.teacherDisplay === 'name' 
                                      ? (teacher?.name || slot.teacherId)
                                      : (teacher?.code || teacher?.name?.split(' ').pop() || slot.teacherId)}
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
                  );
                })}

                {/* Lunch Break Divider (If enabled) */}
                {displayOptions.showLunchRow && morningPeriods.length > 0 && afternoonPeriods.length > 0 && (
                  <tr style={{ background: '#f1f5f9' }}>
                    <td colSpan={2 + targetClasses.length} style={{
                      border: '1px solid #000',
                      padding: '2px 4px',
                      fontSize: '7.5pt',
                      fontWeight: 800,
                      fontStyle: 'italic',
                      color: '#475569',
                      textAlign: 'center'
                    }}>
                      🍱 Nghỉ trưa & Ăn bán trú ({printMeta.lunchBreak})
                    </td>
                  </tr>
                )}

                {/* 2. CHIỀU */}
                {afternoonPeriods.map((p, pIdx) => {
                  const isFirstOfAfternoon = pIdx === 0;
                  const isWedOff = day.id === 4 && p.id > 4;

                  return (
                    <tr key={`${day.id}_${p.id}`} style={{ background: pIdx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                      {/* Session Column (Rowspan buổi chiều) */}
                      {isFirstOfAfternoon && (
                        <td
                          rowSpan={afternoonPeriods.length}
                          style={{
                            border: '1px solid #000',
                            fontWeight: 800,
                            verticalAlign: 'middle',
                            textAlign: 'center',
                            fontSize: '8.5pt',
                            background: '#fafafa',
                            letterSpacing: '0.5px'
                          }}
                        >
                          CHIỀU
                        </td>
                      )}

                      {/* Period Number Column */}
                      <td style={{
                        border: '1px solid #000',
                        fontWeight: 800,
                        verticalAlign: 'middle',
                        textAlign: 'center',
                        fontSize: '9pt'
                      }}>
                        {p.id <= 4 ? p.id : (p.id - 4)}
                      </td>

                      {/* Class Slots */}
                      {targetClasses.map(cls => {
                        if (isWedOff) {
                          return (
                            <td
                              key={cls.id}
                              style={{
                                border: '1px solid #000',
                                background: '#f8fafc',
                                color: '#94a3b8',
                                fontSize: '6.5pt',
                                height: fSizes.cellHeight,
                                verticalAlign: 'middle'
                              }}
                            >
                              -
                            </td>
                          );
                        }

                        const slot = timetable[cls.id]?.[day.id]?.[p.id];
                        const sub = slot ? ((subjects && subjects[slot.subjectId]) || DEFAULT_SUBJECTS[slot.subjectId] || { shortName: slot.subjectRaw || slot.subjectId, name: slot.subjectId }) : null;
                        const teacher = slot ? teacherMap.get(slot.teacherId) : null;

                        return (
                          <td
                            key={cls.id}
                            style={{
                              border: '1px solid #000',
                              padding: '2px 2px',
                              height: fSizes.cellHeight,
                              verticalAlign: 'middle',
                              textAlign: 'center',
                              lineHeight: 1.15
                            }}
                          >
                            {slot ? (
                              <div>
                                <div style={{ fontWeight: 800, fontSize: fSizes.subject, color: '#000' }}>
                                  {sub?.shortName || sub?.name || slot.subjectId}
                                </div>
                                {displayOptions.teacherDisplay !== 'none' && (
                                  <div style={{ fontSize: fSizes.teacher, color: '#333', marginTop: '1px' }}>
                                    {displayOptions.teacherDisplay === 'name' 
                                      ? (teacher?.name || slot.teacherId)
                                      : (teacher?.code || teacher?.name?.split(' ').pop() || slot.teacherId)}
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
                  );
                })}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER DẠNG 2: MA TRẬN THEO LỚP (HÀNG: LỚP • CỘT: THỨ/TIẾT)
  // ─────────────────────────────────────────────────────────────
  const renderMatrixStyleTable = () => {
    return (
      <table style={{
        width: '100%',
        tableLayout: 'fixed',
        borderCollapse: 'collapse',
        border: '1.5px solid #000',
        textAlign: 'center',
        fontSize: fSizes.table
      }}>
        <thead>
          {/* Row 1: Days */}
          <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #000' }}>
            <th rowSpan={3} style={{ border: '1px solid #000', width: '52px', fontWeight: 800, padding: '3px 2px' }}>
              Lớp
            </th>
            {targetDays.map(d => {
              const pCount = targetPeriods.length;
              return (
                <th
                  key={d.id}
                  colSpan={pCount}
                  style={{
                    border: '1px solid #000',
                    padding: '4px 2px',
                    fontWeight: 800,
                    fontSize: '8.5pt',
                    background: d.id % 2 === 0 ? '#f8fafc' : '#f1f5f9'
                  }}
                >
                  {d.name.toUpperCase()}
                </th>
              );
            })}
          </tr>

          {/* Row 2: Sessions */}
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #000' }}>
            {targetDays.map(d => {
              const morningCount = targetPeriods.filter(p => p.session === 'morning').length;
              const afternoonCount = targetPeriods.filter(p => p.session === 'afternoon').length;
              return (
                <React.Fragment key={d.id}>
                  {morningCount > 0 && (
                    <th colSpan={morningCount} style={{ border: '1px solid #000', padding: '2px', fontWeight: 700, fontSize: '7.5pt' }}>
                      SÁNG
                    </th>
                  )}
                  {afternoonCount > 0 && (
                    <th colSpan={afternoonCount} style={{ border: '1px solid #000', padding: '2px', fontWeight: 700, fontSize: '7.5pt' }}>
                      CHIỀU
                    </th>
                  )}
                </React.Fragment>
              );
            })}
          </tr>

          {/* Row 3: Periods Numbers */}
          <tr style={{ background: '#ffffff', borderBottom: '1.5px solid #000' }}>
            {targetDays.map(d => (
              <React.Fragment key={d.id}>
                {targetPeriods.map(p => (
                  <th
                    key={p.id}
                    style={{
                      border: '1px solid #000',
                      padding: '2px 1px',
                      fontWeight: 800,
                      fontSize: '7.5pt'
                    }}
                  >
                    {p.id <= 4 ? p.id : (p.id - 4)}
                  </th>
                ))}
              </React.Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {targetClasses.map((cls, idx) => (
            <tr key={cls.id} style={{ background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
              <td style={{
                border: '1px solid #000',
                fontWeight: 800,
                padding: '2px 2px',
                fontSize: '8pt',
                whiteSpace: 'nowrap'
              }}>
                {cls.name}
              </td>

              {targetDays.map(day => (
                <React.Fragment key={day.id}>
                  {targetPeriods.map(p => {
                    const slot = timetable[cls.id]?.[day.id]?.[p.id];
                    const sub = slot ? ((subjects && subjects[slot.subjectId]) || DEFAULT_SUBJECTS[slot.subjectId] || { shortName: slot.subjectRaw || slot.subjectId, name: slot.subjectId }) : null;
                    const teacher = slot ? teacherMap.get(slot.teacherId) : null;
                    const isWedOff = day.id === 4 && p.id > 4;

                    if (isWedOff) {
                      return (
                        <td
                          key={p.id}
                          style={{
                            border: '1px solid #000',
                            background: '#f1f5f9',
                            color: '#94a3b8',
                            fontSize: '6.5pt',
                            height: fSizes.cellHeight,
                            verticalAlign: 'middle'
                          }}
                        >
                          -
                        </td>
                      );
                    }

                    return (
                      <td
                        key={p.id}
                        style={{
                          border: '1px solid #000',
                          padding: '1px',
                          height: fSizes.cellHeight,
                          verticalAlign: 'middle',
                          lineHeight: 1.15
                        }}
                      >
                        {slot ? (
                          <div>
                            <div style={{ fontWeight: 800, fontSize: fSizes.subject, color: '#000' }}>
                              {sub?.shortName || sub?.name || slot.subjectId}
                            </div>
                            {displayOptions.teacherDisplay !== 'none' && (
                              <div style={{ fontSize: fSizes.teacher, color: '#333' }}>
                                {displayOptions.teacherDisplay === 'name' 
                                  ? (teacher?.name || slot.teacherId)
                                  : (teacher?.code || teacher?.name?.split(' ').pop() || slot.teacherId)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: '#cbd5e1' }}>-</span>
                        )}
                      </td>
                    );
                  })}
                </React.Fragment>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // Render Printable Matrix Sheet Container
  const renderMatrixSheet = (isPreview = false) => {
    return (
      <div
        className={isPreview ? 'preview-matrix-sheet' : 'printable-sheet'}
        style={{
          width: isPreview ? paperDims.width : '100%',
          minHeight: isPreview ? paperDims.minHeight : 'auto',
          background: '#ffffff',
          color: '#000000',
          fontFamily: '"Times New Roman", Times, serif',
          padding: isPreview ? '20px 24px' : '0',
          boxSizing: 'border-box',
          margin: '0 auto'
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
            marginBottom: '8px'
          }}>
            <div style={{ textAlign: 'center', width: '45%' }}>
              <div style={{ fontSize: '9pt', textTransform: 'uppercase', fontWeight: 700 }}>
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

        {/* 2. Main Title */}
        <div style={{ textAlign: 'center', margin: '6px 0 8px 0' }}>
          <h1 style={{
            fontSize: '14pt',
            fontWeight: 900,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            BẢNG TỔNG HỢP THỜI KHÓA BIỂU TOÀN TRƯỜNG
          </h1>
          <div style={{ fontSize: '8.5pt', fontStyle: 'italic', marginTop: '2px' }}>
            {printMeta.effectiveDate} • Quy mô: {targetClasses.length} lớp học • {printMeta.year}
            {scopeGrade !== 'ALL' && scopeGrade !== 'custom' && ` (Khối ${scopeGrade})`}
            {scopeDay !== 'ALL' && ` (Thứ ${scopeDay})`}
          </div>
        </div>

        {/* 3. Bell Schedule Sub-header */}
        {displayOptions.showBellSchedule && (
          <div style={{
            border: '1px solid #94a3b8',
            background: '#f8fafc',
            padding: '3px 8px',
            marginBottom: '6px',
            fontSize: '7pt',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div>
              <strong>⏰ KHUNG GIỜ SÁNG:</strong> T1: {periods?.find(p => p.id === 1)?.time || '07:15 - 07:55'} • T2: {periods?.find(p => p.id === 2)?.time || '07:55 - 08:35'} • T3: {periods?.find(p => p.id === 3)?.time || '09:00 - 09:40'} • T4: {periods?.find(p => p.id === 4)?.time || '09:40 - 10:20'}
            </div>
            <div>
              <strong>🍱 NGHỈ TRƯA:</strong> {printMeta.lunchBreak}
            </div>
            <div>
              <strong>⏰ KHUNG GIỜ CHIỀU:</strong> T1: {periods?.find(p => p.id === 5)?.time || '14:00 - 14:40'} • T2: {periods?.find(p => p.id === 6)?.time || '14:40 - 15:20'} • T3: {periods?.find(p => p.id === 7)?.time || '15:40 - 16:20'}
            </div>
          </div>
        )}

        {/* 4. Table Content (Excel or Matrix format) */}
        {matrixLayout === 'excel' ? renderExcelStyleTable() : renderMatrixStyleTable()}

        {/* 5. Footer Signatures */}
        {displayOptions.showSignatures && (
          <div className="signatures" style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '12px',
            fontSize: '8.5pt'
          }}>
            <div style={{ textAlign: 'center', width: '220px' }}>
              <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>NGƯỜI LẬP BIỂU</div>
              <div style={{ fontStyle: 'italic', fontSize: '7.5pt', marginTop: '2px' }}>(Ký và ghi rõ họ tên)</div>
              <div style={{ height: '36px' }} />
              <div style={{ fontWeight: 800 }}>{printMeta.scheduler || ''}</div>
            </div>
            <div style={{ textAlign: 'center', width: '240px' }}>
              <div style={{ fontStyle: 'italic', fontSize: '8pt' }}>
                {printMeta.signLocationDate}
              </div>
              <div style={{ fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>HIỆU TRƯỞNG</div>
              <div style={{ fontStyle: 'italic', fontSize: '7.5pt', marginTop: '2px' }}>(Ký và đóng dấu)</div>
              <div style={{ height: '36px' }} />
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
      className={`portal-print-modal ${paperOrientation === 'landscape' ? 'is-landscape' : 'is-portrait'}`}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 99999,
        padding: '16px'
      }}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* SCREEN-ONLY INTERACTIVE MODAL CONTAINER                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        className="no-print animate-fade-in"
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '1500px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden'
        }}
      >
        {/* Top Header Bar */}
        <div style={{
          padding: '14px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}>
              <Grid3X3 size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                In Ma Trận Thời Khóa Biểu Toàn Trường
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: '20px',
                  background: '#e0e7ff',
                  color: '#4338ca'
                }}>
                  {targetClasses.length} lớp • {matrixLayout === 'excel' ? 'Mẫu chuẩn Excel' : 'Ma trận lớp'}
                </span>
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Xem trước trang in ma trận toàn trường chuẩn quy cách giáo dục, hỗ trợ khổ ngang A4/A3, lọc theo khối/ngày và xuất ảnh Zalo.
              </p>
            </div>
          </div>

          {/* Header Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {/* Copy Zalo Image */}
            <button
              onClick={handleCopyZaloImage}
              disabled={isCopyingImage}
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
              title="Sao chép ảnh ma trận vào Clipboard. Mở Zalo và bấm Ctrl+V để gửi ngay cho trường!"
            >
              <Copy size={16} />
              <span>{isCopyingImage ? 'Đang copy...' : 'Copy Ảnh (Dán Zalo)'}</span>
            </button>

            {/* Download Zalo Image */}
            <button
              onClick={handleExportZaloImage}
              disabled={isExportingImage}
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
              title="Tải file ảnh PNG sắc nét (High-DPI) để gửi nhóm Zalo hoặc in khổ lớn"
            >
              <ImageIcon size={16} />
              <span>{isExportingImage ? 'Đang tạo...' : 'Tải Ảnh Zalo'}</span>
            </button>

            {/* Export Excel */}
            <button
              onClick={handleExportExcel}
              disabled={isExportingExcel}
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
              title="Xuất bảng ma trận ra file Excel"
            >
              <FileSpreadsheet size={16} />
              <span>{isExportingExcel ? 'Đang xuất...' : 'Xuất Excel'}</span>
            </button>

            {/* Print Button */}
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
              <span>In Ngay / PDF</span>
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
                <span>2. Tiêu đề</span>
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

            {/* Tab Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
              {/* TAB 1: SCOPE */}
              {activeTab === 'scope' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Khối Lớp */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Khối lớp cần in:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        onClick={() => setScopeGrade('ALL')}
                        style={{
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: scopeGrade === 'ALL' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: scopeGrade === 'ALL' ? '#eff6ff' : '#ffffff',
                          color: scopeGrade === 'ALL' ? '#1d4ed8' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        Toàn trường ({classes.length} lớp)
                      </button>
                      <button
                        onClick={() => setScopeGrade('custom')}
                        style={{
                          padding: '7px 10px',
                          borderRadius: '8px',
                          border: scopeGrade === 'custom' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: scopeGrade === 'custom' ? '#eff6ff' : '#ffffff',
                          color: scopeGrade === 'custom' ? '#1d4ed8' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          cursor: 'pointer'
                        }}
                      >
                        Chọn lớp tùy ý...
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '4px', marginTop: '6px' }}>
                      {availableGrades.map(g => (
                        <button
                          key={g}
                          onClick={() => setScopeGrade(String(g))}
                          style={{
                            padding: '6px 2px',
                            borderRadius: '6px',
                            border: scopeGrade === String(g) ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                            background: scopeGrade === String(g) ? '#eff6ff' : '#ffffff',
                            color: scopeGrade === String(g) ? '#1d4ed8' : '#334155',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            cursor: 'pointer'
                          }}
                        >
                          Khối {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Custom Class Selection List */}
                  {scopeGrade === 'custom' && (
                    <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                          Đã chọn: {selectedClassIds.length} / {classes.length} lớp
                        </span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={handleSelectAllCustom} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#e2e8f0', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Tất cả</button>
                          <button onClick={handleDeselectAllCustom} style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: '#e2e8f0', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Bỏ chọn</button>
                        </div>
                      </div>
                      <div style={{ position: 'relative', marginBottom: '6px' }}>
                        <Search size={13} color="#94a3b8" style={{ position: 'absolute', left: '8px', top: '8px' }} />
                        <input
                          type="text"
                          placeholder="Tìm lớp..."
                          value={classSearch}
                          onChange={e => setClassSearch(e.target.value)}
                          style={{ width: '100%', padding: '5px 8px 5px 26px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.75rem', boxSizing: 'border-box' }}
                        />
                      </div>
                      <div style={{ maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {classes.filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase())).map(c => (
                          <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer' }}>
                            <input type="checkbox" checked={selectedClassIds.includes(c.id)} onChange={() => handleToggleClass(c.id)} />
                            <span>{c.name} (Khối {c.grade})</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ngày trong tuần */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Ngày trong tuần:
                    </label>
                    <select
                      value={scopeDay}
                      onChange={e => setScopeDay(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.82rem' }}
                    >
                      <option value="ALL">Cả tuần (Thứ 2 đến Thứ 6)</option>
                      {DAYS_OF_WEEK.map(d => (
                        <option key={d.id} value={String(d.id)}>{d.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Buổi học */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Buổi học:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      {[
                        { id: 'ALL', label: 'Cả ngày (T1-T7)' },
                        { id: 'morning', label: 'Chỉ Sáng (T1-T4)' },
                        { id: 'afternoon', label: 'Chỉ Chiều (T5-T7)' }
                      ].map(s => (
                        <button
                          key={s.id}
                          onClick={() => setScopeSession(s.id)}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '6px',
                            border: scopeSession === s.id ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                            background: scopeSession === s.id ? '#eff6ff' : '#ffffff',
                            color: scopeSession === s.id ? '#1d4ed8' : '#475569',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            cursor: 'pointer'
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summary Box */}
                  <div style={{ padding: '10px 12px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1e40af', fontSize: '0.75rem' }}>
                    <div style={{ fontWeight: 800, marginBottom: '2px' }}>📊 Tóm tắt bảng in ma trận:</div>
                    <div>• Định dạng: <strong>{matrixLayout === 'excel' ? 'Chuẩn mẫu file Excel (Hàng: Thứ & Tiết)' : 'Ma trận ngang (Hàng: Lớp học)'}</strong></div>
                    <div>• Quy mô: <strong>{targetClasses.length} lớp học</strong></div>
                    <div>• Thời gian: <strong>{targetDays.length} ngày</strong> • <strong>{targetPeriods.length} tiết/ngày</strong></div>
                  </div>
                </div>
              )}

              {/* TAB 2: META */}
              {activeTab === 'meta' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Cơ quan / Phòng GD&ĐT:</label>
                    <input
                      type="text"
                      value={printMeta.district}
                      onChange={e => setPrintMeta({ ...printMeta, district: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Tên trường:</label>
                    <input
                      type="text"
                      value={printMeta.schoolName}
                      onChange={e => setPrintMeta({ ...printMeta, schoolName: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Năm học:</label>
                      <input
                        type="text"
                        value={printMeta.year}
                        onChange={e => setPrintMeta({ ...printMeta, year: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Ngày áp dụng:</label>
                      <input
                        type="text"
                        value={printMeta.effectiveDate}
                        onChange={e => setPrintMeta({ ...printMeta, effectiveDate: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Địa danh & Ngày ký chân trang:</label>
                    <input
                      type="text"
                      value={printMeta.signLocationDate}
                      onChange={e => setPrintMeta({ ...printMeta, signLocationDate: e.target.value })}
                      style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Người lập biểu:</label>
                      <input
                        type="text"
                        value={printMeta.scheduler}
                        onChange={e => setPrintMeta({ ...printMeta, scheduler: e.target.value })}
                        placeholder="Để trống hoặc nhập họ tên"
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '4px' }}>Hiệu trưởng:</label>
                      <input
                        type="text"
                        value={printMeta.principal}
                        onChange={e => setPrintMeta({ ...printMeta, principal: e.target.value })}
                        style={{ width: '100%', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.8rem', boxSizing: 'border-box' }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: OPTIONS */}
              {activeTab === 'options' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {/* Bố cục bảng (Layout switcher) */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Bố cục cấu trúc bảng:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        onClick={() => setMatrixLayout('excel')}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: matrixLayout === 'excel' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: matrixLayout === 'excel' ? '#eff6ff' : '#ffffff',
                          color: matrixLayout === 'excel' ? '#1d4ed8' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        <span style={{ fontWeight: 800 }}>🥇 Chuẩn file Excel</span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>(Hàng: Thứ/Tiết • Cột: Lớp)</span>
                      </button>

                      <button
                        onClick={() => setMatrixLayout('matrix')}
                        style={{
                          padding: '8px',
                          borderRadius: '8px',
                          border: matrixLayout === 'matrix' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: matrixLayout === 'matrix' ? '#eff6ff' : '#ffffff',
                          color: matrixLayout === 'matrix' ? '#1d4ed8' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px'
                        }}
                      >
                        <span style={{ fontWeight: 800 }}>🥈 Ma trận ngang</span>
                        <span style={{ fontSize: '0.68rem', color: '#64748b' }}>(Hàng: Lớp • Cột: Thứ/Tiết)</span>
                      </button>
                    </div>
                  </div>

                  {/* Orientation & Paper Size */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Hướng in & Khổ giấy:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px', marginBottom: '6px' }}>
                      <button
                        onClick={() => setPaperOrientation('landscape')}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: paperOrientation === 'landscape' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: paperOrientation === 'landscape' ? '#eff6ff' : '#fff',
                          color: paperOrientation === 'landscape' ? '#1d4ed8' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Khổ Ngang (Khuyên dùng)
                      </button>
                      <button
                        onClick={() => setPaperOrientation('portrait')}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: paperOrientation === 'portrait' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: paperOrientation === 'portrait' ? '#eff6ff' : '#fff',
                          color: paperOrientation === 'portrait' ? '#1d4ed8' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Khổ Dọc
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                      <button
                        onClick={() => setPaperSize('a4')}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: paperSize === 'a4' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: paperSize === 'a4' ? '#eff6ff' : '#fff',
                          color: paperSize === 'a4' ? '#1d4ed8' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Giấy A4
                      </button>
                      <button
                        onClick={() => setPaperSize('a3')}
                        style={{
                          padding: '6px',
                          borderRadius: '6px',
                          border: paperSize === 'a3' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: paperSize === 'a3' ? '#eff6ff' : '#fff',
                          color: paperSize === 'a3' ? '#1d4ed8' : '#334155',
                          fontWeight: 700,
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        Giấy A3 (Treo tường)
                      </button>
                    </div>
                  </div>

                  {/* Teacher display */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Hiển thị Giáo viên trong ô tiết:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="teacherDisplayMatrix"
                          value="code"
                          checked={displayOptions.teacherDisplay === 'code'}
                          onChange={() => setDisplayOptions({ ...displayOptions, teacherDisplay: 'code' })}
                        />
                        <span>Mã viết tắt / Tên gọn (VD: <em>Mai</em>, <em>GV01</em>)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="teacherDisplayMatrix"
                          value="name"
                          checked={displayOptions.teacherDisplay === 'name'}
                          onChange={() => setDisplayOptions({ ...displayOptions, teacherDisplay: 'name' })}
                        />
                        <span>Họ và tên đầy đủ</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="teacherDisplayMatrix"
                          value="none"
                          checked={displayOptions.teacherDisplay === 'none'}
                          onChange={() => setDisplayOptions({ ...displayOptions, teacherDisplay: 'none' })}
                        />
                        <span>Ẩn tên giáo viên (chỉ hiện môn học)</span>
                      </label>
                    </div>
                  </div>

                  {/* Header / Signature / Bell / Lunch Toggles */}
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
                      <span>Hiển thị phần Chữ ký duyệt (Người lập & Hiệu trưởng)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={displayOptions.showBellSchedule}
                        onChange={e => setDisplayOptions({ ...displayOptions, showBellSchedule: e.target.checked })}
                      />
                      <span>Hiển thị thanh Khung giờ học các tiết (Sáng/Chiều)</span>
                    </label>

                    {matrixLayout === 'excel' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={displayOptions.showLunchRow}
                          onChange={e => setDisplayOptions({ ...displayOptions, showLunchRow: e.target.checked })}
                        />
                        <span>Hiển thị dòng ngăn cách Nghỉ trưa & Ăn bán trú</span>
                      </label>
                    )}
                  </div>

                  {/* Font Scale */}
                  <div style={{ paddingTop: '8px', borderTop: '1px solid #e2e8f0' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Cỡ chữ ma trận in:
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                      {[
                        { id: 'compact', label: 'Siêu gọn (6.5pt)' },
                        { id: 'normal', label: 'Chuẩn (7.5pt)' },
                        { id: 'large', label: 'Lớn rõ (8.5pt)' }
                      ].map(scale => (
                        <button
                          key={scale.id}
                          onClick={() => setDisplayOptions({ ...displayOptions, fontScale: scale.id })}
                          style={{
                            padding: '6px 4px',
                            borderRadius: '6px',
                            border: displayOptions.fontScale === scale.id ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                            background: displayOptions.fontScale === scale.id ? '#eff6ff' : '#ffffff',
                            color: displayOptions.fontScale === scale.id ? '#4338ca' : '#475569',
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          {scale.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─────── RIGHT LIVE PREVIEW PANEL ─────── */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            background: '#475569',
            overflow: 'hidden'
          }}>
            {/* Preview Toolbar */}
            <div style={{
              padding: '8px 20px',
              background: '#1e293b',
              color: '#ffffff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.2)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#93c5fd' }}>
                  📐 Xem trước ({matrixLayout === 'excel' ? 'Chuẩn mẫu file Excel' : 'Ma trận ngang'} • {paperOrientation === 'landscape' ? 'Khổ ngang' : 'Khổ dọc'} • {paperSize.toUpperCase()})
                </span>
              </div>

              {/* Zoom Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  onClick={() => setPreviewZoom(prev => Math.max(50, prev - 10))}
                  style={{ background: '#334155', border: 'none', borderRadius: '6px', padding: '4px 8px', color: '#fff', cursor: 'pointer' }}
                  title="Thu nhỏ"
                >
                  <ZoomOut size={14} />
                </button>
                <span style={{ fontSize: '0.78rem', minWidth: '40px', textAlign: 'center', fontWeight: 700 }}>{previewZoom}%</span>
                <button
                  onClick={() => setPreviewZoom(prev => Math.min(130, prev + 10))}
                  style={{ background: '#334155', border: 'none', borderRadius: '6px', padding: '4px 8px', color: '#fff', cursor: 'pointer' }}
                  title="Phóng to"
                >
                  <ZoomIn size={14} />
                </button>
                <button
                  onClick={() => setPreviewZoom(85)}
                  style={{ background: '#334155', border: 'none', borderRadius: '6px', padding: '4px 8px', color: '#cbd5e1', fontSize: '0.72rem', cursor: 'pointer' }}
                >
                  85%
                </button>
              </div>
            </div>

            {/* Live Canvas Viewport */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '24px',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'flex-start'
            }}>
              <div
                ref={previewSheetRef}
                style={{
                  ...paperDims,
                  background: '#ffffff',
                  boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                  borderRadius: '2px',
                  transform: `scale(${previewZoom / 100})`,
                  transformOrigin: 'top center',
                  transition: 'transform 0.15s ease',
                  boxSizing: 'border-box'
                }}
              >
                {renderMatrixSheet(true)}
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
        {renderMatrixSheet(false)}
      </div>
    </div>,
    document.body
  );
};
