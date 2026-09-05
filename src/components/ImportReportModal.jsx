// src/components/ImportReportModal.jsx
// Modal Báo Cáo Đối Soát Dữ Liệu Sau Khi Nạp Excel
// Giữ nguyên 100% dữ liệu gốc, thông báo chi tiết lỗi/xung đột và hỗ trợ điều hướng sửa lỗi tức thì

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  Calendar,
  Clock,
  School,
  Sparkles,
  MapPin
} from 'lucide-react';

export const ImportReportModal = ({
  isOpen,
  onClose,
  report = {},
  classes = [],
  onNavigateToSlot
}) => {
  const [filterType, setFilterType] = useState('ALL'); // ALL, ERRORS, WARNINGS
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  const errors = report.errors || [];
  const warnings = report.warnings || [];
  const summary = report.summary || {};

  const errorCount = errors.length;
  const warningCount = warnings.length;
  const totalCount = errorCount + warningCount;

  // Lấy danh sách hợp nhất các mục cần đối soát
  const allItems = useMemo(() => {
    return [
      ...errors.map(e => ({ ...e, isError: true })),
      ...warnings.map(w => ({ ...w, isError: false }))
    ];
  }, [errors, warnings]);

  // Bộ lọc danh sách
  const filteredItems = useMemo(() => {
    return allItems.filter(item => {
      // 1. Lọc theo loại
      if (filterType === 'ERRORS' && !item.isError) return false;
      if (filterType === 'WARNINGS' && item.isError) return false;

      // 2. Lọc theo lớp
      if (selectedClassFilter !== 'ALL') {
        const matchClass = item.classId === selectedClassFilter || 
          (item.conflictingSlots && item.conflictingSlots.some(s => s.classId === selectedClassFilter));
        if (!matchClass) return false;
      }

      // 3. Tìm kiếm từ khóa
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const msgMatch = item.message?.toLowerCase().includes(kw);
        const refMatch = item.cellRef?.toLowerCase().includes(kw);
        const nameMatch = item.teacherName?.toLowerCase().includes(kw) || item.value?.toLowerCase().includes(kw);
        const clsMatch = item.classId?.toLowerCase().includes(kw);
        const titleMatch = item.title?.toLowerCase().includes(kw);
        if (!msgMatch && !refMatch && !nameMatch && !clsMatch && !titleMatch) return false;
      }

      return true;
    });
  }, [allItems, filterType, selectedClassFilter, searchKeyword]);

  if (!isOpen) return null;

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
        maxWidth: '1050px',
        width: '100%',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* MODAL HEADER */}
        <div style={{
          padding: '20px 28px',
          background: errorCount > 0 
            ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)' 
            : (warningCount > 0 ? 'linear-gradient(135deg, #92400e 0%, #b45309 100%)' : 'linear-gradient(135deg, #065f46 0%, #047857 100%)'),
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: 'rgba(255, 255, 255, 0.2)',
              padding: '10px',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {errorCount > 0 ? <AlertTriangle size={26} color="#fecaca" /> : (warningCount > 0 ? <AlertCircle size={26} color="#fde68a" /> : <CheckCircle2 size={26} color="#a7f3d0" />)}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Báo Cáo Đối Soát Dữ Liệu Sau Khi Nạp Excel</span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: errorCount > 0 ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.3)',
                  fontWeight: 700
                }}>
                  {errorCount > 0 ? `${errorCount} Lỗi cần sửa` : '0 Lỗi'}
                  {warningCount > 0 ? ` • ${warningCount} Cảnh báo` : ''}
                </span>
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                Dữ liệu đã được nạp nguyên vẹn vào Thời khóa biểu. Bấm nút "Chỉnh sửa" tại từng ô để mở ngay lớp cần xử lý.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: 'none',
              background: 'rgba(255, 255, 255, 0.15)',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.25)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* METRICS STRIP */}
        <div style={{
          padding: '14px 28px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '12px'
        }}>
          <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Lớp Đã Nạp</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#2563eb' }}>{summary.totalClasses || classes.length || 0} Lớp</div>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Giáo Viên Nhận Diện</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#7c3aed' }}>{summary.totalTeachers || 0} GV</div>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Tiết Đã Nạp Vào TKB</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#059669' }}>{summary.totalSlots || 0} Tiết</div>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Lỗi Trùng / Dữ Liệu</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: errorCount > 0 ? '#dc2626' : '#16a34a' }}>
              {errorCount} Lỗi
            </div>
          </div>
          <div style={{ background: '#ffffff', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Cảnh Báo Cần Lưu Ý</div>
            <div style={{ fontSize: '1.2rem', fontWeight: 800, color: warningCount > 0 ? '#d97706' : '#64748b' }}>
              {warningCount} Cảnh báo
            </div>
          </div>
        </div>

        {/* CONTROLS BAR: FILTERS & SEARCH */}
        <div style={{
          padding: '12px 28px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          background: '#ffffff'
        }}>
          {/* Tab Filter */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setFilterType('ALL')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterType === 'ALL' ? '1px solid #2563eb' : '1px solid #cbd5e1',
                background: filterType === 'ALL' ? '#2563eb' : '#ffffff',
                color: filterType === 'ALL' ? '#ffffff' : '#475569'
              }}
            >
              Tất cả ({totalCount})
            </button>
            <button
              onClick={() => setFilterType('ERRORS')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterType === 'ERRORS' ? '1px solid #dc2626' : '1px solid #cbd5e1',
                background: filterType === 'ERRORS' ? '#dc2626' : '#ffffff',
                color: filterType === 'ERRORS' ? '#ffffff' : '#475569'
              }}
            >
              Lỗi trùng lịch ({errorCount})
            </button>
            <button
              onClick={() => setFilterType('WARNINGS')}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterType === 'WARNINGS' ? '1px solid #d97706' : '1px solid #cbd5e1',
                background: filterType === 'WARNINGS' ? '#d97706' : '#ffffff',
                color: filterType === 'WARNINGS' ? '#ffffff' : '#475569'
              }}
            >
              Cảnh báo ({warningCount})
            </button>
          </div>

          {/* Search and Class selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Class filter */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 600 }}>Lớp:</span>
              <select
                value={selectedClassFilter}
                onChange={(e) => setSelectedClassFilter(e.target.value)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '0.8rem',
                  outline: 'none',
                  background: '#ffffff',
                  color: '#1e293b'
                }}
              >
                <option value="ALL">Toàn bộ các lớp</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name || c.id}</option>
                ))}
              </select>
            </div>

            {/* Keyword Search */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '8px',
              padding: '4px 10px'
            }}>
              <Search size={14} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm GV, môn, ô Excel..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '0.8rem', width: '160px' }}
              />
            </div>
          </div>
        </div>

        {/* LIST OF ISSUES */}
        <div style={{
          padding: '16px 28px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {filteredItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#16a34a' }}>
              <CheckCircle2 size={44} style={{ margin: '0 auto 12px auto' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 6px 0' }}>
                {totalCount === 0 ? 'Dữ liệu thời khóa biểu hoàn hảo!' : 'Không có mục nào phù hợp bộ lọc.'}
              </h3>
              <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                {totalCount === 0 ? 'Tất cả các tiết học đã được nạp chính xác, không phát hiện trùng lịch hoặc bất thường nào.' : 'Hãy thử chọn bộ lọc khác hoặc xóa từ khóa tìm kiếm.'}
              </p>
            </div>
          ) : (
            filteredItems.map((item, idx) => (
              <div
                key={`report_item_${idx}`}
                style={{
                  background: item.isError ? '#fff5f5' : '#fffbeb',
                  border: `1.5px solid ${item.isError ? '#fca5a5' : '#fde68a'}`,
                  borderRadius: '14px',
                  padding: '14px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                }}
              >
                {/* Header row: Badge + Location + Class + Action Button */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Badge */}
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: item.isError ? '#dc2626' : '#d97706',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {item.isError ? <AlertTriangle size={12} /> : <AlertCircle size={12} />}
                      <span>{item.title || (item.isError ? 'LỖI TRÙNG LỊCH' : 'CẢNH BÁO')}</span>
                    </span>

                    {/* Cell Coordinates */}
                    {item.cellRef && (
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#1e293b',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <MapPin size={12} color="#64748b" />
                        <span>Ô Excel: <strong>{item.cellRef}</strong></span>
                      </span>
                    )}

                    {/* Class badge */}
                    {item.classId && (
                      <span style={{
                        padding: '3px 10px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe'
                      }}>
                        Lớp {item.classId}
                      </span>
                    )}
                  </div>

                  {/* Direct Navigate to Studio Button */}
                  {item.classId && onNavigateToSlot && (
                    <button
                      onClick={() => {
                        onNavigateToSlot(item.classId, item.day, item.period);
                        onClose();
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '6px 12px',
                        borderRadius: '8px',
                        border: 'none',
                        background: item.isError ? '#dc2626' : '#d97706',
                        color: '#ffffff',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
                    >
                      <span>Sửa ô này tại Lớp {item.classId}</span>
                      <ArrowRight size={13} />
                    </button>
                  )}
                </div>

                {/* Message detail */}
                <div style={{
                  color: item.isError ? '#991b1b' : '#92400e',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  lineHeight: '1.45'
                }}>
                  {item.message}
                </div>

                {/* Conflicting classes list if any */}
                {item.conflictingSlots && item.conflictingSlots.length > 0 && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    flexWrap: 'wrap',
                    background: 'rgba(255, 255, 255, 0.65)',
                    padding: '6px 10px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0,0,0,0.06)'
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#475569' }}>Các lớp liên quan:</span>
                    {item.conflictingSlots.map((cSlot, cIdx) => (
                      <button
                        key={cIdx}
                        onClick={() => {
                          onNavigateToSlot(cSlot.classId, cSlot.day, cSlot.period);
                          onClose();
                        }}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          border: '1px solid #cbd5e1',
                          background: '#ffffff',
                          color: '#1e40af',
                          fontSize: '0.73rem',
                          fontWeight: 700,
                          cursor: 'pointer'
                        }}
                      >
                        {cSlot.classId} ({cSlot.cellRef || `Ô dòng ${cSlot.row}`}) ➔
                      </button>
                    ))}
                  </div>
                )}

                {/* Suggestion */}
                {item.suggestion && (
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#64748b',
                    background: 'rgba(255, 255, 255, 0.75)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    borderLeft: `3px solid ${item.isError ? '#ef4444' : '#f59e0b'}`
                  }}>
                    💡 <strong>Gợi ý:</strong> {item.suggestion}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* MODAL FOOTER */}
        <div style={{
          padding: '14px 28px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
            Toàn bộ thời khóa biểu đã được nạp và lưu an toàn. Bạn có thể đóng cửa sổ này và chỉnh sửa bất kỳ lúc nào.
          </div>
          <button
            onClick={onClose}
            style={{
              padding: '8px 20px',
              borderRadius: '10px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            Đóng Lại (Tôi sẽ tự sửa sau)
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
