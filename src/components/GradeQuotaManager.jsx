import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  BookOpen, 
  Plus, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  Sparkles,
  ShieldCheck,
  Search,
  X,
  Check,
  Layers,
  HelpCircle
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
  const [toastMessage, setToastMessage] = useState('');

  // State quản lý Modal thêm môn học
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [modalSearchTerm, setModalSearchTerm] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [newWeeklyPeriods, setNewWeeklyPeriods] = useState(2);
  const [newAllowDouble, setNewAllowDouble] = useState(false);
  const [newRoomType, setNewRoomType] = useState('LOP_HOC');

  // Chuyển subjects sang dạng mảng chuẩn hóa
  const allSubjectsList = useMemo(() => {
    if (!subjects) return Object.values(DEFAULT_SUBJECTS);
    if (Array.isArray(subjects)) return subjects;
    return Object.values(subjects);
  }, [subjects]);

  // Danh sách phòng học đồng bộ động từ tab Phòng Chức Năng
  const availableRoomTypes = useMemo(() => {
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

  // Danh sách các môn ĐÃ CÓ trong khối hiện tại
  const existingSubjectIds = useMemo(() => {
    return new Set((currentQuota.subjects || []).map(s => s.subjectId));
  }, [currentQuota.subjects]);

  // Danh sách các môn CHƯA HỌC trong khối hiện tại
  const unassignedSubjects = useMemo(() => {
    return allSubjectsList.filter(s => !existingSubjectIds.has(s.id));
  }, [allSubjectsList, existingSubjectIds]);

  // Danh sách các môn chưa học được lọc theo ô tìm kiếm trong modal
  const filteredUnassignedSubjects = useMemo(() => {
    if (!modalSearchTerm.trim()) return unassignedSubjects;
    const term = modalSearchTerm.toLowerCase().trim();
    return unassignedSubjects.filter(s => 
      (s.name && s.name.toLowerCase().includes(term)) ||
      (s.shortName && s.shortName.toLowerCase().includes(term)) ||
      (s.id && s.id.toLowerCase().includes(term)) ||
      (s.category && s.category.toLowerCase().includes(term))
    );
  }, [unassignedSubjects, modalSearchTerm]);

  // Mở modal Thêm Môn và tự động chọn môn đầu tiên chưa học
  const handleOpenAddModal = () => {
    setModalSearchTerm('');
    if (unassignedSubjects.length > 0) {
      const firstSub = unassignedSubjects[0];
      setSelectedSubjectId(firstSub.id);
      setNewWeeklyPeriods(2);
      setNewAllowDouble(false);
      setNewRoomType(firstSub.defaultRoom || 'LOP_HOC');
    } else {
      setSelectedSubjectId('');
    }
    setIsAddModalOpen(true);
  };

  // Khi người dùng click chọn 1 môn trong modal
  const handleSelectSubjectInModal = (sub) => {
    setSelectedSubjectId(sub.id);
    setNewRoomType(sub.defaultRoom || 'LOP_HOC');
  };

  // Xác nhận thêm môn học vào khối
  const handleConfirmAddSubject = () => {
    if (!selectedSubjectId) return;

    const subInfo = allSubjectsList.find(s => s.id === selectedSubjectId) || { name: selectedSubjectId };
    const periods = Math.max(1, Math.min(15, Number(newWeeklyPeriods) || 1));

    const newSub = {
      subjectId: selectedSubjectId,
      weeklyPeriods: periods,
      maxMorning: periods,
      maxAfternoon: 0,
      allowDouble: Boolean(newAllowDouble),
      roomType: newRoomType || subInfo.defaultRoom || 'LOP_HOC'
    };

    setGradeQuotas(prev => {
      const current = prev[activeGrade] || { grade: activeGrade, gradeName: `Khối ${activeGrade}`, targetWeeklyPeriods: 32, subjects: [] };
      return {
        ...prev,
        [activeGrade]: {
          ...current,
          subjects: [...(current.subjects || []), newSub]
        }
      };
    });

    setIsAddModalOpen(false);
    setToastMessage(`Đã thêm môn "${subInfo.name}" (${periods} tiết/tuần) vào Khối ${activeGrade} thành công!`);
    triggerSaveNotification();
  };

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

  // Xóa môn học khỏi khối
  const handleDeleteSubject = (index) => {
    const subToDelete = currentQuota.subjects[index];
    const subName = (subjects && subjects[subToDelete?.subjectId]?.name) || subToDelete?.subjectId || 'môn này';
    
    if (window.confirm(`Bạn có chắc chắn muốn xóa môn "${subName}" khỏi định mức Khối ${activeGrade}?`)) {
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
      setToastMessage(`Đã xóa môn "${subName}" khỏi Khối ${activeGrade}!`);
      triggerSaveNotification();
    }
  };

  // Khôi phục chuẩn GDPT 2018 cho khối đang chọn
  const handleResetToStandard = () => {
    if (window.confirm(`Khôi phục định mức Khối ${activeGrade} về chuẩn CTGDPT 2018 của Bộ GD&ĐT?`)) {
      setGradeQuotas(prev => ({
        ...prev,
        [activeGrade]: JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS[activeGrade]))
      }));
      setToastMessage(`Đã khôi phục định mức Khối ${activeGrade} về chuẩn GDPT 2018!`);
      triggerSaveNotification();
    }
  };

  // Khôi phục tất cả các khối
  const handleResetAllToStandard = () => {
    if (window.confirm('Khôi phục toàn bộ định mức từ Khối 1 đến Khối 5 về chuẩn CTGDPT 2018?')) {
      setGradeQuotas(JSON.parse(JSON.stringify(DEFAULT_GRADE_QUOTAS)));
      setToastMessage('Đã khôi phục định mức toàn bộ 5 khối về chuẩn GDPT 2018!');
      triggerSaveNotification();
    }
  };

  const triggerSaveNotification = () => {
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setToastMessage('');
    }, 3000);
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
          <span>{toastMessage || 'Đã lưu và đồng bộ định mức khung chương trình thành công vào toàn bộ các lớp học!'}</span>
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

        {/* Quota Status Indicator & Add Subject Action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
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
            onClick={handleOpenAddModal}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
              transition: 'all 0.15s ease'
            }}
            title="Nhấn để chọn và thêm môn học chưa học vào Khối này"
          >
            <Plus size={16} />
            <span>Thêm Môn</span>
            {unassignedSubjects.length > 0 && (
              <span style={{
                background: 'rgba(255, 255, 255, 0.25)',
                padding: '1px 7px',
                borderRadius: '999px',
                fontSize: '0.72rem',
                fontWeight: 700,
                marginLeft: '2px'
              }} title={`Có ${unassignedSubjects.length} môn chưa học`}>
                {unassignedSubjects.length}
              </span>
            )}
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

      {/* 4. Modal Thêm Môn Học Chưa Học Vào Khối */}
      {isAddModalOpen && createPortal(
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
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsAddModalOpen(false);
          }}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '20px',
              width: '100%',
              maxWidth: '820px',
              maxHeight: '92vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.4)',
              overflow: 'hidden',
              border: '1px solid #e2e8f0',
              animation: 'slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
            }}
          >
            {/* Modal Header */}
            <div style={{
              padding: '18px 24px',
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
                  <BookOpen size={22} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>Thêm Môn Học Vào Định Mức Khối {activeGrade}</span>
                  </h2>
                  <p style={{ fontSize: '0.82rem', color: '#64748b', margin: '2px 0 0 0' }}>
                    Danh sách các môn học chưa có trong chương trình Khối {activeGrade}. Chọn môn và điều chỉnh số tiết/tuần.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  border: '1px solid #e2e8f0',
                  background: '#ffffff',
                  color: '#64748b',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = '#fef2f2';
                  e.currentTarget.style.color = '#ef4444';
                  e.currentTarget.style.borderColor = '#fecaca';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = '#ffffff';
                  e.currentTarget.style.color = '#64748b';
                  e.currentTarget.style.borderColor = '#e2e8f0';
                }}
                title="Đóng (ESC)"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {unassignedSubjects.length === 0 ? (
                /* Empty State: Tất cả các môn đã có trong khối */
                <div style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  background: '#f8fafc',
                  borderRadius: '16px',
                  border: '1px dashed #cbd5e1'
                }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    borderRadius: '50%',
                    background: '#ecfdf5',
                    color: '#10b981',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 16px auto',
                    border: '1px solid #a7f3d0'
                  }}>
                    <CheckCircle2 size={32} />
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
                    Khối {activeGrade} Đã Có Đầy Đủ Tất Cả Các Môn Học!
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '520px', margin: '0 auto 18px auto', lineHeight: 1.6 }}>
                    Toàn bộ <strong>{allSubjectsList.length} môn học</strong> trong danh mục hệ thống đều đã được thiết lập định mức cho Khối {activeGrade}.
                    Nếu bạn muốn giảng dạy thêm môn học mới (môn tăng cường, kỹ năng sống, câu lạc bộ...), vui lòng chuyển sang tab <strong>"Quản Lý Môn Học"</strong> để khai báo môn mới.
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(false)}
                    style={{
                      padding: '9px 22px',
                      borderRadius: '10px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: '0.875rem',
                      border: 'none',
                      cursor: 'pointer'
                    }}
                  >
                    Đóng Cửa Sổ
                  </button>
                </div>
              ) : (
                /* Có môn chưa học: Hiển thị danh sách để chọn */
                <>
                  {/* Search Bar & Count Stats */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
                      <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                      <input
                        type="text"
                        placeholder="Tìm kiếm môn học theo tên, mã, viết tắt..."
                        value={modalSearchTerm}
                        onChange={(e) => setModalSearchTerm(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '9px 12px 9px 36px',
                          borderRadius: '10px',
                          border: '1px solid #cbd5e1',
                          fontSize: '0.85rem',
                          background: '#ffffff'
                        }}
                      />
                      {modalSearchTerm && (
                        <button
                          onClick={() => setModalSearchTerm('')}
                          style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            background: 'none',
                            border: 'none',
                            color: '#94a3b8',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      borderRadius: '8px',
                      background: '#eef2ff',
                      color: '#4338ca',
                      fontSize: '0.8rem',
                      fontWeight: 700
                    }}>
                      <Layers size={14} />
                      <span>{filteredUnassignedSubjects.length} môn chưa học</span>
                    </div>
                  </div>

                  {/* Grid Danh Sách Môn Học Chưa Học */}
                  <div>
                    <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                      1. CHỌN MÔN HỌC MUỐN THÊM:
                    </label>
                    
                    {filteredUnassignedSubjects.length === 0 ? (
                      <div style={{ padding: '24px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', color: '#64748b', fontSize: '0.85rem' }}>
                        Không tìm thấy môn học nào khớp với từ khóa "{modalSearchTerm}".
                      </div>
                    ) : (
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))',
                        gap: '10px',
                        maxHeight: '230px',
                        overflowY: 'auto',
                        padding: '4px',
                        border: '1px solid #f1f5f9',
                        borderRadius: '12px',
                        background: '#fafafa'
                      }}>
                        {filteredUnassignedSubjects.map(sub => {
                          const isSelected = selectedSubjectId === sub.id;
                          return (
                            <div
                              key={sub.id}
                              onClick={() => handleSelectSubjectInModal(sub)}
                              style={{
                                padding: '12px',
                                borderRadius: '12px',
                                cursor: 'pointer',
                                border: isSelected ? '2px solid #4f46e5' : `1px solid ${sub.border || '#cbd5e1'}`,
                                background: isSelected ? '#ffffff' : (sub.bg || '#ffffff'),
                                boxShadow: isSelected ? '0 4px 12px rgba(79, 70, 229, 0.2)' : 'none',
                                transition: 'all 0.15s ease',
                                position: 'relative',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px'
                              }}
                            >
                              {/* Selected Check Badge */}
                              {isSelected && (
                                <div style={{
                                  position: 'absolute',
                                  top: '8px',
                                  right: '8px',
                                  width: '20px',
                                  height: '20px',
                                  borderRadius: '50%',
                                  background: '#4f46e5',
                                  color: '#ffffff',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  <Check size={13} strokeWidth={3} />
                                </div>
                              )}

                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: sub.color || '#4f46e5',
                                  flexShrink: 0
                                }} />
                                <span style={{
                                  fontWeight: 700,
                                  fontSize: '0.92rem',
                                  color: isSelected ? '#1e1b4b' : (sub.text || '#0f172a'),
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  paddingRight: isSelected ? '20px' : '0'
                                }}>
                                  {sub.name}
                                </span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                                <span style={{
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: isSelected ? '#eef2ff' : '#f1f5f9',
                                  color: isSelected ? '#4338ca' : '#475569',
                                  padding: '2px 8px',
                                  borderRadius: '6px'
                                }}>
                                  {sub.shortName || sub.id}
                                </span>
                                {sub.category && (
                                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                                    {sub.category}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Cấu Hình Môn Học Đang Chọn */}
                  {selectedSubjectId && (
                    <div style={{
                      padding: '16px 20px',
                      background: '#f8fafc',
                      borderRadius: '14px',
                      border: '1px solid #e2e8f0',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '14px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>
                            2. THIẾT LẬP ĐỊNH MỨC CHO:
                          </span>
                          {(() => {
                            const sub = allSubjectsList.find(s => s.id === selectedSubjectId);
                            return (
                              <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 10px',
                                borderRadius: '8px',
                                background: sub?.bg || '#eef2ff',
                                border: `1px solid ${sub?.border || '#c7d2fe'}`,
                                color: sub?.text || '#312e81',
                                fontWeight: 700,
                                fontSize: '0.85rem'
                              }}>
                                <span>{sub?.name || selectedSubjectId}</span>
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                        alignItems: 'center'
                      }}>
                        {/* Số tiết / tuần */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            Số tiết / tuần:
                          </label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                              type="button"
                              onClick={() => setNewWeeklyPeriods(p => Math.max(1, p - 1))}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                fontWeight: 700,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              -
                            </button>
                            <input
                              type="number"
                              min="1"
                              max="15"
                              value={newWeeklyPeriods}
                              onChange={(e) => setNewWeeklyPeriods(Math.max(1, Math.min(15, parseInt(e.target.value, 10) || 1)))}
                              style={{
                                width: '60px',
                                height: '36px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                textAlign: 'center',
                                fontWeight: 800,
                                fontSize: '0.95rem',
                                color: '#1e1b4b',
                                background: '#ffffff'
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setNewWeeklyPeriods(p => Math.min(15, p + 1))}
                              style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '8px',
                                border: '1px solid #cbd5e1',
                                background: '#ffffff',
                                color: '#334155',
                                fontWeight: 700,
                                fontSize: '1rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}
                            >
                              +
                            </button>
                            {/* Quick options */}
                            <div style={{ display: 'flex', gap: '4px', marginLeft: '4px' }}>
                              {[1, 2, 3, 4].map(num => (
                                <button
                                  key={num}
                                  type="button"
                                  onClick={() => setNewWeeklyPeriods(num)}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '6px',
                                    border: newWeeklyPeriods === num ? '1px solid #4f46e5' : '1px solid #e2e8f0',
                                    background: newWeeklyPeriods === num ? '#eef2ff' : '#ffffff',
                                    color: newWeeklyPeriods === num ? '#4338ca' : '#64748b',
                                    fontSize: '0.75rem',
                                    fontWeight: 700,
                                    cursor: 'pointer'
                                  }}
                                >
                                  {num}T
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Ghép tiết kép */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            Tiết kép (liền nhau):
                          </label>
                          <label style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            border: '1px solid #cbd5e1',
                            background: '#ffffff',
                            width: '100%'
                          }}>
                            <input
                              type="checkbox"
                              checked={newAllowDouble}
                              onChange={(e) => setNewAllowDouble(e.target.checked)}
                              style={{ width: '16px', height: '16px' }}
                            />
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#334155' }}>
                              {newAllowDouble ? 'Cho phép ghép 2 tiết' : 'Tách rời từng tiết'}
                            </span>
                          </label>
                        </div>

                        {/* Phòng chức năng */}
                        <div>
                          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                            Phòng chức năng / địa điểm:
                          </label>
                          <select
                            value={newRoomType}
                            onChange={(e) => setNewRoomType(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 10px',
                              borderRadius: '8px',
                              border: '1px solid #cbd5e1',
                              fontSize: '0.85rem',
                              color: '#334155',
                              background: '#ffffff',
                              fontWeight: 500
                            }}
                          >
                            {availableRoomTypes.map(r => (
                              <option key={r.id} value={r.id}>{r.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '16px 24px',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: '#f8fafc',
              flexWrap: 'wrap',
              gap: '12px'
            }}>
              <div>
                {selectedSubjectId && unassignedSubjects.length > 0 && (
                  <div style={{ fontSize: '0.82rem', color: '#475569' }}>
                    Sẽ thêm vào <strong>Khối {activeGrade}</strong>: <strong style={{ color: '#4f46e5' }}>{allSubjectsList.find(s => s.id === selectedSubjectId)?.name}</strong> ({newWeeklyPeriods} tiết/tuần)
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '10px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Hủy Bỏ
                </button>

                {unassignedSubjects.length > 0 && (
                  <button
                    type="button"
                    disabled={!selectedSubjectId}
                    onClick={handleConfirmAddSubject}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '9px 20px',
                      borderRadius: '10px',
                      border: 'none',
                      background: selectedSubjectId 
                        ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' 
                        : '#cbd5e1',
                      color: '#ffffff',
                      fontSize: '0.875rem',
                      fontWeight: 700,
                      cursor: selectedSubjectId ? 'pointer' : 'not-allowed',
                      boxShadow: selectedSubjectId ? '0 4px 12px rgba(79, 70, 229, 0.35)' : 'none',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Plus size={16} />
                    <span>Thêm Vào Khối {activeGrade}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
