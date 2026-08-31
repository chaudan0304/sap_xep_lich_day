// src/components/ClassTimetablePrintModal.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { toPng, toBlob } from 'html-to-image';
import {
  Printer,
  Download,
  FileSpreadsheet,
  X,
  Check,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Settings,
  Eye,
  Layers,
  School,
  User,
  Calendar,
  Sparkles,
  Info,
  Search,
  CheckSquare,
  Square,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Image as ImageIcon,
  Copy,
  CheckCircle2
} from 'lucide-react';
import { DAYS_OF_WEEK, PERIODS as DEFAULT_PERIODS } from '../constants/defaultCurriculum';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import { exportClassTimetables } from '../services/excelService';
import { triggerAppPrint } from '../services/printService';

export const ClassTimetablePrintModal = ({
  isOpen,
  onClose,
  classes = [],
  teachers = [],
  timetable = {},
  subjects = DEFAULT_SUBJECTS,
  periods = DEFAULT_PERIODS,
  schoolInfo = {},
  initialClassId = null
}) => {
  if (!isOpen) return null;

  // 1. In Scope: 'current' | 'all' | 'grade' | 'custom'
  const [printScope, setPrintScope] = useState('current');
  const [selectedGrade, setSelectedGrade] = useState(1);
  const [selectedClassIds, setSelectedClassIds] = useState(() => {
    return initialClassId ? [initialClassId] : (classes[0] ? [classes[0].id] : []);
  });
  const [classSearch, setClassSearch] = useState('');

  // 2. Preview navigation state
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewZoom, setPreviewZoom] = useState(100); // 85 | 100 | 115

  // 3. Print Meta Config (editable for print)
  const [printMeta, setPrintMeta] = useState({
    district: schoolInfo.district || 'UBND PHƯỜNG TÂN MAI',
    schoolName: schoolInfo.name || 'TRƯỜNG TIỂU HỌC QUỲNH LỘC B',
    year: schoolInfo.year || 'Năm học 2026 - 2027',
    effectiveDate: 'Áp dụng từ ngày 05/09/2026',
    signLocationDate: 'Tân Mai, ngày 05 tháng 09 năm 2026',
    scheduler: schoolInfo.scheduler || 'Châu Đàn',
    principal: schoolInfo.principal || 'Bùi Văn Việt',
    lunchBreak: schoolInfo.lunchBreak || '10:30 - 14:00'
  });

  // 4. Display options
  const [displayOptions, setDisplayOptions] = useState({
    showHeader: true,
    showSignatures: true,
    teacherDisplay: 'code', // 'code' | 'name' | 'none'
    showRoom: true,
    showClassMeta: true,
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

  // Xuất file ảnh PNG độ nét cao (2.5x) để gửi qua Zalo
  const handleExportZaloImage = async () => {
    if (!previewSheetRef.current || !currentPreviewClass) return;
    try {
      setIsExportingImage(true);
      const dataUrl = await toPng(previewSheetRef.current, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff'
      });
      const link = document.createElement('a');
      const safeName = (currentPreviewClass.name || 'Lop').replace(/\s+/g, '_');
      link.download = `TKB_${safeName}_Zalo.png`;
      link.href = dataUrl;
      link.click();
      showToast(`Đã tải ảnh TKB ${currentPreviewClass.name} nét cao cho Zalo!`);
    } catch (err) {
      console.error('Lỗi xuất ảnh:', err);
      alert('Không thể tạo file ảnh. Vui lòng thử lại!');
    } finally {
      setIsExportingImage(false);
    }
  };

  // Sao chép ảnh trực tiếp vào Clipboard (nhấn Ctrl+V dán ngay vào Zalo chat)
  const handleCopyZaloImage = async () => {
    if (!previewSheetRef.current || !currentPreviewClass) return;
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
        showToast(`Đã sao chép ảnh TKB ${currentPreviewClass.name}! Nhấn Ctrl+V để dán vào Zalo.`);
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

  const teacherMap = useMemo(() => new Map((teachers || []).map(t => [t.id, t])), [teachers]);
  const classMap = useMemo(() => new Map((classes || []).map(c => [c.id, c])), [classes]);

  // Extract available grades from classes
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

  // Determine target classes based on scope
  const targetClasses = useMemo(() => {
    if (printScope === 'current') {
      const cls = classes.find(c => c.id === (initialClassId || selectedClassIds[0])) || classes[0];
      return cls ? [cls] : [];
    }
    if (printScope === 'all') {
      return [...classes];
    }
    if (printScope === 'grade') {
      return classes.filter(c => {
        const g = c.grade || (c.name?.match(/(\d+)/) ? parseInt(c.name.match(/(\d+)/)[1], 10) : null);
        return g === selectedGrade;
      });
    }
    if (printScope === 'custom') {
      return classes.filter(c => selectedClassIds.includes(c.id));
    }
    return classes;
  }, [printScope, selectedGrade, selectedClassIds, classes, initialClassId]);

  // Keep preview index in bounds
  useEffect(() => {
    if (previewIndex >= targetClasses.length) {
      setPreviewIndex(Math.max(0, targetClasses.length - 1));
    }
  }, [targetClasses.length, previewIndex]);

  const currentPreviewClass = targetClasses[previewIndex] || targetClasses[0] || classes[0];

  // Quick class toggles for custom scope
  const handleToggleClass = (classId) => {
    setSelectedClassIds(prev => {
      if (prev.includes(classId)) {
        if (prev.length === 1) return prev; // Keep at least 1
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

  const handlePrint = () => {
    triggerAppPrint();
  };

  const handleExportExcel = async () => {
    if (!targetClasses || targetClasses.length === 0) return;
    try {
      setIsExportingExcel(true);
      await exportClassTimetables(
        timetable,
        targetClasses,
        teachers,
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
      alert('Đã xảy ra lỗi khi xuất Excel thời khóa biểu.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Helper to render an individual A4 Printable Class Sheet
  const renderClassSheet = (cls, isPreview = false) => {
    if (!cls) return null;
    const homeroom = teacherMap.get(cls.homeroomTeacherId);
    const homeroomName = homeroom ? (homeroom.name + (homeroom.code ? ` (${homeroom.code})` : '')) : 'Chưa phân công';

    const getFontSizeTable = () => {
      if (displayOptions.fontScale === 'compact') return { table: '8pt', header: '8pt', sub: '7.5pt', teacher: '7pt' };
      if (displayOptions.fontScale === 'large') return { table: '9.5pt', header: '9.5pt', sub: '9.5pt', teacher: '8.5pt' };
      return { table: '8.5pt', header: '9pt', sub: '8.5pt', teacher: '7.5pt' };
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
        {/* National / School Header */}
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
                {printMeta.schoolName || 'TRƯỜNG TIỂU HỌC QUỲNH LỘC B'}
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

        {/* Timetable Title */}
        <div style={{ textAlign: 'center', margin: '8px 0 10px 0' }}>
          <h1 style={{
            fontSize: '15pt',
            fontWeight: 900,
            margin: 0,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            THỜI KHÓA BIỂU {cls.name?.startsWith('Lớp ') ? cls.name.toUpperCase() : `LỚP ${(cls.name || '').toUpperCase()}`}
          </h1>
          <div style={{ fontSize: '9pt', fontStyle: 'italic', marginTop: '3px' }}>
            {printMeta.effectiveDate} • {printMeta.year}
          </div>
          {displayOptions.showClassMeta && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
              marginTop: '5px',
              fontSize: '9pt',
              fontWeight: 600
            }}>
              <span>GVCN: <strong>{homeroomName}</strong></span>
              {displayOptions.showRoom && (
                <span>Phòng học: <strong>{cls.mainRoom || 'Phòng học lớp'}</strong></span>
              )}
              <span>Sĩ số: <strong>{cls.studentCount || 35} học sinh</strong></span>
            </div>
          )}
        </div>

        {/* Official Printable Table */}
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
              const isMorning = period.session === 'morning';
              const isAfternoon = period.session === 'afternoon';
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
                      const slot = timetable[cls.id]?.[day.id]?.[period.id];
                      const sub = slot ? ((subjects && subjects[slot.subjectId]) || DEFAULT_SUBJECTS[slot.subjectId] || { name: slot.subjectRaw || slot.subjectId }) : null;
                      const teacher = slot ? teacherMap.get(slot.teacherId) : null;
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

                      let teacherLabel = '';
                      if (displayOptions.teacherDisplay === 'code') {
                        teacherLabel = teacher?.code ? `(${teacher.code})` : (teacher?.name ? `(${teacher.name})` : '');
                      } else if (displayOptions.teacherDisplay === 'name') {
                        teacherLabel = teacher?.name ? `(${teacher.name})` : '';
                      }

                      return (
                        <td
                          key={day.id}
                          style={{
                            border: '1px solid #000',
                            height: '35px',
                            padding: '2px 3px',
                            verticalAlign: 'middle',
                            wordBreak: 'break-word'
                          }}
                        >
                          {slot ? (
                            <div>
                              <div style={{
                                fontWeight: 800,
                                fontSize: fSizes.sub,
                                color: '#000',
                                lineHeight: 1.15
                              }}>
                                {sub?.name || slot.subjectId}
                              </div>
                              {teacherLabel && (
                                <div style={{
                                  fontSize: fSizes.teacher,
                                  color: '#333',
                                  marginTop: '1px'
                                }}>
                                  {teacherLabel}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span style={{ color: '#aaa' }}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {isLunch && displayOptions.showLunchBreak && (
                    <tr style={{ background: '#f1f5f9', border: '1px solid #000' }}>
                      <td
                        colSpan={displayOptions.showPeriodTime ? 8 : 7}
                        style={{
                          border: '1px solid #000',
                          padding: '3px',
                          fontSize: '7.5pt',
                          fontWeight: 800,
                          fontStyle: 'italic'
                        }}
                      >
                        🍱 NGHỈ TRƯA & ĂN BÁN TRÚ ({printMeta.lunchBreak})
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Footer Signatures */}
        {displayOptions.showSignatures && (
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: '14px',
            fontSize: '8.5pt'
          }}>
            <div style={{ textAlign: 'center', width: '200px' }}>
              <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>NGƯỜI LẬP BIỂU</div>
              <div style={{ fontStyle: 'italic', fontSize: '7.5pt', marginTop: '2px' }}>(Ký và ghi rõ họ tên)</div>
              <div style={{ height: '36px' }} />
              <div style={{ fontWeight: 800 }}>{printMeta.scheduler || ''}</div>
            </div>
            <div style={{ textAlign: 'center', width: '220px' }}>
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

  return createPortal(
    <div
      className="portal-print-modal"
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
          maxWidth: '1350px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Modal Top Header */}
        <div style={{
          padding: '16px 24px',
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
              <Printer size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                In Thời Khóa Biểu Lớp Học (A4)
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: '20px',
                  background: '#e0e7ff',
                  color: '#4338ca'
                }}>
                  {targetClasses.length} bản in
                </span>
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#64748b' }}>
                Xem trước trang in chuẩn quy cách giáo dục, hỗ trợ in đơn lẻ hoặc in hàng loạt toàn trường.
              </p>
            </div>
          </div>

            {/* Top Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Copy Image Button */}
              <button
                onClick={handleCopyZaloImage}
                disabled={isCopyingImage || !currentPreviewClass}
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
                title="Sao chép ảnh TKB đang xem vào Clipboard. Mở Zalo và nhấn Ctrl+V để gửi ngay cho phụ huynh!"
              >
                <Copy size={16} />
                <span>{isCopyingImage ? 'Đang copy...' : 'Copy Ảnh (Dán Zalo)'}</span>
              </button>

              {/* Download Zalo Image Button */}
              <button
                onClick={handleExportZaloImage}
                disabled={isExportingImage || !currentPreviewClass}
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
                title="Tải file ảnh PNG sắc nét (High-DPI) để gửi nhóm Zalo hoặc in ảnh"
              >
                <ImageIcon size={16} />
                <span>{isExportingImage ? 'Đang tạo...' : 'Tải Ảnh Zalo (PNG)'}</span>
              </button>

              <button
                onClick={handleExportExcel}
                disabled={isExportingExcel || targetClasses.length === 0}
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
                title="Xuất các lớp đã chọn ra file Excel"
              >
                <FileSpreadsheet size={16} />
                <span>{isExportingExcel ? 'Đang xuất...' : `Xuất Excel (${targetClasses.length})`}</span>
              </button>

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
                <span>In Ngay / PDF ({targetClasses.length} trang)</span>
              </button>

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
                      {/* Current Class */}
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
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>📌 Lớp hiện tại</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Chỉ in lớp {currentPreviewClass?.name || 'đang chọn'} (1 trang)
                        </div>
                      </button>

                      {/* All Classes */}
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
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>🏫 Toàn trường</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          Tất cả {classes.length} lớp học
                        </div>
                      </button>

                      {/* By Grade */}
                      <button
                        onClick={() => setPrintScope('grade')}
                        style={{
                          padding: '10px 12px',
                          borderRadius: '10px',
                          border: printScope === 'grade' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                          background: printScope === 'grade' ? '#eef2ff' : '#ffffff',
                          color: printScope === 'grade' ? '#4338ca' : '#475569',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '2px'
                        }}
                      >
                        <div style={{ fontWeight: 800, fontSize: '0.85rem' }}>📚 Theo khối</div>
                        <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                          In riêng Khối 1, 2, 3...
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
                          Tự chọn từng lớp ({selectedClassIds.length} lớp)
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Sub-selectors depending on scope */}
                  {printScope === 'current' && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '6px' }}>
                        Đang chọn lớp:
                      </label>
                      <select
                        value={selectedClassIds[0] || ''}
                        onChange={(e) => setSelectedClassIds([e.target.value])}
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
                        {classes.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({teacherMap.get(c.homeroomTeacherId)?.name || 'Chưa gán GVCN'})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {printScope === 'grade' && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <label style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569', display: 'block', marginBottom: '8px' }}>
                        Chọn khối muốn in:
                      </label>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {availableGrades.map(g => {
                          const isSel = selectedGrade === g;
                          const count = classes.filter(c => (c.grade || (c.name?.match(/(\d+)/) ? parseInt(c.name.match(/(\d+)/)[1], 10) : null)) === g).length;
                          return (
                            <button
                              key={g}
                              onClick={() => setSelectedGrade(g)}
                              style={{
                                padding: '6px 14px',
                                borderRadius: '8px',
                                border: isSel ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                                background: isSel ? '#eef2ff' : '#ffffff',
                                color: isSel ? '#4338ca' : '#475569',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                cursor: 'pointer'
                              }}
                            >
                              Khối {g} ({count} lớp)
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {printScope === 'custom' && (
                    <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>
                          Đã chọn: {selectedClassIds.length} / {classes.length} lớp
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
                          placeholder="Tìm lớp..."
                          value={classSearch}
                          onChange={e => setClassSearch(e.target.value)}
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

                      {/* Class Checkbox List */}
                      <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {classes
                          .filter(c => c.name.toLowerCase().includes(classSearch.toLowerCase()))
                          .map(c => {
                            const isChecked = selectedClassIds.includes(c.id);
                            return (
                              <label
                                key={c.id}
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
                                  onChange={() => handleToggleClass(c.id)}
                                  style={{ cursor: 'pointer' }}
                                />
                                <span>{c.name}</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.72rem', marginLeft: 'auto' }}>
                                  {c.mainRoom || ''}
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
                    <div>• Tổng số trang in dự kiến: <strong>{targetClasses.length} trang A4</strong></div>
                    <div>• Tự động tách trang (Page-Break) chuẩn xác 1 lớp / 1 trang A4 đứng.</div>
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
                  {/* Teacher display mode */}
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: '6px' }}>
                      Hiển thị Giáo viên bộ môn:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="teacherDisplay"
                          value="code"
                          checked={displayOptions.teacherDisplay === 'code'}
                          onChange={() => setDisplayOptions({ ...displayOptions, teacherDisplay: 'code' })}
                        />
                        <span>Mã viết tắt / Tên gọn (VD: <em>Mai</em>, <em>GV01</em>)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="teacherDisplay"
                          value="name"
                          checked={displayOptions.teacherDisplay === 'name'}
                          onChange={() => setDisplayOptions({ ...displayOptions, teacherDisplay: 'name' })}
                        />
                        <span>Họ và tên đầy đủ (VD: <em>Cô Nguyễn Thị Mai</em>)</span>
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="teacherDisplay"
                          value="none"
                          checked={displayOptions.teacherDisplay === 'none'}
                          onChange={() => setDisplayOptions({ ...displayOptions, teacherDisplay: 'none' })}
                        />
                        <span>Ẩn tên giáo viên (chỉ hiện môn học)</span>
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
                      <span>Hiển thị phần Chữ ký duyệt (Người lập biểu & Hiệu trưởng)</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={displayOptions.showClassMeta}
                        onChange={e => setDisplayOptions({ ...displayOptions, showClassMeta: e.target.checked })}
                      />
                      <span>Hiển thị thông tin GVCN & Sĩ số lớp</span>
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={displayOptions.showRoom}
                        onChange={e => setDisplayOptions({ ...displayOptions, showRoom: e.target.checked })}
                      />
                      <span>Hiển thị phòng học của lớp</span>
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
                <span>In Bản In Này ({targetClasses.length} lớp)</span>
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
                  {targetClasses.map((cls, idx) => (
                    <option key={cls.id} value={idx}>
                      Trang {idx + 1}/{targetClasses.length}: {cls.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setPreviewIndex(prev => Math.min(targetClasses.length - 1, prev + 1))}
                  disabled={previewIndex >= targetClasses.length - 1}
                  style={{
                    background: '#1e293b',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '4px 8px',
                    color: previewIndex >= targetClasses.length - 1 ? '#64748b' : '#ffffff',
                    cursor: previewIndex >= targetClasses.length - 1 ? 'not-allowed' : 'pointer',
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
                {renderClassSheet(currentPreviewClass, true)}
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
        {targetClasses.map((cls, index) => (
          <React.Fragment key={cls.id}>
            {renderClassSheet(cls, false)}
          </React.Fragment>
        ))}
      </div>
    </div>,
    document.body
  );
};
