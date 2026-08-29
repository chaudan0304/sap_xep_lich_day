import { QUYNH_LOC_DATA } from './src/data/quynhLocSchoolData.js';
import { checkAllConflicts } from './src/services/conflictDetector.js';

const rooms = [
  { id: 'PHONG_TIN_HOC', name: 'Phòng Tin học 1' },
  { id: 'SAN_THE_CHAT', name: 'Sân Thể chất', allowMultiple: true },
  { id: 'SAN_TRUONG', name: 'Sân trường', allowMultiple: true }
];

const conflicts = checkAllConflicts(
  QUYNH_LOC_DATA.timetable,
  QUYNH_LOC_DATA.assignments,
  QUYNH_LOC_DATA.teachers,
  rooms,
  QUYNH_LOC_DATA.classes
);

console.log(`Total conflicts detected: ${conflicts.length}`);
const errors = conflicts.filter(c => c.severity === 'error');
const warnings = conflicts.filter(c => c.severity === 'warning');

console.log(`- Errors (Double booking): ${errors.length}`);
errors.forEach(e => console.log('  [ERROR]', e.message));

console.log(`- Warnings (Off session / Quotas): ${warnings.length}`);
warnings.forEach(w => console.log('  [WARN]', w.message));
