import { generateICal } from './src/lib/ical';
import type { Shift } from './src/lib/store';

const sampleShifts: Shift[] = [
  {
    id: '123',
    date: '2026-04-25',
    startTime: '10:00',
    endTime: '19:00',
    breakMinutes: 60,
    deduction: 0,
    hourlyWage: 1000
  }
];

const result = generateICal(sampleShifts);
console.log(JSON.stringify(result));
console.log("---- RAW ----");
console.log(result);
