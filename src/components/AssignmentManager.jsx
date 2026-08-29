// src/components/AssignmentManager.jsx
import React, { useState } from 'react';
import { 
  Layers, 
  Sparkles, 
  UserCheck, 
  RotateCcw, 
  CheckCircle2,
  Building2,
  BookOpen
} from 'lucide-react';
import { SUBJECTS as DEFAULT_SUBJECTS, ROOM_TYPES } from '../constants/subjects';

export const AssignmentManager = ({
  assignments,
  setAssignments,
  classes,
  teachers,
  gradeQuotas,
  subjects = DEFAULT_SUBJECTS,
  rooms = []
}) => {
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '1A1');
  const [syncSuccess, setSyncSuccess] = useState(false);

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

  const currentClass = classes.find(c => c.id === selectedClassId) || classes[0];
  const classAssignments = assignments.filter(a => a.classId === selectedClassId);
  const homeroomTeacher = teachers.find(t => t.id === currentClass?.homeroomTeacherId);

  const specialistSubjects = ['TIENG_ANH', 'TIN_HOC', 'THE_DUC', 'AM_NHAC', 'MY_THUAT', 'DAO_DUC'];

  // Cập nhật giáo viên hoặc phòng cho 1 môn
  const handleUpdateAssignment = (id, field, value) => {
    setAssignments(prev => prev.map(a => a.id === id ? { ...a, [field]: value } : a));
  };

  // Tự động gán GVCN cho các môn chủ nhiệm
  const handleAutoAssignHomeroom = () => {
    if (!homeroomTeacher) return;
    setAssignments(prev => prev.map(a => {
      if (a.classId === selectedClassId) {
        // Nếu không phải môn chuyên biệt do GVBM dạy
        const isSpecialist = specialistSubjects.includes(a.subjectId);
        if (!isSpecialist) {
          return { ...a, teacherId: homeroomTeacher.id };
        }
      }
      return a;
    }));
    triggerSuccess();
  };

  // Đồng bộ lại phân công của lớp theo định mức khối
  const handleSyncFromGradeQuota = () => {
    const quota = gradeQuotas[currentClass.grade];
    if (!quota) return;

    setAssignments(prev => {
      const otherClassAsg = prev.filter(a => a.classId !== selectedClassId);
      const newClassAsg = quota.subjects.map(s => {
        const existing = prev.find(a => a.classId === selectedClassId && a.subjectId === s.subjectId);
        return {
          id: `ASG_${selectedClassId}_${s.subjectId}`,
          classId: selectedClassId,
          subjectId: s.subjectId,
          teacherId: existing ? existing.teacherId : (specialistSubjects.includes(s.subjectId) ? '' : (homeroomTeacher?.id || '')),
          weeklyPeriods: s.weeklyPeriods,
          roomType: s.roomType || 'LOP_HOC',
          allowDouble: s.allowDouble || false
        };
      });

      return [...otherClassAsg, ...newClassAsg];
    });
    triggerSuccess();
  };

  // Đồng bộ lại tất cả 23 lớp theo định mức khối tương ứng
  const handleSyncAllClassesFromGradeQuotas = () => {
    setAssignments(prev => {
      const newAssignments = [];
      classes.forEach(cls => {
        const quota = gradeQuotas[cls.grade];
        if (!quota) return;
        const homeroom = teachers.find(t => t.id === cls.homeroomTeacherId);
        quota.subjects.forEach(s => {
          const existing = prev.find(a => a.classId === cls.id && a.subjectId === s.subjectId);
          newAssignments.push({
            id: `ASG_${cls.id}_${s.subjectId}`,
            classId: cls.id,
            subjectId: s.subjectId,
            teacherId: existing?.teacherId || (specialistSubjects.includes(s.subjectId) ? '' : (homeroom?.id || '')),
            weeklyPeriods: s.weeklyPeriods,
            roomType: s.roomType || 'LOP_HOC',
            allowDouble: s.allowDouble || false
          });
        });
      });
      return newAssignments;
    });
    triggerSuccess();
  };

  const triggerSuccess = () => {
    setSyncSuccess(true);
    setTimeout(() => setSyncSuccess(false), 2500);
  };

  const totalAssignedPeriods = classAssignments.reduce((sum, a) => sum + (Number(a.weeklyPeriods) || 0), 0);

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
            <Layers size={28} color="#4f46e5" />
            <span>Phân Công Chuyên Môn Giảng Dạy Từng Lớp</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Chỉ định giáo viên phụ trách và phòng bộ môn cho từng môn học của 23 lớp học
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={handleAutoAssignHomeroom}
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
            <UserCheck size={16} />
            <span>Tự Động Gán GVCN Lớp</span>
          </button>

          <button
            onClick={handleSyncFromGradeQuota}
            title="Đồng bộ riêng phân công của lớp đang chọn theo định mức khối"
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
            <span>Tái Tạo Lớp Này</span>
          </button>

          <button
            onClick={handleSyncAllClassesFromGradeQuotas}
            title="Tự động đồng bộ phân công môn học cho toàn bộ 23 lớp theo Định Mức Khối"
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
            <RotateCcw size={16} />
            <span>Đồng Bộ Tất Cả 23 Lớp</span>
          </button>
        </div>
      </div>

      {/* Sync Success Alert */}
      {syncSuccess && (
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
          <span>Đã cập nhật và đồng bộ phân công giảng dạy thành công!</span>
        </div>
      )}

      {/* 2. Class Selector Tabs */}
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
        {/* Class Buttons */}
        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px', maxWidth: '75%' }}>
          {classes.map(cls => {
            const isSelected = selectedClassId === cls.id;
            return (
              <button
                key={cls.id}
                onClick={() => setSelectedClassId(cls.id)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  background: isSelected ? '#eef2ff' : '#ffffff',
                  color: isSelected ? '#4338ca' : '#475569',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease'
                }}
              >
                {cls.name}
              </button>
            );
          })}
        </div>

        {/* Class Details Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ fontSize: '0.85rem', color: '#475569' }}>
            GVCN: <strong style={{ color: '#1e293b' }}>{homeroomTeacher?.name || 'Chưa gán'}</strong>
          </div>
          <div style={{
            padding: '6px 14px',
            borderRadius: '8px',
            background: totalAssignedPeriods >= 32 ? '#ecfdf5' : '#eff6ff',
            color: totalAssignedPeriods >= 32 ? '#065f46' : '#1e40af',
            fontWeight: 700,
            fontSize: '0.85rem'
          }}>
            Tổng: {totalAssignedPeriods} / 32 tiết/tuần
          </div>
        </div>
      </div>

      {/* 3. Assignments Table */}
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
                <th style={{ padding: '14px 18px' }}>Môn Học</th>
                <th style={{ padding: '14px 18px', width: '130px' }}>Số Tiết / Tuần</th>
                <th style={{ padding: '14px 18px' }}>Giáo Viên Phụ Trách</th>
                <th style={{ padding: '14px 18px' }}>Phòng Học Chức Năng</th>
              </tr>
            </thead>
            <tbody>
              {classAssignments.length === 0 ? (
                <tr>
                  <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                    Chưa có phân công môn học cho lớp này. Nhấn nút "Tái tạo từ Định mức Khối" phía trên để tạo tự động.
                  </td>
                </tr>
              ) : (
                classAssignments.map((asg, index) => {
                  const subInfo = (subjects && subjects[asg.subjectId]) || DEFAULT_SUBJECTS[asg.subjectId] || { name: asg.subjectId, bg: '#f8fafc', border: '#e2e8f0', text: '#334155' };
                  const isSpecialist = ['TIENG_ANH', 'TIN_HOC', 'THE_DUC', 'AM_NHAC', 'MY_THUAT'].includes(asg.subjectId);

                  return (
                    <tr 
                      key={asg.id}
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

                      {/* Subject */}
                      <td style={{ padding: '14px 18px' }}>
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
                      </td>

                      {/* Weekly Periods */}
                      <td style={{ padding: '14px 18px' }}>
                        <input
                          type="number"
                          min="0"
                          max="15"
                          value={asg.weeklyPeriods}
                          onChange={(e) => handleUpdateAssignment(asg.id, 'weeklyPeriods', Number(e.target.value))}
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
                      </td>

                      {/* Teacher Selector */}
                      <td style={{ padding: '14px 18px' }}>
                        <select
                          value={asg.teacherId || ''}
                          onChange={(e) => handleUpdateAssignment(asg.id, 'teacherId', e.target.value)}
                          style={{
                            width: '100%',
                            maxWidth: '300px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: `1px solid ${asg.teacherId ? '#cbd5e1' : '#fca5a5'}`,
                            background: asg.teacherId ? '#ffffff' : '#fef2f2',
                            fontSize: '0.85rem',
                            color: asg.teacherId ? '#1e293b' : '#991b1b',
                            fontWeight: asg.teacherId ? 500 : 600
                          }}
                        >
                          <option value="">-- Chưa phân công giáo viên --</option>
                          {teachers.map(t => (
                            <option key={t.id} value={t.id}>
                              {t.name} {t.id === currentClass.homeroomTeacherId ? '★ GVCN' : ''}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Room Selector */}
                      <td style={{ padding: '14px 18px' }}>
                        <select
                          value={asg.roomType || 'LOP_HOC'}
                          onChange={(e) => handleUpdateAssignment(asg.id, 'roomType', e.target.value)}
                          style={{
                            width: '100%',
                            maxWidth: '260px',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            fontSize: '0.85rem',
                            color: '#334155'
                          }}
                        >
                          {availableRoomTypes.map(r => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
