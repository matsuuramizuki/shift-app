import { Shift } from './store';

function formatToICalDate(dateStr: string, timeStr: string, isNextDay: boolean = false): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [H, M] = timeStr.split(':').map(Number);
  
  const dateObj = new Date(Date.UTC(y, m - 1, d + (isNextDay ? 1 : 0)));
  const ny = dateObj.getUTCFullYear();
  const nm = dateObj.getUTCMonth() + 1;
  const nd = dateObj.getUTCDate();
  
  return `${ny.toString().padStart(4, '0')}${nm.toString().padStart(2, '0')}${nd.toString().padStart(2, '0')}T${H.toString().padStart(2, '0')}${M.toString().padStart(2, '0')}00`;
}

function getDtstamp(): string {
  const now = new Date();
  return `${now.getUTCFullYear().toString().padStart(4, '0')}${(now.getUTCMonth()+1).toString().padStart(2, '0')}${now.getUTCDate().toString().padStart(2, '0')}T${now.getUTCHours().toString().padStart(2, '0')}${now.getUTCMinutes().toString().padStart(2, '0')}${now.getUTCSeconds().toString().padStart(2, '0')}Z`;
}

export function generateICal(shifts: Shift[]): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Shift App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:シフト',
    'X-WR-TIMEZONE:Asia/Tokyo'
  ];

  const dtstamp = getDtstamp();

  shifts.forEach(shift => {
    if (!shift.date || !shift.startTime || !shift.endTime) return;

    const isOvernight = shift.endTime < shift.startTime;

    const dtstart = formatToICalDate(shift.date, shift.startTime, false);
    const dtend = formatToICalDate(shift.date, shift.endTime, isOvernight);
    const uid = `${shift.id || shift.date}@shiftapp`;

    let description = `休憩: ${shift.breakMinutes || 0}分`;
    if (shift.deduction && shift.deduction > 0) {
      description += `\\n控除: ${shift.deduction}円`;
    }

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=Asia/Tokyo:${dtstart}`,
      `DTEND;TZID=Asia/Tokyo:${dtend}`,
      `SUMMARY:バイト`,
      `DESCRIPTION:${description}`,
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}
