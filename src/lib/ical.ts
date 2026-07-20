import { Shift } from './store';

// Convert JST (Asia/Tokyo) date and time to UTC and format as iCal UTC string (ending with Z)
function formatToICalUTC(dateStr: string, timeStr: string, isNextDay: boolean = false): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [H, M] = timeStr.split(':').map(Number);
  
  // Date.UTC expects 0-indexed month. 
  // JST is UTC+9. So we subtract 9 hours to get UTC.
  const dateObj = new Date(Date.UTC(y, m - 1, d + (isNextDay ? 1 : 0), H - 9, M));
  
  const ny = dateObj.getUTCFullYear();
  const nm = dateObj.getUTCMonth() + 1;
  const nd = dateObj.getUTCDate();
  const nH = dateObj.getUTCHours();
  const nM = dateObj.getUTCMinutes();
  
  return `${ny.toString().padStart(4, '0')}${nm.toString().padStart(2, '0')}${nd.toString().padStart(2, '0')}T${nH.toString().padStart(2, '0')}${nM.toString().padStart(2, '0')}00Z`;
}

function getDtstamp(): string {
  const now = new Date();
  return `${now.getUTCFullYear().toString().padStart(4, '0')}${(now.getUTCMonth()+1).toString().padStart(2, '0')}${now.getUTCDate().toString().padStart(2, '0')}T${now.getUTCHours().toString().padStart(2, '0')}${now.getUTCMinutes().toString().padStart(2, '0')}${now.getUTCSeconds().toString().padStart(2, '0')}Z`;
}

// iCal lines must be folded if they exceed 75 octets.
// We use a safe character limit (20) to avoid splitting multi-byte UTF-8 characters.
function foldLine(line: string): string {
  const chars = Array.from(line);
  const limit = 20; 
  if (chars.length <= limit) return line;
  
  let result = '';
  for (let i = 0; i < chars.length; i += limit) {
    if (i > 0) result += '\r\n ';
    result += chars.slice(i, i + limit).join('');
  }
  return result;
}

function escapeValue(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export function generateICal(shifts: Shift[]): string {
  const rawLines: string[] = [
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

    const dtstart = formatToICalUTC(shift.date, shift.startTime, false);
    const dtend = formatToICalUTC(shift.date, shift.endTime, isOvernight);
    const uid = `${shift.id || shift.date}@shiftapp`;

    // Reorder description: Memo first, then details
    let descriptionParts = [];
    if (shift.memo) {
      descriptionParts.push(shift.memo);
    }
    
    const details = [];
    details.push(`休憩: ${shift.breakMinutes || 0}分`);
    if (shift.allowance && shift.allowance > 0) {
      details.push(`手当: ${shift.allowance}円`);
    }
    if (shift.deduction && shift.deduction > 0) {
      details.push(`控除: ${shift.deduction}円`);
    }
    
    if (descriptionParts.length > 0 && details.length > 0) {
      descriptionParts.push('------------------');
    }
    descriptionParts = [...descriptionParts, ...details];

    const description = escapeValue(descriptionParts.join('\n'));
    const summary = escapeValue(
      shift.isTentative
        ? 'バイト（仮）'
        : shift.memo
          ? `バイト (${shift.memo.substring(0, 10)}${shift.memo.length > 10 ? '...' : ''})`
          : 'バイト'
    );

    rawLines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${dtstart}`,
      `DTEND:${dtend}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      `STATUS:CONFIRMED`,
      `SEQUENCE:0`,
      'END:VEVENT'
    );
  });

  rawLines.push('END:VCALENDAR');
  
  // Apply line folding and join with CRLF
  const lines = rawLines.map(foldLine);
  return lines.join('\r\n');
}
