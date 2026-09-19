// src/services/dbService.js
/**
 * Dịch vụ kết nối và quản lý Cơ sở dữ liệu SQLite cho EduTimetable
 * Tự động thích ứng đa môi trường:
 * - Môi trường Electron Desktop: Gọi trực tiếp qua IPC window.electronAPI.db
 * - Môi trường Trình duyệt / Vite Dev: Gọi REST API /api/db/*
 * - Môi trường Static / Offline Web: Đồng bộ dự phòng qua LocalStorage
 */

export const isElectronEnv = () => {
  return typeof window !== 'undefined' && Boolean(window.electronAPI?.db);
};

/**
 * Nạp toàn bộ dữ liệu từ Cơ sở dữ liệu SQLite
 */
export async function loadAllDataFromDb() {
  try {
    // 1. Nếu đang chạy trong Desktop Electron
    if (isElectronEnv()) {
      const res = await window.electronAPI.db.load();
      if (res?.success && res?.data) {
        return res.data;
      }
    }

    // 2. Nếu đang chạy trên Trình duyệt (Vite Dev Server)
    if (typeof window !== 'undefined') {
      const resp = await fetch('/api/db/load', { method: 'GET' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.schoolInfo && data.classes && data.classes.length > 0) {
          return data;
        }
      }
    }
  } catch (err) {
    console.warn('loadAllDataFromDb warning, falling back to local state:', err);
  }

  return null;
}

/**
 * Lưu toàn bộ dữ liệu vào Cơ sở dữ liệu SQLite
 */
export async function saveAllDataToDb(payload) {
  if (!payload) return false;

  let savedOk = false;

  try {
    // 1. Lưu qua Electron IPC
    if (isElectronEnv()) {
      const res = await window.electronAPI.db.save(payload);
      if (res?.success) savedOk = true;
    } else if (typeof window !== 'undefined') {
      // 2. Lưu qua Vite Dev API
      const resp = await fetch('/api/db/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (resp.ok) savedOk = true;
    }
  } catch (err) {
    console.warn('saveAllDataToDb SQLite write warning:', err);
  }

  return savedOk;
}

/**
 * Xuất tập tin cơ sở dữ liệu SQLite (.db) về máy tính
 */
export async function exportSqliteDatabaseFile(schoolName = 'Truong') {
  try {
    if (isElectronEnv()) {
      const res = await window.electronAPI.db.exportFile();
      return res;
    }

    // Trình duyệt: tải trực tiếp từ endpoint /api/db/download
    const resp = await fetch('/api/db/download');
    if (!resp.ok) {
      throw new Error('Không thể tải file database từ máy chủ.');
    }

    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeSchoolName = (schoolName || 'Truong').replace(/[^a-zA-Z0-9_\u00C0-\u1EF9]/g, '_');
    a.download = `edutimetable_${safeSchoolName}_${new Date().toISOString().slice(0, 10)}.db`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return { success: true };
  } catch (err) {
    console.error('exportSqliteDatabaseFile error:', err);
    throw err;
  }
}

/**
 * Nạp tập tin cơ sở dữ liệu SQLite (.db) từ máy tính
 */
export async function importSqliteDatabaseFile(file) {
  try {
    if (isElectronEnv()) {
      const res = await window.electronAPI.db.importFile();
      return res;
    }

    if (!file) {
      throw new Error('Vui lòng chọn file .db để nạp.');
    }

    const arrayBuffer = await file.arrayBuffer();
    const resp = await fetch('/api/db/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: arrayBuffer
    });

    if (!resp.ok) {
      const errRes = await resp.json().catch(() => ({}));
      throw new Error(errRes.error || 'Nạp file cơ sở dữ liệu thất bại.');
    }

    const uploadRes = await resp.json().catch(() => ({}));
    if (uploadRes?.data && uploadRes.data.classes?.length > 0) {
      return { success: true, data: uploadRes.data };
    }

    // Nạp lại dữ liệu sau khi upload thành công (fallback nếu server không đính kèm data)
    const loadResp = await fetch('/api/db/load');
    if (!loadResp.ok) {
      throw new Error(`Máy chủ không thể đọc lại dữ liệu (mã lỗi ${loadResp.status}).`);
    }
    const freshData = await loadResp.json();
    if (freshData?.success === false) {
      throw new Error(freshData.error || 'Nạp dữ liệu từ cơ sở dữ liệu thất bại.');
    }
    return { success: true, data: freshData };
  } catch (err) {
    console.error('importSqliteDatabaseFile error:', err);
    throw err;
  }
}
