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
  // Inject dynamic @page style for orientation and size if specified
  let tempStyle = null;
  if (options.landscape !== undefined || options.size) {
    tempStyle = document.createElement('style');
    const sizeStr = options.size || (options.landscape ? 'A4 landscape' : 'A4 portrait');
    tempStyle.innerHTML = `@page { size: ${sizeStr} !important; margin: 5mm 6mm !important; }`;
    document.head.appendChild(tempStyle);
  }

  if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.printWindow === 'function') {
    try {
      const result = await window.electronAPI.printWindow({
        silent: false,
        printBackground: true,
        landscape: options.landscape || false,
        ...options
      });
      if (tempStyle && tempStyle.parentNode) tempStyle.parentNode.removeChild(tempStyle);
      return result || { success: true };
    } catch (err) {
      console.warn('Lỗi gọi in qua Electron IPC, chuyển hướng fallback sang window.print():', err);
    }
  }

  // Fallback hoặc môi trường Web chuẩn
  try {
    window.print();
    if (tempStyle && tempStyle.parentNode) tempStyle.parentNode.removeChild(tempStyle);
    return { success: true };
  } catch (err) {
    if (tempStyle && tempStyle.parentNode) tempStyle.parentNode.removeChild(tempStyle);
    console.error('Không thể kích hoạt in ấn:', err);
    return { success: false, error: err.message };
  }
}
