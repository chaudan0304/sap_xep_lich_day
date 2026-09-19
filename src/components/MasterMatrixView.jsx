// src/components/MasterMatrixView.jsx
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Grid3X3, 
  Printer, 
  Download,
  AlertTriangle,
  AlertCircle,
  TableProperties
} from 'lucide-react';
import { DAYS_OF_WEEK, PERIODS, PERIODS as DEFAULT_PERIODS } from '../constants/defaultCurriculum';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import { exportMasterTimetable } from '../services/excelService';
import { MasterTimetablePrintModal } from './MasterTimetablePrintModal';

export const MasterMatrixView = ({
  classes,
  teachers,
  timetable,
  conflicts = [],
  subjects = DEFAULT_SUBJECTS,
  periods = DEFAULT_PERIODS,
  schoolInfo = {},
  onOpenConflictModal
}) => {
  const [selectedGrade, setSelectedGrade] = useState('ALL');
  const [selectedDay, setSelectedDay] = useState('ALL'); // ALL or 2..6
  const [viewLayout, setViewLayout] = useState('excel'); // 'excel' | 'matrix'
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Dual Synchronized Scrollbar Refs & State
  const topScrollRef = useRef(null);
  const bottomScrollRef = useRef(null);
  const isSyncingTop = useRef(false);
  const isSyncingBottom = useRef(false);
  const [contentScrollWidth, setContentScrollWidth] = useState(0);

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);
  const teacherByNameMap = useMemo(() => {
    const map = new Map();
    teachers.forEach(t => {
      if (t.code) map.set(t.code.toLowerCase().trim(), t);
      if (t.name) map.set(t.name.toLowerCase().trim(), t);
      if (t.shortName) map.set(t.shortName.toLowerCase().trim(), t);
    });
    return map;
  }, [teachers]);

  const resolveTeacherFromSlot = useCallback((slot) => {
    if (!slot) return null;
    if (slot.teacherId && teacherMap.has(slot.teacherId)) {
      return teacherMap.get(slot.teacherId);
    }
    const cCode = (slot.teacherCode || '').toLowerCase().trim();
    if (cCode && teacherByNameMap.has(cCode)) return teacherByNameMap.get(cCode);

    const cRaw = (slot.teacherRaw || '').replace(/^(?:Đ\/c\.|Đ\/c|Đc\.|Đc|Thầy|Cô)\s+/i, '').toLowerCase().trim();
    if (cRaw && teacherByNameMap.has(cRaw)) return teacherByNameMap.get(cRaw);

    const cName = (slot.teacherName || '').toLowerCase().trim();
    if (cName && teacherByNameMap.has(cName)) return teacherByNameMap.get(cName);

    return null;
  }, [teacherMap, teacherByNameMap]);

  const errorCount = useMemo(() => conflicts.filter(c => c.severity === 'error').length, [conflicts]);
  const warningCount = useMemo(() => conflicts.filter(c => c.severity === 'warning').length, [conflicts]);

  // Lọc lớp theo khối
  const filteredClasses = useMemo(() => {
    return classes.filter(c => selectedGrade === 'ALL' || c.grade === Number(selectedGrade));
  }, [classes, selectedGrade]);

  // Lọc ngày hiển thị
  const activeDays = useMemo(() => {
    return selectedDay === 'ALL' 
      ? DAYS_OF_WEEK 
      : DAYS_OF_WEEK.filter(d => d.id === Number(selectedDay));
  }, [selectedDay]);

  const getSlotConflict = (classId, dayId, periodId) => {
    return (conflicts || []).find(c => {
      const matchClass = c.classId === classId || (c.conflictingClassIds && c.conflictingClassIds.includes(classId));
      if (!matchClass) return false;
      if (c.day === dayId && c.period === periodId) return true;
      if (c.type === 'SUBJECT_QUOTA_EXCEEDED' && c.placedSlots) {
        return c.placedSlots.some(s => s.day === dayId && s.period === periodId);
      }
      return false;
    });
  };

  // Synchronize Scroll from Top to Bottom
  const handleTopScroll = () => {
    if (isSyncingTop.current) {
      isSyncingTop.current = false;
      return;
    }
    if (bottomScrollRef.current && topScrollRef.current) {
      isSyncingBottom.current = true;
      bottomScrollRef.current.scrollLeft = topScrollRef.current.scrollLeft;
    }
  };

  // Synchronize Scroll from Bottom to Top
  const handleBottomScroll = () => {
    if (isSyncingBottom.current) {
      isSyncingBottom.current = false;
      return;
    }
    if (topScrollRef.current && bottomScrollRef.current) {
      isSyncingTop.current = true;
      topScrollRef.current.scrollLeft = bottomScrollRef.current.scrollLeft;
    }
  };

  // Measure content scroll width dynamically whenever filters or layout change
  useEffect(() => {
    const updateWidth = () => {
      if (bottomScrollRef.current) {
        setContentScrollWidth(bottomScrollRef.current.scrollWidth);
      }
    };
    updateWidth();
    const timer = setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateWidth);
    };
  }, [filteredClasses, activeDays, viewLayout]);

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1650px', margin: '0 auto' }}>
      <div className="no-print">
        {/* 1. Header & Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          marginBottom: '20px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Grid3X3 size={28} color="#4f46e5" />
              <span>Ma Trận Thời Khóa Biểu Toàn Trường</span>
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
              Tổng hợp và theo dõi chi tiết toàn bộ các tiết học trong tuần của các khối lớp
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Conflict / Warning Quick Button */}
            {conflicts.length > 0 && onOpenConflictModal && (
              <button
                onClick={onOpenConflictModal}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  background: errorCount > 0 ? '#fee2e2' : '#fef3c7',
                  border: `1.5px solid ${errorCount > 0 ? '#f87171' : '#fcd34d'}`,
                  color: errorCount > 0 ? '#991b1b' : '#92400e',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                {errorCount > 0 ? (
                  <AlertTriangle size={16} color="#dc2626" />
                ) : (
                  <AlertCircle size={16} color="#d97706" />
                )}
                <span>
                  {errorCount > 0 
                    ? `Xem ${errorCount} Lỗi Trùng Lịch${warningCount > 0 ? ` (${warningCount} Cảnh Báo)` : ''}`
                    : `Xem ${warningCount} Cảnh Báo`}
                </span>
              </button>
            )}

            <button
              onClick={() => exportMasterTimetable(timetable, filteredClasses, teachers, subjects, schoolInfo)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 600,
                background: '#059669',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)'
              }}
            >
              <Download size={16} />
              <span>Xuất Excel Ma Trận</span>
            </button>

            <button
              onClick={() => setIsPrintModalOpen(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 18px',
                borderRadius: '10px',
                fontSize: '0.875rem',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                border: 'none',
                color: '#ffffff',
                cursor: 'pointer',
                boxShadow: '0 3px 10px rgba(79, 70, 229, 0.3)',
                transition: 'transform 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Printer size={16} />
              <span>In Bản Tổng Thể (A4/A3)</span>
            </button>
          </div>
        </div>

        {/* 2. Filter Bar & View Layout Switcher */}
        <div style={{
          background: '#ffffff',
          padding: '14px 20px',
          borderRadius: '14px',
          border: '1px solid #e2e8f0',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Lọc Khối */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Khối lớp:</span>
              <select
                value={selectedGrade}
                onChange={(e) => setSelectedGrade(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
              >
                <option value="ALL">Tất cả các khối ({classes.length} lớp)</option>
                {[1, 2, 3, 4, 5].map(g => {
                  const gClasses = classes.filter(c => c.grade === g);
                  if (gClasses.length === 0) return null;
                  const rangeText = gClasses.length > 0 
                    ? ` (${gClasses[0].name}${gClasses.length > 1 ? ` - ${gClasses[gClasses.length - 1].name}` : ''})` 
                    : '';
                  return (
                    <option key={g} value={String(g)}>
                      Khối {g}{rangeText} ({gClasses.length} lớp)
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Lọc Thứ trong tuần */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Ngày trong tuần:</span>
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
              >
                <option value="ALL">Cả tuần (Thứ 2 đến Thứ 6)</option>
                {DAYS_OF_WEEK.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* View Layout Switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>Định dạng:</span>
            <div style={{
              display: 'flex',
              background: '#f1f5f9',
              padding: '3px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0'
            }}>
              <button
                onClick={() => setViewLayout('excel')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  background: viewLayout === 'excel' ? '#ffffff' : 'transparent',
                  color: viewLayout === 'excel' ? '#4f46e5' : '#64748b',
                  fontWeight: viewLayout === 'excel' ? 800 : 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: viewLayout === 'excel' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <TableProperties size={14} />
                <span>🥇 Chuẩn Excel (Hàng: Thứ & Tiết)</span>
              </button>

              <button
                onClick={() => setViewLayout('matrix')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '7px',
                  border: 'none',
                  background: viewLayout === 'matrix' ? '#ffffff' : 'transparent',
                  color: viewLayout === 'matrix' ? '#4f46e5' : '#64748b',
                  fontWeight: viewLayout === 'matrix' ? 800 : 600,
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  boxShadow: viewLayout === 'matrix' ? '0 2px 5px rgba(0,0,0,0.08)' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                <Grid3X3 size={14} />
                <span>🥈 Ma Trận Ngang (Hàng: Lớp)</span>
              </button>
            </div>

            <div style={{ fontSize: '0.85rem', color: '#64748b', marginLeft: '6px' }}>
              <strong>{filteredClasses.length} lớp</strong>
            </div>
          </div>
        </div>

        {/* Dedicated Khung Giờ Học (Bell Schedule) Box */}
        <div style={{
          background: '#f8fafc',
          borderRadius: '12px',
          border: '1px solid #e2e8f0',
          padding: '10px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#1e293b' }}>
              ⏰ Khung Giờ Học Các Tiết:
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 800, color: '#1d4ed8', background: '#eff6ff', padding: '2px 6px', borderRadius: '4px' }}>SÁNG:</span>
              <span style={{ color: '#334155' }}>
                <strong>T1</strong>: {periods?.find(p => p.id === 1)?.time || '07:15 - 07:55'} • <strong>T2</strong>: {periods?.find(p => p.id === 2)?.time || '07:55 - 08:35'} • <strong>T3</strong>: {periods?.find(p => p.id === 3)?.time || '09:00 - 09:40'} • <strong>T4</strong>: {periods?.find(p => p.id === 4)?.time || '09:40 - 10:20'}
              </span>
            </div>
            <div style={{ width: '1px', height: '14px', background: '#cbd5e1' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 800, color: '#b45309', background: '#fffbeb', padding: '2px 6px', borderRadius: '4px' }}>CHIỀU:</span>
              <span style={{ color: '#334155' }}>
                <strong>T1</strong>: {periods?.find(p => p.id === 5)?.time || '14:00 - 14:40'} • <strong>T2</strong>: {periods?.find(p => p.id === 6)?.time || '14:40 - 15:20'} • <strong>T3</strong>: {periods?.find(p => p.id === 7)?.time || '15:40 - 16:20'}
              </span>
            </div>
          </div>
        </div>

        {/* ───────────────────────────────────────────────────────────── */}
        {/* 3. TABLE CONTAINER (EXCEL-STYLE AS DEFAULT OR HORIZONTAL MATRIX) */}
        {/* ───────────────────────────────────────────────────────────── */}
        <div style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          boxShadow: 'var(--shadow-sm)',
          overflow: 'hidden'
        }}>
          {/* Top Synchronized Horizontal Scrollbar */}
          <div style={{
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#4f46e5', display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              ↔️ Thanh cuộn ngang trên:
            </span>
            <div
              ref={topScrollRef}
              onScroll={handleTopScroll}
              style={{
                overflowX: 'auto',
                overflowY: 'hidden',
                flex: 1,
                height: '14px'
              }}
            >
              <div style={{ width: `${contentScrollWidth}px`, height: '1px' }} />
            </div>
          </div>

          <div ref={bottomScrollRef} onScroll={handleBottomScroll} style={{ overflowX: 'auto', maxHeight: '78vh' }}>
            {viewLayout === 'excel' ? (
              /* ── FORMAT 1: CHUẨN XUẤT EXCEL (HÀNG: THỨ/TIẾT • CỘT: LỚP) ── */
              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                textAlign: 'center',
                fontSize: '0.8rem',
                background: '#ffffff'
              }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 30, background: '#f8fafc' }}>
                  <tr>
                    <th style={{
                      position: 'sticky',
                      top: 0,
                      left: 0,
                      zIndex: 35,
                      width: '65px',
                      minWidth: '65px',
                      maxWidth: '65px',
                      padding: '10px 4px',
                      background: '#f1f5f9',
                      borderBottom: '2px solid #cbd5e1',
                      borderRight: '1px solid #cbd5e1',
                      color: '#1e293b',
                      fontWeight: 800
                    }}>
                      Thứ
                    </th>
                    <th style={{
                      position: 'sticky',
                      top: 0,
                      left: '65px',
                      zIndex: 35,
                      width: '60px',
                      minWidth: '60px',
                      maxWidth: '60px',
                      padding: '10px 4px',
                      background: '#f1f5f9',
                      borderBottom: '2px solid #cbd5e1',
                      borderRight: '1px solid #cbd5e1',
                      color: '#1e293b',
                      fontWeight: 800
                    }}>
                      Buổi
                    </th>
                    <th style={{
                      position: 'sticky',
                      top: 0,
                      left: '125px',
                      zIndex: 35,
                      width: '45px',
                      minWidth: '45px',
                      maxWidth: '45px',
                      padding: '10px 2px',
                      background: '#f1f5f9',
                      borderBottom: '2px solid #cbd5e1',
                      borderRight: '2px solid #cbd5e1',
                      color: '#1e293b',
                      fontWeight: 800
                    }}>
                      Tiết
                    </th>
                    {filteredClasses.map(cls => (
                      <th
                        key={cls.id}
                        style={{
                          position: 'sticky',
                          top: 0,
                          zIndex: 30,
                          padding: '12px 6px',
                          minWidth: '105px',
                          background: '#f8fafc',
                          borderBottom: '2px solid #cbd5e1',
                          borderRight: '1px solid #e2e8f0',
                          color: '#1e1b4b',
                          fontWeight: 800,
                          fontSize: '0.9rem'
                        }}
                      >
                        <div>{cls.name}</div>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {activeDays.map(day => {
                    const morningPeriods = periods.filter(p => p.session === 'morning');
                    const afternoonPeriods = periods.filter(p => p.session === 'afternoon');
                    const totalDayRows = morningPeriods.length + afternoonPeriods.length + 1; // +1 for lunch row

                    let hasRenderedDay = false;

                    return (
                      <React.Fragment key={day.id}>
                        {/* 1. SÁNG (Tiết 1..4) */}
                        {morningPeriods.map((p, pIdx) => {
                          const isFirstMorning = pIdx === 0;

                          return (
                            <tr key={`${day.id}_${p.id}`} style={{ background: pIdx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                              {/* Sticky Day Column */}
                              {!hasRenderedDay && (
                                (() => {
                                  hasRenderedDay = true;
                                  return (
                                    <td
                                      rowSpan={totalDayRows}
                                      style={{
                                        position: 'sticky',
                                        left: 0,
                                        zIndex: 15,
                                        width: '65px',
                                        minWidth: '65px',
                                        maxWidth: '65px',
                                        padding: '10px 4px',
                                        fontWeight: 900,
                                        fontSize: '0.875rem',
                                        color: '#1e293b',
                                        background: '#f8fafc',
                                        borderRight: '1px solid #cbd5e1',
                                        borderBottom: '1px solid #cbd5e1',
                                        verticalAlign: 'middle',
                                        boxShadow: '2px 0 5px rgba(0,0,0,0.02)'
                                      }}
                                    >
                                      {day.name}
                                    </td>
                                  );
                                })()
                              )}

                              {/* Sticky Session Column */}
                              {isFirstMorning && (
                                <td
                                  rowSpan={morningPeriods.length}
                                  style={{
                                    position: 'sticky',
                                    left: '65px',
                                    zIndex: 15,
                                    width: '60px',
                                    minWidth: '60px',
                                    maxWidth: '60px',
                                    padding: '6px 2px',
                                    fontWeight: 800,
                                    fontSize: '0.78rem',
                                    color: '#1d4ed8',
                                    background: '#eff6ff',
                                    borderRight: '1px solid #cbd5e1',
                                    borderBottom: '1px solid #cbd5e1',
                                    verticalAlign: 'middle',
                                    letterSpacing: '0.5px'
                                  }}
                                >
                                  SÁNG
                                </td>
                              )}

                              {/* Sticky Period Number */}
                              <td style={{
                                position: 'sticky',
                                left: '125px',
                                zIndex: 15,
                                width: '45px',
                                minWidth: '45px',
                                maxWidth: '45px',
                                padding: '6px 2px',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                color: '#1e293b',
                                background: '#ffffff',
                                borderRight: '2px solid #cbd5e1',
                                borderBottom: '1px solid #e2e8f0',
                                verticalAlign: 'middle'
                              }}>
                                {p.id}
                              </td>

                              {/* Class Slots */}
                              {filteredClasses.map(cls => {
                                const slot = timetable[cls.id]?.[day.id]?.[p.id];
                                const sub = slot ? ((subjects && subjects[slot.subjectId]) || DEFAULT_SUBJECTS[slot.subjectId] || { shortName: slot.subjectRaw || slot.subjectId, bg: '#f8fafc', border: '#cbd5e1', text: '#334155' }) : null;
                                const teacher = slot ? resolveTeacherFromSlot(slot) : null;
                                const conflict = getSlotConflict(cls.id, day.id, p.id);

                                return (
                                  <td
                                    key={cls.id}
                                    style={{
                                      padding: '4px',
                                      verticalAlign: 'middle',
                                      borderRight: '1px solid #e2e8f0',
                                      borderBottom: '1px solid #e2e8f0',
                                      background: conflict ? (conflict.severity === 'warning' ? '#fffbeb' : '#fff5f5') : (sub ? sub.bg : 'transparent'),
                                      height: '46px'
                                    }}
                                  >
                                    {slot ? (
                                      <div
                                        onClick={() => {
                                          if (conflict && onOpenConflictModal) onOpenConflictModal();
                                        }}
                                        className={conflict ? 'conflict-pulse' : ''}
                                        style={{
                                          borderRadius: '6px',
                                          padding: '3px 4px',
                                          border: `1.5px solid ${conflict ? (conflict.severity === 'warning' ? '#f59e0b' : '#ef4444') : (sub?.border || '#cbd5e1')}`,
                                          background: conflict ? (conflict.severity === 'warning' ? '#fef3c7' : '#fee2e2') : 'transparent',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          gap: '1px',
                                          cursor: conflict ? 'pointer' : 'default',
                                          boxShadow: conflict ? (conflict.severity === 'warning' ? '0 0 6px rgba(245, 158, 11, 0.4)' : '0 0 6px rgba(239, 68, 68, 0.4)') : 'none'
                                        }}
                                        title={conflict ? conflict.message : `${sub?.name || slot.subjectId} - ${teacher?.name || slot.teacherId}`}
                                      >
                                        <span style={{
                                          fontWeight: 800,
                                          fontSize: '0.74rem',
                                          color: conflict ? (conflict.severity === 'warning' ? '#92400e' : '#991b1b') : (sub?.text || '#1e293b'),
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {sub?.shortName || sub?.name || slot.subjectRaw || slot.subjectId}
                                        </span>
                                        <span style={{
                                          fontSize: '0.66rem',
                                          color: conflict ? '#dc2626' : '#475569',
                                          fontWeight: 700,
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {slot.teacherRaw ? slot.teacherRaw.replace('Đ/c ', '') : (teacher?.code || teacher?.name.split(' ').pop() || '')}
                                        </span>
                                      </div>
                                    ) : (
                                      <span style={{ color: '#cbd5e1' }}>-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}

                        {/* Lunch Break Banner Row */}
                        <tr style={{ background: '#f8fafc' }}>
                          <td
                            colSpan={2}
                            style={{
                              position: 'sticky',
                              left: '65px',
                              zIndex: 15,
                              width: '105px',
                              minWidth: '105px',
                              maxWidth: '105px',
                              padding: '5px 2px',
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              color: '#64748b',
                              background: '#f1f5f9',
                              borderRight: '2px solid #cbd5e1',
                              borderBottom: '1px solid #cbd5e1',
                              textAlign: 'center'
                            }}
                          >
                            Nghỉ trưa
                          </td>
                          <td
                            colSpan={filteredClasses.length}
                            style={{
                              padding: '5px 10px',
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              fontStyle: 'italic',
                              color: '#475569',
                              textAlign: 'center',
                              background: '#f8fafc',
                              borderBottom: '1px solid #cbd5e1',
                              borderRight: '1px solid #e2e8f0'
                            }}
                          >
                            🍱 Nghỉ trưa & Ăn bán trú ({schoolInfo.lunchBreak || '10:30 - 14:00'})
                          </td>
                        </tr>

                        {/* 2. CHIỀU (Tiết 5..7) */}
                        {afternoonPeriods.map((p, pIdx) => {
                          const isFirstAfternoon = pIdx === 0;
                          const isWedOff = day.id === 4 && p.id > 4;

                          return (
                            <tr key={`${day.id}_${p.id}`} style={{ background: pIdx % 2 === 0 ? '#ffffff' : '#fafafa' }}>
                              {/* Sticky Session Column */}
                              {isFirstAfternoon && (
                                <td
                                  rowSpan={afternoonPeriods.length}
                                  style={{
                                    position: 'sticky',
                                    left: '65px',
                                    zIndex: 15,
                                    width: '60px',
                                    minWidth: '60px',
                                    maxWidth: '60px',
                                    padding: '6px 2px',
                                    fontWeight: 800,
                                    fontSize: '0.78rem',
                                    color: '#b45309',
                                    background: '#fffbeb',
                                    borderRight: '1px solid #cbd5e1',
                                    borderBottom: '1px solid #cbd5e1',
                                    verticalAlign: 'middle',
                                    letterSpacing: '0.5px'
                                  }}
                                >
                                  CHIỀU
                                </td>
                              )}

                              {/* Sticky Period Number */}
                              <td style={{
                                position: 'sticky',
                                left: '125px',
                                zIndex: 15,
                                width: '45px',
                                minWidth: '45px',
                                maxWidth: '45px',
                                padding: '6px 2px',
                                fontWeight: 800,
                                fontSize: '0.82rem',
                                color: '#1e293b',
                                background: '#ffffff',
                                borderRight: '2px solid #cbd5e1',
                                borderBottom: '1px solid #e2e8f0',
                                verticalAlign: 'middle'
                              }}>
                                {p.id - 4}
                              </td>

                              {/* Class Slots */}
                              {filteredClasses.map(cls => {
                                if (isWedOff) {
                                  return (
                                    <td
                                      key={cls.id}
                                      style={{
                                        padding: '4px',
                                        verticalAlign: 'middle',
                                        borderRight: '1px solid #e2e8f0',
                                        borderBottom: '1px solid #e2e8f0',
                                        background: '#f8fafc',
                                        height: '46px',
                                        color: '#cbd5e1'
                                      }}
                                    >
                                      -
                                    </td>
                                  );
                                }

                                const slot = timetable[cls.id]?.[day.id]?.[p.id];
                                const sub = slot ? ((subjects && subjects[slot.subjectId]) || DEFAULT_SUBJECTS[slot.subjectId] || { shortName: slot.subjectRaw || slot.subjectId, bg: '#f8fafc', border: '#cbd5e1', text: '#334155' }) : null;
                                const teacher = slot ? resolveTeacherFromSlot(slot) : null;
                                const conflict = getSlotConflict(cls.id, day.id, p.id);

                                return (
                                  <td
                                    key={cls.id}
                                    style={{
                                      padding: '4px',
                                      verticalAlign: 'middle',
                                      borderRight: '1px solid #e2e8f0',
                                      borderBottom: '1px solid #e2e8f0',
                                      background: conflict ? (conflict.severity === 'warning' ? '#fffbeb' : '#fff5f5') : (sub ? sub.bg : 'transparent'),
                                      height: '46px'
                                    }}
                                  >
                                    {slot ? (
                                      <div
                                        onClick={() => {
                                          if (conflict && onOpenConflictModal) onOpenConflictModal();
                                        }}
                                        className={conflict ? 'conflict-pulse' : ''}
                                        style={{
                                          borderRadius: '6px',
                                          padding: '3px 4px',
                                          border: `1.5px solid ${conflict ? (conflict.severity === 'warning' ? '#f59e0b' : '#ef4444') : (sub?.border || '#cbd5e1')}`,
                                          background: conflict ? (conflict.severity === 'warning' ? '#fef3c7' : '#fee2e2') : 'transparent',
                                          display: 'flex',
                                          flexDirection: 'column',
                                          alignItems: 'center',
                                          gap: '1px',
                                          cursor: conflict ? 'pointer' : 'default',
                                          boxShadow: conflict ? (conflict.severity === 'warning' ? '0 0 6px rgba(245, 158, 11, 0.4)' : '0 0 6px rgba(239, 68, 68, 0.4)') : 'none'
                                        }}
                                        title={conflict ? conflict.message : `${sub?.name || slot.subjectId} - ${teacher?.name || slot.teacherId}`}
                                      >
                                        <span style={{
                                          fontWeight: 800,
                                          fontSize: '0.74rem',
                                          color: conflict ? (conflict.severity === 'warning' ? '#92400e' : '#991b1b') : (sub?.text || '#1e293b'),
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {sub?.shortName || sub?.name || slot.subjectRaw || slot.subjectId}
                                        </span>
                                        <span style={{
                                          fontSize: '0.66rem',
                                          color: conflict ? '#dc2626' : '#475569',
                                          fontWeight: 700,
                                          whiteSpace: 'nowrap'
                                        }}>
                                          {slot.teacherRaw ? slot.teacherRaw.replace('Đ/c ', '') : (teacher?.code || teacher?.name.split(' ').pop() || '')}
                                        </span>
                                      </div>
                                    ) : (
                                      <span style={{ color: '#cbd5e1' }}>-</span>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              /* ── FORMAT 2: MA TRẬN NGANG (HÀNG: LỚP • CỘT: THỨ/TIẾT) ── */
              <table style={{
                width: '100%',
                borderCollapse: 'separate',
                borderSpacing: 0,
                textAlign: 'center',
                fontSize: '0.8rem',
                background: '#ffffff'
              }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 30, background: '#f8fafc' }}>
                  {/* Row 1: Day Headers */}
                  <tr>
                    <th rowSpan={3} style={{
                      position: 'sticky',
                      top: 0,
                      left: 0,
                      zIndex: 35,
                      width: '85px',
                      minWidth: '85px',
                      maxWidth: '85px',
                      padding: '12px 6px',
                      background: '#f1f5f9',
                      borderRight: '2px solid #cbd5e1',
                      borderBottom: '2px solid #cbd5e1',
                      color: '#1e293b',
                      fontWeight: 800
                    }}>
                      Lớp
                    </th>
                    {activeDays.map(day => (
                      <th
                        key={day.id}
                        colSpan={7}
                        style={{
                          padding: '8px',
                          background: day.id % 2 === 0 ? '#eff6ff' : '#f8fafc',
                          borderRight: '2px solid #cbd5e1',
                          borderBottom: '1px solid #e2e8f0',
                          color: '#1e1b4b',
                          fontWeight: 800,
                          fontSize: '0.875rem'
                        }}
                      >
                        {day.name.toUpperCase()}
                      </th>
                    ))}
                  </tr>

                  {/* Row 2: Sáng / Chiều Session Headers */}
                  <tr style={{ background: '#f8fafc' }}>
                    {activeDays.map(day => (
                      <React.Fragment key={day.id}>
                        <th
                          colSpan={4}
                          style={{
                            padding: '4px 2px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            borderRight: '1px solid #bfdbfe',
                            borderBottom: '1px solid #cbd5e1'
                          }}
                        >
                          SÁNG
                        </th>
                        <th
                          colSpan={3}
                          style={{
                            padding: '4px 2px',
                            background: '#fffbeb',
                            color: '#b45309',
                            fontWeight: 700,
                            fontSize: '0.72rem',
                            borderRight: '2px solid #cbd5e1',
                            borderBottom: '1px solid #cbd5e1'
                          }}
                        >
                          CHIỀU
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>

                  {/* Row 3: Period Headers (Only Numbers) */}
                  <tr style={{ background: '#f8fafc' }}>
                    {activeDays.map(day => (
                      <React.Fragment key={day.id}>
                        {PERIODS.map(p => (
                          <th
                            key={p.id}
                            title={`${p.name} (${p.time})`}
                            style={{
                              padding: '6px 2px',
                              width: '42px',
                              color: p.session === 'morning' ? '#2563eb' : '#d97706',
                              fontWeight: 800,
                              fontSize: '0.82rem',
                              borderRight: p.id === 7 ? '2px solid #cbd5e1' : '1px solid #f1f5f9',
                              borderBottom: '2px solid #cbd5e1',
                              background: p.session === 'morning' ? '#ffffff' : '#fffdf5'
                            }}
                          >
                            {p.id <= 4 ? p.id : (p.id - 4)}
                          </th>
                        ))}
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {filteredClasses.map((cls, idx) => (
                    <tr
                      key={cls.id}
                      style={{
                        background: idx % 2 === 0 ? '#ffffff' : '#fafafa'
                      }}
                    >
                      {/* Sticky Class Name Column */}
                      <td style={{
                        padding: '10px',
                        fontWeight: 800,
                        fontSize: '0.85rem',
                        color: '#1e293b',
                        background: '#f8fafc',
                        borderRight: '2px solid #cbd5e1',
                        borderBottom: '1px solid #e2e8f0',
                        position: 'sticky',
                        left: 0,
                        zIndex: 15
                      }}>
                        <div>{cls.name}</div>
                      </td>

                      {/* Day / Period Slots */}
                      {activeDays.map(day => (
                        <React.Fragment key={day.id}>
                          {PERIODS.map(p => {
                            const slot = timetable[cls.id]?.[day.id]?.[p.id];
                            const sub = slot ? ((subjects && subjects[slot.subjectId]) || DEFAULT_SUBJECTS[slot.subjectId] || { shortName: slot.subjectRaw || slot.subjectId, bg: '#f8fafc', border: '#cbd5e1', text: '#334155' }) : null;
                            const teacher = slot ? resolveTeacherFromSlot(slot) : null;
                            const conflict = getSlotConflict(cls.id, day.id, p.id);

                            const isOffWednesdayAfternoon = day.id === 4 && p.id > 4;

                            if (isOffWednesdayAfternoon) {
                              return (
                                <td
                                  key={p.id}
                                  style={{
                                    padding: '4px',
                                    verticalAlign: 'middle',
                                    borderRight: p.id === 7 ? '2px solid #cbd5e1' : '1px solid #f1f5f9',
                                    borderBottom: '1px solid #e2e8f0',
                                    background: '#f8fafc',
                                    height: '48px',
                                    color: '#cbd5e1'
                                  }}
                                >
                                  -
                                </td>
                              );
                            }

                            return (
                              <td
                                key={p.id}
                                style={{
                                  padding: '3px',
                                  verticalAlign: 'middle',
                                  borderRight: p.id === 7 ? '2px solid #cbd5e1' : '1px solid #f1f5f9',
                                  borderBottom: '1px solid #e2e8f0',
                                  background: conflict ? (conflict.severity === 'warning' ? '#fffbeb' : '#fff5f5') : (sub ? sub.bg : 'transparent'),
                                  height: '48px'
                                }}
                              >
                                {slot ? (
                                  <div
                                    onClick={() => {
                                      if (conflict && onOpenConflictModal) onOpenConflictModal();
                                    }}
                                    className={conflict ? 'conflict-pulse' : ''}
                                    style={{
                                      borderRadius: '6px',
                                      padding: '3px 4px',
                                      border: `1.5px solid ${conflict ? (conflict.severity === 'warning' ? '#f59e0b' : '#ef4444') : (sub?.border || '#cbd5e1')}`,
                                      background: conflict ? (conflict.severity === 'warning' ? '#fef3c7' : '#fee2e2') : 'transparent',
                                      display: 'flex',
                                      flexDirection: 'column',
                                      alignItems: 'center',
                                      gap: '1px',
                                      cursor: conflict ? 'pointer' : 'default',
                                      boxShadow: conflict ? (conflict.severity === 'warning' ? '0 0 6px rgba(245, 158, 11, 0.4)' : '0 0 6px rgba(239, 68, 68, 0.4)') : 'none'
                                    }}
                                    title={conflict ? conflict.message : `${sub?.name || slot.subjectId} - ${teacher?.name || slot.teacherId}`}
                                  >
                                    <span style={{
                                      fontWeight: 800,
                                      fontSize: '0.73rem',
                                      color: conflict ? (conflict.severity === 'warning' ? '#92400e' : '#991b1b') : (sub?.text || '#1e293b'),
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {sub?.shortName || sub?.name || slot.subjectRaw || slot.subjectId}
                                    </span>
                                    <span style={{
                                      fontSize: '0.66rem',
                                      color: conflict ? (conflict.severity === 'warning' ? '#b45309' : '#dc2626') : '#475569',
                                      fontWeight: 700,
                                      whiteSpace: 'nowrap'
                                    }}>
                                      {slot.teacherRaw ? slot.teacherRaw.replace('Đ/c ', '') : (teacher?.code || teacher?.name.split(' ').pop() || '')}
                                    </span>
                                  </div>
                                ) : (
                                  <span style={{ color: '#cbd5e1' }}>-</span>
                                )}
                              </td>
                            );
                          })}
                        </React.Fragment>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Professional Master Timetable Print & Zalo Export Modal */}
      {isPrintModalOpen && (
        <MasterTimetablePrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          classes={classes}
          teachers={teachers}
          timetable={timetable}
          subjects={subjects}
          periods={periods}
          schoolInfo={schoolInfo}
        />
      )}
    </div>
  );
};
