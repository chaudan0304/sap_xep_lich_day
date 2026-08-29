import { QUYNH_LOC_DATA } from './src/data/quynhLocSchoolData.js';

console.log('--- Inspecting current QUYNH_LOC_DATA.timetable ---');
let totalSlots = 0;
let gvcnSlots = 0;
let specificSubjectSlots = 0;
let chaoCoSlots = 0;

Object.entries(QUYNH_LOC_DATA.timetable).forEach(([cls, days]) => {
  for (let d = 2; d <= 6; d++) {
    for (let p = 1; p <= 7; p++) {
      const slot = days[d]?.[p];
      if (slot && slot.subjectId) {
        totalSlots++;
        if (slot.subjectId === 'GVCN_TIET') gvcnSlots++;
        else if (slot.subjectId === 'CHAO_CO') chaoCoSlots++;
        else specificSubjectSlots++;
      }
    }
  }
});

console.log(`Total slots: ${totalSlots}`);
console.log(`GVCN_TIET (placeholder): ${gvcnSlots}`);
console.log(`CHAO_CO: ${chaoCoSlots}`);
console.log(`Specific subjects: ${specificSubjectSlots}`);
