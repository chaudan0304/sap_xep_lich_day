// src/components/AutoScheduleModal.jsx
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Sparkles, X } from 'lucide-react';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';

export const AutoScheduleModal = ({
  isOpen,
  onClose,
  onExecuteSchedule,
  classes,
  teachers: _teachers,
  assignments,
  timetable,
  subjects: _subjects = DEFAULT_SUBJECTS,
  isScheduling = false
}) => {
  const [scheduleMode, setScheduleMode] = useState('FILL_UNASSIGNED'); // 'FILL_UNASSIGNED' | 'FULL_RESET'
  const [category, setCategory] = useState('ALL'); // 'ALL' | 'SPECIALIZED' | 'CORE' | 'ELECTIVE' | 'CUSTOM'
  const [selectedSubjectIds, _setSelectedSubjectIds] = useState([]);
  const [scopeType, setScopeType] = useState('ALL'); // 'ALL' | 'GRADE' | 'CLASS'
  const [selectedGrade, setSelectedGrade] = useState(1);
  const [selectedClassIds, _setSelectedClassIds] = useState([]);

  // Thống kê số tiết trống và số tiết còn thiếu
  const stats = useMemo(() => {
    let emptySlotsCount = 0;
    let placedSlotsCount = 0;

    classes.forEach(cls => {
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          const slot = timetable[cls.id]?.[d]?.[p];
          if (slot && slot.subjectId) {
            placedSlotsCount++;
          } else {
            emptySlotsCount++;
          }
        }
      }
    });

    // Tính tổng số tiết cần xếp theo định mức
    let totalAssignedPeriods = 0;
    assignments.forEach(a => {
      totalAssignedPeriods += (a.weeklyPeriods || 0);
    });

    const unassignedNeeded = Math.max(0, totalAssignedPeriods - placedSlotsCount);

    return {
      emptySlotsCount,
      placedSlotsCount,
      totalAssignedPeriods,
      unassignedNeeded
    };
  }, [classes, timetable, assignments]);

  if (!isOpen) return null;

  // Xử lý gửi lệnh xếp lịch
  const handleSubmit = (e) => {
    e.preventDefault();

    let targetClassIds = null;
    if (scopeType === 'GRADE') {
      targetClassIds = classes.filter(c => c.grade === Number(selectedGrade)).map(c => c.id);
    } else if (scopeType === 'CLASS') {
      targetClassIds = selectedClassIds.length > 0 ? selectedClassIds : null;
    }

    const options = {
      mode: scheduleMode,
      category: category,
      selectedSubjectIds: category === 'CUSTOM' ? selectedSubjectIds : null,
      targetClassIds: targetClassIds
    };

    onExecuteSchedule(options);
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(15, 23, 42, 0.7)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '20px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '24px',
        width: '100%',
        maxWidth: '700px',
        maxHeight: '92vh',
        overflowY: 'auto',
        padding: '28px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
        border: '1px solid #e2e8f0',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b, #d97706)',
              padding: '10px',
              borderRadius: '14px',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)'
            }}>
              <Sparkles size={24} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#1e293b' }}>
                Tùy Chọn Tự Động Xếp Lịch (AI Scheduler)
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '2px' }}>
                Chọn chế độ và phân loại các môn cần xếp tự động vào thời khóa biểu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isScheduling}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
          >
            <X size={22} color="#94a3b8" />
          </button>
        </div>

        {/* Thông tin thống kê hiện tại */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '10px',
          background: '#f8fafc',
          padding: '12px 16px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          marginBottom: '22px'
        }}>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Đã xếp trên TKB:</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#10b981' }}>{stats.placedSlotsCount} tiết</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Ô còn trống:</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#6366f1' }}>{stats.emptySlotsCount} ô</div>
          </div>
          <div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: 600 }}>Cần xếp bổ sung:</div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: stats.unassignedNeeded > 0 ? '#f59e0b' : '#10b981' }}>
              {stats.unassignedNeeded} tiết
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 1. CHỌN CHẾ ĐỘ XẾP */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>
              1. Chế Độ Xếp Lịch:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Option 1: Điền khuyết */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px',
                borderRadius: '12px',
                border: `2px solid ${scheduleMode === 'FILL_UNASSIGNED' ? '#4f46e5' : '#e2e8f0'}`,
                background: scheduleMode === 'FILL_UNASSIGNED' ? '#eef2ff' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={scheduleMode === 'FILL_UNASSIGNED'}
                  onChange={() => setScheduleMode('FILL_UNASSIGNED')}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', color: scheduleMode === 'FILL_UNASSIGNED' ? '#312e81' : '#1e293b' }}>
                    🎯 Chỉ Xếp Các Môn Chưa Xếp (Khuyên Dùng)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                    <strong>Giữ nguyên 100%</strong> các tiết đã xếp trước đó. Chỉ tìm ô trống để xếp bù các môn còn thiếu cho đủ định mức tuần.
                  </div>
                </div>
              </label>

              {/* Option 2: Xếp mới toàn bộ */}
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '14px',
                borderRadius: '12px',
                border: `2px solid ${scheduleMode === 'FULL_RESET' ? '#f59e0b' : '#e2e8f0'}`,
                background: scheduleMode === 'FULL_RESET' ? '#fffbeb' : '#ffffff',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}>
                <input
                  type="radio"
                  name="scheduleMode"
                  checked={scheduleMode === 'FULL_RESET'}
                  onChange={() => setScheduleMode('FULL_RESET')}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontWeight: 800, fontSize: '0.875rem', color: scheduleMode === 'FULL_RESET' ? '#92400e' : '#1e293b' }}>
                    ⚡ Xếp Lại Mới Toàn Bộ (Full Reset)
                  </div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', lineHeight: 1.4 }}>
                    Xóa các tiết tự do và xếp lại toàn bộ từ đầu (chỉ giữ lại các tiết có khóa cố định).
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* 2. PHÂN LOẠI MÔN HỌC CẦN XẾP */}
          <div style={{ marginBottom: '22px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>
              2. Phân Loại Môn Học Cần Xếp:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {/* Tất cả các môn */}
              <button
                type="button"
                onClick={() => setCategory('ALL')}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${category === 'ALL' ? '#4f46e5' : '#e2e8f0'}`,
                  background: category === 'ALL' ? '#eef2ff' : '#ffffff',
                  color: category === 'ALL' ? '#312e81' : '#334155',
                  cursor: 'pointer',
                  fontWeight: category === 'ALL' ? 700 : 500,
                  fontSize: '0.82rem'
                }}
              >
                🌐 <strong>Tất Cả Các Môn</strong> (Toán, Tiếng Việt, Ngoại ngữ, Tin học, Thể dục...)
              </button>

              {/* Môn phòng chức năng / chuyên biệt */}
              <button
                type="button"
                onClick={() => setCategory('SPECIALIZED')}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${category === 'SPECIALIZED' ? '#4f46e5' : '#e2e8f0'}`,
                  background: category === 'SPECIALIZED' ? '#eef2ff' : '#ffffff',
                  color: category === 'SPECIALIZED' ? '#312e81' : '#334155',
                  cursor: 'pointer',
                  fontWeight: category === 'SPECIALIZED' ? 700 : 500,
                  fontSize: '0.82rem'
                }}
              >
                💻 <strong>Chỉ Môn Phòng Chức Năng</strong> (Tin học, Ngoại ngữ, Thể dục, Âm nhạc, Mỹ thuật)
              </button>

              {/* Môn chính khóa / GVCN */}
              <button
                type="button"
                onClick={() => setCategory('CORE')}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${category === 'CORE' ? '#4f46e5' : '#e2e8f0'}`,
                  background: category === 'CORE' ? '#eef2ff' : '#ffffff',
                  color: category === 'CORE' ? '#312e81' : '#334155',
                  cursor: 'pointer',
                  fontWeight: category === 'CORE' ? 700 : 500,
                  fontSize: '0.82rem'
                }}
              >
                📖 <strong>Chỉ Môn Chính Khóa / GVCN</strong> (Toán, Tiếng Việt, Đạo đức, HĐTN, TNXH...)
              </button>

              {/* Môn Tự chọn / Phát triển năng lực */}
              <button
                type="button"
                onClick={() => setCategory('ELECTIVE')}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: `1.5px solid ${category === 'ELECTIVE' ? '#4f46e5' : '#e2e8f0'}`,
                  background: category === 'ELECTIVE' ? '#eef2ff' : '#ffffff',
                  color: category === 'ELECTIVE' ? '#312e81' : '#334155',
                  cursor: 'pointer',
                  fontWeight: category === 'ELECTIVE' ? 700 : 500,
                  fontSize: '0.82rem'
                }}
              >
                ✏️ <strong>Chỉ Môn Tự Chọn / PTNL</strong> (Phát triển năng lực, Đọc thư viện, Tiết GVCN)
              </button>
            </div>
          </div>

          {/* 3. PHẠM VI LỚP CẦN XẾP */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 800, color: '#1e293b', marginBottom: '10px' }}>
              3. Phạm Vi Lớp Áp Dụng:
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                <input
                  type="radio"
                  name="scopeType"
                  checked={scopeType === 'ALL'}
                  onChange={() => setScopeType('ALL')}
                />
                <span>Toàn trường ({classes.length} lớp)</span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600, color: '#334155' }}>
                <input
                  type="radio"
                  name="scopeType"
                  checked={scopeType === 'GRADE'}
                  onChange={() => setScopeType('GRADE')}
                />
                <span>Theo Khối:</span>
              </label>

              {scopeType === 'GRADE' && (
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(Number(e.target.value))}
                  style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.82rem', fontWeight: 700 }}
                >
                  {[1, 2, 3, 4, 5].map(g => (
                    <option key={g} value={g}>Khối {g} ({classes.filter(c => c.grade === g).length} lớp)</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Form Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isScheduling}
              style={{
                padding: '10px 20px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer'
              }}
            >
              Hủy Bỏ
            </button>

            <button
              type="submit"
              disabled={isScheduling}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.875rem',
                cursor: isScheduling ? 'not-allowed' : 'pointer',
                boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)'
              }}
            >
              <Sparkles size={16} />
              <span>{isScheduling ? 'Đang Xếp Lịch...' : 'Bắt Đầu Xếp Lịch Tự Động'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};
