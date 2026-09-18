// src/services/departmentService.js
/**
 * Quản lý Danh mục Tổ Chuyên Môn / Văn Phòng động cho EduTimetable
 * Đảm bảo:
 * - ID ổn định (không thay đổi khi đổi tên tổ)
 * - Tên duy nhất (không phân biệt hoa/thường, tự động trim)
 * - Chặn xóa khi có giáo viên đang tham chiếu
 * - Tương thích ngược: đồng bộ cả departmentId và department (name)
 */

export const DEFAULT_DEPARTMENTS = [
  {
    id: 'dept_to_123',
    name: 'Tổ 1, 2, 3',
    description: '',
    isOffice: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'dept_to_45',
    name: 'Tổ 4, 5',
    description: '',
    isOffice: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'dept_bo_mon',
    name: 'Giáo viên bộ môn',
    description: '',
    isOffice: false,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  },
  {
    id: 'dept_van_phong',
    name: 'Tổ Văn Phòng',
    description: '',
    isOffice: true,
    createdAt: '2026-09-01T00:00:00.000Z',
    updatedAt: '2026-09-01T00:00:00.000Z'
  }
];

/**
 * Kiểm tra xem một tổ hoặc tên tổ có phải là tổ Văn phòng/Hành chính không
 */
export const isOfficeDepartment = (deptOrName) => {
  if (!deptOrName) return false;
  if (typeof deptOrName === 'object') {
    if (deptOrName.isOffice) return true;
    return isOfficeDepartment(deptOrName.name);
  }
  const lower = String(deptOrName).trim().toLowerCase();
  return (
    lower === 'tổ văn phòng' ||
    lower === 'văn phòng' ||
    lower.includes('văn phòng') ||
    lower.includes('hành chính') ||
    lower.includes('kế toán') ||
    lower.includes('văn thư')
  );
};

/**
 * Tạo ID tổ duy nhất và ổn định
 */
export const generateDepartmentId = (name = '') => {
  const norm = String(name)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  if (norm.includes('1_2_3') || norm === 'to_123') return 'dept_to_123';
  if (norm.includes('4_5') || norm === 'to_45') return 'dept_to_45';
  if (norm.includes('bo_mon')) return 'dept_bo_mon';
  if (norm.includes('van_phong')) return 'dept_van_phong';

  const baseSlug = norm ? norm.slice(0, 20) : 'dept';
  const randomSuffix = Math.random().toString(36).substring(2, 7);
  return `dept_${baseSlug}_${Date.now()}_${randomSuffix}`;
};

/**
 * Chuẩn hóa tên tổ: trim khoảng trắng
 */
export const normalizeDepartmentName = (name) => {
  if (!name || typeof name !== 'string') return '';
  return name.trim().replace(/\s+/g, ' ');
};

/**
 * Tìm tổ theo tên (không phân biệt hoa/thường)
 */
export const findDepartmentByName = (departments = [], name = '') => {
  const cleanName = normalizeDepartmentName(name).toLowerCase();
  if (!cleanName) return null;
  return (departments || []).find(d => normalizeDepartmentName(d.name).toLowerCase() === cleanName) || null;
};

/**
 * Lấy danh sách tổ đã sắp xếp (các tổ chuyên môn trước, tổ văn phòng sau)
 */
export const getDepartments = (departments = []) => {
  const list = Array.isArray(departments) && departments.length > 0
    ? [...departments]
    : [...DEFAULT_DEPARTMENTS];

  return list.sort((a, b) => {
    const isOfficeA = isOfficeDepartment(a);
    const isOfficeB = isOfficeDepartment(b);
    if (isOfficeA && !isOfficeB) return 1;
    if (!isOfficeA && isOfficeB) return -1;
    return (a.name || '').localeCompare(b.name || '', 'vi', { numeric: true });
  });
};

/**
 * Lấy thông tin tổ theo ID
 */
export const getDepartmentById = (departments = [], id) => {
  if (!id) return null;
  return (departments || []).find(d => d.id === id) || null;
};

/**
 * Kiểm tra hợp lệ của tên tổ:
 * - Không rỗng
 * - Không chỉ có khoảng trắng
 * - Không trùng lặp (không phân biệt hoa/thường)
 */
