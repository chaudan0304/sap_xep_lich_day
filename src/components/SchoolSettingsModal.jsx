// src/components/SchoolSettingsModal.jsx
import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  School,
  Clock,
  Save,
  RotateCcw,
  X,
  CheckCircle2,
  Settings,
  Sparkles,
  Calendar,
  User,
  MapPin,
  FileText
} from 'lucide-react';
import { PERIODS as DEFAULT_PERIODS } from '../constants/defaultCurriculum';

export const DEFAULT_SCHOOL_INFO = {
  name: 'Trường Tiểu học Quỳnh Lộc B',
  district: 'UBND Phường Tân Mai',
  year: 'Năm học 2026 - 2027',
  principal: 'Bùi Văn Việt',
  scheduler: 'Châu Đàn',
  address: 'Phường Tân Mai, TX Hoàng Mai, Nghệ An',
  lunchBreak: '10:30 - 14:00'
};

const SchoolSettingsModal = ({
  isOpen,
  onClose,
  schoolInfo = {},
  setSchoolInfo,
  periods = DEFAULT_PERIODS,
  setPeriods
}) => {
  const [activeTab, setActiveTab] = useState('school'); // 'school' | 'periods'

  // Local form state
  const [localSchool, setLocalSchool] = useState({
    name: schoolInfo.name || DEFAULT_SCHOOL_INFO.name,
    district: schoolInfo.district || DEFAULT_SCHOOL_INFO.district,
    year: schoolInfo.year || DEFAULT_SCHOOL_INFO.year,
    principal: schoolInfo.principal || DEFAULT_SCHOOL_INFO.principal,
    scheduler: schoolInfo.scheduler || DEFAULT_SCHOOL_INFO.scheduler,
    address: schoolInfo.address || DEFAULT_SCHOOL_INFO.address,
    lunchBreak: schoolInfo.lunchBreak || DEFAULT_SCHOOL_INFO.lunchBreak
  });

  const [localPeriods, setLocalPeriods] = useState(() => {
    return (periods && periods.length > 0) ? JSON.parse(JSON.stringify(periods)) : JSON.parse(JSON.stringify(DEFAULT_PERIODS));
  });

  // Auto schedule generator inputs
  const [autoGen, setAutoGen] = useState({
    morningStart: '07:30',
    afternoonStart: '14:00',
    periodDuration: 35,
    shortBreak: 10,
    longBreak: 20 // between P2 and P3
  });

  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setLocalSchool({
        name: schoolInfo.name || DEFAULT_SCHOOL_INFO.name,
        district: schoolInfo.district || DEFAULT_SCHOOL_INFO.district,
        year: schoolInfo.year || DEFAULT_SCHOOL_INFO.year,
        principal: schoolInfo.principal || DEFAULT_SCHOOL_INFO.principal,
        scheduler: schoolInfo.scheduler || DEFAULT_SCHOOL_INFO.scheduler,
        address: schoolInfo.address || DEFAULT_SCHOOL_INFO.address,
        lunchBreak: schoolInfo.lunchBreak || DEFAULT_SCHOOL_INFO.lunchBreak
      });
      setLocalPeriods((periods && periods.length > 0) ? JSON.parse(JSON.stringify(periods)) : JSON.parse(JSON.stringify(DEFAULT_PERIODS)));
    }
  }, [isOpen, schoolInfo, periods]);

  if (!isOpen) return null;

  // Helper to calculate duration between HH:mm and HH:mm
  const calculateDuration = (timeRangeStr) => {
    if (!timeRangeStr || !timeRangeStr.includes('-')) return '';
    const [startStr, endStr] = timeRangeStr.split('-').map(s => s.trim());
    const [sh, sm] = (startStr || '').split(':').map(Number);
    const [eh, em] = (endStr || '').split(':').map(Number);
    if (isNaN(sh) || isNaN(sm) || isNaN(eh) || isNaN(em)) return '';
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    const diff = endMins - startMins;
    return diff > 0 ? `${diff} phút` : '';
  };

  const handlePeriodTimeChange = (id, newTime) => {
    setLocalPeriods(prev => prev.map(p => p.id === id ? { ...p, time: newTime } : p));
  };

  // Helper to add minutes to HH:mm
  const addMinutes = (timeStr, mins) => {
    const [h, m] = timeStr.split(':').map(Number);
    const total = h * 60 + m + mins;
    const newH = Math.floor(total / 60) % 24;
    const newM = total % 60;
    return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
  };

  // Auto Generate Periods
  const handleAutoGeneratePeriods = () => {
    const newPeriods = JSON.parse(JSON.stringify(localPeriods));
    const dur = Number(autoGen.periodDuration) || 35;
    const sBreak = Number(autoGen.shortBreak) || 10;
    const lBreak = Number(autoGen.longBreak) || 20;

    // Morning: 4 periods
    let curTime = autoGen.morningStart || '07:30';
    for (let i = 1; i <= 4; i++) {
      const pIndex = newPeriods.findIndex(p => p.id === i);
      const endTime = addMinutes(curTime, dur);
      if (pIndex !== -1) {
        newPeriods[pIndex].time = `${curTime} - ${endTime}`;
      }
      // calculate next start time
      const breakMins = (i === 2) ? lBreak : sBreak;
      curTime = addMinutes(endTime, breakMins);
    }

    // Afternoon: 3 periods (P5, P6, P7)
    let curAftTime = autoGen.afternoonStart || '14:00';
    for (let i = 5; i <= 7; i++) {
      const pIndex = newPeriods.findIndex(p => p.id === i);
      const endTime = addMinutes(curAftTime, dur);
      if (pIndex !== -1) {
        newPeriods[pIndex].time = `${curAftTime} - ${endTime}`;
      }
      curAftTime = addMinutes(endTime, sBreak);
    }

    setLocalPeriods(newPeriods);
    setToastMessage('Đã tự động tính toán khung giờ tiết học chuẩn thành công!');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleResetToDefault = () => {
    if (activeTab === 'school') {
      setLocalSchool(DEFAULT_SCHOOL_INFO);
    } else {
      setLocalPeriods(JSON.parse(JSON.stringify(DEFAULT_PERIODS)));
    }
    setToastMessage('Đã khôi phục cài đặt mặc định.');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (setSchoolInfo) {
      setSchoolInfo(localSchool);
      localStorage.setItem('EDUTIMETABLE_SCHOOL_INFO', JSON.stringify(localSchool));
    }
    if (setPeriods) {
      setPeriods(localPeriods);
      localStorage.setItem('EDUTIMETABLE_PERIODS', JSON.stringify(localPeriods));
    }
    onClose();
  };

  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
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
        maxWidth: '850px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '24px 28px',
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)',
          color: '#ffffff',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              padding: '12px',
              borderRadius: '14px',
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
            }}>
              <Settings size={26} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                Cài Đặt Trường Học & Thời Gian Tiết Học
              </h2>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#c7d2fe' }}>
                Tùy chỉnh thông tin nhà trường, cơ quan cấp trên, năm học và khung giờ chuông báo từng tiết
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '10px',
              padding: '8px',
              cursor: 'pointer',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s'
            }}
            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
            onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc',
          padding: '0 28px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('school')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'school' ? '#4f46e5' : '#64748b',
              borderBottom: activeTab === 'school' ? '3px solid #4f46e5' : '3px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <School size={18} />
            <span>1. Thông Tin Trường Học</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('periods')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 20px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.9rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'periods' ? '#4f46e5' : '#64748b',
              borderBottom: activeTab === 'periods' ? '3px solid #4f46e5' : '3px solid transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <Clock size={18} />
            <span>2. Khung Giờ & Thời Gian Tiết Học</span>
          </button>
        </div>

        {/* Toast Notification */}
        {toastMessage && (
          <div style={{
            margin: '16px 28px 0 28px',
            padding: '10px 16px',
            borderRadius: '10px',
            background: '#ecfdf5',
            border: '1px solid #a7f3d0',
            color: '#065f46',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle2 size={16} color="#059669" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSave} style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px', flex: 1 }}>
          {activeTab === 'school' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '12px',
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                color: '#1e40af',
                fontSize: '0.82rem'
              }}>
                <School size={20} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Lưu ý:</strong> Thông tin tên trường, cơ quan cấp trên, năm học và hiệu trưởng sẽ được tự động đồng bộ lên tiêu đề báo cáo, bảng ma trận, thời khóa biểu giáo viên và file Excel khi xuất bản.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Tên Trường */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    🏫 Tên Trường Học <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={localSchool.name}
                    onChange={(e) => setLocalSchool({ ...localSchool, name: e.target.value })}
                    placeholder="VD: Trường Tiểu học Quỳnh Lộc B"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Cơ quan quản lý cấp trên */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    🏛️ Cơ Quan Cấp Trên / Phường / Xã <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={localSchool.district}
                    onChange={(e) => setLocalSchool({ ...localSchool, district: e.target.value })}
                    placeholder="VD: UBND Phường Tân Mai hoặc Phòng GD&ĐT..."
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Năm Học */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    📅 Năm Học Áp Dụng <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={localSchool.year}
                    onChange={(e) => setLocalSchool({ ...localSchool, year: e.target.value })}
                    placeholder="VD: Năm học 2026 - 2027"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Hiệu Trưởng */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    ✍️ Họ Tên Hiệu Trưởng (Ký duyệt TKB) <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={localSchool.principal}
                    onChange={(e) => setLocalSchool({ ...localSchool, principal: e.target.value })}
                    placeholder="VD: Bùi Văn Việt"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                {/* Người Lập Biểu */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    👤 Người Lập Biểu / Phó Hiệu Trưởng
                  </label>
                  <input
                    type="text"
                    value={localSchool.scheduler}
                    onChange={(e) => setLocalSchool({ ...localSchool, scheduler: e.target.value })}
                    placeholder="VD: Châu Đàn"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Giờ Nghỉ Trưa */}
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    🍱 Khung Giờ Nghỉ Trưa & Bán Trú
                  </label>
                  <input
                    type="text"
                    value={localSchool.lunchBreak}
                    onChange={(e) => setLocalSchool({ ...localSchool, lunchBreak: e.target.value })}
                    placeholder="VD: 10:30 - 14:00"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      border: '1.5px solid #cbd5e1',
                      fontSize: '0.9rem',
                      fontWeight: 600,
                      color: '#0f172a',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              {/* Địa chỉ trường */}
              <div>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  📍 Địa Chỉ Trường Học
                </label>
                <input
                  type="text"
                  value={localSchool.address}
                  onChange={(e) => setLocalSchool({ ...localSchool, address: e.target.value })}
                  placeholder="VD: Phường Tân Mai, TX Hoàng Mai, Nghệ An"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1.5px solid #cbd5e1',
                    fontSize: '0.9rem',
                    color: '#0f172a',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            </div>
          )}

          {activeTab === 'periods' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Auto Generator Quick Tool */}
              <div style={{
                background: '#f8fafc',
                borderRadius: '16px',
                padding: '16px 20px',
                border: '1px solid #e2e8f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Sparkles size={18} color="#4f46e5" />
                  <span style={{ fontWeight: 800, fontSize: '0.9rem', color: '#1e293b' }}>
                    Công Cụ Tự Động Tính Khung Giờ Nhanh (35 phút/tiết chuẩn Bộ GD&ĐT)
                  </span>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '12px',
                  alignItems: 'flex-end'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Bắt đầu Sáng
                    </label>
                    <input
                      type="time"
                      value={autoGen.morningStart}
                      onChange={(e) => setAutoGen({ ...autoGen, morningStart: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Bắt đầu Chiều
                    </label>
                    <input
                      type="time"
                      value={autoGen.afternoonStart}
                      onChange={(e) => setAutoGen({ ...autoGen, afternoonStart: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Thời lượng 1 tiết
                    </label>
                    <input
                      type="number"
                      min="30"
                      max="45"
                      value={autoGen.periodDuration}
                      onChange={(e) => setAutoGen({ ...autoGen, periodDuration: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Nghỉ giữa tiết 2 & 3
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="30"
                      value={autoGen.longBreak}
                      onChange={(e) => setAutoGen({ ...autoGen, longBreak: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                      Giải lao thường
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="15"
                      value={autoGen.shortBreak}
                      onChange={(e) => setAutoGen({ ...autoGen, shortBreak: e.target.value })}
                      style={{ width: '100%', padding: '6px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={handleAutoGeneratePeriods}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      background: '#4f46e5',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: '0.8rem',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      boxShadow: '0 2px 6px rgba(79, 70, 229, 0.3)',
                      height: '35px'
                    }}
                  >
                    <Sparkles size={14} />
                    <span>Áp Dụng Tự Động</span>
                  </button>
                </div>
              </div>

              {/* Table of Periods */}
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1.5px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 14px', width: '70px', fontWeight: 800, color: '#475569' }}>Buổi</th>
                      <th style={{ padding: '10px 14px', width: '70px', fontWeight: 800, color: '#475569' }}>Tiết</th>
                      <th style={{ padding: '10px 14px', fontWeight: 800, color: '#475569' }}>Tên Tiết Học</th>
                      <th style={{ padding: '10px 14px', width: '220px', fontWeight: 800, color: '#475569' }}>Khung Giờ (Bắt đầu - Kết thúc)</th>
                      <th style={{ padding: '10px 14px', width: '110px', fontWeight: 800, color: '#475569', textAlign: 'center' }}>Thời Lượng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {localPeriods.map((p, idx) => {
                      const isMorning = p.session === 'morning';
                      const duration = calculateDuration(p.time);

                      return (
                        <React.Fragment key={p.id}>
                          <tr style={{
                            borderBottom: '1px solid #f1f5f9',
                            background: isMorning ? '#ffffff' : '#fffdfa'
                          }}>
                            {/* Session label */}
                            {p.id === 1 && (
                              <td rowSpan={4} style={{
                                padding: '10px 14px',
                                fontWeight: 800,
                                color: '#1d4ed8',
                                background: '#eff6ff',
                                verticalAlign: 'middle',
                                borderRight: '1px solid #e2e8f0'
                              }}>
                                SÁNG
                              </td>
                            )}
                            {p.id === 5 && (
                              <td rowSpan={3} style={{
                                padding: '10px 14px',
                                fontWeight: 800,
                                color: '#b45309',
                                background: '#fffbeb',
                                verticalAlign: 'middle',
                                borderRight: '1px solid #e2e8f0'
                              }}>
                                CHIỀU
                              </td>
                            )}

                            {/* Period Number */}
                            <td style={{ padding: '10px 14px', fontWeight: 800, color: isMorning ? '#2563eb' : '#d97706' }}>
                              Tiết {p.id <= 4 ? p.id : (p.id - 4)}
                            </td>

                            {/* Period Display Name */}
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: '#1e293b' }}>
                              {p.name || `Tiết ${p.id}`}
                            </td>

                            {/* Period Time Input */}
                            <td style={{ padding: '6px 14px' }}>
                              <input
                                type="text"
                                value={p.time}
                                onChange={(e) => handlePeriodTimeChange(p.id, e.target.value)}
                                placeholder="07:30 - 08:05"
                                style={{
                                  width: '100%',
                                  padding: '6px 10px',
                                  borderRadius: '8px',
                                  border: '1.5px solid #cbd5e1',
                                  fontSize: '0.85rem',
                                  fontWeight: 700,
                                  color: '#0f172a',
                                  outline: 'none',
                                  boxSizing: 'border-box'
                                }}
                              />
                            </td>

                            {/* Duration */}
                            <td style={{ padding: '10px 14px', textAlign: 'center', color: '#64748b', fontWeight: 600 }}>
                              <span style={{
                                background: '#f1f5f9',
                                padding: '2px 8px',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontWeight: 700,
                                color: '#334155'
                              }}>
                                {duration || '35 phút'}
                              </span>
                            </td>
                          </tr>

                          {/* Lunch Break Divider */}
                          {p.id === 4 && (
                            <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
                              <td colSpan={4} style={{ padding: '8px 14px', color: '#64748b', fontSize: '0.78rem', fontWeight: 700, textAlign: 'center' }}>
                                🍱 NGHỈ TRƯA & ĂN BÁN TRÚ: <strong>{localSchool.lunchBreak || '10:30 - 14:00'}</strong>
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
          )}

          {/* Footer Actions */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0',
            marginTop: '8px'
          }}>
            <button
              type="button"
              onClick={handleResetToDefault}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 16px',
                borderRadius: '10px',
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                color: '#475569',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              <RotateCcw size={16} />
              <span>Khôi Phục Mặc Định</span>
            </button>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '10px 18px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Hủy Bỏ
              </button>

              <button
                type="submit"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 22px',
                  borderRadius: '10px',
                  background: '#4f46e5',
                  border: 'none',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(79, 70, 229, 0.35)'
                }}
              >
                <Save size={16} />
                <span>Lưu Cấu Hình</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default SchoolSettingsModal;
