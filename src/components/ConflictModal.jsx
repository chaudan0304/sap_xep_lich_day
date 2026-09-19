// src/components/ConflictModal.jsx
// Modal Tra Cứu & Hiển Thị Chi Tiết Xung Đột, Trùng Giờ, Trùng Phòng
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Users,
  Building2,
  Clock,
  Calendar,
  Layers,
  ArrowRight,
  Search
} from 'lucide-react';

export const ConflictModal = ({
  isOpen,
  onClose,
  conflicts = [],
  classes = [],
  teachers: _teachers = [],
  onNavigateToClass
}) => {
  const [filterType, setFilterType] = useState('ALL'); // ALL, TEACHER, ROOM, OFF_SESSION, QUOTA
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  const [searchKeyword, setSearchKeyword] = useState('');

  const errorCount = useMemo(() => conflicts.filter(c => c.severity === 'error').length, [conflicts]);
  const warningCount = useMemo(() => conflicts.filter(c => c.severity === 'warning').length, [conflicts]);

  const filteredConflicts = useMemo(() => {
    return conflicts.filter(c => {
      // 1. Lọc theo loại
      if (filterType === 'ERRORS' && c.severity !== 'error') return false;
      if (filterType === 'WARNINGS' && c.severity !== 'warning') return false;
      if (filterType === 'TEACHER' && c.type !== 'TEACHER_DOUBLE_BOOKING') return false;
      if (filterType === 'ROOM' && c.type !== 'ROOM_DOUBLE_BOOKING') return false;
      if (filterType === 'OFF_SESSION' && c.type !== 'TEACHER_OFF_SESSION') return false;
      if (filterType === 'QUOTA' && c.type !== 'TEACHER_MAX_DAILY' && c.type !== 'SUBJECT_QUOTA_EXCEEDED') return false;

      // 2. Lọc theo lớp
      if (selectedClassFilter !== 'ALL') {
        const isMatch = c.classId === selectedClassFilter || (c.conflictingClassIds && c.conflictingClassIds.includes(selectedClassFilter));
        if (!isMatch) return false;
      }

      // 3. Tìm kiếm từ khóa
      if (searchKeyword.trim()) {
        const kw = searchKeyword.toLowerCase();
        const msgMatch = c.message?.toLowerCase().includes(kw);
        const nameMatch = c.teacherName?.toLowerCase().includes(kw);
        const clsMatch = c.className?.toLowerCase().includes(kw) || c.conflictingClassNames?.toLowerCase().includes(kw);
        const roomMatch = c.roomName?.toLowerCase().includes(kw);
        if (!msgMatch && !nameMatch && !clsMatch && !roomMatch) return false;
      }

      return true;
    });
  }, [conflicts, filterType, selectedClassFilter, searchKeyword]);

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
        maxWidth: '1000px',
        width: '100%',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45)',
        border: '1px solid #e2e8f0',
        overflow: 'hidden'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '20px 28px',
          background: errorCount > 0 
            ? 'linear-gradient(135deg, #7f1d1d 0%, #991b1b 50%, #b91c1c 100%)' 
            : (warningCount > 0 
                ? 'linear-gradient(135deg, #78350f 0%, #92400e 50%, #b45309 100%)' 
                : 'linear-gradient(135deg, #064e3b 0%, #065f46 50%, #047857 100%)'),
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
              {errorCount > 0 ? (
                <AlertTriangle size={26} color="#fecaca" />
              ) : (warningCount > 0 ? (
                <AlertCircle size={26} color="#fde68a" />
              ) : (
                <CheckCircle2 size={26} color="#a7f3d0" />
              ))}
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>Bảng Kiểm Tra & Cảnh Báo Trùng Lịch</span>
                <span style={{
                  fontSize: '0.75rem',
                  padding: '3px 10px',
                  borderRadius: '999px',
                  background: errorCount > 0 
                    ? 'rgba(255, 255, 255, 0.25)' 
                    : (warningCount > 0 ? 'rgba(255, 255, 255, 0.22)' : 'rgba(255, 255, 255, 0.3)'),
                  fontWeight: 700
                }}>
                  {errorCount > 0 
                    ? `${errorCount} Lỗi Trùng Giờ/Phòng${warningCount > 0 ? ` • ${warningCount} Cảnh báo` : ''}` 
                    : (warningCount > 0 ? `0 Trùng Giờ • ${warningCount} Cảnh báo` : '0 Trùng Giờ (Hoàn hảo)')}
                </span>
              </h2>
              <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.85)' }}>
                {errorCount > 0 
                  ? 'Hiển thị rõ ràng Tiết học, Buổi học, Lớp học và Giáo viên/Phòng học bị trùng'
                  : (warningCount > 0 
                      ? 'Không có lỗi trùng giờ/phòng. Phát hiện cảnh báo về định mức môn hoặc phân công giảng dạy'
                      : 'Tất cả tiết học, giáo viên và phòng chức năng đều không có xung đột hay cảnh báo nào')}
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
              transition: 'background 0.2s ease'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div style={{
          padding: '14px 28px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Quick Filter Tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterType('ALL')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterType === 'ALL' ? '1px solid #4f46e5' : '1px solid #cbd5e1',
                background: filterType === 'ALL' ? '#4f46e5' : '#ffffff',
                color: filterType === 'ALL' ? '#ffffff' : '#475569'
              }}
            >
              Tất cả ({conflicts.length})
            </button>

            <button
              onClick={() => setFilterType('TEACHER')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterType === 'TEACHER' ? '1px solid #dc2626' : '1px solid #cbd5e1',
                background: filterType === 'TEACHER' ? '#dc2626' : '#ffffff',
                color: filterType === 'TEACHER' ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Users size={13} />
              <span>Trùng giờ GV ({conflicts.filter(c => c.type === 'TEACHER_DOUBLE_BOOKING').length})</span>
            </button>

            <button
              onClick={() => setFilterType('ROOM')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterType === 'ROOM' ? '1px solid #ea580c' : '1px solid #cbd5e1',
                background: filterType === 'ROOM' ? '#ea580c' : '#ffffff',
                color: filterType === 'ROOM' ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Building2 size={13} />
              <span>Trùng phòng ({conflicts.filter(c => c.type === 'ROOM_DOUBLE_BOOKING').length})</span>
            </button>

            <button
              onClick={() => setFilterType('OFF_SESSION')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterType === 'OFF_SESSION' ? '1px solid #d97706' : '1px solid #cbd5e1',
                background: filterType === 'OFF_SESSION' ? '#d97706' : '#ffffff',
                color: filterType === 'OFF_SESSION' ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Clock size={13} />
              <span>Buổi nghỉ ({conflicts.filter(c => c.type === 'TEACHER_OFF_SESSION').length})</span>
            </button>

            <button
              onClick={() => setFilterType('QUOTA')}
              style={{
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: filterType === 'QUOTA' ? '1px solid #b45309' : '1px solid #cbd5e1',
                background: filterType === 'QUOTA' ? '#b45309' : '#ffffff',
                color: filterType === 'QUOTA' ? '#ffffff' : '#475569',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Layers size={13} />
              <span>Vượt định mức ({conflicts.filter(c => c.type === 'SUBJECT_QUOTA_EXCEEDED' || c.type === 'TEACHER_MAX_DAILY').length})</span>
            </button>
          </div>

          {/* Secondary Filters: Class & Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={selectedClassFilter}
              onChange={(e) => setSelectedClassFilter(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.78rem',
                fontWeight: 600,
                color: '#334155',
                background: '#ffffff'
              }}
            >
              <option value="ALL">Tất cả lớp học</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              borderRadius: '8px'
            }}>
              <Search size={13} color="#94a3b8" />
              <input
                type="text"
                placeholder="Tìm GV, lớp, phòng..."
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                style={{ border: 'none', outline: 'none', fontSize: '0.78rem', width: '130px' }}
              />
            </div>
          </div>
        </div>

        {/* Modal Body: Conflict Items List */}
        <div style={{
          padding: '20px 28px',
          overflowY: 'auto',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {filteredConflicts.length === 0 ? (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: '#dcfce7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle2 size={36} color="#16a34a" />
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#166534', margin: 0 }}>
                Không có xung đột nào phù hợp với bộ lọc
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0, maxWidth: '420px' }}>
                {conflicts.length === 0 
                  ? 'Thời khóa biểu hoàn toàn chính xác! 0 trùng giờ giáo viên, 0 trùng phòng chức năng.' 
                  : 'Hãy thử chọn "Tất cả" hoặc xóa bộ lọc để xem các cảnh báo khác.'}
              </p>
            </div>
          ) : (
            filteredConflicts.map((item, idx) => {
              const isError = item.severity === 'error';
              const isRoomBooking = item.type === 'ROOM_DOUBLE_BOOKING';
              const isQuotaExceeded = item.type === 'SUBJECT_QUOTA_EXCEEDED';

              return (
                <div
                  key={item.id || idx}
                  className="animate-fade-in"
                  style={{
                    background: isError ? '#fff5f5' : '#fffbeb',
                    border: `1.5px solid ${isError ? '#fca5a5' : '#fde68a'}`,
                    borderRadius: '16px',
                    padding: '16px 20px',
                    boxShadow: 'var(--shadow-sm)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  {/* Top Bar: Title & Tags */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        background: isError ? '#ef4444' : isQuotaExceeded ? '#b45309' : '#d97706',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {isError ? <AlertTriangle size={12} /> : <AlertCircle size={12} />}
                        <span>{isQuotaExceeded ? 'XẾP VƯỢT ĐỊNH MỨC MÔN' : (item.title || (isError ? 'LỖI TRÙNG LỊCH' : 'CẢNH BÁO'))}</span>
                      </span>

                      {/* Time Badge */}
                      {item.day ? (
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: '#ffffff',
                          border: '1px solid #cbd5e1',
                          color: '#1e293b',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}>
                          <Calendar size={13} color="#4f46e5" />
                          <span>{item.dayName || `Thứ ${item.day}`}</span>
                          <span style={{ color: '#94a3b8' }}>•</span>
                          <span>{item.periodName || `Tiết ${item.period}`}</span>
                        </span>
                      ) : (
                        <span style={{
                          padding: '3px 10px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          background: '#ffffff',
                          border: '1px solid #fde68a',
                          color: '#b45309',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <Layers size={13} color="#d97706" />
                          <span>Định mức tuần: <strong>{item.placed} / {item.weeklyPeriods}</strong> tiết</span>
                          <span style={{
                            background: '#dc2626',
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            fontSize: '0.7rem',
                            fontWeight: 800
                          }}>
                            Thừa {item.excessPeriods || (item.placed - item.weeklyPeriods)} tiết
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Quick navigation buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {item.conflictingClasses && item.conflictingClasses.length > 0 ? (
                        item.conflictingClasses.map(clsObj => (
                          <button
                            key={clsObj.classId}
                            onClick={() => {
                              if (onNavigateToClass) onNavigateToClass(clsObj.classId);
                              onClose();
                            }}
                            title={`Chuyển đến Studio Xếp Lịch của ${clsObj.className}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 10px',
                              borderRadius: '6px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <span>Đến {clsObj.className}</span>
                            <ArrowRight size={12} />
                          </button>
                        ))
                      ) : (
                        item.classId && (
                          <button
                            onClick={() => {
                              if (onNavigateToClass) onNavigateToClass(item.classId);
                              onClose();
                            }}
                            title={`Chuyển đến Studio Xếp Lịch của ${item.className}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '5px 12px',
                              borderRadius: '6px',
                              background: '#eff6ff',
                              border: '1px solid #bfdbfe',
                              color: '#1d4ed8',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer'
                            }}
                          >
                            <span>Đến {item.className}</span>
                            <ArrowRight size={12} />
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Core Details Grid */}
                  <div style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '12px 16px',
                    border: '1px solid rgba(0,0,0,0.06)',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                    gap: '12px',
                    fontSize: '0.82rem'
                  }}>
                    {/* Ai trùng (Giáo viên hoặc Phòng) */}
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                        {isRoomBooking ? '🏢 Phòng Chức Năng Bị Trùng:' : isQuotaExceeded ? '👤 Giáo Viên Phụ Trách Môn:' : '👤 Giáo Viên Bị Trùng / Vi Phạm:'}
                      </div>
                      <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {isRoomBooking ? (
                          item.roomName || item.roomType
                        ) : isQuotaExceeded ? (
                          item.teacherName && item.teacherName !== 'Chưa phân công' ? (
                            <>
                              <span>{item.teacherName}</span>
                              {item.teacherCode && <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 700 }}>({item.teacherCode})</span>}
                            </>
                          ) : (
                            <span style={{ color: '#94a3b8', fontWeight: 500, fontStyle: 'italic' }}>Chưa phân công GV</span>
                          )
                        ) : (
                          <>
                            <span>{item.teacherName || item.teacherId}</span>
                            {item.teacherCode && <span style={{ fontSize: '0.75rem', color: '#4f46e5', fontWeight: 700 }}>({item.teacherCode})</span>}
                          </>
                        )}
                      </div>
                    </div>

                    {/* Lớp & Môn học */}
                    <div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600, textTransform: 'uppercase', marginBottom: '2px' }}>
                        {isQuotaExceeded ? '🏫 Lớp & Môn Học Vi Phạm:' : '🏫 Các Lớp Bị Ảnh Hưởng:'}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        {isQuotaExceeded ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 800, color: '#1e293b' }}>{item.className}</span>
                            <span style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#eef2ff',
                              border: '1px solid #c7d2fe',
                              color: '#4338ca',
                              fontWeight: 800,
                              fontSize: '0.8rem'
                            }}>
                              Môn: {item.subjectName}
                            </span>
                          </div>
                        ) : item.conflictingClasses && item.conflictingClasses.length > 0 ? (
                          item.conflictingClasses.map((c) => (
                            <span key={c.classId} style={{
                              padding: '2px 8px',
                              borderRadius: '6px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              color: '#1e293b',
                              fontWeight: 700,
                              fontSize: '0.78rem'
                            }}>
                              {c.className} <span style={{ color: '#6366f1' }}>({c.subjectName})</span>
                            </span>
                          ))
                        ) : (
                          <span style={{ fontWeight: 700, color: '#1e293b' }}>{item.className}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Danh Sách Vị Trí Các Tiết Đã Xếp (Khi vượt định mức) */}
                  {item.placedSlots && item.placedSlots.length > 0 && (
                    <div style={{
                      padding: '10px 14px',
                      background: '#ffffff',
                      borderRadius: '10px',
                      border: '1px solid #fde68a',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#b45309', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Clock size={13} />
                        <span>Vị trí các tiết môn {item.subjectName} đang xếp trên TKB ({item.placed} tiết):</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {item.placedSlots.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            style={{
                              padding: '3px 8px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              background: '#fffbeb',
                              border: '1px solid #fde68a',
                              color: '#92400e',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                          >
                            <Calendar size={11} color="#d97706" />
                            <span>{s.dayName}: {s.periodName} ({s.session})</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Clear Message */}
                  <div style={{
                    fontSize: '0.82rem',
                    color: isError ? '#991b1b' : '#92400e',
                    fontWeight: 600,
                    lineHeight: '1.4'
                  }}>
                    {item.message}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '14px 28px',
          background: '#f8fafc',
          borderTop: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
            {errorCount > 0 ? (
              <>Hiển thị <strong>{filteredConflicts.length}</strong> / <strong>{conflicts.length}</strong> vấn đề ({errorCount} trùng giờ/phòng{warningCount > 0 ? `, ${warningCount} cảnh báo` : ''})</>
            ) : warningCount > 0 ? (
              <>Hiển thị <strong>{filteredConflicts.length}</strong> / <strong>{conflicts.length}</strong> cảnh báo (0 trùng giờ)</>
            ) : (
              <>0 xung đột • Thời khóa biểu hoàn hảo</>
            )}
          </span>

          <button
            onClick={onClose}
            style={{
              padding: '8px 22px',
              borderRadius: '10px',
              background: '#4f46e5',
              border: 'none',
              color: '#ffffff',
              fontWeight: 700,
              fontSize: '0.85rem',
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
            }}
          >
            Đóng Bảng Tra Cứu
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
