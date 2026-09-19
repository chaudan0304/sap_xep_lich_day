// src/components/ExcelModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  AlertTriangle,
  X, 
  FileText, 
  Users, 
  Grid3X3, 
  Layers,
  RotateCcw,
  School,
  Check,
  ShieldAlert,
  Search
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  downloadExcelTemplate, 
  importExcelWithPreview, 
  exportMasterTimetable, 
  exportClassTimetables, 
  exportTeacherTimetables, 
  exportTeacherDirectory 
} from '../services/excelService.js';
import { DAYS_OF_WEEK, PERIODS } from '../constants/defaultCurriculum.js';
import { SUBJECTS } from '../constants/subjects.js';

export const ExcelModal = ({
  isOpen,
  onClose,
  classes = [],
  teachers = [],
  assignments = [],
  gradeQuotas: _gradeQuotas = {},
  timetable = {},
  subjects = {},
  schoolInfo = {},
  onImportSuccess
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState(null); // { success, isValid, previewData, errors, warnings, summary, data }
  const [previewTab, setPreviewTab] = useState('overview'); // 'overview' | 'timetable' | 'teachers' | 'validation'
  const [previewClassId, setPreviewClassId] = useState('1A1');
  const [errorMessage, setErrorMessage] = useState('');
  const [diagFilter, setDiagFilter] = useState('ALL');
  const [diagSearch, setDiagSearch] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
      setImportResult(null);
      setErrorMessage('');
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setErrorMessage('');
    setImportResult(null);

    try {
      const res = await importExcelWithPreview(file);
      if (res.success) {
        setImportResult(res);
        if (res.data?.classes?.length > 0) {
          setPreviewClassId(res.data.classes[0].id);
        }
      } else {
        setErrorMessage('Không thể đọc file Excel. Vui lòng kiểm tra định dạng file!');
      }
    } catch (err) {
      console.error('Import error:', err);
      setErrorMessage(err.message || 'Lỗi khi đọc file Excel. Vui lòng kiểm tra đúng cấu trúc bảng tính!');
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = () => {
    if (!importResult || !importResult.data) return;

    onImportSuccess(importResult.data, {
      errors: importResult.errors || [],
      warnings: importResult.warnings || [],
      summary: importResult.summary || {}
    });

    confetti({
      particleCount: 150,
      spread: 90,
      origin: { y: 0.6 }
    });

    onClose();
  };

  const handleCancelPreview = () => {
    setImportResult(null);
    setErrorMessage('');
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(15, 23, 42, 0.75)',
      backdropFilter: 'blur(8px)',
      WebkitBackdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '20px'
    }}>
      <div className="animate-fade-in" style={{
        background: '#ffffff',
        borderRadius: '24px',
        maxWidth: importResult ? '1100px' : '850px',
        width: '100%',
        maxHeight: '92vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        padding: '28px',
        transition: 'max-width 0.25s ease'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '14px', background: '#ecfdf5', color: '#059669' }}>
              <FileSpreadsheet size={28} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b', margin: 0 }}>
                {importResult ? 'Kiểm Tra & Xem Trước Dữ Liệu Excel (Preview)' : 'Trung Tâm Nhập & Xuất File Excel'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '3px 0 0 0' }}>
                {importResult 
                  ? 'Đối soát dữ liệu, kiểm tra tính hợp lệ và xung đột trước khi nạp chính thức vào hệ thống' 
                  : 'Hỗ trợ định dạng STKB thực tế (Nhiều Sheet) và xuất báo cáo chuẩn A4'}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: '#f1f5f9', width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={20} color="#64748b" />
          </button>
        </div>

        {/* ERROR NOTIFICATION */}
        {errorMessage && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', color: '#991b1b', marginBottom: '20px' }}>
            <AlertCircle size={22} color="#ef4444" />
            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{errorMessage}</div>
          </div>
        )}

        {/* ---------------------------------------------------- */}
        {/* VIEW 1: IMPORT & PREVIEW DIALOG                     */}
        {/* ---------------------------------------------------- */}
        {importResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* STATUS BANNER & METRICS */}
            <div style={{
              background: importResult.isValid ? 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)' : 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
              border: `1px solid ${importResult.isValid ? '#86efac' : '#fcd34d'}`,
              borderRadius: '16px',
              padding: '18px 20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {importResult.isValid ? (
                    <CheckCircle2 size={24} color="#16a34a" />
                  ) : (
                    <AlertTriangle size={24} color="#d97706" />
                  )}
                  <div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: importResult.isValid ? '#166534' : '#92400e' }}>
                      {importResult.isValid ? 'Dữ liệu Hợp Lệ — Sẵn sàng nạp vào Thời khóa biểu' : 'Dữ liệu có cảnh báo hoặc cần lưu ý'}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: importResult.isValid ? '#15803d' : '#b45309', marginTop: '2px' }}>
                      Định dạng nhận diện: <strong>{importResult.summary?.format === 'REAL_SCHOOL_MULTISHEET' ? 'Bảng tính thực tế nhiều khối lớp' : 'File mẫu chuẩn'}</strong>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={handleCancelPreview}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      color: '#475569',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <RotateCcw size={16} /> Chọn File Khác
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    style={{
                      padding: '8px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: '#16a34a',
                      color: '#ffffff',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.35)'
                    }}
                  >
                    <Check size={18} /> Xác Nhận Nạp Thời Khóa Biểu
                  </button>
                </div>
              </div>

              {/* 6 Metric Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px' }}>
                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Số Sheet</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a' }}>{importResult.summary?.totalSheets || 0}</div>
                </div>
                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Số Lớp Học</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#2563eb' }}>{importResult.summary?.totalClasses || 0}</div>
                </div>
                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Số Giáo Viên</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#7c3aed' }}>{importResult.summary?.totalTeachers || 0}</div>
                </div>
                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Tổng Số Tiết</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#059669' }}>{importResult.summary?.totalSlots || 0}</div>
                </div>
                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Tiết Hợp Lệ</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: '#16a34a' }}>{importResult.summary?.validSlots || 0}</div>
                </div>
                <div style={{ background: '#ffffff', padding: '12px 14px', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.06)' }}>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>Lỗi / Cảnh báo</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 800, color: (importResult.summary?.errorCount || 0) > 0 ? '#dc2626' : '#64748b' }}>
                    {importResult.summary?.errorCount || 0} / {importResult.summary?.warningCount || 0}
                  </div>
                </div>
              </div>
            </div>

            {/* PREVIEW TABS NAVIGATION */}
            <div style={{ display: 'flex', gap: '8px', borderBottom: '2px solid #e2e8f0', paddingBottom: '8px' }}>
              {[
                { id: 'overview', label: 'Tổng Quan & Định Mức', icon: <School size={16} /> },
                { id: 'timetable', label: 'Xem Trước Thời Khóa Biểu', icon: <Grid3X3 size={16} /> },
                { id: 'teachers', label: `Giáo Viên (${importResult.summary?.totalTeachers || 0})`, icon: <Users size={16} /> },
                { id: 'validation', label: `Kiểm Tra Chi Tiết (${(importResult.errors?.length || 0) + (importResult.warnings?.length || 0)})`, icon: <ShieldAlert size={16} /> }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setPreviewTab(tab.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '10px',
                    border: 'none',
                    background: previewTab === tab.id ? '#3b82f6' : '#f8fafc',
                    color: previewTab === tab.id ? '#ffffff' : '#64748b',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                  }}
                >
                  {tab.icon} {tab.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENT 1: OVERVIEW */}
            {previewTab === 'overview' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#1e293b' }}>Thông Tin Nhà Trường & Khối Lớp</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Đơn vị:</span>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{importResult.data?.schoolInfo?.name || 'Trường TH Quỳnh Lộc'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Năm học:</span>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>{importResult.data?.schoolInfo?.year || '2026 - 2027'}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Các khối lớp tìm thấy:</span>
                      <div style={{ fontWeight: 700, color: '#2563eb' }}>
                        {Array.from(new Set((importResult.data?.classes || []).map(c => `Khối ${c.grade}`))).join(', ')}
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px' }}>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: '0.95rem', color: '#1e293b' }}>
                    Danh Sách {importResult.data?.classes?.length || 0} Lớp Học Tìm Thấy
                  </h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {(importResult.data?.classes || []).map(c => {
                      const gvHome = (importResult.data?.teachers || []).find(t => t.id === c.homeroomTeacherId);
                      return (
                        <div key={c.id} style={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '10px', padding: '8px 12px', fontSize: '0.8rem' }}>
                          <strong style={{ color: '#0f172a' }}>{c.name}</strong>
                          <span style={{ color: '#64748b', marginLeft: '6px' }}>({gvHome ? gvHome.name : 'Chưa gán GVCN'})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: TIMETABLE GRID PREVIEW */}
            {previewTab === 'timetable' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>Chọn lớp xem trước:</span>
                  {(importResult.data?.classes || []).map(c => (
                    <button
                      key={c.id}
                      onClick={() => setPreviewClassId(c.id)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: previewClassId === c.id ? '2px solid #2563eb' : '1px solid #cbd5e1',
                        background: previewClassId === c.id ? '#eff6ff' : '#ffffff',
                        color: previewClassId === c.id ? '#1e40af' : '#475569',
                        fontWeight: previewClassId === c.id ? 800 : 600,
                        fontSize: '0.8rem',
                        cursor: 'pointer'
                      }}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>

                {/* Timetable Grid for Selected Class */}
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '14px', background: '#ffffff' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '10px', textAlign: 'center', width: '90px' }}>Buổi / Tiết</th>
                        {DAYS_OF_WEEK.map(d => (
                          <th key={d.id} style={{ padding: '10px', textAlign: 'center', borderLeft: '1px solid #e2e8f0' }}>{d.name}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {PERIODS.map(p => {
                        const isAfternoonHeader = p.id === 5;
                        const classSched = importResult.data?.timetable?.[previewClassId] || {};
                        return (
                          <React.Fragment key={p.id}>
                            {isAfternoonHeader && (
                              <tr style={{ background: '#f1f5f9' }}>
                                <td colSpan={6} style={{ padding: '6px 12px', fontWeight: 800, color: '#334155', textAlign: 'center', fontSize: '0.75rem' }}>
                                  BUỔI CHIỀU
                                </td>
                              </tr>
                            )}
                            <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                              <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: '#64748b', background: '#fafafa' }}>
                                {p.name}
                              </td>
                              {DAYS_OF_WEEK.map(d => {
                                const slot = classSched[d.id]?.[p.id];
                                const subDef = slot?.subjectId ? (SUBJECTS[slot.subjectId] || {}) : null;
                                return (
                                  <td key={d.id} style={{ padding: '8px', borderLeft: '1px solid #f1f5f9', verticalAlign: 'top', height: '56px' }}>
                                    {slot && slot.subjectId ? (
                                      <div style={{
                                        background: subDef?.bg || '#f0fdf4',
                                        border: `1px solid ${subDef?.border || '#86efac'}`,
                                        borderRadius: '8px',
                                        padding: '6px 8px',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '2px'
                                      }}>
                                        <div style={{ fontWeight: 800, color: subDef?.text || '#166534', fontSize: '0.8rem' }}>
                                          {subDef?.name || slot.subjectRaw}
                                        </div>
                                        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                                          {slot.teacherRaw || 'GV'}
                                        </div>
                                      </div>
                                    ) : (
                                      <div style={{ color: '#cbd5e1', textAlign: 'center', marginTop: '12px' }}>-</div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT 3: TEACHERS LIST */}
            {previewTab === 'teachers' && (
              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '14px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                    <tr>
                      <th style={{ padding: '10px', textAlign: 'center', width: '50px' }}>STT</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Họ và Tên</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Tổ Chuyên Môn</th>
                      <th style={{ padding: '10px', textAlign: 'left' }}>Nhiệm Vụ Phân Công</th>
                      <th style={{ padding: '10px', textAlign: 'center', width: '90px' }}>Định Mức</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(importResult.data?.teachers || []).map((t, idx) => (
                      <tr key={t.id} style={{ borderBottom: '1px solid #f1f5f9', background: idx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                        <td style={{ padding: '8px 10px', textAlign: 'center', color: '#64748b' }}>{t.tt || (idx + 1)}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#0f172a' }}>{t.name}</td>
                        <td style={{ padding: '8px 10px', color: '#475569' }}>{t.department}</td>
                        <td style={{ padding: '8px 10px', color: '#334155', fontSize: '0.75rem' }}>{t.task || t.position}</td>
                        <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#2563eb' }}>{t.dinhMuc || 23}t</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* TAB CONTENT 4: VALIDATION DIAGNOSTICS */}
            {previewTab === 'validation' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Diagnostics Filter and Search Bar */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', background: '#f8fafc', padding: '10px 14px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setDiagFilter('ALL')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: diagFilter === 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                        background: diagFilter === 'ALL' ? '#2563eb' : '#ffffff',
                        color: diagFilter === 'ALL' ? '#ffffff' : '#475569'
                      }}
                    >
                      Tất cả ({(importResult.errors?.length || 0) + (importResult.warnings?.length || 0)})
                    </button>
                    <button
                      onClick={() => setDiagFilter('ERRORS')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: diagFilter === 'ERRORS' ? '1px solid #dc2626' : '1px solid #cbd5e1',
                        background: diagFilter === 'ERRORS' ? '#dc2626' : '#ffffff',
                        color: diagFilter === 'ERRORS' ? '#ffffff' : '#475569'
                      }}
                    >
                      Lỗi trùng giờ ({importResult.errors?.length || 0})
                    </button>
                    <button
                      onClick={() => setDiagFilter('WARNINGS')}
                      style={{
                        padding: '5px 12px',
                        borderRadius: '8px',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        border: diagFilter === 'WARNINGS' ? '1px solid #d97706' : '1px solid #cbd5e1',
                        background: diagFilter === 'WARNINGS' ? '#d97706' : '#ffffff',
                        color: diagFilter === 'WARNINGS' ? '#ffffff' : '#475569'
                      }}
                    >
                      Cảnh báo ({importResult.warnings?.length || 0})
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '4px 8px' }}>
                    <Search size={14} color="#94a3b8" />
                    <input
                      type="text"
                      placeholder="Tìm lỗi, GV, lớp, ô Excel..."
                      value={diagSearch}
                      onChange={(e) => setDiagSearch(e.target.value)}
                      style={{ border: 'none', outline: 'none', fontSize: '0.78rem', width: '160px' }}
                    />
                  </div>
                </div>

                {/* Diagnostics List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto' }}>
                  {(() => {
                    const allItems = [
                      ...(importResult.errors || []).map(e => ({ ...e, isError: true })),
                      ...(importResult.warnings || []).map(w => ({ ...w, isError: false }))
                    ];

                    const filtered = allItems.filter(item => {
                      if (diagFilter === 'ERRORS' && !item.isError) return false;
                      if (diagFilter === 'WARNINGS' && item.isError) return false;
                      if (diagSearch.trim()) {
                        const kw = diagSearch.toLowerCase();
                        const msgMatch = item.message?.toLowerCase().includes(kw);
                        const refMatch = item.cellRef?.toLowerCase().includes(kw);
                        const tchMatch = item.teacherName?.toLowerCase().includes(kw) || item.value?.toLowerCase().includes(kw);
                        const clsMatch = item.classId?.toLowerCase().includes(kw);
                        if (!msgMatch && !refMatch && !tchMatch && !clsMatch) return false;
                      }
                      return true;
                    });

                    if (filtered.length === 0) {
                      return (
                        <div style={{ textAlign: 'center', padding: '36px 20px', color: '#16a34a' }}>
                          <CheckCircle2 size={40} style={{ margin: '0 auto 10px auto' }} />
                          <div style={{ fontWeight: 800, fontSize: '1rem' }}>
                            {allItems.length === 0 ? 'Dữ liệu hoàn hảo — Không phát hiện bất kỳ lỗi hay cảnh báo nào!' : 'Không có mục nào phù hợp với bộ lọc tìm kiếm.'}
                          </div>
                        </div>
                      );
                    }

                    return filtered.map((item, idx) => (
                      <div
                        key={`diag_${idx}`}
                        style={{
                          background: item.isError ? '#fff5f5' : '#fffbeb',
                          border: `1.5px solid ${item.isError ? '#fca5a5' : '#fde68a'}`,
                          borderRadius: '12px',
                          padding: '12px 16px',
                          fontSize: '0.82rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '6px'
                        }}
                      >
                        {/* Header: Type Badge + Location */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              background: item.isError ? '#dc2626' : '#d97706',
                              color: '#ffffff',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              {item.isError ? <AlertCircle size={12} /> : <AlertTriangle size={12} />}
                              <span>{item.title || (item.isError ? 'LỖI TRÙNG LỊCH' : 'CẢNH BÁO')}</span>
                            </span>

                            {/* Location Badge */}
                            {item.cellRef && (
                              <span style={{
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 700,
                                background: '#ffffff',
                                border: '1px solid #cbd5e1',
                                color: '#1e293b'
                              }}>
                                📍 Vị trí: <strong>{item.cellRef}</strong> {item.row > 0 ? `(Dòng ${item.row}, Cột ${item.col})` : ''}
                              </span>
                            )}
                          </div>

                          {item.classId && (
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe'
                            }}>
                              Lớp: {item.classId}
                            </span>
                          )}
                        </div>

                        {/* Message */}
                        <div style={{ color: item.isError ? '#991b1b' : '#92400e', fontWeight: 600, lineHeight: '1.4' }}>
                          {item.message}
                        </div>

                        {/* Actionable Suggestion */}
                        {item.suggestion && (
                          <div style={{ fontSize: '0.75rem', color: '#64748b', background: 'rgba(255, 255, 255, 0.7)', padding: '6px 10px', borderRadius: '6px', borderLeft: `3px solid ${item.isError ? '#ef4444' : '#f59e0b'}` }}>
                            💡 <strong>Gợi ý:</strong> {item.suggestion}
                          </div>
                        )}
                      </div>
                    ));
                  })()}
                </div>
              </div>
            )}

          </div>
        ) : (
          /* ---------------------------------------------------- */
          /* VIEW 2: STANDARD EXPORT & UPLOAD DROPZONE           */
          /* ---------------------------------------------------- */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* UPLOAD ZONE */}
            <div style={{
              background: '#f8fafc',
              border: '2px dashed #93c5fd',
              borderRadius: '20px',
              padding: '30px 20px',
              textAlign: 'center'
            }}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls"
                onChange={handleFileChange}
                style={{ display: 'none' }}
                id="excel-file-upload-input"
              />
              <div style={{
                width: '60px',
                height: '60px',
                borderRadius: '16px',
                background: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px auto'
              }}>
                <Upload size={30} />
              </div>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#1e293b', margin: '0 0 6px 0' }}>
                Tải lên File Excel Thời Khóa Biểu (.xlsx / .xls)
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '0 0 16px 0', maxWidth: '500px', marginLeft: 'auto', marginRight: 'auto' }}>
                Hỗ trợ cả file mẫu chuẩn và file bảng tính thời khóa biểu thực tế nhiều sheet của nhà trường.
              </p>
              
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                <label
                  htmlFor="excel-file-upload-input"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    background: isImporting ? '#94a3b8' : '#2563eb',
                    color: '#ffffff',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: isImporting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)',
                    pointerEvents: isImporting ? 'none' : 'auto'
                  }}
                >
                  <Upload size={18} /> {isImporting ? 'Đang Đọc File Excel...' : 'Chọn File Excel Để Nhập'}
                </label>
                <button
                  onClick={downloadExcelTemplate}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 18px',
                    borderRadius: '12px',
                    background: '#ffffff',
                    border: '1px solid #cbd5e1',
                    color: '#475569',
                    fontSize: '0.9rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  <Download size={18} /> Tải File Mẫu (.xlsx)
                </button>
              </div>
            </div>

            {/* EXPORT OPTIONS SECTION */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '18px',
              padding: '20px'
            }}>
              <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Download size={18} color="#2563eb" /> Xuất File Báo Cáo Thời Khóa Biểu Chuẩn In Ấn
              </h4>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                <button
                  onClick={() => exportMasterTimetable(timetable, classes, teachers, subjects, schoolInfo)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ padding: '8px', borderRadius: '10px', background: '#eff6ff', color: '#2563eb' }}>
                    <Grid3X3 size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Ma Trận Toàn Trường</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Bảng tổng hợp tất cả các lớp & từng khối</div>
                  </div>
                </button>

                <button
                  onClick={() => exportClassTimetables(timetable, classes, teachers, subjects, schoolInfo)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ padding: '8px', borderRadius: '10px', background: '#f0fdf4', color: '#16a34a' }}>
                    <Layers size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Thời Khóa Biểu Từng Lớp</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Mỗi lớp 1 sheet chuẩn in A4</div>
                  </div>
                </button>

                <button
                  onClick={() => exportTeacherTimetables(timetable, teachers, classes, subjects, schoolInfo)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ padding: '8px', borderRadius: '10px', background: '#faf5ff', color: '#7c3aed' }}>
                    <Users size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Lịch Dạy Từng Giáo Viên</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Theo từng cá nhân giáo viên</div>
                  </div>
                </button>

                <button
                  onClick={() => exportTeacherDirectory(teachers, assignments, timetable, classes, schoolInfo)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '14px 16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    textAlign: 'left'
                  }}
                >
                  <div style={{ padding: '8px', borderRadius: '10px', background: '#fffbeb', color: '#d97706' }}>
                    <FileText size={20} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0f172a' }}>Danh Bạ & Định Mức GV</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Thống kê tiết dạy và phân công</div>
                  </div>
                </button>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>,
    document.body
  );
};
