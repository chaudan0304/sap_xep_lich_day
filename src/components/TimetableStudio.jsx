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
  Building,
  ChevronLeft,
  ChevronRight,
  Layers,
  GraduationCap,
  Filter,
  Edit2,
  Edit3,
  Check,
  X as CloseIcon,
  Save,
  Undo2,
  Redo2
} from 'lucide-react';
import { DAYS_OF_WEEK, PERIODS, PERIODS as DEFAULT_PERIODS } from '../constants/defaultCurriculum';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import { validateSlotPlacement } from '../services/conflictDetector';
import { ClassTimetablePrintModal } from './ClassTimetablePrintModal';
import { ClassStudentCountModal } from './ClassStudentCountModal';

export const TimetableStudio = ({
  classes,
  setClasses,
  teachers,
  assignments,
  timetable,
  setTimetable,
  conflicts,
  subjects = DEFAULT_SUBJECTS,
  periods = DEFAULT_PERIODS,
  schoolInfo = {},
  onAutoScheduleSingleClass,
  onOpenConflictModal,
  selectedClassId: externalClassId,
  onSelectClass: externalSetClassId
}) => {
  const [internalClassId, setInternalClassId] = useState(classes[0]?.id || '1A1');
  const selectedClassId = externalClassId || internalClassId;
  const setSelectedClassId = externalSetClassId || setInternalClassId;

  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isStudentCountModalOpen, setIsStudentCountModalOpen] = useState(false);
  const [isEditingInlineCount, setIsEditingInlineCount] = useState(false);
  const [inlineCountVal, setInlineCountVal] = useState('');
  const [draggedSubject, setDraggedSubject] = useState(null); // { subjectId, teacherId, roomType, classId }
  const [draggedSlot, setDraggedSlot] = useState(null); // { fromDay, fromPeriod }
  const [swapSource, setSwapSource] = useState(null); // { day, period, slot } for click-to-swap mode
  const [drawerSearch, setDrawerSearch] = useState('');

  // Undo & Redo History State
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  const setTimetableWithHistory = (updater) => {
    setTimetable(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      // Record previous state in history
      setHistory(h => [...h.slice(-30), JSON.parse(JSON.stringify(prev))]);
      setFuture([]);
      return next;
    });
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previousSnapshot = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    setFuture(f => [JSON.parse(JSON.stringify(timetable)), ...f]);
    setTimetable(previousSnapshot);
    setSwapSource(null);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const nextSnapshot = future[0];
    setFuture(f => f.slice(1));
    setHistory(h => [...h, JSON.parse(JSON.stringify(timetable))]);
    setTimetable(nextSnapshot);
    setSwapSource(null);
  };

  // Keyboard shortcut listener for Ctrl+Z and Ctrl+Y / Ctrl+Shift+Z
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [history, future, timetable]);

  // 1. Grade detection & grouping
  const getGradeOfClass = (cls) => {
    if (!cls) return 1;
    if (cls.grade) return cls.grade;
    const match = cls.name?.match(/(\d+)/) || cls.id?.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  };

  const availableGrades = useMemo(() => {
    const grades = new Set();
    classes.forEach(c => grades.add(getGradeOfClass(c)));
    return Array.from(grades).sort((a, b) => a - b);
  }, [classes]);

  // Tab filter: 'all' | 1 | 2 | 3 | 4 | 5
  const [selectedGradeTab, setSelectedGradeTab] = useState('all');

  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const selectedClass = currentClass;
  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);
  const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

  // 2. Class Stats (Scheduled periods count & conflicts count for every class)
  const classStatsMap = useMemo(() => {
    const map = new Map();
    classes.forEach(c => {
      let count = 0;
      const classTt = timetable[c.id];
      if (classTt) {
        for (let d = 2; d <= 6; d++) {
          if (classTt[d]) {
            for (let p = 1; p <= 7; p++) {
              if (classTt[d][p] && classTt[d][p].subjectId) {
                count++;
              }
            }
          }
        }
      }
      const cConflicts = (conflicts || []).filter(
        conf => conf.classId === c.id || (conf.conflictingClassIds && conf.conflictingClassIds.includes(c.id))
      ).length;

      map.set(c.id, { scheduledCount: count, conflictCount: cConflicts });
    });
    return map;
  }, [classes, timetable, conflicts]);

  // 3. Classes grouped by grade
  const classesByGrade = useMemo(() => {
    const grouped = {};
    availableGrades.forEach(g => { grouped[g] = []; });
    classes.forEach(c => {
      const g = getGradeOfClass(c);
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(c);
    });
    return grouped;
  }, [classes, availableGrades]);

  // 4. Quick Prev / Next Class
  const currentClassIndex = classes.findIndex(c => c.id === selectedClassId);
  const handlePrevClass = () => {
    if (currentClassIndex > 0) {
      setSelectedClassId(classes[currentClassIndex - 1].id);
      setSwapSource(null);
      setIsEditingInlineCount(false);
    }
  };
  const handleNextClass = () => {
    if (currentClassIndex < classes.length - 1) {
      setSelectedClassId(classes[currentClassIndex + 1].id);
      setSwapSource(null);
      setIsEditingInlineCount(false);
    }
  };

  // 5. Save Inline Student Count
  const handleStartInlineEdit = (e) => {
    e.stopPropagation();
    setInlineCountVal(currentClass?.studentCount || 35);
    setIsEditingInlineCount(true);
  };

  const handleSaveInlineCount = (e) => {
    if (e) e.stopPropagation();
    const num = parseInt(inlineCountVal, 10);
    if (!isNaN(num) && num >= 1 && num <= 70) {
      if (setClasses) {
        setClasses(prev => prev.map(c => c.id === selectedClassId ? { ...c, studentCount: num } : c));
      }
    }
    setIsEditingInlineCount(false);
  };

  const handleCancelInlineCount = (e) => {
    if (e) e.stopPropagation();
    setIsEditingInlineCount(false);
  };

  // 6. Xóa sạch lịch đã xếp riêng cho lớp hiện tại
  const handleClearCurrentClass = () => {
    const classData = timetable[selectedClassId];
    const hasSlots = classData && Object.values(classData).some(day => day && Object.values(day).some(slot => slot && slot.subjectId));
    if (!hasSlots) {
      alert(`${currentClass?.name || 'Lớp này'} hiện chưa có tiết nào được xếp!`);
      return;
    }
    if (window.confirm(`Bạn có chắc chắn muốn xóa toàn bộ lịch đã xếp của ${currentClass?.name || 'lớp này'} để xếp lại từ đầu?\n(Lịch các lớp khác vẫn được giữ nguyên)`)) {
      setTimetableWithHistory(prev => ({
        ...prev,
        [selectedClassId]: {}
      }));
      setSwapSource(null);
    }
  };

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
        setTimetableWithHistory(prev => {
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

        setTimetableWithHistory(prev => {
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

      setTimetableWithHistory(prev => {
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

    setTimetableWithHistory(prev => {
      const updatedClass = { ...prev[selectedClassId] };
      updatedClass[day] = { ...updatedClass[day] };
      updatedClass[day][period] = { ...slot, isLocked: !slot.isLocked };
      return { ...prev, [selectedClassId]: updatedClass };
    });
  };

  // 4. Xóa Ô
  const handleClearSlot = (e, day, period) => {
    e.stopPropagation();

    setTimetableWithHistory(prev => {
      const updatedClass = { ...prev[selectedClassId] };
      updatedClass[day] = { ...updatedClass[day] };
      updatedClass[day][period] = null;
      return { ...prev, [selectedClassId]: updatedClass };
    });
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      <div className="no-print">
        {/* Top Class Selector & Stats Bar */}
        <div style={{
          background: '#ffffff',
          padding: '16px 20px',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          marginBottom: '20px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}>
          {/* Row 1: Grade Filter Tabs & Status & Quick Navigation */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            borderBottom: '1px solid #f1f5f9',
            paddingBottom: '12px'
          }}>
            {/* Grade Filter Pills */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.78rem',
                fontWeight: 800,
                color: '#64748b',
                textTransform: 'uppercase',
                marginRight: '2px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Layers size={14} />
                <span>Khối:</span>
              </span>

              {/* Tất cả button */}
              <button
                onClick={() => setSelectedGradeTab('all')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '20px',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: selectedGradeTab === 'all' ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                  background: selectedGradeTab === 'all' ? '#eef2ff' : '#ffffff',
                  color: selectedGradeTab === 'all' ? '#4338ca' : '#64748b',
                  transition: 'all 0.15s ease'
                }}
              >
                Tất cả ({classes.length})
              </button>

              {/* Individual Grade Buttons */}
              {availableGrades.map(g => {
                const count = (classesByGrade[g] || []).length;
                const isSel = selectedGradeTab === g;
                return (
                  <button
                    key={g}
                    onClick={() => {
                      setSelectedGradeTab(g);
                      // If current selected class is not in this grade, auto-select first class in this grade
                      const firstInGrade = classesByGrade[g]?.[0];
                      if (firstInGrade && getGradeOfClass(currentClass) !== g) {
                        setSelectedClassId(firstInGrade.id);
                        setSwapSource(null);
                      }
                    }}
                    style={{
                      padding: '5px 14px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      border: isSel ? '1.5px solid #4f46e5' : '1px solid #e2e8f0',
                      background: isSel ? '#eef2ff' : '#ffffff',
                      color: isSel ? '#4338ca' : '#64748b',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Khối {g} ({count})
                  </button>
                );
              })}
            </div>

            {/* Right: Quick Nav & Status & Print */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              {/* Prev / Next Class Navigation with Student Count & Homeroom */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: '#f8fafc',
                padding: '3px 10px',
                borderRadius: '10px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    onClick={handlePrevClass}
                    disabled={currentClassIndex <= 0}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      cursor: currentClassIndex <= 0 ? 'not-allowed' : 'pointer',
                      color: currentClassIndex <= 0 ? '#cbd5e1' : '#475569',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Lớp trước"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b', padding: '0 4px', minWidth: '46px', textAlign: 'center' }}>
                    {currentClass?.name?.replace('Lớp ', '') || currentClass?.id}
                  </span>
                  <button
                    onClick={handleNextClass}
                    disabled={currentClassIndex >= classes.length - 1}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      cursor: currentClassIndex >= classes.length - 1 ? 'not-allowed' : 'pointer',
                      color: currentClassIndex >= classes.length - 1 ? '#cbd5e1' : '#475569',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Lớp kế tiếp"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div style={{ width: '1px', height: '14px', background: '#cbd5e1' }} />

                {/* Sĩ số lớp hiện tại (Editable & Click to change) */}
                {isEditingInlineCount ? (
                  <div
                    onClick={e => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      background: '#ffffff',
                      padding: '1px 6px',
                      borderRadius: '6px',
                      border: '1.5px solid #4f46e5'
                    }}
                  >
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#4338ca' }}>Sĩ số:</span>
                    <input
                      type="number"
                      min="1"
                      max="70"
                      value={inlineCountVal}
                      onChange={e => setInlineCountVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleSaveInlineCount(e);
                        if (e.key === 'Escape') handleCancelInlineCount(e);
                      }}
                      autoFocus
                      style={{
                        width: '46px',
                        padding: '2px 4px',
                        borderRadius: '4px',
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8rem',
                        fontWeight: 800,
                        textAlign: 'center'
                      }}
                    />
                    <span style={{ fontSize: '0.75rem', color: '#64748b' }}>HS</span>
                    <button
                      onClick={handleSaveInlineCount}
                      style={{ background: '#10b981', border: 'none', borderRadius: '4px', padding: '2px 5px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Lưu (Enter)"
                    >
                      <Check size={12} />
                    </button>
                    <button
                      onClick={handleCancelInlineCount}
                      style={{ background: '#ef4444', border: 'none', borderRadius: '4px', padding: '2px 5px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                      title="Hủy (Esc)"
                    >
                      <CloseIcon size={12} />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={handleStartInlineEdit}
                    title="Bấm để chỉnh sửa nhanh sĩ số lớp này, hoặc mở quản lý sĩ số"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      fontSize: '0.78rem',
                      color: '#475569',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: '2px 6px',
                      borderRadius: '6px',
                      transition: 'all 0.15s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#eef2ff'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <UsersIcon size={13} color="#4f46e5" />
                    <span>Sĩ số: <strong style={{ color: '#0f172a' }}>{currentClass?.studentCount || 35}</strong> HS</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsStudentCountModalOpen(true);
                      }}
                      title="Mở bảng chỉnh sửa sĩ số tất cả các lớp"
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#6366f1',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        padding: '1px'
                      }}
                    >
                      <Edit3 size={12} />
                    </button>
                  </div>
                )}

                <div style={{ width: '1px', height: '14px', background: '#cbd5e1' }} />

                {/* GVCN lớp hiện tại */}
                <div style={{
                  fontSize: '0.78rem',
                  color: '#475569',
                  fontWeight: 600
                }}>
                  <span>GVCN: <strong style={{ color: '#0f172a' }}>{teacherMap.get(currentClass?.homeroomTeacherId)?.name || 'Chưa gán'}</strong></span>
                </div>
              </div>

              {/* Progress */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                background: totalScheduled >= 32 ? '#ecfdf5' : '#eff6ff',
                color: totalScheduled >= 32 ? '#065f46' : '#1e40af',
                fontWeight: 700,
                fontSize: '0.82rem'
              }}>
                <CheckCircle2 size={15} color={totalScheduled >= 32 ? '#10b981' : '#3b82f6'} />
                <span>{totalScheduled} / 32 tiết</span>
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
                    padding: '6px 12px',
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
                  <AlertTriangle size={14} color="#dc2626" />
                  <span>{classConflicts.length} Xung Đột</span>
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
                  <CheckCircle2 size={14} />
                  <span>0 Trùng Giờ</span>
                </div>
              )}

              {/* Undo / Redo Group */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '2px',
                background: '#f8fafc',
                padding: '2px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1'
              }}>
                <button
                  onClick={handleUndo}
                  disabled={history.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 9px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: history.length === 0 ? '#cbd5e1' : '#1e293b',
                    cursor: history.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.78rem'
                  }}
                  title="Hoàn tác bước xếp trước (Phím tắt: Ctrl + Z)"
                >
                  <Undo2 size={14} />
                  <span>Hoàn tác</span>
                </button>
                <div style={{ width: '1px', height: '12px', background: '#cbd5e1' }} />
                <button
                  onClick={handleRedo}
                  disabled={future.length === 0}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '5px 9px',
                    borderRadius: '6px',
                    border: 'none',
                    background: 'transparent',
                    color: future.length === 0 ? '#cbd5e1' : '#1e293b',
                    cursor: future.length === 0 ? 'not-allowed' : 'pointer',
                    fontWeight: 700,
                    fontSize: '0.78rem'
                  }}
                  title="Làm lại bước vừa hoàn tác (Phím tắt: Ctrl + Y)"
                >
                  <Redo2 size={14} />
                  <span>Làm lại</span>
                </button>
              </div>

              {/* Print Button */}
              <button
                onClick={() => setIsPrintModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '9px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 3px 10px rgba(79, 70, 229, 0.25)',
                  transition: 'transform 0.15s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
                onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                title="Mở xem trước và tùy chọn in thời khóa biểu (In từng lớp hoặc toàn trường chuẩn A4)"
              >
                <Printer size={15} />
                <span>In Thời Khóa Biểu</span>
              </button>

              {/* Clear Current Class Timetable Button */}
              <button
                onClick={handleClearCurrentClass}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '7px 12px',
                  borderRadius: '9px',
                  background: '#ffffff',
                  border: '1px solid #fecdd3',
                  color: '#e11d48',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#ffe4e6';
                  e.currentTarget.style.borderColor = '#fda4af';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.borderColor = '#fecdd3';
                }}
                title={`Xóa sạch lịch đã xếp của ${currentClass?.name || 'lớp này'} để xếp lại (các lớp khác giữ nguyên)`}
              >
                <Trash2 size={14} color="#e11d48" />
                <span>Xóa Lịch Lớp</span>
              </button>
            </div>
          </div>

          {/* Row 2: Grouped Class Chips */}
          {selectedGradeTab === 'all' ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              {availableGrades.map(g => {
                const gradeClasses = classesByGrade[g] || [];
                return (
                  <div
                    key={g}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: '#f8fafc',
                      padding: '4px 8px 4px 6px',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0'
                    }}
                  >
                    <span style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      color: '#475569',
                      padding: '4px 8px',
                      borderRadius: '8px',
                      background: '#e2e8f0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}>
                      K{g}
                    </span>

                    <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                      {gradeClasses.map(cls => {
                        const isSelected = selectedClassId === cls.id;
                        const stats = classStatsMap.get(cls.id) || { scheduledCount: 0, conflictCount: 0 };
                        const homeroom = teacherMap.get(cls.homeroomTeacherId);
                        const isFull = stats.scheduledCount >= 32;

                        return (
                          <button
                            key={cls.id}
                            onClick={() => {
                              setSelectedClassId(cls.id);
                              setSwapSource(null);
                            }}
                            title={`${cls.name} • Sĩ số: ${cls.studentCount || 35} học sinh • GVCN: ${homeroom?.name || 'Chưa gán'} • Đã xếp: ${stats.scheduledCount}/32 tiết${stats.conflictCount > 0 ? ` • ${stats.conflictCount} Xung đột` : ''}`}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px 11px',
                              borderRadius: '8px',
                              fontSize: '0.82rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                              border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                              background: isSelected ? '#4f46e5' : '#ffffff',
                              color: isSelected ? '#ffffff' : '#334155',
                              boxShadow: isSelected ? '0 3px 8px rgba(79, 70, 229, 0.3)' : 'none',
                              transition: 'all 0.15s ease',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            <span>{cls.name}</span>

                            {/* Sĩ số badge */}
                            <span style={{
                              fontSize: '0.68rem',
                              fontWeight: 600,
                              color: isSelected ? '#e0e7ff' : '#64748b',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '2px',
                              opacity: 0.9
                            }}>
                              <UsersIcon size={11} />
                              <span>{cls.studentCount || 35}</span>
                            </span>
                            
                            {/* Indicator badge */}
                            {stats.conflictCount > 0 ? (
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '1px 5px',
                                borderRadius: '10px',
                                background: isSelected ? '#ffffff' : '#fef2f2',
                                color: '#dc2626',
                                fontWeight: 800,
                                border: isSelected ? 'none' : '1px solid #fecaca'
                              }}>
                                !{stats.conflictCount}
                              </span>
                            ) : (
                              <span style={{
                                fontSize: '0.68rem',
                                padding: '1px 5px',
                                borderRadius: '10px',
                                background: isSelected ? 'rgba(255, 255, 255, 0.25)' : (isFull ? '#f0fdf4' : '#f8fafc'),
                                color: isSelected ? '#ffffff' : (isFull ? '#15803d' : '#64748b'),
                                fontWeight: 700
                              }}>
                                {stats.scheduledCount}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Specific Grade View: spacious, rich class cards */
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              flexWrap: 'wrap'
            }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#4338ca', background: '#eef2ff', padding: '6px 12px', borderRadius: '8px' }}>
                Danh sách lớp Khối {selectedGradeTab}:
              </span>

              {(classesByGrade[selectedGradeTab] || []).map(cls => {
                const isSelected = selectedClassId === cls.id;
                const stats = classStatsMap.get(cls.id) || { scheduledCount: 0, conflictCount: 0 };
                const homeroom = teacherMap.get(cls.homeroomTeacherId);
                const isFull = stats.scheduledCount >= 32;

                return (
                  <button
                    key={cls.id}
                    onClick={() => {
                      setSelectedClassId(cls.id);
                      setSwapSource(null);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                      background: isSelected ? 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#1e293b',
                      boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.25)' : '0 1px 2px rgba(0,0,0,0.05)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '0.92rem', textAlign: 'left' }}>{cls.name}</span>
                        <span style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '1px 6px',
                          borderRadius: '6px',
                          background: isSelected ? 'rgba(255,255,255,0.2)' : '#f1f5f9',
                          color: isSelected ? '#ffffff' : '#475569',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}>
                          <UsersIcon size={11} />
                          <span>{cls.studentCount || 35} HS</span>
                        </span>
                      </div>
                      <div style={{
                        fontSize: '0.72rem',
                        color: isSelected ? '#e0e7ff' : '#64748b',
                        marginTop: '2px',
                        textAlign: 'left'
                      }}>
                        GVCN: {homeroom?.name ? homeroom.name.split(' ').pop() : 'Chưa gán'}
                      </div>
                    </div>

                    {stats.conflictCount > 0 ? (
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 7px',
                        borderRadius: '12px',
                        background: isSelected ? '#ffffff' : '#fef2f2',
                        color: '#dc2626',
                        fontWeight: 800
                      }}>
                        {stats.conflictCount} xung đột
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.72rem',
                        padding: '2px 8px',
                        borderRadius: '12px',
                        background: isSelected ? 'rgba(255, 255, 255, 0.25)' : (isFull ? '#f0fdf4' : '#f1f5f9'),
                        color: isSelected ? '#ffffff' : (isFull ? '#15803d' : '#64748b'),
                        fontWeight: 700
                      }}>
                        {stats.scheduledCount}/32
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
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
              🎒 Giỏ Môn Học
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
      </div>

      {/* CLASS TIMETABLE PRINT PREVIEW & BATCH PRINT MODAL */}
      <ClassTimetablePrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        classes={classes}
        teachers={teachers}
        timetable={timetable}
        subjects={subjects}
        periods={periods}
        schoolInfo={schoolInfo}
        initialClassId={selectedClassId}
      />

      {/* CLASS STUDENT COUNT MANAGEMENT MODAL */}
      <ClassStudentCountModal
        isOpen={isStudentCountModalOpen}
        onClose={() => setIsStudentCountModalOpen(false)}
        classes={classes}
        setClasses={setClasses}
        teachers={teachers}
      />
    </div>
  </div>
  );
};
