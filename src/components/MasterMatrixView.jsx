// src/components/MasterMatrixView.jsx
import React, { useState, useMemo } from 'react';
import { 
  Grid3X3, 
  Printer, 
  Download,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { DAYS_OF_WEEK, PERIODS, PERIODS as DEFAULT_PERIODS } from '../constants/defaultCurriculum';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';
import { exportMasterTimetable } from '../services/excelService';
import { triggerAppPrint } from '../services/printService';
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
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

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
    return (conflicts || []).find(c => (c.classId === classId || (c.conflictingClassIds && c.conflictingClassIds.includes(classId))) && c.day === dayId && c.period === periodId);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
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
            <span>Ma Trận Thời Khóa Biểu Toàn Trường (Trường TH Quỳnh Lộc)</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Bảng ma trận chuẩn xác 100% từng tiết học của 23 lớp khớp với file Excel chính thức
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Conflict Quick Button */}
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
              <AlertTriangle size={16} color={errorCount > 0 ? '#dc2626' : '#d97706'} />
              <span>Xem {conflicts.length} Xung Đột (Tiết/Lớp/Ai trùng)</span>
            </button>
          )}

          <button
            onClick={() => exportMasterTimetable(timetable, classes, teachers, subjects)}
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

      {/* 2. Filter Bar */}
      <div style={{
        background: '#ffffff',
        padding: '14px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '20px',
        flexWrap: 'wrap'
      }}>
        {/* Lọc Khối */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Khối lớp:</span>
          <select
            value={selectedGrade}
            onChange={(e) => setSelectedGrade(e.target.value)}
            style={{ padding: '6px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: '#ffffff' }}
          >
            <option value="ALL">Tất cả các khối (Khối 1 - 5)</option>
            <option value="1">Khối 1 (1A1 - 1A4)</option>
            <option value="2">Khối 2 (2A1 - 2A5)</option>
            <option value="3">Khối 3 (3A1 - 3A4)</option>
            <option value="4">Khối 4 (4A1 - 4A5)</option>
            <option value="5">Khối 5 (5A1 - 5A5)</option>
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

        <div style={{ marginLeft: 'auto', fontSize: '0.85rem', color: '#64748b' }}>
          Hiển thị: <strong>{filteredClasses.length} lớp học</strong>
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
              <strong>T1</strong>: 07:30 - 08:05 • <strong>T2</strong>: 08:15 - 08:50 • <strong>T3</strong>: 09:10 - 09:45 • <strong>T4</strong>: 09:55 - 10:30
            </span>
          </div>
          <div style={{ width: '1px', height: '14px', background: '#cbd5e1' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 800, color: '#b45309', background: '#fffbeb', padding: '2px 6px', borderRadius: '4px' }}>CHIỀU:</span>
            <span style={{ color: '#334155' }}>
              <strong>T1</strong>: 14:00 - 14:35 • <strong>T2</strong>: 14:45 - 15:20 • <strong>T3</strong>: 15:30 - 16:05
            </span>
          </div>
        </div>
      </div>

      {/* 3. Master Matrix Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto', maxHeight: '75vh' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.8rem' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, background: '#f8fafc' }}>
              {/* Row 1: Day Headers */}
              <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                <th rowSpan={3} style={{
                  padding: '12px',
                  width: '90px',
                  background: '#f1f5f9',
                  borderRight: '1px solid #cbd5e1',
                  color: '#1e293b',
                  fontWeight: 800,
                  position: 'sticky',
                  left: 0,
                  zIndex: 15
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
              <tr style={{ borderBottom: '1px solid #cbd5e1', background: '#f8fafc' }}>
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
                        borderRight: '1px solid #bfdbfe'
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
                        borderRight: '2px solid #cbd5e1'
                      }}
                    >
                      CHIỀU
                    </th>
                  </React.Fragment>
                ))}
              </tr>

              {/* Row 3: Period Headers (Only Numbers) */}
              <tr style={{ borderBottom: '2px solid #cbd5e1', background: '#f8fafc' }}>
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
                    borderBottom: '1px solid #e2e8f0',
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
                    borderRight: '1px solid #cbd5e1',
                    position: 'sticky',
                    left: 0,
                    zIndex: 5
                  }}>
                    <div>{cls.name}</div>
                    <div style={{ fontSize: '0.65rem', fontWeight: 500, color: '#64748b' }}>K.{cls.grade}</div>
                  </td>

                  {/* Day / Period Slots */}
                  {activeDays.map(day => (
                    <React.Fragment key={day.id}>
                      {PERIODS.map(p => {
                        const slot = timetable[cls.id]?.[day.id]?.[p.id];
                        const sub = slot ? ((subjects && subjects[slot.subjectId]) || DEFAULT_SUBJECTS[slot.subjectId] || { shortName: slot.subjectRaw || slot.subjectId, bg: '#f8fafc', border: '#cbd5e1', text: '#334155' }) : null;
                        const teacher = slot ? teacherMap.get(slot.teacherId) : null;
                        const conflict = getSlotConflict(cls.id, day.id, p.id);

                        const isOffWednesdayAfternoon = day.id === 4 && p.id > 4;

                        if (isOffWednesdayAfternoon) {
                          return (
                            <td
                              key={p.id}
                              style={{
                                padding: '4px',
                                verticalAlign: 'middle',
                                borderLeft: p.id === 1 ? '2px solid #cbd5e1' : '1px solid #f1f5f9',
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
                              borderLeft: p.id === 1 ? '2px solid #cbd5e1' : '1px solid #f1f5f9',
                              background: conflict ? '#fff5f5' : (sub ? sub.bg : 'transparent'),
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
                                  border: `1.5px solid ${conflict ? '#ef4444' : (sub?.border || '#cbd5e1')}`,
                                  background: conflict ? '#fee2e2' : 'transparent',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  gap: '1px',
                                  cursor: conflict ? 'pointer' : 'default',
                                  boxShadow: conflict ? '0 0 6px rgba(239, 68, 68, 0.4)' : 'none'
                                }}
                                title={conflict ? conflict.message : `${sub?.name || slot.subjectId} - ${teacher?.name || slot.teacherId}`}
                              >
                                <span style={{
                                  fontWeight: 800,
                                  fontSize: '0.73rem',
                                  color: conflict ? '#991b1b' : (sub?.text || '#1e293b'),
                                  whiteSpace: 'nowrap'
                                }}>
                                  {sub?.shortName || sub?.name || slot.subjectRaw || slot.subjectId}
                                </span>
                                <span style={{
                                  fontSize: '0.65rem',
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
                    </React.Fragment>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
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
