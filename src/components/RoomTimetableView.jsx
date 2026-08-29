// src/components/RoomTimetableView.jsx
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Building2, 
  Printer, 
  Users, 
  CheckCircle2, 
  AlertTriangle,
  Plus,
  Edit3,
  Trash2,
  X,
  Sparkles,
  Layers,
  MapPin,
  Clock
} from 'lucide-react';
import { DAYS_OF_WEEK, PERIODS } from '../constants/defaultCurriculum';
import { SUBJECTS as DEFAULT_SUBJECTS } from '../constants/subjects';

export const RoomTimetableView = ({
  rooms,
  setRooms,
  classes,
  teachers,
  timetable,
  subjects = DEFAULT_SUBJECTS,
  setSubjects,
  assignments = [],
  setAssignments
}) => {
  const [selectedRoomId, setSelectedRoomId] = useState(rooms[0]?.id || 'PHONG_TIN_HOC');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  // Đảm bảo selectedRoomId luôn trỏ tới phòng hợp lệ
  const currentRoom = useMemo(() => {
    return rooms.find(r => r.id === selectedRoomId) || rooms[0] || null;
  }, [rooms, selectedRoomId]);

  const teacherMap = useMemo(() => new Map(teachers.map(t => [t.id, t])), [teachers]);

  // Mở modal thêm phòng mới
  const handleAddNewRoom = () => {
    const nextNum = rooms.length + 1;
    setEditingRoom({
      id: `PHONG_CHUC_NANG_${nextNum}`,
      name: '',
      code: `PCN-${String(nextNum).padStart(2, '0')}`,
      building: 'Khu Chuyên Môn - Tầng 2',
      capacity: 35,
      subjectId: 'TIN_HOC',
      color: '#4f46e5',
      isSpecialized: true
    });
    setIsModalOpen(true);
  };

  // Mở modal sửa phòng hiện tại
  const handleEditRoom = (roomToEdit) => {
    if (!roomToEdit) return;
    setEditingRoom({
      ...roomToEdit,
      building: roomToEdit.building || 'Khu Chuyên Môn',
      capacity: roomToEdit.capacity || 35,
      subjectId: roomToEdit.subjectId || 'TIN_HOC',
      color: roomToEdit.color || '#4f46e5'
    });
    setIsModalOpen(true);
  };

  // Xóa phòng
  const handleDeleteRoom = (roomId) => {
    if (rooms.length <= 1) {
      alert('Hệ thống cần tối thiểu 1 phòng chức năng!');
      return;
    }
    const roomToDelete = rooms.find(r => r.id === roomId);
    if (window.confirm(`Bạn có chắc chắn muốn xóa phòng chức năng [${roomToDelete?.name || roomId}]?`)) {
      const remaining = rooms.filter(r => r.id !== roomId);
      if (setRooms) {
        setRooms(remaining);
      }
      // Gỡ bỏ phòng này khỏi danh mục môn học
      if (setSubjects) {
        setSubjects(prev => {
          const next = { ...prev };
          Object.keys(next).forEach(k => {
            if (next[k].defaultRoom === roomId) {
              next[k] = { ...next[k], defaultRoom: 'LOP_HOC' };
            }
          });
          return next;
        });
      }
      // Gỡ bỏ phòng này khỏi phân công chuyên môn
      if (setAssignments) {
        setAssignments(prev => prev.map(a => 
          a.roomType === roomId ? { ...a, roomType: 'LOP_HOC' } : a
        ));
      }

      if (selectedRoomId === roomId) {
        setSelectedRoomId(remaining[0]?.id || '');
      }
    }
  };

  // Lưu thông tin phòng (Thêm mới / Cập nhật)
  const handleSaveRoom = (e) => {
    e.preventDefault();
    if (!editingRoom.name.trim()) {
      alert('Vui lòng nhập tên phòng chức năng!');
      return;
    }

    // 1. Cập nhật danh sách phòng
    if (setRooms) {
      setRooms(prev => {
        const exists = prev.some(r => r.id === editingRoom.id);
        if (exists) {
          return prev.map(r => r.id === editingRoom.id ? editingRoom : r);
        } else {
          return [...prev, editingRoom];
        }
      });
    }

    // 2. Đồng bộ sang danh mục Môn học (Gán defaultRoom cho môn liên kết)
    if (setSubjects && editingRoom.subjectId) {
      setSubjects(prev => {
        const sub = prev[editingRoom.subjectId];
        if (sub) {
          return {
            ...prev,
            [editingRoom.subjectId]: {
              ...sub,
              defaultRoom: editingRoom.id
            }
          };
        }
        return prev;
      });
    }

    // 3. Đồng bộ sang bảng Phân công chuyên môn
    if (setAssignments && editingRoom.subjectId) {
      setAssignments(prev => prev.map(a => 
        a.subjectId === editingRoom.subjectId ? { ...a, roomType: editingRoom.id } : a
      ));
    }

    setSelectedRoomId(editingRoom.id);
    setIsModalOpen(false);
    setEditingRoom(null);
  };

  // Tính số tiết đã xếp vào phòng hiện tại
  const currentRoomBookedCount = useMemo(() => {
    if (!currentRoom) return 0;
    let count = 0;
    classes.forEach(cls => {
      for (let d = 2; d <= 6; d++) {
        for (let p = 1; p <= 7; p++) {
          const slot = timetable[cls.id]?.[d]?.[p];
          if (slot && (slot.roomId === currentRoom.id || slot.roomType === currentRoom.id)) {
            count++;
          }
        }
      }
    });
    return count;
  }, [classes, timetable, currentRoom]);

  return (
    <div className="animate-fade-in" style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* 1. Header */}
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
            <Building2 size={28} color="#4f46e5" />
            <span>Quản Lý & Lịch Sử Dụng Phòng Học Chức Năng</span>
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.875rem', marginTop: '4px' }}>
            Theo dõi tình trạng sử dụng, kiểm soát trùng phòng và chỉnh sửa cấu hình các phòng bộ môn
          </p>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          {setRooms && (
            <>
              <button
                onClick={handleAddNewRoom}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '10px 16px',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  background: '#4f46e5',
                  color: '#ffffff',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-sm)'
                }}
              >
                <Plus size={16} />
                <span>+ Thêm Phòng Mới</span>
              </button>

              {currentRoom && (
                <>
                  <button
                    onClick={() => handleEditRoom(currentRoom)}
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
                    <Edit3 size={16} color="#4f46e5" />
                    <span>Sửa Phòng Này</span>
                  </button>

                  <button
                    onClick={() => handleDeleteRoom(currentRoom.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '10px 16px',
                      borderRadius: '10px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      color: '#b91c1c',
                      cursor: 'pointer'
                    }}
                  >
                    <Trash2 size={16} />
                    <span>Xóa Phòng</span>
                  </button>
                </>
              )}
            </>
          )}

          <button
            onClick={() => window.print()}
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
            <Printer size={16} />
            <span>In Lịch Phòng</span>
          </button>
        </div>
      </div>

      {/* 2. Room Selector Tabs & Info Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#ffffff',
        padding: '14px 20px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px',
        boxShadow: 'var(--shadow-sm)'
      }}>
        {/* Room Buttons */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
          {rooms.map(room => {
            const isSelected = selectedRoomId === room.id;

            // Đếm số tiết đã xếp vào phòng này
            let bookedCount = 0;
            classes.forEach(cls => {
              for (let d = 2; d <= 6; d++) {
                for (let p = 1; p <= 7; p++) {
                  const slot = timetable[cls.id]?.[d]?.[p];
                  if (slot && (slot.roomId === room.id || slot.roomType === room.id)) {
                    bookedCount++;
                  }
                }
              }
            });

            return (
              <button
                key={room.id}
                onClick={() => setSelectedRoomId(room.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '9px 16px',
                  borderRadius: '10px',
                  fontSize: '0.875rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  border: isSelected ? '2px solid #4f46e5' : '1px solid #e2e8f0',
                  background: isSelected ? '#eef2ff' : '#ffffff',
                  color: isSelected ? '#4338ca' : '#475569',
                  transition: 'all 0.15s ease'
                }}
              >
                <span>{room.name}</span>
                <span style={{
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: isSelected ? '#4f46e5' : '#f1f5f9',
                  color: isSelected ? '#ffffff' : '#64748b'
                }}>
                  {bookedCount} tiết
                </span>
              </button>
            );
          })}
        </div>

        {/* Room Quick Info Badge */}
        {currentRoom && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            background: '#f8fafc',
            padding: '8px 14px',
            borderRadius: '10px',
            border: '1px solid #e2e8f0',
            fontSize: '0.8rem',
            color: '#475569',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <MapPin size={14} color="#4f46e5" />
              <span>Vị trí: <strong style={{ color: '#1e293b' }}>{currentRoom.building || 'Khu Chuyên Môn'}</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Users size={14} color="#059669" />
              <span>Sức chứa: <strong style={{ color: '#1e293b' }}>{currentRoom.capacity || 35} HS</strong></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={14} color="#d97706" />
              <span>Công suất: <strong style={{ color: '#4f46e5' }}>{currentRoomBookedCount} / 32 tiết</strong></span>
            </div>
          </div>
        )}
      </div>

      {/* Bell Schedule Bar */}
      <div style={{
        background: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0',
        padding: '8px 14px',
        marginBottom: '16px',
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

      {/* 3. Room Timetable Grid */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'center', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '14px 6px', width: '55px', color: '#475569', fontWeight: 800, borderRight: '1px solid #e2e8f0' }}>
                  Buổi
                </th>
                <th style={{ padding: '14px 6px', width: '55px', color: '#475569', fontWeight: 800, borderRight: '1px solid #e2e8f0' }}>
                  Tiết
                </th>
                {DAYS_OF_WEEK.map(day => (
                  <th key={day.id} style={{ padding: '14px', color: '#1e1b4b', fontWeight: 800 }}>
                    {day.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERIODS.map(period => (
                <React.Fragment key={period.id}>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    {/* Buổi Sáng / Chiều */}
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
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto' }}>
                          SÁNG
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
                        <div style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', margin: '0 auto' }}>
                          CHIỀU
                        </div>
                      </td>
                    )}

                    {/* Period Number Only */}
                    <td
                      title={`${period.name}: ${period.time}`}
                      style={{
                        padding: '10px 6px',
                        background: period.session === 'morning' ? '#f8fafc' : '#fffdf5',
                        borderRight: '1px solid #e2e8f0',
                        fontWeight: 800,
                        fontSize: '1rem',
                        color: period.session === 'morning' ? '#2563eb' : '#d97706',
                        verticalAlign: 'middle'
                      }}
                    >
                      {period.id <= 4 ? period.id : (period.id - 4)}
                    </td>

                    {DAYS_OF_WEEK.map(day => {
                      // Tìm tất cả các lớp đang dùng phòng này tại (day, period)
                      const matchedBookings = [];
                      classes.forEach(cls => {
                        const slot = timetable[cls.id]?.[day.id]?.[period.id];
                        if (slot && (slot.roomId === selectedRoomId || slot.roomType === selectedRoomId)) {
                          matchedBookings.push({ class: cls, slot });
                        }
                      });

                      const isOccupied = matchedBookings.length > 0;
                      const isMultiAllowed = selectedRoomId === 'SAN_THE_CHAT' || selectedRoomId === 'SAN_TRUONG' || currentRoom?.allowMultiple;
                      const isDoubleBooked = matchedBookings.length > 1 && !isMultiAllowed;
                      const isWedAfternoonOff = day.id === 4 && period.id > 4;

                      if (isWedAfternoonOff) {
                        return (
                          <td
                            key={day.id}
                            style={{
                              padding: '8px',
                              height: '75px',
                              width: '18%',
                              verticalAlign: 'middle',
                              borderRight: '1px solid #f1f5f9',
                              background: '#f1f5f9'
                            }}
                          >
                            <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>Nghỉ</span>
                          </td>
                        );
                      }

                      return (
                        <td
                          key={day.id}
                          style={{
                            padding: '8px',
                            height: '75px',
                            width: '18%',
                            verticalAlign: 'middle',
                            borderRight: '1px solid #f1f5f9'
                          }}
                        >
                          {isOccupied ? (
                            <div style={{
                              padding: '8px',
                              borderRadius: '8px',
                              background: isDoubleBooked ? '#fee2e2' : (isMultiAllowed && matchedBookings.length > 1 ? '#eff6ff' : '#f0fdf4'),
                              border: `1px solid ${isDoubleBooked ? '#fca5a5' : (isMultiAllowed && matchedBookings.length > 1 ? '#bfdbfe' : '#bbf7d0')}`,
                              color: isDoubleBooked ? '#991b1b' : (isMultiAllowed && matchedBookings.length > 1 ? '#1e40af' : '#166534'),
                              textAlign: 'left'
                            }}>
                              {matchedBookings.map((b, idx) => {
                                const sub = (subjects && subjects[b.slot.subjectId]) || DEFAULT_SUBJECTS[b.slot.subjectId];
                                const teacher = teacherMap.get(b.slot.teacherId);

                                return (
                                  <div key={idx} style={{ marginBottom: idx < matchedBookings.length - 1 ? '6px' : '0', paddingBottom: idx < matchedBookings.length - 1 ? '4px' : '0', borderBottom: idx < matchedBookings.length - 1 ? '1px dashed rgba(0,0,0,0.1)' : 'none' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                      <strong style={{ fontSize: '0.82rem' }}>{b.class.name}</strong>
                                      <span style={{ fontSize: '0.72rem', background: '#ffffff', padding: '1px 5px', borderRadius: '4px', border: '1px solid rgba(0,0,0,0.06)' }}>
                                        {sub?.shortName || sub?.name || b.slot.subjectId}
                                      </span>
                                    </div>
                                    <div style={{ fontSize: '0.72rem', color: isDoubleBooked ? '#b91c1c' : (isMultiAllowed && matchedBookings.length > 1 ? '#1d4ed8' : '#15803d'), marginTop: '2px' }}>
                                      GV: {teacher?.name || b.slot.teacherId}
                                    </div>
                                  </div>
                                );
                              })}
                              {isDoubleBooked && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 700, color: '#ef4444', marginTop: '4px' }}>
                                  <AlertTriangle size={12} />
                                  <span>Trùng 2 lớp cùng dùng phòng!</span>
                                </div>
                              )}
                              {isMultiAllowed && matchedBookings.length > 1 && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.68rem', fontWeight: 700, color: '#2563eb', marginTop: '4px' }}>
                                  <CheckCircle2 size={12} />
                                  <span>{matchedBookings.length} lớp học cùng lúc</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div style={{
                              height: '100%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: '#cbd5e1',
                              fontSize: '0.8rem'
                            }}>
                              Trống
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>

                  {/* Lunch break divider */}
                  {period.id === 4 && (
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0', borderBottom: '2px solid #e2e8f0' }}>
                      <td colSpan="7" style={{ padding: '8px', color: '#64748b', fontSize: '0.75rem', fontWeight: 700, textAlign: 'center' }}>
                        🍱 NGHỈ TRƯA (10:30 - 14:00)
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* DEDICATED OFFICIAL PRINTABLE SHEET FOR ROOM (A4 PORTRAIT)     */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="printable-sheet">
        {/* National / School Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1.5px solid #000', paddingBottom: '8px', marginBottom: '12px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '10pt', textTransform: 'uppercase', fontWeight: 600 }}>PHÒNG GD&ĐT THỊ XÃ HOÀNG MAI</div>
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
            LỊCH SỬ DỤNG {currentRoom?.name?.toUpperCase() || 'PHÒNG CHỨC NĂNG'}
          </h1>
          <div style={{ fontSize: '9.5pt', fontStyle: 'italic', marginTop: '4px' }}>
            Áp dụng từ ngày {new Date().toLocaleDateString('vi-VN')} • Năm học 2025 - 2026
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '24px', marginTop: '6px', fontSize: '9.5pt', fontWeight: 600 }}>
            <span>Phụ trách: <strong>{currentRoom?.inCharge || 'Nhà trường'}</strong></span>
            <span>Vị trí: <strong>{currentRoom?.location || 'Khu phòng chức năng'}</strong></span>
            <span>Công suất: <strong>{currentRoomBookedCount} / 32 tiết</strong></span>
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
            {PERIODS.map(period => (
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
                    const matchedBookings = [];
                    classes.forEach(cls => {
                      const slot = timetable[cls.id]?.[day.id]?.[period.id];
                      if (slot && (slot.roomId === selectedRoomId || slot.roomType === selectedRoomId)) {
                        matchedBookings.push({ class: cls, slot });
                      }
                    });

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
                        {matchedBookings.length > 0 ? (
                          <div>
                            {matchedBookings.map((b, idx) => {
                              const sub = (subjects && subjects[b.slot.subjectId]) || DEFAULT_SUBJECTS[b.slot.subjectId];
                              const teacher = teacherMap.get(b.slot.teacherId);
                              return (
                                <div key={idx} style={{ marginBottom: idx < matchedBookings.length - 1 ? '3px' : '0' }}>
                                  <div style={{ fontWeight: 800, fontSize: '9pt', color: '#000' }}>
                                    {b.class.name} ({sub?.shortName || sub?.name || b.slot.subjectId})
                                  </div>
                                  <div style={{ fontSize: '7.5pt', color: '#333' }}>
                                    GV: {teacher?.code || teacher?.name || b.slot.teacherId}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <span style={{ color: '#aaa' }}>-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {period.id === 4 && (
                  <tr style={{ background: '#f1f5f9', border: '1px solid #000' }}>
                    <td colSpan={8} style={{ border: '1px solid #000', padding: '4px', fontSize: '8.5pt', fontWeight: 800, fontStyle: 'italic' }}>
                      🍱 NGHỈ TRƯA (10:30 - 14:00)
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>

        {/* Footer Signatures */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '22px', fontSize: '9.5pt' }}>
          <div style={{ textAlign: 'center', width: '220px' }}>
            <div style={{ fontWeight: 800, textTransform: 'uppercase' }}>NGƯỜI LẬP BIỂU</div>
            <div style={{ fontStyle: 'italic', fontSize: '8pt', marginTop: '2px' }}>(Ký và ghi rõ họ tên)</div>
            <div style={{ height: '50px' }} />
          </div>
          <div style={{ textAlign: 'center', width: '240px' }}>
            <div style={{ fontStyle: 'italic', fontSize: '8.5pt' }}>Quỳnh Lộc, ngày ... tháng ... năm 202...</div>
            <div style={{ fontWeight: 800, textTransform: 'uppercase', marginTop: '2px' }}>HIỆU TRƯỞNG</div>
            <div style={{ fontStyle: 'italic', fontSize: '8pt', marginTop: '2px' }}>(Ký và đóng dấu)</div>
            <div style={{ height: '50px' }} />
          </div>
        </div>
      </div>

      {/* 4. Modal Chỉnh Sửa / Thêm Mới Phòng Chức Năng */}
      {isModalOpen && editingRoom && createPortal(
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '20px',
            width: '100%',
            maxWidth: '560px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '28px',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid #e2e8f0',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Building2 size={24} color="#4f46e5" />
                <span>{rooms.some(r => r.id === editingRoom.id) ? 'Chỉnh Sửa Phòng Chức Năng' : 'Thêm Phòng Chức Năng Mới'}</span>
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: '4px' }}
              >
                <X size={22} color="#94a3b8" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveRoom}>
              {/* Tên phòng */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Tên Phòng Chức Năng *
                </label>
                <input
                  type="text"
                  required
                  value={editingRoom.name}
                  onChange={(e) => setEditingRoom({ ...editingRoom, name: e.target.value })}
                  placeholder="VD: Phòng Tin học 1, Phòng Tiếng Anh Smart Lab..."
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                />
              </div>

              {/* Grid 2 cột: Mã ID & Mã Viết Tắt */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Mã Phòng (ID) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editingRoom.id}
                    onChange={(e) => setEditingRoom({ ...editingRoom, id: e.target.value.trim().toUpperCase() })}
                    placeholder="VD: PHONG_TIN_HOC"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Mã Viết Tắt
                  </label>
                  <input
                    type="text"
                    value={editingRoom.code || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, code: e.target.value.trim() })}
                    placeholder="VD: TIN-01, LAB-AV..."
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {/* Grid 2 cột: Vị trí & Sức chứa */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Vị Trí / Tòa Nhà
                  </label>
                  <input
                    type="text"
                    value={editingRoom.building || ''}
                    onChange={(e) => setEditingRoom({ ...editingRoom, building: e.target.value })}
                    placeholder="VD: Khu Chuyên Môn - Tầng 2"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                    Sức Chứa (Học Sinh)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="200"
                    value={editingRoom.capacity || 35}
                    onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem' }}
                  />
                </div>
              </div>

              {/* Môn học liên kết mặc định */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Môn Học Liên Kết Mặc Định
                </label>
                <select
                  value={editingRoom.subjectId || 'TIN_HOC'}
                  onChange={(e) => setEditingRoom({ ...editingRoom, subjectId: e.target.value })}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.875rem', background: '#fff' }}
                >
                  {Object.values(subjects).map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name} ({sub.id})</option>
                  ))}
                </select>
              </div>

              {/* Tùy chọn cho phép nhiều lớp học cùng lúc */}
              <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontWeight: 600, color: '#334155', fontSize: '0.85rem' }}>
                  <input
                    type="checkbox"
                    checked={editingRoom.allowMultiple ?? (editingRoom.id === 'SAN_THE_CHAT' || editingRoom.id === 'SAN_TRUONG')}
                    onChange={(e) => setEditingRoom({ ...editingRoom, allowMultiple: e.target.checked })}
                    style={{ width: '18px', height: '18px' }}
                  />
                  <span>Cho phép nhiều lớp học cùng 1 lúc (vd: Sân thể chất, Nhà thi đấu đa năng)</span>
                </label>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: '10px 20px', borderRadius: '10px', border: '1px solid #cbd5e1', background: '#ffffff', color: '#475569', fontWeight: 600, cursor: 'pointer' }}
                >
                  Hủy Bỏ
                </button>
                <button
                  type="submit"
                  style={{ padding: '10px 24px', borderRadius: '10px', border: 'none', background: '#4f46e5', color: '#ffffff', fontWeight: 700, cursor: 'pointer', boxShadow: 'var(--shadow-sm)' }}
                >
                  Lưu Thông Tin Phòng
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
