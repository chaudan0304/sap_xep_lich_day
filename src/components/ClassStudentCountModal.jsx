// src/components/ClassStudentCountModal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  X,
  Check,
  Save,
  RotateCcw,
  Sparkles,
  Layers,
  Search,
  CheckCircle2,
  GraduationCap,
  ArrowRight,
  Filter
} from 'lucide-react';

export const ClassStudentCountModal = ({
  isOpen,
  onClose,
  classes = [],
  setClasses,
  teachers = []
}) => {
  if (!isOpen) return null;

  const teacherMap = useMemo(() => new Map((teachers || []).map(t => [t.id, t])), [teachers]);

  // Helper to extract numeric grade reliably (1..5)
  const getGradeNum = (c) => {
    if (!c) return 1;
    if (c.grade !== undefined && c.grade !== null && c.grade !== '') {
      const n = Number(c.grade);
      if (!isNaN(n) && n > 0) return n;
    }
    const match = (c.name || '').match(/(\d+)/) || (c.id || '').match(/(\d+)/);
    return match ? parseInt(match[1], 10) : 1;
  };

  // Local copy of student counts
  const [localCounts, setLocalCounts] = useState(() => {
    const counts = {};
    classes.forEach(c => {
      counts[c.id] = c.studentCount || 35;
    });
    return counts;
  });

  const [bulkNumber, setBulkNumber] = useState(35);
  const [filterSearch, setFilterSearch] = useState('');
  const [selectedGradeTab, setSelectedGradeTab] = useState('all'); // 'all' | 1 | 2 | 3 | 4 | 5
  const [toastMessage, setToastMessage] = useState('');

  // Auto-hide toast after 3s
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Extract unique sorted grades as numbers: [1, 2, 3, 4, 5]
  const availableGrades = useMemo(() => {
    const gradeSet = new Set();
    classes.forEach(c => {
      gradeSet.add(getGradeNum(c));
    });
    return Array.from(gradeSet).sort((a, b) => a - b);
  }, [classes]);

  // Group classes by numeric grade
  const classesByGrade = useMemo(() => {
    const grouped = {};
    availableGrades.forEach(g => { grouped[g] = []; });
    classes.forEach(c => {
      const g = getGradeNum(c);
      if (!grouped[g]) grouped[g] = [];
      grouped[g].push(c);
    });
    return grouped;
  }, [classes, availableGrades]);

  const handleChangeCount = (classId, val) => {
    const num = parseInt(val, 10);
    setLocalCounts(prev => ({
      ...prev,
      [classId]: isNaN(num) ? '' : Math.max(1, Math.min(70, num))
    }));
  };

  const handleAdjust = (classId, delta) => {
    setLocalCounts(prev => {
      const current = parseInt(prev[classId], 10) || 35;
      return {
        ...prev,
        [classId]: Math.max(1, Math.min(70, current + delta))
      };
    });
  };

  const handleSetQuick = (classId, val) => {
    setLocalCounts(prev => ({
      ...prev,
      [classId]: val
    }));
  };

  // Gán cho toàn bộ tất cả các lớp
  const handleApplyToAll = () => {
    const val = parseInt(bulkNumber, 10) || 35;
    setLocalCounts(prev => {
      const next = { ...prev };
      classes.forEach(c => {
        next[c.id] = val;
      });
      return next;
    });
    setToastMessage(`✓ Đã gán ${val} học sinh cho toàn bộ ${classes.length} lớp!`);
  };

  // Gán cho tất cả các lớp trong 1 khối cụ thể
  const handleApplyToGrade = (grade) => {
    const targetGrade = Number(grade);
    const val = parseInt(bulkNumber, 10) || 35;
    let countUpdated = 0;

    setLocalCounts(prev => {
      const next = { ...prev };
      classes.forEach(c => {
        if (getGradeNum(c) === targetGrade) {
          next[c.id] = val;
          countUpdated++;
        }
      });
      return next;
    });

    // Also switch to that grade tab so user can see it immediately
    setSelectedGradeTab(targetGrade);
    setToastMessage(`✓ Đã gán ${val} học sinh cho ${countUpdated} lớp Khối ${targetGrade}!`);
  };

  const handleSave = () => {
    if (setClasses) {
      setClasses(prev => prev.map(c => ({
        ...c,
        studentCount: parseInt(localCounts[c.id], 10) || 35
      })));
    }
    onClose();
  };

  // Filtered classes according to selectedGradeTab and filterSearch
  const filteredClasses = useMemo(() => {
    return classes.filter(c => {
      const matchSearch = (c.name || '').toLowerCase().includes(filterSearch.toLowerCase()) ||
                          (c.id || '').toLowerCase().includes(filterSearch.toLowerCase());
      const g = getGradeNum(c);
      const matchGrade = selectedGradeTab === 'all' || g === Number(selectedGradeTab);
      return matchSearch && matchGrade;
    });
  }, [classes, filterSearch, selectedGradeTab]);

  const totalStudents = useMemo(() => {
    return Object.values(localCounts).reduce((sum, v) => sum + (parseInt(v, 10) || 0), 0);
  }, [localCounts]);

  const avgStudents = useMemo(() => {
    if (classes.length === 0) return 0;
    return Math.round((totalStudents / classes.length) * 10) / 10;
  }, [totalStudents, classes.length]);

  return createPortal(
    <div
      className="no-print animate-fade-in"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        padding: '16px'
      }}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          width: '100%',
          maxWidth: '960px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 24px',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '12px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}>
              <Users size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                Quản Lý & Chỉnh Sửa Sĩ Số Lớp
                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '2px 10px',
                  borderRadius: '12px',
                  background: '#eff6ff',
                  color: '#2563eb'
                }}>
                  {classes.length} lớp
                </span>
              </h2>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.78rem', color: '#64748b' }}>
                Chỉnh sửa số lượng học sinh cho từng lớp hoặc gán nhanh đồng loạt theo từng khối.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '10px',
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#64748b'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Grade Filter Tabs (Row 1) */}
        <div style={{
          padding: '12px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Grade selection tabs */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginRight: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Filter size={14} />
              <span>Xem Khối:</span>
            </span>

            <button
              onClick={() => setSelectedGradeTab('all')}
              style={{
                padding: '6px 14px',
                borderRadius: '10px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: selectedGradeTab === 'all' ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                background: selectedGradeTab === 'all' ? '#4f46e5' : '#ffffff',
                color: selectedGradeTab === 'all' ? '#ffffff' : '#475569',
                boxShadow: selectedGradeTab === 'all' ? '0 2px 8px rgba(79, 70, 229, 0.3)' : 'none',
                transition: 'all 0.15s ease'
              }}
            >
              Tất cả ({classes.length} lớp)
            </button>

            {availableGrades.map(g => {
              const count = (classesByGrade[g] || []).length;
              const isSel = selectedGradeTab === g;
              return (
                <button
                  key={g}
                  onClick={() => setSelectedGradeTab(g)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '10px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    border: isSel ? '2px solid #4f46e5' : '1px solid #cbd5e1',
                    background: isSel ? '#4f46e5' : '#ffffff',
                    color: isSel ? '#ffffff' : '#475569',
                    boxShadow: isSel ? '0 2px 8px rgba(79, 70, 229, 0.3)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Khối {g} ({count})
                </button>
              );
            })}
          </div>

          {/* Search box */}
          <div style={{ position: 'relative' }}>
            <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
            <input
              type="text"
              placeholder="Tìm tên lớp..."
              value={filterSearch}
              onChange={e => setFilterSearch(e.target.value)}
              style={{
                padding: '6px 12px 6px 30px',
                borderRadius: '8px',
                border: '1px solid #cbd5e1',
                fontSize: '0.8rem',
                width: '140px',
                background: '#ffffff'
              }}
            />
          </div>
        </div>

        {/* Bulk Action & Preset Bar (Row 2) */}
        <div style={{
          padding: '10px 24px',
          background: '#eef2ff',
          borderBottom: '1px solid #c7d2fe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: '#3730a3', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Sparkles size={16} color="#4f46e5" />
              <span>Gán sĩ số:</span>
            </span>

            <input
              type="number"
              min="1"
              max="70"
              value={bulkNumber}
              onChange={e => setBulkNumber(e.target.value)}
              style={{
                width: '58px',
                padding: '5px 6px',
                borderRadius: '8px',
                border: '1.5px solid #6366f1',
                fontSize: '0.9rem',
                fontWeight: 900,
                textAlign: 'center',
                background: '#ffffff',
                color: '#1e1b4b'
              }}
            />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#4338ca' }}>HS</span>

            <button
              onClick={handleApplyToAll}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '6px 14px',
                borderRadius: '8px',
                background: '#4f46e5',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.8rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(79, 70, 229, 0.25)',
                transition: 'transform 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
              title={`Áp dụng ${bulkNumber} HS cho toàn bộ ${classes.length} lớp trong trường`}
            >
              <Check size={14} />
              <span>Gán Tất Cả Lớp</span>
            </button>

            {/* Quick Assign Buttons for each Grade 1..5 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginLeft: '6px' }}>
              <span style={{ fontSize: '0.75rem', color: '#6366f1', fontWeight: 700 }}>hoặc gán riêng:</span>
              {availableGrades.map(g => (
                <button
                  key={g}
                  onClick={() => handleApplyToGrade(g)}
                  style={{
                    padding: '5px 10px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    border: '1.5px solid #a5b4fc',
                    color: '#3730a3',
                    fontSize: '0.78rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = '#4338ca';
                    e.currentTarget.style.color = '#ffffff';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = '#ffffff';
                    e.currentTarget.style.color = '#3730a3';
                  }}
                  title={`Gán ${bulkNumber} HS cho tất cả lớp Khối ${g}`}
                >
                  Gán Khối {g}
                </button>
              ))}
            </div>
          </div>

          {/* Toast feedback */}
          {toastMessage && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 12px',
              borderRadius: '20px',
              background: '#10b981',
              color: '#ffffff',
              fontSize: '0.78rem',
              fontWeight: 700,
              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
            }}>
              <CheckCircle2 size={14} />
              <span>{toastMessage}</span>
            </div>
          )}
        </div>

        {/* Classes Table */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                <th style={{ padding: '10px 12px', fontWeight: 700, width: '50px' }}>STT</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, width: '130px' }}>Tên Lớp</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, width: '90px' }}>Khối</th>
                <th style={{ padding: '10px 12px', fontWeight: 700 }}>Giáo Viên Chủ Nhiệm</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, width: '110px' }}>Phòng Học</th>
                <th style={{ padding: '10px 12px', fontWeight: 700, width: '310px', textAlign: 'right' }}>Sĩ Số Học Sinh</th>
              </tr>
            </thead>
            <tbody>
              {filteredClasses.map((cls, idx) => {
                const g = getGradeNum(cls);
                const homeroom = teacherMap.get(cls.homeroomTeacherId);
                const currentCount = localCounts[cls.id] ?? 35;

                return (
                  <tr
                    key={cls.id}
                    style={{
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.1s ease'
                    }}
                    onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '10px 12px', color: '#94a3b8', fontWeight: 600 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 800, color: '#1e293b', fontSize: '0.92rem' }}>
                      {cls.name}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        padding: '3px 9px',
                        borderRadius: '6px',
                        background: '#e0e7ff',
                        color: '#4338ca',
                        fontWeight: 800,
                        fontSize: '0.75rem'
                      }}>
                        Khối {g}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#334155' }}>
                      {homeroom ? (
                        <span><strong>{homeroom.name}</strong> {homeroom.code ? `(${homeroom.code})` : ''}</span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Chưa phân công</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', color: '#64748b' }}>
                      {cls.mainRoom || 'P.Học lớp'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        {/* Quick Presets */}
                        <div style={{ display: 'flex', gap: '3px', marginRight: '4px' }}>
                          {[30, 32, 35].map(preset => (
                            <button
                              key={preset}
                              onClick={() => handleSetQuick(cls.id, preset)}
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                border: '1px solid #e2e8f0',
                                background: currentCount === preset ? '#4f46e5' : '#ffffff',
                                color: currentCount === preset ? '#ffffff' : '#64748b',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer'
                              }}
                              title={`Đặt ${preset} HS`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>

                        {/* Adjust -1 */}
                        <button
                          onClick={() => handleAdjust(cls.id, -1)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            fontWeight: 800,
                            color: '#334155',
                            fontSize: '0.9rem'
                          }}
                        >
                          -
                        </button>

                        {/* Number Input */}
                        <input
                          type="number"
                          min="1"
                          max="70"
                          value={currentCount}
                          onChange={e => handleChangeCount(cls.id, e.target.value)}
                          style={{
                            width: '60px',
                            padding: '5px 6px',
                            borderRadius: '8px',
                            border: '1.5px solid #4f46e5',
                            fontSize: '0.9rem',
                            fontWeight: 900,
                            textAlign: 'center',
                            color: '#1e1b4b',
                            background: '#eef2ff'
                          }}
                        />

                        {/* Adjust +1 */}
                        <button
                          onClick={() => handleAdjust(cls.id, 1)}
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            border: '1px solid #cbd5e1',
                            background: '#f8fafc',
                            cursor: 'pointer',
                            fontWeight: 800,
                            color: '#334155',
                            fontSize: '0.9rem'
                          }}
                        >
                          +
                        </button>

                        <span style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, minWidth: '24px', textAlign: 'left' }}>
                          HS
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Statistics & Action Bar */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid #e2e8f0',
          background: '#f8fafc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {/* Stats */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem', color: '#475569' }}>
            <div>
              Tổng số học sinh toàn trường: <strong style={{ color: '#0f172a', fontSize: '0.95rem' }}>{totalStudents}</strong> em
            </div>
            <div>•</div>
            <div>
              Bình quân: <strong style={{ color: '#0f172a' }}>{avgStudents}</strong> em / lớp
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onClose}
              style={{
                padding: '8px 18px',
                borderRadius: '10px',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Hủy bỏ
            </button>

            <button
              onClick={handleSave}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 22px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                border: 'none',
                color: '#ffffff',
                fontSize: '0.85rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.35)',
                transition: 'transform 0.15s ease'
              }}
              onMouseOver={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <Save size={16} />
              <span>Lưu Sĩ Số ({classes.length} lớp)</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