export const validateDepartmentName = (departments = [], name = '', excludeId = null) => {
  const cleanName = normalizeDepartmentName(name);

  if (!cleanName) {
    return {
      valid: false,
      error: 'EMPTY_NAME',
      message: 'Tên tổ không được để trống hoặc chỉ chứa khoảng trắng.'
    };
  }

  const lowerName = cleanName.toLowerCase();
  const duplicate = (departments || []).find(d => {
    if (excludeId && d.id === excludeId) return false;
    return normalizeDepartmentName(d.name).toLowerCase() === lowerName;
  });

  if (duplicate) {
    return {
      valid: false,
      error: 'DUPLICATE_NAME',
      message: `Tên tổ "${cleanName}" đã tồn tại trong danh mục (không phân biệt chữ hoa/thường).`
    };
  }

  return { valid: true, cleanName };
};

/**
 * Thêm mới Tổ Chuyên Môn / Văn Phòng
 */
export const createDepartment = (departments = [], data = {}) => {
  const validation = validateDepartmentName(departments, data.name);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      message: validation.message
    };
  }

  const cleanName = validation.cleanName;
  const isOffice = data.isOffice !== undefined ? Boolean(data.isOffice) : isOfficeDepartment(cleanName);
  const now = new Date().toISOString();

  const newDept = {
    id: data.id || generateDepartmentId(cleanName),
    name: cleanName,
    description: (data.description || '').trim(),
    isOffice,
    createdAt: now,
    updatedAt: now
  };

  const updatedDepartments = [...(departments || []), newDept];

  return {
    success: true,
    department: newDept,
    departments: updatedDepartments
  };
};

/**
 * Cập nhật thông tin Tổ (cho phép đổi tên tổ, giữ nguyên ID)
 * Khi đổi tên:
 * - ID tổ giữ nguyên
 * - Tự động đồng bộ tên tổ mới vào teacher.department cho tất cả giáo viên thuộc tổ đó
 * - TKB, assignments, subjectAssignments hoàn toàn không bị ảnh hưởng
 */
export const updateDepartment = (departments = [], id, data = {}, teachers = []) => {
  if (!id) {
    return {
      success: false,
      error: 'MISSING_ID',
      message: 'Thiếu ID tổ chuyên môn cần cập nhật.'
    };
  }

  const existingDept = getDepartmentById(departments, id);
  if (!existingDept) {
    return {
      success: false,
      error: 'NOT_FOUND',
      message: `Không tìm thấy tổ chuyên môn với ID: "${id}".`
    };
  }

  const validation = validateDepartmentName(departments, data.name || existingDept.name, id);
  if (!validation.valid) {
    return {
      success: false,
      error: validation.error,
      message: validation.message
    };
  }

  const cleanName = validation.cleanName;
  const oldName = existingDept.name;
  const isOffice = data.isOffice !== undefined ? Boolean(data.isOffice) : existingDept.isOffice;
  const now = new Date().toISOString();

  const updatedDept = {
    ...existingDept,
    name: cleanName,
    description: data.description !== undefined ? String(data.description).trim() : existingDept.description,
    isOffice,
    updatedAt: now
  };

  const updatedDepartments = (departments || []).map(d => (d.id === id ? updatedDept : d));

  // Đồng bộ lại tên tổ cho giáo viên nếu tên tổ thay đổi
  let updatedTeachers = teachers;
  let teachersModified = false;
  if (oldName !== cleanName && Array.isArray(teachers)) {
    updatedTeachers = teachers.map(t => {
      const matchById = t.departmentId === id;
      const matchByName = (t.department || '').trim().toLowerCase() === oldName.trim().toLowerCase();
      if (matchById || matchByName) {
        teachersModified = true;
        return {
          ...t,
          departmentId: id,
          department: cleanName
        };
      }
      return t;
    });
  }

  return {
    success: true,
    department: updatedDept,
    departments: updatedDepartments,
    updatedTeachers,
    teachersModified
  };
};

/**
 * Đếm số giáo viên đang thuộc một tổ
 */
export const countTeachersInDepartment = (dept, teachers = []) => {
  if (!dept || !Array.isArray(teachers)) return 0;
  const targetId = dept.id;
  const targetName = (dept.name || '').trim().toLowerCase();

  return teachers.filter(t => {
    if (targetId && t.departmentId === targetId) return true;
    if (t.department && t.department.trim().toLowerCase() === targetName) return true;
    return false;
  }).length;
};

/**
 * Xóa tổ chuyên môn:
 * - Nếu đang có giáo viên tham chiếu: TỪ CHỐI XÓA, trả về cảnh báo
 * - Nếu không có giáo viên nào: Cho phép xóa
 * - Tuyệt đối không xóa cascade giáo viên hoặc TKB
 */
