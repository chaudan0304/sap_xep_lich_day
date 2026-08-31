// src/services/printService.js

/**
 * Kích hoạt in ấn thời khóa biểu / bảng biểu một cách an toàn và tối ưu cho cả Web và Electron.
 * - Trên môi trường Desktop Electron: Gọi IPC 'print-window' tới Main Process để mở hộp thoại in native của Windows,
 *   bật sẵn printBackground: true để giữ đầy đủ màu sắc, đường viền bảng.
 * - Trên môi trường Web (trình duyệt Chrome, Edge...): Gọi window.print() thông thường.
 *
 * @param {Object} options Tùy chọn in bổ sung (nếu có)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function triggerAppPrint(options = {}) {
  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printWindow === 'function') {
    try {
      const result = await window.electronAPI.printWindow({
        silent: false,
        printBackground: true,
        ...options
      });
      return result || { success: true };
    } catch (err) {
      console.warn('Lỗi gọi in qua Electron IPC, chuyển hướng fallback sang window.print():', err);
    }
  }

  // Fallback hoặc môi trường Web chuẩn
  try {
    window.print();
    return { success: true };
  } catch (err) {
    console.error('Không thể kích hoạt in ấn:', err);
    return { success: false, error: err.message };
  }
}
