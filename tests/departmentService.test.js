// tests/departmentService.test.js
import { describe, it, expect } from 'vitest';
import { 
  DEFAULT_DEPARTMENTS, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment, 
  countTeachersInDepartment
} from '../src/services/departmentService.js';
import { SAMPLE_TEACHERS } from '../src/data/sampleData.js';

describe('departmentService: Quản Lý Danh Mục Tổ Chuyên Môn Động', () => {
  const sampleTeachers = [...SAMPLE_TEACHERS];

  it('danh mục mặc định có đủ các tổ cơ bản', () => {
    expect(DEFAULT_DEPARTMENTS).toBeDefined();
    expect(DEFAULT_DEPARTMENTS.length).toBeGreaterThan(0);
    const names = DEFAULT_DEPARTMENTS.map(d => d.name);
    expect(names).toContain('Tổ 1, 2, 3');
    expect(names).toContain('Tổ 4, 5');
  });

  it('thêm tổ mới thành công với tên hợp lệ', () => {
    const result = createDepartment(DEFAULT_DEPARTMENTS, { name: 'Tổ Khảo Thí' });
    expect(result.success).toBe(true);
    expect(result.department).toBeDefined();
    expect(result.department.name).toBe('Tổ Khảo Thí');
    expect(result.departments.some(d => d.name === 'Tổ Khảo Thí')).toBe(true);
  });

  it('từ chối thêm tổ nếu tên trùng lặp', () => {
    const result = createDepartment(DEFAULT_DEPARTMENTS, { name: 'Tổ 1, 2, 3' });
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('đếm chính xác số lượng giáo viên trong từng tổ', () => {
    const to123 = DEFAULT_DEPARTMENTS.find(d => d.name === 'Tổ 1, 2, 3');
    expect(to123).toBeDefined();
    const count = countTeachersInDepartment(to123, sampleTeachers);
    expect(count).toBe(6); // GV01 - GV06
  });

  it('không cho phép xóa tổ nếu đang có giáo viên trực thuộc', () => {
    const to123 = DEFAULT_DEPARTMENTS.find(d => d.name === 'Tổ 1, 2, 3');
    const result = deleteDepartment(DEFAULT_DEPARTMENTS, to123.id, sampleTeachers);
    expect(result.success).toBe(false);
    expect(result.error).toBe('IN_USE');
  });

  it('cho phép xóa tổ nếu không có giáo viên nào trực thuộc', () => {
    const addRes = createDepartment(DEFAULT_DEPARTMENTS, { name: 'Tổ Tạm Thời' });
    expect(addRes.success).toBe(true);

    const delRes = deleteDepartment(addRes.departments, addRes.department.id, sampleTeachers);
    expect(delRes.success).toBe(true);
    expect(delRes.departments.some(d => d.name === 'Tổ Tạm Thời')).toBe(false);
  });

  it('cập nhật tên tổ và đồng bộ tên mới sang toàn bộ giáo viên', () => {
    const addRes = createDepartment(DEFAULT_DEPARTMENTS, { name: 'Tổ Thể Dục' });
    const teachersWithDept = [
      ...sampleTeachers,
      { id: 'GV_TD1', name: 'GV Thể Dục', departmentId: addRes.department.id, department: 'Tổ Thể Dục' }
    ];


    const updateRes = updateDepartment(
      addRes.departments,
      addRes.department.id,
      { name: 'Tổ Giáo Dục Thể Chất' },
      teachersWithDept
    );

    expect(updateRes.success).toBe(true);
    expect(updateRes.department.name).toBe('Tổ Giáo Dục Thể Chất');
    const updatedTeacher = updateRes.updatedTeachers.find(t => t.id === 'GV_TD1');
    expect(updatedTeacher.department).toBe('Tổ Giáo Dục Thể Chất');
  });
});