export const deleteDepartment = (departments = [], id, teachers = []) => {
  if (!id) {
    return {
      success: false,
      error: 'MISSING_ID',
      message: 'Thiếu ID tổ chuyên môn cần xóa.'
    };
  }

  const targetDept = getDepartmentById(departments, id);
  if (!targetDept) {
    return {
      success: false,
      error: 'NOT_FOUND',
      message: `Không tìm thấy tổ chuyên môn với ID: "${id}".`
    };
  }

  const assignedCount = countTeachersInDepartment(targetDept, teachers);
  if (assignedCount > 0) {
    return {
      success: false,
      error: 'IN_USE',
      teacherCount: assignedCount,
      message: `Không thể xóa tổ "${targetDept.name}" vì đang có ${assignedCount} giáo viên / nhân sự thuộc tổ này. Vui lòng chuyển giáo viên sang tổ khác trước khi xóa!`
    };
  }

  const updatedDepartments = (departments || []).filter(d => d.id !== id);

  return {
    success: true,
    deletedId: id,
    departments: updatedDepartments
  };
};

/**
 * Migration dữ liệu:
 * Quét toàn bộ danh sách giáo viên, đối chiếu với danh mục departments:
 * - Nếu giáo viên đã có departmentId hợp lệ -> giữ nguyên.
 * - Nếu giáo viên chỉ có chuỗi department cũ (VD: "Tổ 1", "Tổ 1, 2, 3", "Tổ 4, 5", "Tổ Văn Phòng", ...) ->
 *   Tìm hoặc tạo Department tương ứng và gán cả departmentId lẫn department.
 * - Đảm bảo KHÔNG làm mất bất kỳ dữ liệu nào.
 */
export const migrateDepartmentsAndTeachers = (teachers = [], existingDepartments = []) => {
  const deptMap = new Map();

  // 1. Đưa các tổ mặc định vào map nếu danh mục trống
  const initialList = Array.isArray(existingDepartments) && existingDepartments.length > 0
    ? existingDepartments
    : DEFAULT_DEPARTMENTS;

  initialList.forEach(d => {
    if (d.id) {
      deptMap.set(d.id, { ...d });
    }
    if (d.name) {
      deptMap.set(normalizeDepartmentName(d.name).toLowerCase(), { ...d });
    }
  });

  const allDepts = [...initialList];
  const now = new Date().toISOString();

  // 2. Quét giáo viên để phát hiện và bảo toàn các tổ cũ
  const updatedTeachers = (teachers || []).map(t => {
    const rawDeptName = normalizeDepartmentName(t.department);
    const lowerName = rawDeptName.toLowerCase();
    const existingDeptId = t.departmentId;

    let targetDept = null;

    // Ưu tiên 1: Đã có departmentId và ID hợp lệ
    if (existingDeptId && deptMap.has(existingDeptId)) {
      targetDept = deptMap.get(existingDeptId);
    }
    // Ưu tiên 2: Tìm theo tên tổ không phân biệt hoa/thường
    else if (lowerName && deptMap.has(lowerName)) {
      targetDept = deptMap.get(lowerName);
    }
    // Ưu tiên 3: Có tên tổ nhưng chưa có trong danh mục -> TỰ ĐỘNG TẠO TỔ MỚI (Bảo toàn dữ liệu cũ như "Tổ 1", "Tổ Tin học"...)
    else if (rawDeptName) {
      const isOffice = isOfficeDepartment(rawDeptName);
      const newId = generateDepartmentId(rawDeptName);
      targetDept = {
        id: newId,
        name: rawDeptName,
        description: `Tự động khởi tạo từ dữ liệu giáo viên hiện có`,
        isOffice,
        createdAt: now,
        updatedAt: now
      };
      allDepts.push(targetDept);
      deptMap.set(newId, targetDept);
      deptMap.set(lowerName, targetDept);
    }
    // Ưu tiên 4: Giáo viên chưa có tổ -> Gán mặc định theo logic chuyên môn
    else {
      targetDept = deptMap.get('dept_bo_mon') || allDepts[0];
    }

    return {
      ...t,
      departmentId: targetDept ? targetDept.id : 'dept_bo_mon',
      department: targetDept ? targetDept.name : (rawDeptName || 'Giáo viên bộ môn')
    };
  });

  // Lọc bỏ trùng lặp trong allDepts theo ID
  const uniqueDeptsMap = new Map();
  allDepts.forEach(d => {
    if (d && d.id && !uniqueDeptsMap.has(d.id)) {
      uniqueDeptsMap.set(d.id, d);
    }
  });

  return {
    departments: Array.from(uniqueDeptsMap.values()),
    teachers: updatedTeachers
  };
};
