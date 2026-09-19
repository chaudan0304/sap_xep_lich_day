// src/components/Header.jsx
import React from 'react';
import { 
  Calendar, 
  Users, 
  BookOpen, 
  Layers, 
  Grid3X3, 
  Building2, 
  Sparkles, 
  FileSpreadsheet, 
  Trash2,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  School,
  Bookmark,
  Save,
  Upload,
  ArrowUpCircle,
  HelpCircle,
  Database
} from 'lucide-react';
import { CURRENT_APP_VERSION } from '../services/updateChecker';

export const Header = ({
  activeTab,
  setActiveTab,
  onAutoSchedule,
  onOpenExcelModal,
  onOpenSettingsModal,
  onOpenUpdateModal,
  onOpenWelcomeModal,
  onOpenUserGuideModal,
  updateInfo = null,
  onResetSampleData: _onResetSampleData,
  onClearTimetable,
  onExportBackupJson,
  onImportBackupJson,
  onExportSqliteDb,
  onImportSqliteDb,
  conflicts = [],
  isAutoScheduling = false,
  schoolInfo = { name: 'Trường TH Quỳnh Lộc', year: 'Năm học 2026 - 2027' },
  onOpenConflictModal,
  onOpenImportReport,
  importReportCount = 0
}) => {
  const jsonFileInputRef = React.useRef(null);
  const dbFileInputRef = React.useRef(null);

  const handleJsonFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        if (onImportBackupJson) onImportBackupJson(jsonData);
        alert('Đã nạp file dữ liệu sao lưu thành công!');
      } catch {
        alert('File không hợp lệ hoặc bị lỗi định dạng JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDbFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (onImportSqliteDb) {
      onImportSqliteDb(file);
    }
    e.target.value = '';
  };
  const errorCount = conflicts.filter(c => c.severity === 'error').length;

  const navItems = [
    { id: 'studio', label: 'Studio Xếp Lịch', icon: Calendar, badge: null },
    { id: 'teachers', label: 'Danh Sách Giáo Viên', icon: Users, badge: null },
    { id: 'classes', label: 'Danh Sách Lớp Học', icon: GraduationCap, badge: null },
    { id: 'subjects', label: 'Quản Lý Môn Học', icon: BookOpen, badge: null },
    { id: 'curriculum', label: 'Định Mức Khối (1-5)', icon: Bookmark, badge: null },
    { id: 'assignments', label: 'Phân Công Chuyên Môn', icon: Layers, badge: null },
    { id: 'matrix', label: 'Ma Trận Toàn Trường', icon: Grid3X3, badge: null },
    { id: 'rooms', label: 'Phòng Chức Năng', icon: Building2, badge: null },
  ];

  return (
    <header className="no-print" style={{
      background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)',
      color: '#ffffff',
      boxShadow: '0 4px 20px rgba(30, 27, 75, 0.25)',
      position: 'sticky',
      top: 0,
      zIndex: 50
    }}>
      {/* Top Banner */}
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.12)'
      }}>
        {/* Brand & School Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #a855f7)',
            padding: '10px',
            borderRadius: '12px',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <GraduationCap size={26} color="#ffffff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>EduTimetable</span>
                  <span style={{ color: '#a5b4fc', fontWeight: 600 }}>Tiểu Học</span>
                </h1>

                {/* Version Badge aligned with Software Name */}
                {updateInfo?.hasUpdate ? (
                  <button
                    onClick={onOpenUpdateModal}
                    title={`Đã có phiên bản mới v${updateInfo.latestVersion}! Bấm để xem và tải về`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 9px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                      border: '1px solid #fda4af',
                      color: '#ffffff',
                      cursor: 'pointer',
                      boxShadow: '0 0 12px rgba(244, 63, 94, 0.5)',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.06)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    <Sparkles size={12} />
                    <span>v{updateInfo.latestVersion} Mới</span>
                  </button>
                ) : (
                  <button
                    onClick={onOpenUpdateModal}
                    title="Kiểm tra bản cập nhật mới nhất từ GitHub"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 9px',
                      borderRadius: '999px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      background: 'rgba(255, 255, 255, 0.12)',
                      border: '1px solid rgba(255, 255, 255, 0.22)',
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)';
                      e.currentTarget.style.color = '#ffffff';
                      e.currentTarget.style.transform = 'scale(1.04)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
                      e.currentTarget.style.color = '#cbd5e1';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    <ArrowUpCircle size={12} />
                    <span>v{CURRENT_APP_VERSION}</span>
                  </button>
                )}
              </div>

              {/* School Badge */}
              <button
                type="button"
                onClick={onOpenSettingsModal}
                title="Bấm để chỉnh sửa tên trường, cơ quan cấp trên, năm học & khung giờ tiết học"
                style={{
                  background: 'rgba(99, 102, 241, 0.35)',
                  border: '1px solid rgba(165, 180, 252, 0.4)',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#e0e7ff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.6)';
                  e.currentTarget.style.transform = 'scale(1.03)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.35)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <School size={13} />
                <span>{schoolInfo.name} ({schoolInfo.year})</span>
                <span style={{ fontSize: '0.65rem', background: '#4f46e5', padding: '1px 5px', borderRadius: '4px', marginLeft: '2px' }}>Sửa</span>
              </button>
            </div>
            <p style={{ fontSize: '0.78rem', color: '#c7d2fe', marginTop: '2px', margin: 0 }}>
              Phần mềm Xếp Thời Khóa Biểu & Quản Lý Giảng Dạy Chuẩn CTGDPT 2018
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'nowrap' }}>
          {/* Group 1: Data & Files Segment */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(255, 255, 255, 0.08)',
            borderRadius: '10px',
            padding: '3px',
            border: '1px solid rgba(255, 255, 255, 0.16)',
            gap: '2px'
          }}>
            {/* User Guide & Manual Button */}
            <button
              onClick={onOpenUserGuideModal}
              title="Mở cẩm nang hướng dẫn sử dụng chi tiết từng bước (Quy trình chuẩn, Studio, In A4, AI...)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.4))',
                border: '1px solid rgba(165, 180, 252, 0.4)',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.7), rgba(168, 85, 247, 0.7))';
                e.currentTarget.style.transform = 'scale(1.03)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.4))';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <HelpCircle size={14} color="#a5b4fc" />
              <span>Hướng Dẫn</span>
            </button>

            {/* Project / Welcome Button */}
            <button
              onClick={onOpenWelcomeModal}
              title="Khởi tạo dự án mới: Chuyển đổi giữa Dữ liệu mẫu (Demo) và Dự án trắng"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: 'transparent',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Bookmark size={14} />
              <span>Dự Án</span>
            </button>

            {/* Save JSON Backup */}
            <button
              onClick={onExportBackupJson}
              title="Lưu file sao lưu toàn bộ dữ liệu dự án (.json) về máy tính"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: 'transparent',
                border: 'none',
                color: '#93c5fd',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(37, 99, 235, 0.25)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Save size={14} />
              <span>Lưu File</span>
            </button>

            {/* Load JSON Backup */}
            <button
              onClick={() => jsonFileInputRef.current?.click()}
              title="Tải nạp file sao lưu (.json) từ máy tính"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: 'transparent',
                border: 'none',
                color: '#e2e8f0',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Upload size={14} />
              <span>Nạp File</span>
            </button>
            <input
              type="file"
              ref={jsonFileInputRef}
              onChange={handleJsonFileChange}
              accept=".json"
              style={{ display: 'none' }}
            />

            {/* SQLite Database Backup (.db) */}
            <button
              onClick={onExportSqliteDb}
              title="Xuất tập tin Cơ sở dữ liệu SQLite (.db) lưu về máy tính"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: 'rgba(59, 130, 246, 0.18)',
                border: '1px solid rgba(96, 165, 250, 0.4)',
                color: '#93c5fd',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.35)';
                e.currentTarget.style.transform = 'scale(1.02)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.18)';
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              <Database size={14} />
              <span>Lưu .db</span>
            </button>

            {/* SQLite Database Restore (.db) */}
            <button
              onClick={() => dbFileInputRef.current?.click()}
              title="Nạp tập tin Cơ sở dữ liệu SQLite (.db) từ máy tính"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: 'transparent',
                border: 'none',
                color: '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
            >
              <Upload size={14} />
              <span>Nạp .db</span>
            </button>
            <input
              type="file"
              ref={dbFileInputRef}
              onChange={handleDbFileChange}
              accept=".db,.sqlite"
              style={{ display: 'none' }}
            />

            {/* Excel Import / Export Button */}
            <button
              onClick={onOpenExcelModal}
              title="Nhập / Xuất dữ liệu Excel chuẩn mẫu BGD"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 11px',
                borderRadius: '7px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: '#059669',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(5, 150, 105, 0.3)',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#047857'}
              onMouseOut={(e) => e.currentTarget.style.background = '#059669'}
            >
              <FileSpreadsheet size={14} />
              <span>Excel</span>
            </button>
          </div>

          {/* Group 2: Conflict Status Badge */}
          <button
            onClick={onOpenConflictModal}
            title="Bấm để xem chi tiết danh sách xung đột: tiết nào, lớp nào và ai trùng"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '9px',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: errorCount > 0 ? 'rgba(239, 68, 68, 0.22)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${errorCount > 0 ? 'rgba(248, 113, 113, 0.5)' : 'rgba(52, 211, 153, 0.4)'}`,
              color: errorCount > 0 ? '#fca5a5' : '#6ee7b7',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {errorCount > 0 ? (
              <>
                <AlertTriangle size={14} />
                <span>{errorCount} Trùng Lịch</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={14} />
                <span>0 Trùng Giờ</span>
              </>
            )}
          </button>

          {/* Group 2b: Import Report Button (khi có báo cáo đối soát nạp Excel) */}
          {importReportCount > 0 && onOpenImportReport && (
            <button
              onClick={onOpenImportReport}
              title="Bấm để xem lại báo cáo lỗi/cảnh báo sau khi nạp file Excel"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '9px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                background: 'rgba(245, 158, 11, 0.25)',
                border: '1px solid rgba(245, 158, 11, 0.5)',
                color: '#fde68a',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <FileSpreadsheet size={14} />
              <span>Báo Cáo Nạp ({importReportCount})</span>
            </button>
          )}

          {/* Group 3: Core Scheduling Actions (Auto Schedule + Clear Timetable in One Segment) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.45)',
            borderRadius: '10px',
            padding: '2px',
            border: '1px solid rgba(251, 191, 36, 0.35)',
            gap: '2px'
          }}>
            {/* Auto Schedule AI Button */}
            <button
              onClick={onAutoSchedule}
              disabled={isAutoScheduling}
              title="Tự động xếp lịch thông minh AI cho toàn bộ các lớp"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                border: 'none',
                color: '#ffffff',
                cursor: isAutoScheduling ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 10px rgba(245, 158, 11, 0.4)',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => { if (!isAutoScheduling) e.currentTarget.style.transform = 'scale(1.02)'; }}
              onMouseOut={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              <Sparkles size={15} className={isAutoScheduling ? 'animate-spin' : ''} />
              <span>{isAutoScheduling ? 'Đang Xếp...' : 'Tự Động Xếp Lịch'}</span>
            </button>

            {/* Clear Timetable Button (Paired in same scheduling group) */}
            <button
              onClick={onClearTimetable}
              title="Xóa toàn bộ thời khóa biểu tất cả các lớp để xếp lại từ đầu (có xác nhận)"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '7px 10px',
                borderRadius: '8px',
                background: 'transparent',
                border: 'none',
                color: '#fca5a5',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.3)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#fca5a5';
              }}
            >
              <Trash2 size={13} />
              <span>Xóa TKB</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div style={{
        maxWidth: '1600px',
        margin: '0 auto',
        padding: '0 24px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        overflowX: 'auto'
      }}>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 18px',
                fontSize: '0.85rem',
                fontWeight: isActive ? 700 : 500,
                color: isActive ? '#ffffff' : '#c7d2fe',
                background: isActive ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                border: 'none',
                borderBottom: isActive ? '3px solid #fbbf24' : '3px solid transparent',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseOver={(e) => {
                if (!isActive) e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                if (!isActive) e.currentTarget.style.color = '#c7d2fe';
              }}
            >
              <Icon size={16} color={isActive ? '#fbbf24' : '#a5b4fc'} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
