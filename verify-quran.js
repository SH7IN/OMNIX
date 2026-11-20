const fs = require('fs');
const vm = require('vm');

const context = { window: {} };
vm.createContext(context);

vm.runInContext(fs.readFileSync('quran-data.js','utf8'), context);
vm.runInContext(fs.readFileSync('quran-names.js','utf8'), context);

const q = context.window.OMNIX_QURAN;
const names = context.window.OMNIX_SURAH_NAMES;

console.log('عدد السور:', q.length);
console.log('عدد أسماء السور:', names.length);
console.log('إجمالي الآيات:', q.reduce((n,s)=>n+s.ayahs.length,0));
console.log('الفاتحة:', names[0], q[0].ayahs.length, 'آيات');
console.log('البقرة:', names[1], q[1].ayahs.length, 'آية');
console.log('الناس:', names[113], q[113].ayahs.length, 'آيات');

if(q.length!==114 || names.length!==114 ||
   q.reduce((n,s)=>n+s.ayahs.length,0)!==6236) {
  throw new Error('فشل التحقق من بيانات القرآن');
}
console.log('QURAN DATA VERIFIED');
