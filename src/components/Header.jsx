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
  RotateCcw, 
  Trash2,
  AlertTriangle,
  CheckCircle2,
  GraduationCap,
  School,
  Bookmark,
  Save,
  Upload,
  Settings,
  ArrowUpCircle
} from 'lucide-react';

export const Header = ({
  activeTab,
  setActiveTab,
  onAutoSchedule,
  onOpenExcelModal,
  onOpenSettingsModal,
  onOpenUpdateModal,
  updateInfo = null,
  onResetSampleData,
  onClearTimetable,
  onExportBackupJson,
  onImportBackupJson,
  onOpenConflictModal,
  conflicts = [],
  isAutoScheduling = false,
  schoolInfo = { name: 'Trường TH Quỳnh Lộc B', year: 'Năm học 2026 - 2027' }
}) => {
  const jsonFileInputRef = React.useRef(null);

  const handleJsonFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const jsonData = JSON.parse(event.target.result);
        if (onImportBackupJson) onImportBackupJson(jsonData);
        alert('Đã nạp file dữ liệu sao lưu thành công!');
      } catch (err) {
        alert('File không hợp lệ hoặc bị lỗi định dạng JSON!');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };
  const errorCount = conflicts.filter(c => c.severity === 'error').length;
  const warningCount = conflicts.filter(c => c.severity === 'warning').length;

  const navItems = [
    { id: 'studio', label: 'Studio Xếp Lịch', icon: Calendar, badge: null },
    { id: 'teachers', label: 'Danh Sách Giáo Viên', icon: Users, badge: null },
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: '1.2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                EduTimetable <span style={{ color: '#a5b4fc', fontWeight: 600 }}>Tiểu Học</span>
              </h1>
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
            <p style={{ fontSize: '0.78rem', color: '#c7d2fe', marginTop: '2px' }}>
              Hệ thống Xếp Thời Khóa Biểu & Quản Lý Định Mức Chuẩn CTGDPT 2018
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {/* Update Notification Pill (Show when update is available or general checker) */}
          {updateInfo?.hasUpdate ? (
            <button
              onClick={onOpenUpdateModal}
              title={`Đã có phiên bản mới v${updateInfo.latestVersion}! Bấm để xem và tải về`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 800,
                background: 'linear-gradient(135deg, #ec4899, #f43f5e)',
                border: '1px solid #fda4af',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 0 14px rgba(244, 63, 94, 0.5)',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Sparkles size={16} />
              <span>Bản Mới v{updateInfo.latestVersion}</span>
            </button>
          ) : (
            <button
              onClick={onOpenUpdateModal}
              title="Kiểm tra bản cập nhật mới nhất từ GitHub"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 12px',
                borderRadius: '10px',
                fontSize: '0.78rem',
                fontWeight: 700,
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.18)',
                color: '#cbd5e1',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.16)';
                e.currentTarget.style.color = '#ffffff';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
                e.currentTarget.style.color = '#cbd5e1';
              }}
            >
              <ArrowUpCircle size={14} />
              <span>v1.0.0</span>
            </button>
          )}

          {/* School & Period Time Settings Button */}
          <button
            onClick={onOpenSettingsModal}
            title="Cài đặt thông tin trường học, cơ quan quản lý, hiệu trưởng và khung giờ các tiết học"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.12)',
              border: '1px solid rgba(255, 255, 255, 0.25)',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.22)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
            }}
          >
            <Settings size={16} />
            <span>Cài Đặt Trường & Tiết Học</span>
          </button>

          {/* Conflict Status Badge (Interactive Button) */}
          <button
            onClick={onOpenConflictModal}
            title="Bấm để xem chi tiết danh sách xung đột: tiết nào, lớp nào và ai trùng"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: '10px',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: errorCount > 0 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(16, 185, 129, 0.25)',
              border: `1.5px solid ${errorCount > 0 ? 'rgba(239, 68, 68, 0.6)' : 'rgba(16, 185, 129, 0.6)'}`,
              color: errorCount > 0 ? '#fca5a5' : '#6ee7b7',
              transition: 'all 0.2s ease',
              boxShadow: errorCount > 0 ? '0 0 12px rgba(239, 68, 68, 0.3)' : 'none'
            }}
            onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            {errorCount > 0 ? (
              <>
                <AlertTriangle size={16} />
                <span>{errorCount} Trùng Giờ / Phòng (Xem Chi Tiết)</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} />
                <span>0 Trùng Giờ {warningCount > 0 ? `(${warningCount} Cảnh báo)` : '(Chuẩn)'}</span>
              </>
            )}
          </button>

          {/* Excel Import / Export Button */}
          <button
            onClick={onOpenExcelModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: '#059669',
              border: '1px solid #10b981',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#047857'}
            onMouseOut={(e) => e.currentTarget.style.background = '#059669'}
          >
            <FileSpreadsheet size={16} />
            <span>Nhập / Xuất Excel</span>
          </button>

          {/* Export JSON Data File */}
          <button
            onClick={onExportBackupJson}
            title="Lưu file sao lưu toàn bộ dữ liệu dự án (.json) về máy tính"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: '#2563eb',
              border: '1px solid #3b82f6',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = '#1d4ed8'}
            onMouseOut={(e) => e.currentTarget.style.background = '#2563eb'}
          >
            <Save size={16} />
            <span>Lưu File Dữ Liệu</span>
          </button>

          {/* Import JSON Data File */}
          <button
            onClick={() => jsonFileInputRef.current?.click()}
            title="Tải nạp file sao lưu (.json) từ máy tính"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '10px',
              fontSize: '0.82rem',
              fontWeight: 700,
              background: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          >
            <Upload size={16} />
            <span>Nạp File (.json)</span>
          </button>
          <input
            type="file"
            ref={jsonFileInputRef}
            onChange={handleJsonFileChange}
            accept=".json"
            style={{ display: 'none' }}
          />

          {/* Auto Schedule AI Button */}
          <button
            onClick={onAutoSchedule}
            disabled={isAutoScheduling}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              borderRadius: '10px',
              fontSize: '0.85rem',
              fontWeight: 700,
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              border: '1px solid #fbbf24',
              color: '#ffffff',
              cursor: isAutoScheduling ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)',
              transform: isAutoScheduling ? 'scale(0.98)' : 'scale(1)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => { if (!isAutoScheduling) e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <Sparkles size={16} className={isAutoScheduling ? 'animate-spin' : ''} />
            <span>{isAutoScheduling ? 'Đang Xếp Lịch...' : 'Tự Động Xếp Lịch'}</span>
          </button>

          {/* Clear Button */}
          <button
            onClick={onClearTimetable}
            title="Xóa thời khóa biểu để xếp lại từ đầu"
            style={{
              padding: '8px 10px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.25)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)'}
          >
            <Trash2 size={15} />
          </button>
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
