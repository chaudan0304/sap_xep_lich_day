// src/components/GradeQuotaManager.jsx
import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { SUBJECTS as DEFAULT_SUBJECTS, ROOM_TYPES } from '../constants/subjects';
import { DEFAULT_GRADE_QUOTAS } from '../constants/defaultCurriculum';

export const GradeQuotaManager = ({
  gradeQuotas,
  setGradeQuotas,
  onSyncAssignments,
  subjects = DEFAULT_SUBJECTS,
  rooms = []
}) => {
  const [activeGrade, setActiveGrade] = useState(1);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Danh sách phòng học đồng bộ động từ tab Phòng Chức Năng
  const availableRoomTypes = React.useMemo(() => {
    const standard = [
      { id: 'LOP_HOC', name: 'Phòng học tại lớp (Mặc định)' },
      { id: 'SAN_TRUONG', name: 'Sân trường toàn trường' }
    ];
    const dynamicRooms = (rooms || []).map(r => ({
      id: r.id,
      name: `${r.name} (${r.building || r.code || 'Phòng bộ môn'})`
    }));
    return [...standard, ...dynamicRooms];
  }, [rooms]);

  const currentQuota = gradeQuotas[activeGrade] || { grade: activeGrade, gradeName: `Khối ${activeGrade}`, targetWeeklyPeriods: 32, subjects: [] };
  const targetPeriods = currentQuota.targetWeeklyPeriods || 32;

  // Tính tổng số tiết trong tuần của khối hiện tại
  const totalWeeklyPeriods = currentQuota.subjects.reduce((sum, s) => sum + (Number(s.weeklyPeriods) || 0), 0);
  const isStandardTarget = totalWeeklyPeriods === targetPeriods;

  // Cập nhật thuộc tính của 1 môn
  const handleUpdateSubject = (index, field, value) => {
    setGradeQuotas(prev => {
      const updatedList = [...prev[activeGrade].subjects];
      updatedList[index] = { ...updatedList[index], [field]: value };
      return {
        ...prev,
        [activeGrade]: {
          ...prev[activeGrade],
          subjects: updatedList
        }
      };
    });
  };

  // Thêm môn học mới vào khối
  const handleAddSubject = () => {
    const existingIds = new Set(currentQuota.subjects.map(s => s.subjectId));
    // Tìm môn học chưa có trong danh sách
    const availableKey = Object.keys(subjects).find(k => !existingIds.has(k)) || 'TU_CHON';

    const newSub = {
      subjectId: availableKey,
      weeklyPeriods: 2,
      maxMorning: 2,
      maxAfternoon: 0,
      allowDouble: false,
      roomType: subjects[availableKey]?.defaultRoom || 'LOP_HOC'
    };

    setGradeQuotas(prev => ({
      ...prev,
      [activeGrade]: {
        ...prev[activeGrade],
        subjects: [...prev[activeGrade].subjects, newSub]
      }
    }));
  };

  // Xóa môn học khỏi khối
  const handleDeleteSubject = (index) => {
    setGradeQuotas(prev => {
      const updatedList = prev[activeGrade].subjects.filter((_, idx) => idx !== index);
      return {
        ...prev,
        [activeGrade]: {
          ...prev[activeGrade],
          subjects: updatedList
        }
      };
    });
  };

  // Khôi phục chuẩn GDPT 2018 cho khối đang chọn
  const handleResetToStandard = () => {
    if (window.confirm(`Khôi phục định mức Khối ${activeGrade} về chuẩn CTGDPT 2018 của Bộ GD&ĐT?`)) {
      setGradeQuotas(prev => ({
        ...prev,
        [activeGrade]: JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS[activeGrade]))
      }));
      triggerSaveNotification();
    }
  };

  // Khôi phục tất cả các khối
  const handleResetAllToStandard = () => {
    if (window.confirm('Khôi phục toàn bộ định mức từ Khối 1 đến Khối 5 về chuẩn CTGDPT 2018?')) {
      setGradeQuotas(JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS)));
      triggerSaveNotification();
    }
  };

  const triggerSaveNotification = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* 1. Header & Actions */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        marginBottom: '24px'
      }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#1e1b4b', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <BookOpen size={28} color="#4f46e5" />
            <span>Quản Lý Định Mức Số Tiết Theo Khối</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Cấu hình khung phân phối chương trình môn học theo từng khối lớp (Khối 1 đến Khối 5 - CTGDPT 2018)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleResetAllToStandard}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 16px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 600,
              background: '#ffffff',
              border: '1px solid #cbd5e1',
              color: '#334155',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <RotateCcw size={16} />
            <span>Khôi Phục Chuẩn GDPT 2018</span>
          </button>

          <button
            onClick={() => {
              if (onSyncAssignments) onSyncAssignments();
              triggerSaveNotification();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 18px',
              borderRadius: '10px',
              fontSize: '0.875rem',
              fontWeight: 700,
              background: '#4f46e5',
              border: 'none',
              color: '#ffffff',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
            }}
          >
            <Sparkles size={16} />
            <span>Đồng Bộ Vào Phân Công GV</span>
          </button>
        </div>
      </div>

      {/* Save Success Alert */}
      {saveSuccess && (
        <div className="animate-fade-in" style={{
          background: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          padding: '12px 18px',
          borderRadius: '10px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: 600,
          fontSize: '0.875rem'
        }}>
          <CheckCircle2 size={18} color="#10b981" />
          <span>Đã lưu và đồng bộ định mức khung chương trình thành công vào toàn bộ các lớp học!</span>
        </div>
      )}

      {/* 2. Grade Selector Tabs */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        padding: '12px 20px',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Grade Buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {[1, 2, 3, 4, 5].map(grade => {
            const isSelected = activeGrade === grade;
            const quota = gradeQuotas[grade];
            const count = quota?.subjects?.reduce((s, item) => s + (Number(item.weeklyPeriods) || 0), 0) || 0;

            return (
              <button
                key={grade}
                onClick={() => setActiveGrade(grade)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  fontSize: '0.9rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  background: isSelected ? '#eef2ff' : '#ffffff',
                  color: isSelected ? '#4338ca' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>Khối {grade}</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  background: isSelected ? '#4f46e5' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b'
                }}>
                  {count}T
                </span>
              </button>
            );
          })}
        </div>

        {/* Quota Status Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            borderRadius: '10px',
            background: isStandardTarget ? '#f0fdf4' : '#fffbeb',
            border: `1px solid ${isStandardTarget ? '#bbf7d0' : '#fde68a'}`,
            color: isStandardTarget ? '#15803d' : '#b45309',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}>
            {isStandardTarget ? <ShieldCheck size={18} /> : <AlertCircle size={18} />}
            <span>Tổng: {totalWeeklyPeriods} / {targetPeriods} tiết/tuần</span>
            <span style={{ fontWeight: 500, fontSize: '0.75rem', color: isStandardTarget ? '#166534' : '#92400e' }}>
              ({isStandardTarget ? `Chuẩn ${targetPeriods} tiết/tuần` : 'Chưa đạt định mức'})
            </span>
          </div>

          <button
            onClick={handleAddSubject}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              borderRadius: '8px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              color: '#334155',
              fontSize: '0.8rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <Plus size={14} />
            <span>Thêm Môn</span>
          </button>
        </div>
      </div>

      {/* 3. Subjects Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '14px',
        border: '1px solid #e2e8f0',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: 700 }}>
                <th style={{ padding: '14px 18px', width: '50px' }}>STT</th>
                <th style={{ padding: '14px 18px' }}>Môn Học & Hoạt Động Giáo Dục</th>
                <th style={{ padding: '14px 18px', width: '180px' }}>Số Tiết / Tuần</th>
                <th style={{ padding: '14px 18px', width: '180px' }}>Ghép Tiết Kép (2T)</th>
                <th style={{ padding: '14px 18px', width: '260px' }}>Phòng Chức Năng Yêu Cầu</th>
                <th style={{ padding: '14px 18px', textAlign: 'right', width: '80px' }}>Xóa</th>
              </tr>
            </thead>
            <tbody>
              {currentQuota.subjects.map((item, index) => {
                const subInfo = (subjects && subjects[item.subjectId]) || DEFAULT_SUBJECTS[item.subjectId] || { name: item.subjectId, bg: '#f8fafc', border: '#e2e8f0', text: '#334155' };

                return (
                  <tr 
                    key={index}
                    style={{ 
                      borderBottom: '1px solid #f1f5f9',
                      transition: 'background 0.15s ease'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '14px 18px', color: '#94a3b8', fontWeight: 600 }}>
                      {index + 1}
                    </td>

                    {/* Subject Selector / Name */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          padding: '6px 12px',
                          borderRadius: '8px',
                          background: subInfo.bg || '#f8fafc',
                          border: `1px solid ${subInfo.border || '#cbd5e1'}`,
                          color: subInfo.text || '#334155',
                          fontWeight: 700,
                          fontSize: '0.85rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          <span>{subInfo.name}</span>
                        </div>
                      </div>
                    </td>

                    {/* Weekly Periods */}
                    <td style={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={item.weeklyPeriods}
                          onChange={(e) => handleUpdateSubject(index, 'weeklyPeriods', Number(e.target.value))}
                          style={{
                            width: '70px',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            color: '#1e293b',
                            textAlign: 'center'
                          }}
                        />
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>tiết / tuần</span>
                      </div>
                    </td>

                    {/* Allow Double Period */}
                    <td style={{ padding: '14px 18px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', fontSize: '0.85rem', color: '#475569' }}>
                        <input
                          type="checkbox"
                          checked={item.allowDouble}
                          onChange={(e) => handleUpdateSubject(index, 'allowDouble', e.target.checked)}
                          style={{ width: '16px', height: '16px' }}
                        />
                        <span>{item.allowDouble ? 'Cho phép ghép' : 'Tách rời'}</span>
                      </label>
                    </td>

                    {/* Specialized Room */}
                    <td style={{ padding: '14px 18px' }}>
                      <select
                        value={item.roomType || 'LOP_HOC'}
                        onChange={(e) => handleUpdateSubject(index, 'roomType', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          color: '#334155',
                          background: '#ffffff'
                        }}
                      >
                        {availableRoomTypes.map(r => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </td>

                    {/* Delete */}
                    <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                      <button
                        onClick={() => handleDeleteSubject(index)}
                        title="Xóa môn khỏi định mức khối"
                        style={{
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid #fecaca',
                          background: '#fef2f2',
                          color: '#ef4444',
                          cursor: 'pointer'
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
