// src/components/ExcelModal.jsx
import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  FileSpreadsheet, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  FileText, 
  Users, 
  Grid3X3, 
  Layers
} from 'lucide-react';
import { 
  downloadExcelTemplate, 
  importExcelData, 
  exportMasterTimetable, 
  exportClassTimetables, 
  exportTeacherTimetables, 
  exportTeacherDirectory 
} from '../services/excelService';

export const ExcelModal = ({
  isOpen,
  onClose,
  classes,
  teachers,
  assignments,
  gradeQuotas,
  timetable,
  subjects,
  onImportSuccess
}) => {
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState(null);
  const fileInputRef = useRef(null);

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

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportStatus(null);

    try {
      const res = await importExcelData(file);
      if (res.success) {
        onImportSuccess(res.data);
        let totalSlots = 0;
        if (res.data.timetable) {
          Object.values(res.data.timetable).forEach(days => {
            Object.values(days).forEach(periods => {
              Object.values(periods).forEach(slot => {
                if (slot && slot.subjectId) totalSlots++;
              });
            });
          });
        }
        setImportStatus({
          success: true,
          message: 'Nhập dữ liệu thời khóa biểu Excel thành công!',
          stats: {
            teachers: res.data.teachers?.length || 0,
            classes: res.data.classes?.length || 0,
            assignments: res.data.assignments?.length || 0,
            slots: totalSlots
          }
        });
      }
    } catch (err) {
      console.error('Import error:', err);
      setImportStatus({
        success: false,
        message: 'Lỗi khi đọc file Excel. Vui lòng kiểm tra đúng cấu trúc file mẫu!'
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
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
      background: 'rgba(15, 23, 42, 0.7)',
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
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
        padding: '28px'
      }}>
        {/* Modal Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '10px', borderRadius: '12px', background: '#ecfdf5', color: '#059669' }}>
              <FileSpreadsheet size={26} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#1e293b' }}>
                Trung Tâm Nhập & Xuất File Excel
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '2px' }}>
                Hỗ trợ mẫu chuẩn CTGDPT 2018 và xuất các báo cáo sẵn sàng in ấn A4
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
            <X size={22} color="#94a3b8" />
          </button>
        </div>

        {/* SECTION 1: NHẬP EXCEL & TẢI FILE MẪU */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Upload size={18} color="#4f46e5" />
            <span>1. Nhập Dữ Liệu Từ File Excel (Import)</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Tải File Mẫu */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b', marginBottom: '4px' }}>
                  Tải File Excel Mẫu Chuẩn
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b', lineHeight: 1.4 }}>
                  Chứa sẵn 5 Sheet: Định mức khối, Danh sách giáo viên, Danh sách lớp, Phòng chức năng, Phân công giảng dạy.
                </p>
              </div>

              <button
                onClick={downloadExcelTemplate}
                style={{
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '9px 14px',
                  borderRadius: '8px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#334155',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                <Download size={15} />
                <span>Tải Mau_Thoi_Khoa_Bieu.xlsx</span>
              </button>
            </div>

            {/* Upload File */}
            <div style={{
              background: '#ffffff',
              border: '1.5px dashed #6366f1',
              borderRadius: '12px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              cursor: 'pointer'
            }}
            onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={24} color="#6366f1" style={{ marginBottom: '8px' }} />
              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#4338ca' }}>
                Chọn hoặc kéo thả file Excel vào đây
              </div>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                Định dạng .xlsx hoặc .xls
              </span>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                style={{ display: 'none' }}
              />
            </div>
          </div>

          {/* Import Status Alert */}
          {importStatus && (
            <div className="animate-fade-in" style={{
              marginTop: '14px',
              padding: '12px 16px',
              borderRadius: '10px',
              background: importStatus.success ? '#ecfdf5' : '#fef2f2',
              border: `1px solid ${importStatus.success ? '#a7f3d0' : '#fecaca'}`,
              color: importStatus.success ? '#065f46' : '#991b1b',
              fontSize: '0.85rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              {importStatus.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <div>
                <div>{importStatus.message}</div>
                {importStatus.stats && (
                  <div style={{ fontSize: '0.75rem', fontWeight: 500, marginTop: '2px' }}>
                    Đã nạp: {importStatus.stats.teachers} giáo viên, {importStatus.stats.classes} lớp học, {importStatus.stats.assignments} môn phân công{importStatus.stats.slots > 0 ? `, ${importStatus.stats.slots} tiết thời khóa biểu` : ''}.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* SECTION 2: XUẤT FILE EXCEL (EXPORT CENTER) */}
        <div>
          <h4 style={{ fontSize: '1rem', fontWeight: 700, color: '#1e293b', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Download size={18} color="#059669" />
            <span>2. Xuất Báo Cáo & Thời Khóa Biểu Ra Excel (Export)</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '14px' }}>
            
            {/* Card 1: TKB Toàn Trường */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Grid3X3 size={18} color="#4f46e5" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                    TKB Ma Trận Toàn Trường
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Bảng tổng hợp tất cả các lớp dạng ma trận, phù hợp cho Ban Giám Hiệu theo dõi.
                </p>
              </div>
              <button
                onClick={() => exportMasterTimetable(timetable, classes, teachers, subjects)}
                style={{
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#059669',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} />
                <span>Tải File Ma Trận</span>
              </button>
            </div>

            {/* Card 2: TKB Từng Lớp */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <FileText size={18} color="#2563eb" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                    TKB Từng Lớp Học (A4)
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Mỗi lớp 1 sheet riêng biệt, căn chỉnh sẵn tiêu đề và chữ ký để in ấn dán tại lớp.
                </p>
              </div>
              <button
                onClick={() => exportClassTimetables(timetable, classes, teachers, subjects)}
                style={{
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#2563eb',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} />
                <span>Tải TKB Các Lớp</span>
              </button>
            </div>

            {/* Card 3: TKB Giáo Viên */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Users size={18} color="#7c3aed" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                    TKB Cá Nhân Giáo Viên
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Lịch giảng dạy riêng cho từng thầy cô kèm số tiết dạy và các buổi trống.
                </p>
              </div>
              <button
                onClick={() => exportTeacherTimetables(timetable, teachers, classes, subjects)}
                style={{
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#7c3aed',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} />
                <span>Tải TKB Giáo Viên</span>
              </button>
            </div>

            {/* Card 4: Danh Sách Giáo Viên */}
            <div style={{
              background: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <Layers size={18} color="#ea580c" />
                  <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#1e293b' }}>
                    Hồ Sơ & Thống Kê Tiết GV
                  </span>
                </div>
                <p style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  Danh sách đầy đủ số điện thoại, vai trò, số tiết phân công và tiến độ xếp lịch.
                </p>
              </div>
              <button
                onClick={() => exportTeacherDirectory(teachers, assignments, timetable, classes)}
                style={{
                  marginTop: '14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  background: '#ea580c',
                  border: 'none',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                <Download size={14} />
                <span>Tải Danh Sách GV</span>
              </button>
            </div>

          </div>
        </div>

        {/* Modal Footer */}
        <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 24px',
              borderRadius: '10px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.875rem',
              cursor: 'pointer'
            }}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
