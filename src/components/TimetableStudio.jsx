// src/components/TimetableStudio.jsx
import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Lock, 
  Unlock, 
  Trash2, 
  ArrowLeftRight, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Info,
  Printer,
  Sparkles,
  Flag,
  Users as UsersIcon,
  Search,
  Building
} from 'lucide-react';
import { DAYS_OF_WEEK, PERIODS } from '../constants/defaultCurriculum';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import { validateSlotPlacement } from '../services/conflictDetector';

export const TimetableStudio = ({
  classes,
  teachers,
  assignments,
  timetable,
  setTimetable,
  conflicts,
  subjects = DEFAULT_SUBJECTS,
  onAutoScheduleSingleClass,
  onOpenConflictModal,
  selectedClassId: externalClassId,
  onSelectClass: externalSetClassId
}) => {
  const [internalClassId, setInternalClassId] = useState(classes[0]?.id || '1A1');
  const selectedClassId = externalClassId || internalClassId;
  const setSelectedClassId = externalSetClassId || setInternalClassId;

  const [draggedSubject, setDraggedSubject] = useState(null); // { subjectId, teacherId, roomType, classId }
  const [draggedSlot, setDraggedSlot] = useState(null); // { fromDay, fromPeriod }
  const [swapSource, setSwapSource] = useState(null); // { day, period, slot } for click-to-swap mode
  const [drawerSearch, setDrawerSearch] = useState('');

  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const selectedClass = currentClass;
  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

  // Lấy phân công của lớp hiện tại
  const classAssignments = useMemo(() => {
    return assignments.filter(a => a.classId === selectedClassId);
  }, [assignments, selectedClassId]);

  // Đếm số lượng tiết đã xếp cho từng môn của lớp hiện tại
  const placedCounts = useMemo(() => {
    const counts = {};
    for (let day = 2; day <= 6; day++) {
      for (let period = 1; period <= 7; period++) {
        const slot = timetable[selectedClassId]?.[day]?.[period];
        if (slot && slot.subjectId) {
          counts[slot.subjectId] = (counts[slot.subjectId] || 0) + 1;
        }
      }
    }
    return counts;
  }, [timetable, selectedClassId]);

  const totalScheduled = Object.values(placedCounts).reduce((sum, c) => sum + c, 0);

  // Lấy danh sách xung đột liên quan đến lớp hiện tại
  const classConflicts = useMemo(() => {
    return (conflicts || []).filter(c => c.classId === selectedClassId || (c.conflictingClassIds && c.conflictingClassIds.includes(selectedClassId)));
  }, [conflicts, selectedClassId]);

  // Kiểm tra 1 ô cụ thể có bị xung đột không
  const getSlotConflict = (day, period) => {
    return classConflicts.find(c => c.day === day && c.period === period);
  };

  // 1. Xử lý Kéo Thả (Drag & Drop)
  const handleDragStartFromDrawer = (e, asg) => {
    const payload = {
      sourceType: 'drawer',
      subjectId: asg.subjectId,
      teacherId: asg.teacherId,
      roomType: asg.roomType,
      classId: selectedClassId
    };
    setDraggedSubject(payload);
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
  };

  const handleDragStartFromSlot = (e, day, period, slot) => {
    if (slot.isLocked) return;
    const payload = {
      sourceType: 'slot',
      fromDay: day,
      fromPeriod: period,
      slot: { ...slot },
      classId: selectedClassId
    };
    setDraggedSlot(payload);
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnSlot = (e, targetDay, targetPeriod) => {
    e.preventDefault();
    const dataStr = e.dataTransfer.getData('application/json');
    if (!dataStr) return;

    try {
      const data = JSON.parse(dataStr);
      const currentTargetSlot = timetable[selectedClassId]?.[targetDay]?.[targetPeriod];

      // Nếu kéo từ Drawer vào Ô
      if (data.sourceType === 'drawer') {
        setTimetable(prev => {
          const updatedClass = { ...prev[selectedClassId] };
          updatedClass[targetDay] = { ...updatedClass[targetDay] };
          updatedClass[targetDay][targetPeriod] = {
            subjectId: data.subjectId,
            teacherId: data.teacherId,
            roomId: data.roomType || 'LOP_HOC',
            roomType: data.roomType,
            isLocked: false
          };
          return { ...prev, [selectedClassId]: updatedClass };
        });
      }
      // Nếu kéo từ Ô này sang Ô khác
      else if (data.sourceType === 'slot') {
        const { fromDay, fromPeriod, slot } = data;
        if (fromDay === targetDay && fromPeriod === targetPeriod) return;

        setTimetable(prev => {
          const updatedClass = { ...prev[selectedClassId] };
          updatedClass[fromDay] = { ...updatedClass[fromDay] };
          updatedClass[targetDay] = { ...updatedClass[targetDay] };

          // Hoán đổi (Swap) nếu ô đích đã có môn, hoặc di chuyển nếu ô đích trống
          updatedClass[fromDay][fromPeriod] = currentTargetSlot ? { ...currentTargetSlot } : null;
          updatedClass[targetDay][targetPeriod] = { ...slot };

          return { ...prev, [selectedClassId]: updatedClass };
        });
      }
    } catch (err) {
      console.error('Drag drop error:', err);
    } finally {
      setDraggedSubject(null);
      setDraggedSlot(null);
    }
  };

  // 2. Thao tác Click-to-Swap
  const handleSlotClick = (day, period, slot) => {
    if (!swapSource) {
      if (slot && !slot.isLocked) {
        setSwapSource({ day, period, slot });
      }
    } else {
      // Đã có ô nguồn, thực hiện hoán đổi với ô đích
      const fromDay = swapSource.day;
      const fromPeriod = swapSource.period;
      const targetSlot = timetable[selectedClassId]?.[day]?.[period];

      setTimetable(prev => {
        const updatedClass = { ...prev[selectedClassId] };
        updatedClass[fromDay] = { ...updatedClass[fromDay] };
        updatedClass[day] = { ...updatedClass[day] };

        updatedClass[fromDay][fromPeriod] = targetSlot ? { ...targetSlot } : null;
        updatedClass[day][period] = { ...swapSource.slot };

        return { ...prev, [selectedClassId]: updatedClass };
      });

      setSwapSource(null);
    }
  };

  // 3. Khóa / Mở Khóa Ô
  const toggleLockSlot = (e, day, period) => {
    e.stopPropagation();
    const slot = timetable[selectedClassId]?.[day]?.[period];
    if (!slot) return;

    setTimetable(prev => {
      const updatedClass = { ...prev[selectedClassId] };
      updatedClass[day] = { ...updatedClass[day] };
      updatedClass[day][period] = { ...slot, isLocked: !slot.isLocked };
      return { ...prev, [selectedClassId]: updatedClass };
    });
  };

  // 4. Xóa Ô
  const handleClearSlot = (e, day, period) => {
    e.stopPropagation();

    setTimetable(prev => {
      const updatedClass = { ...prev[selectedClassId] };
      updatedClass[day] = { ...updatedClass[day] };
      updatedClass[day][period] = null;
      return { ...prev, [selectedClassId]: updatedClass };
    });
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Top Class Selector & Stats Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        padding: '14px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Class Tabs */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
          {classes.map(cls => {
            const isSelected = selectedClassId === cls.id;
            return (
              <button
                key={cls.id}
                onClick={() => {
                  setSelectedClassId(cls.id);
                  setSwapSource(null);
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  background: isSelected ? '#eef2ff' : '#ffffff',
                  color: isSelected ? '#4338ca' : '#475569',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {cls.name}
              </button>
            );
          })}
        </div>

        {/* Status & Quick Print */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Progress */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 14px',
            borderRadius: '8px',
            background: totalScheduled >= 32 ? '#ecfdf5' : '#eff6ff',
            color: totalScheduled >= 32 ? '#065f46' : '#1e40af',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}>
            <CheckCircle2 size={16} color={totalScheduled >= 32 ? '#10b981' : '#3b82f6'} />
            <span>Tiến độ: {totalScheduled} / 32 tiết</span>
          </div>

          {/* Conflict Badge */}
          {classConflicts.length > 0 ? (
            <button
              onClick={() => onOpenConflictModal && onOpenConflictModal()}
              title="Bấm để xem danh sách chi tiết: tiết nào, lớp nào, ai trùng"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#fef2f2',
                border: '1.5px solid #f87171',
                color: '#b91c1c',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 0 10px rgba(239, 68, 68, 0.25)',
                transition: 'transform 0.15s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.04)'}
              onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <AlertTriangle size={15} color="#dc2626" />
              <span>{classConflicts.length} Xung Đột (Xem Chi Tiết)</span>
            </button>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              color: '#15803d',
              fontSize: '0.8rem',
              fontWeight: 700
            }}>
              <CheckCircle2 size={15} />
              <span>0 Trùng Giờ</span>
            </div>
          )}

          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Printer size={15} />
            <span>In Bản A4</span>
          </button>
        </div>
      </div>

      {/* DETAILED CONFLICT ALERT BANNER FOR THIS CLASS */}
      {classConflicts.length > 0 && (
        <div className="animate-fade-in" style={{
          background: '#fff5f5',
          border: '1.5px solid #f87171',
          borderRadius: '14px',
          padding: '14px 20px',
          marginBottom: '18px',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.15)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', flex: 1 }}>
            <div style={{
              background: '#ef4444',
              color: '#ffffff',
              borderRadius: '10px',
              padding: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '2px'
            }}>
              <AlertTriangle size={20} />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: '#991b1b', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span>CẢNH BÁO: Phát hiện {classConflicts.length} xung đột / trùng lịch tại {currentClass.name}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', background: '#fee2e2', padding: '2px 8px', borderRadius: '6px' }}>
                  Cần điều chỉnh
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                {classConflicts.map((cf, idx) => (
                  <div key={cf.id || idx} style={{
                    fontSize: '0.82rem',
                    background: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid #fecaca',
                    color: '#7f1d1d',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 800, color: '#991b1b', background: '#fee2e2', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem' }}>
                        {cf.dayName || `Thứ ${cf.day}`} • {cf.periodName || `Tiết ${cf.period}`}
                      </span>

                      {cf.type === 'TEACHER_DOUBLE_BOOKING' && (
                        <span>
                          🔴 <strong>Trùng giờ GV:</strong> <span style={{ color: '#0f172a', fontWeight: 800 }}>{cf.teacherName}</span> ({cf.teacherCode}) đang dạy cùng lúc với <strong>[{cf.conflictingClassNames}]</strong>
                        </span>
                      )}

                      {cf.type === 'ROOM_DOUBLE_BOOKING' && (
                        <span>
                          🔴 <strong>Trùng Phòng:</strong> <span style={{ color: '#0f172a', fontWeight: 800 }}>{cf.roomName}</span> đang bị trùng bởi <strong>[{cf.conflictingClassNames}]</strong>
                        </span>
                      )}

                      {cf.type === 'TEACHER_OFF_SESSION' && (
                        <span>
                          🟡 <strong>Buổi nghỉ:</strong> <span style={{ color: '#0f172a', fontWeight: 800 }}>{cf.teacherName}</span> đã đăng ký nghỉ buổi này
                        </span>
                      )}

                      {cf.type === 'TEACHER_MAX_DAILY' && (
                        <span>
                          🟡 <strong>Vượt định mức ngày:</strong> <span style={{ color: '#0f172a', fontWeight: 800 }}>{cf.teacherName}</span> dạy {cf.dailyCount} tiết/ngày (tối đa {cf.maxPerDay})
                        </span>
                      )}

                      {cf.type === 'SUBJECT_QUOTA_EXCEEDED' && (
                        <span>
                          🟡 <strong>Vượt số tiết:</strong> Môn {cf.subjectName} đã xếp {cf.placed} tiết (mức phân công: {cf.weeklyPeriods}T)
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {onOpenConflictModal && (
            <button
              onClick={onOpenConflictModal}
              style={{
                background: '#dc2626',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '8px 16px',
                fontSize: '0.8rem',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(220, 38, 38, 0.3)',
                whiteSpace: 'nowrap'
              }}
            >
              Xem Toàn Bộ Lỗi ({conflicts.length})
            </button>
          )}
        </div>
      )}

      {/* Swap Mode Notification Bar */}
      {swapSource && (
        <div className="animate-fade-in" style={{
          background: '#eff6ff',
          border: '1px solid #93c5fd',
          color: '#1e40af',
          padding: '10px 18px',
          borderRadius: '10px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ArrowLeftRight size={18} />
            <span>
              Đang chọn <strong>{(subjects[swapSource.slot.subjectId] || DEFAULT_SUBJECTS[swapSource.slot.subjectId])?.name || swapSource.slot.subjectId}</strong> (Thứ {swapSource.day}, Tiết {swapSource.period}). Hãy bấm vào một ô khác trên bảng để Hoán Đổi vị trí!
            </span>
          </div>
          <button
            onClick={() => setSwapSource(null)}
            style={{
              padding: '4px 10px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #93c5fd',
              color: '#1e40af',
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            Hủy Chế Độ Đổi
          </button>
        </div>
      )}

      {/* Main Content Layout: Left Drawer + Right Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '20px', alignItems: 'start' }}>
        
        {/* LEFT COLUMN: Subject Drawer (Giỏ môn học) */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: 'var(--shadow-sm)',
          padding: '16px',
          position: 'sticky',
          top: '90px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#1e293b' }}>
              🎒 Giỏ Môn Học ({classAssignments.length})
            </h3>
            <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
              Kéo thả vào bảng
            </span>
          </div>

          {/* Search Drawer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: '#f8fafc',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            padding: '6px 10px',
            marginBottom: '12px'
          }}>
            <Search size={14} color="#94a3b8" />
            <input
              type="text"
              placeholder="Lọc môn học..."
              value={drawerSearch}
              onChange={(e) => setDrawerSearch(e.target.value)}
              style={{ border: 'none', background: 'transparent', outline: 'none', width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          {/* Draggable Cards List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: '4px' }}>
            {classAssignments
              .filter(asg => {
                const sub = (subjects && subjects[asg.subjectId]) || DEFAULT_SUBJECTS[asg.subjectId];
                return !drawerSearch || (sub?.name?.toLowerCase().includes(drawerSearch.toLowerCase()) || asg.subjectId.toLowerCase().includes(drawerSearch.toLowerCase()));
              })
              .map(asg => {
                const sub = (subjects && subjects[asg.subjectId]) || DEFAULT_SUBJECTS[asg.subjectId] || { name: asg.subjectId, bg: '#f8fafc', border: '#e2e8f0', text: '#334155', color: '#64748b' };
                const teacher = teacherMap.get(asg.teacherId);
                const placed = placedCounts[asg.subjectId] || 0;
                const needed = asg.weeklyPeriods;
                const isComplete = placed >= needed;
                const isOver = placed > needed;

                return (
                  <div
                    key={asg.id}
                    draggable
                    onDragStart={(e) => handleDragStartFromDrawer(e, asg)}
                    style={{
                      background: sub.bg,
                      border: `1px solid ${isOver ? '#ef4444' : (isComplete ? '#10b981' : sub.border)}`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      cursor: 'grab',
                      userSelect: 'none',
                      transition: 'all 0.15s ease',
                      boxShadow: 'var(--shadow-sm)'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.875rem', color: sub.text }}>
                          {sub.name}
                        </span>
                      </div>

                      {/* Quota Badge */}
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '999px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        background: isComplete ? (isOver ? '#fee2e2' : '#dcfce7') : '#ffffff',
                        color: isComplete ? (isOver ? '#b91c1c' : '#15803d') : sub.text,
                        border: `1px solid ${isComplete ? (isOver ? '#fca5a5' : '#86efac') : sub.border}`
                      }}>
                        {placed} / {needed}T {isComplete && (isOver ? '⚠️' : '✓')}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', color: '#64748b' }}>
                      <span>GV: <strong style={{ color: '#334155' }}>{teacher?.name || asg.teacherId}</strong></span>
                      {asg.roomType && asg.roomType !== 'LOP_HOC' && (
                        <span style={{ background: 'rgba(0,0,0,0.06)', padding: '1px 5px', borderRadius: '4px', fontSize: '0.7rem' }}>
                          🏢 {asg.roomType.replace('PHONG_', '').replace('SAN_', '')}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

        {/* RIGHT COLUMN: 5-Day Timetable Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Bell Schedule Box */}
          <div style={{
            background: '#f8fafc',
            borderRadius: '12px',
            border: '1px solid #e2e8f0',
            padding: '8px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '0.75rem'
          }}>
            <span style={{ fontWeight: 800, color: '#1e293b' }}>⏰ Khung Giờ Học:</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', padding: '1px 5px', borderRadius: '4px' }}>SÁNG:</span>
                <span style={{ color: '#334155' }}>
                  <strong>T1</strong> (07:30 - 08:05) • <strong>T2</strong> (08:15 - 08:50) • <strong>T3</strong> (09:10 - 09:45) • <strong>T4</strong> (09:55 - 10:30)
                </span>
              </div>
              <div style={{ width: '1px', height: '12px', background: '#cbd5e1' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ fontWeight: 800, color: '#b45309', background: '#fffbeb', padding: '1px 5px', borderRadius: '4px' }}>CHIỀU:</span>
                <span style={{ color: '#334155' }}>
                  <strong>T1</strong> (14:00 - 14:35) • <strong>T2</strong> (14:45 - 15:20) • <strong>T3</strong> (15:30 - 16:05)
                </span>
              </div>
            </div>
          </div>

          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: 'var(--shadow-sm)',
            overflow: 'hidden'
          }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '14px 6px', width: '55px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, borderRight: '1px solid #e2e8f0' }}>
                      Buổi
                    </th>
                    <th style={{ padding: '14px 6px', width: '55px', color: '#475569', fontSize: '0.8rem', fontWeight: 800, borderRight: '1px solid #e2e8f0' }}>
                      Tiết
                    </th>
                    {DAYS_OF_WEEK.map(day => (
                      <th key={day.id} style={{ padding: '14px', color: '#1e1b4b', fontSize: '0.9rem', fontWeight: 800 }}>
                        {day.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {PERIODS.map((period, pIdx) => {
                    const isMorning = period.session === 'morning';
                    const isLunchBreak = period.id === 4; // Sau tiết 4 sáng là giờ nghỉ trưa

                    return (
                      <React.Fragment key={period.id}>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {/* Buổi (Sáng / Chiều) Column with rowSpan */}
                          {period.id === 1 && (
                            <td
                              rowSpan={4}
                              style={{
                                background: '#eff6ff',
                                color: '#1e40af',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                borderRight: '2px solid #bfdbfe',
                                verticalAlign: 'middle',
                                letterSpacing: '1px'
                              }}
                            >
                              <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>SÁNG</span>
                              </div>
                            </td>
                          )}

                          {period.id === 5 && (
                            <td
                              rowSpan={3}
                              style={{
                                background: '#fffbeb',
                                color: '#b45309',
                                fontWeight: 800,
                                fontSize: '0.85rem',
                                borderRight: '2px solid #fde68a',
                                verticalAlign: 'middle',
                                letterSpacing: '1px'
                              }}
                            >
                              <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span>CHIỀU</span>
                              </div>
                            </td>
                          )}

                          {/* Period Number Only */}
                          <td
                            title={`${period.name}: ${period.time}`}
                            style={{
                              padding: '12px 6px',
                              background: isMorning ? '#f8fafc' : '#fffdf5',
                              borderRight: '1px solid #e2e8f0',
                              verticalAlign: 'middle'
                            }}
                          >
                            <div style={{ fontWeight: 800, fontSize: '1.05rem', color: isMorning ? '#2563eb' : '#d97706' }}>
                              {period.id <= 4 ? period.id : (period.id - 4)}
                            </div>
                          </td>

                        {/* 5 Day Slot Cells */}
                        {DAYS_OF_WEEK.map(day => {
                          const slot = timetable[selectedClassId]?.[day.id]?.[period.id];
                          const sub = slot ? ((subjects && subjects[slot.subjectId]) || DEFAULT_SUBJECTS[slot.subjectId] || { name: slot.subjectRaw || slot.subjectId, bg: '#f8fafc', border: '#cbd5e1', text: '#334155' }) : null;
                          const teacher = slot ? teacherMap.get(slot.teacherId) : null;
                          const conflict = getSlotConflict(day.id, period.id);

                          const isSwapActive = swapSource && swapSource.day === day.id && swapSource.period === period.id;
                          const isWedAfternoonOff = day.id === 4 && period.id > 4;

                          if (isWedAfternoonOff) {
                            return (
                              <td
                                key={day.id}
                                style={{
                                  padding: '6px',
                                  height: '88px',
                                  width: '18%',
                                  verticalAlign: 'middle',
                                  borderRight: '1px solid #f1f5f9',
                                  background: '#f1f5f9'
                                }}
                              >
                                <div style={{
                                  height: '100%',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  color: '#94a3b8',
                                  fontSize: '0.78rem',
                                  fontWeight: 600,
                                  fontStyle: 'italic'
                                }}>
                                  Nghỉ chiều T4
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={day.id}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDropOnSlot(e, day.id, period.id)}
                              onClick={() => handleSlotClick(day.id, period.id, slot)}
                              style={{
                                padding: '6px',
                                height: '88px',
                                width: '18%',
                                verticalAlign: 'middle',
                                borderRight: '1px solid #f1f5f9',
                                background: isSwapActive ? '#dbeafe' : 'transparent',
                                cursor: 'pointer',
                                position: 'relative'
                              }}
                            >
                              {slot ? (
                                <div
                                  draggable={!slot.isLocked}
                                  onDragStart={(e) => handleDragStartFromSlot(e, day.id, period.id, slot)}
                                  className={conflict ? 'conflict-pulse' : ''}
                                  style={{
                                    height: '100%',
                                    background: sub?.bg || '#f8fafc',
                                    border: `1.5px solid ${conflict ? '#ef4444' : (sub?.border || '#cbd5e1')}`,
                                    borderRadius: '10px',
                                    padding: '6px 8px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'space-between',
                                    textAlign: 'left',
                                    position: 'relative',
                                    boxShadow: conflict ? '0 0 10px rgba(239, 68, 68, 0.3)' : 'var(--shadow-sm)',
                                    transition: 'all 0.15s ease',
                                    cursor: slot.isLocked ? 'default' : 'grab'
                                  }}
                                >
                                  {/* Top line: Subject Name + Lock / Action Icons */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 800, fontSize: '0.82rem', color: sub?.text || '#1e293b' }}>
                                      {sub?.name || slot.subjectId}
                                    </span>

                                    {/* Action Icons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }} onClick={(e) => e.stopPropagation()}>
                                      {conflict && (
                                        <span title={conflict.message} style={{ color: '#ef4444' }}>
                                          <AlertTriangle size={14} />
                                        </span>
                                      )}

                                      <button
                                        onClick={(e) => toggleLockSlot(e, day.id, period.id)}
                                        title={slot.isLocked ? 'Mở khóa tiết' : 'Khóa cố định tiết này'}
                                        style={{
                                          border: 'none',
                                          background: 'transparent',
                                          cursor: 'pointer',
                                          padding: '2px',
                                          color: slot.isLocked ? '#4f46e5' : '#94a3b8'
                                        }}
                                      >
                                        {slot.isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                                      </button>

                                      {!slot.isLocked && (
                                        <button
                                          onClick={(e) => handleClearSlot(e, day.id, period.id)}
                                          title="Xóa tiết"
                                          style={{
                                            border: 'none',
                                            background: 'transparent',
                                            cursor: 'pointer',
                                            padding: '2px',
                                            color: '#ef4444'
                                          }}
                                        >
                                          <Trash2 size={12} />
                                        </button>
                                      )}
                                    </div>
                                  </div>

                                  {/* Conflict chip if any */}
                                  {conflict && (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (onOpenConflictModal) onOpenConflictModal();
                                      }}
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: 800,
                                        color: '#991b1b',
                                        background: '#fee2e2',
                                        border: '1px solid #fca5a5',
                                        padding: '2px 5px',
                                        borderRadius: '4px',
                                        margin: '2px 0',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '3px',
                                        cursor: 'pointer'
                                      }}
                                      title={conflict.message}
                                    >
                                      <AlertTriangle size={10} color="#dc2626" />
                                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        Trùng: {conflict.teacherCode || conflict.roomCode || 'Lịch'}
                                      </span>
                                    </div>
                                  )}

                                  {/* Bottom line: Teacher & Room */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                                    <span style={{ color: '#475569', fontWeight: 600 }}>
                                      {teacher?.code || teacher?.name || slot.teacherId}
                                    </span>

                                    {slot.roomId && slot.roomId !== 'LOP_HOC' && (
                                      <span style={{
                                        fontSize: '0.65rem',
                                        fontWeight: 700,
                                        background: 'rgba(0,0,0,0.06)',
                                        padding: '1px 4px',
                                        borderRadius: '3px',
                                        color: '#475569'
                                      }}>
                                        {slot.roomId.replace('PHONG_', '').replace('SAN_', '')}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                /* Empty Slot Dropzone */
                                <div
                                  style={{
                                    height: '100%',
                                    border: '1.5px dashed #cbd5e1',
                                    borderRadius: '10px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: '#cbd5e1',
                                    fontSize: '0.75rem',
                                    background: '#fafafa',
                                    transition: 'all 0.15s ease'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.borderColor = '#94a3b8';
                                    e.currentTarget.style.background = '#f1f5f9';
                                    e.currentTarget.style.color = '#64748b';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.borderColor = '#cbd5e1';
                                    e.currentTarget.style.background = '#fafafa';
                                    e.currentTarget.style.color = '#cbd5e1';
                                  }}
                                >
                                  <Plus size={14} />
                                </div>
                              )}
                            </td>
                          );
                        })}
                      </tr>

                      {/* Lunch Break Divider */}
                      {isLunchBreak && (
                        <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
                          <td colSpan="7" style={{ padding: '8px', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                            🍱 NGHỈ TRƯA & ĂN BÁN TRÚ (10:30 - 14:00)
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DEDICATED OFFICIAL PRINTABLE SHEET FOR CLASS (A4 PORTRAIT)   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="printable-sheet">
        {/* National / School Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #000', paddingBottom: '8px', marginBottom: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10pt', textTransform: 'uppercase', fontWeight: 700 }}>UBND PHƯỜNG TÂN MAI</div>
            <div style={{ fontSize: '11pt', textTransform: 'uppercase', fontWeight: 800 }}>TRƯỜNG TIỂU HỌC QUỲNH LỘC B</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10pt', fontWeight: 800 }}>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div style={{ fontSize: '9pt', fontStyle: 'italic', textDecoration: 'underline', marginTop: '2px' }}>Độc lập - Tự do - Hạnh phúc</div>
          </div>
        </div>

        {/* Timetable Title */}
        <div style={{ textAlign: 'center', margin: '10px 0 12px 0' }}>
          <h1 style={{ fontSize: '16pt', fontWeight: 900, margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            THỜI KHÓA BIỂU {selectedClass?.name?.startsWith('Lớp ') ? selectedClass.name.toUpperCase() : `LỚP ${(selectedClass?.name || '').toUpperCase()}`}
          </h1>
          <div style={{ fontSize: '9.5pt', fontStyle: 'italic', marginTop: '4px' }}>
            Áp dụng từ ngày 05/09/2026 • Năm học 2026 - 2027
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '6px', fontSize: '9.5pt', fontWeight: 600 }}>
            <span>Giáo viên chủ nhiệm: <strong>{teacherMap.get(selectedClass?.homeroomTeacherId)?.name || 'Chưa phân công'}</strong></span>
            <span>Phòng học: <strong>{selectedClass?.mainRoom || 'Phòng học lớp'}</strong></span>
            <span>Sĩ số: <strong>{selectedClass?.studentCount || 35} học sinh</strong></span>
          </div>
        </div>

        {/* Official Printable Table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #000', textAlign: 'center', fontSize: '9pt' }}>
          <thead>
            <tr style={{ background: '#f1f5f9', borderBottom: '1.5px solid #000' }}>
              <th style={{ border: '1px solid #000', width: '45px', padding: '6px 2px', fontWeight: 800 }}>Buổi</th>
              <th style={{ border: '1px solid #000', width: '38px', padding: '6px 2px', fontWeight: 800 }}>Tiết</th>
              <th style={{ border: '1px solid #000', width: '85px', padding: '6px 2px', fontWeight: 800 }}>Thời gian</th>
              {DAYS_OF_WEEK.map(d => (
                <th key={d.id} style={{ border: '1px solid #000', padding: '6px 4px', fontWeight: 800 }}>
                  {d.name.toUpperCase()}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERIODS.map(period => {
              const isMorning = period.session === 'morning';
              const isAfternoon = period.session === 'afternoon';
              const isLunch = period.id === 4;

              return (
                <React.Fragment key={period.id}>
                  <tr>
                    {period.id === 1 && (
                      <td rowSpan={4} style={{ border: '1px solid #000', fontWeight: 800, verticalAlign: 'middle', fontSize: '9.5pt' }}>
                        SÁNG
                      </td>
                    )}
                    {period.id === 5 && (
                      <td rowSpan={3} style={{ border: '1px solid #000', fontWeight: 800, verticalAlign: 'middle', fontSize: '9.5pt' }}>
                        CHIỀU
                      </td>
                    )}

                    <td style={{ border: '1px solid #000', fontWeight: 800, verticalAlign: 'middle', fontSize: '10pt' }}>
                      {period.id <= 4 ? period.id : (period.id - 4)}
                    </td>

                    <td style={{ border: '1px solid #000', fontSize: '8pt', verticalAlign: 'middle', color: '#222' }}>
                      {period.time}
                    </td>

                    {DAYS_OF_WEEK.map(day => {
                      const slot = timetable[selectedClassId]?.[day.id]?.[period.id];
                      const sub = slot ? ((subjects && subjects[slot.subjectId]) || DEFAULT_SUBJECTS[slot.subjectId] || { name: slot.subjectRaw || slot.subjectId }) : null;
                      const teacher = slot ? teacherMap.get(slot.teacherId) : null;
                      const isWedOff = day.id === 4 && period.id > 4;

                      if (isWedOff) {
                        return (
                          <td key={day.id} style={{ border: '1px solid #000', fontStyle: 'italic', color: '#555', background: '#f8fafc', height: '40px', verticalAlign: 'middle' }}>
                            Nghỉ
                          </td>
                        );
                      }

                      return (
                        <td key={day.id} style={{ border: '1px solid #000', height: '40px', padding: '3px 4px', verticalAlign: 'middle' }}>
                          {slot ? (
                            <div>
                              <div style={{ fontWeight: 800, fontSize: '9pt', color: '#000' }}>
                                {sub?.name || slot.subjectId}
                              </div>
                              <div style={{ fontSize: '7.5pt', color: '#333', marginTop: '1px' }}>
                                {teacher?.code || teacher?.name ? `(${teacher?.code || teacher?.name})` : ''}
                              </div>
                            </div>
                          ) : (
                            <span style={{ color: '#aaa' }}>-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {isLunch && (
                    <tr style={{ background: '#f1f5f9', border: '1px solid #000' }}>
                      <td colSpan={8} style={{ border: '1px solid #000', padding: '4px', fontSize: '8.5pt', fontWeight: 800, fontStyle: 'italic' }}>
                        🍱 NGHỈ TRƯA & ĂN BÁN TRÚ (10:30 - 14:00)
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>

        {/* Footer Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '22px', fontSize: '9.5pt' }}>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>NGƯỜI LẬP BIỂU</div>
            <div style={{ fontStyle: 'italic', fontSize: '8pt', marginTop: '2px' }}>(Ký và ghi rõ họ tên)</div>
            <div style={{ height: '45px' }} />
          </div>
          <div style={{ textAlign: 'center', width: '240px' }}>
            <div style={{ fontStyle: 'italic', fontSize: '8.5pt' }}>Tân Mai, ngày 05 tháng 09 năm 2026</div>
            <div style={{ fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>HIỆU TRƯỞNG</div>
            <div style={{ fontStyle: 'italic', fontSize: '8pt', marginTop: '2px' }}>(Ký và đóng dấu)</div>
            <div style={{ height: '50px' }} />
          </div>
        </div>
      </div>
    </div>
  </div>
);
};
