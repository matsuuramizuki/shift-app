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
    hourlyWage: 1000,
    isTentative: true
  }
];

const result = generateICal(sampleShifts);
if (!result.includes('SUMMARY:バイト（仮）')) {
  throw new Error('Tentative shifts must use the tentative calendar title');
}
console.log(JSON.stringify(result));
console.log("---- RAW ----");
console.log(result);
