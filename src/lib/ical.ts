import type { Shift } from './store';

const textEncoder = new TextEncoder();

const pad = (value: number, length = 2) => value.toString().padStart(length, '0');

// Format a Date as an iCal UTC timestamp (e.g. 20260101T090000Z).
function formatUTC(date: Date, includeSeconds = true): string {
  return `${pad(date.getUTCFullYear(), 4)}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`
    + `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${includeSeconds ? pad(date.getUTCSeconds()) : '00'}Z`;
}

// Convert a JST (Asia/Tokyo, UTC+9) date and time to an iCal UTC string.
function formatToICalUTC(dateStr: string, timeStr: string, isNextDay: boolean = false): string {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [H, M] = timeStr.split(':').map(Number);
  return formatUTC(new Date(Date.UTC(y, m - 1, d + (isNextDay ? 1 : 0), H - 9, M)), false);
}

// RFC 5545 limits content lines to 75 octets, including UTF-8 text.
function foldLine(line: string): string {
  if (textEncoder.encode(line).length <= 75) return line;

  const folded: string[] = [];
  let chunk = '';
  let chunkBytes = 0;
  let limit = 75;

  for (const character of line) {
    const characterBytes = textEncoder.encode(character).length;
    if (chunk && chunkBytes + characterBytes > limit) {
      folded.push(chunk);
      chunk = '';
      chunkBytes = 0;
      limit = 74; // The continuation space counts as one octet.
    }

    chunk += character;
    chunkBytes += characterBytes;
  }

  if (chunk) folded.push(chunk);
  return folded.join('\r\n ');
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

  const dtstamp = formatUTC(new Date());

  for (const shift of shifts) {
    if (!shift.date || !shift.startTime || !shift.endTime) continue;

    const isOvernight = shift.endTime < shift.startTime;

    const dtstart = formatToICalUTC(shift.date, shift.startTime, false);
    const dtend = formatToICalUTC(shift.date, shift.endTime, isOvernight);
    const uid = `${shift.id || shift.date}@shiftapp`;

    // Memo first, then a separator, then the details
    const details = [`休憩: ${shift.breakMinutes || 0}分`];
    if (shift.allowance && shift.allowance > 0) details.push(`手当: ${shift.allowance}円`);
    if (shift.deduction && shift.deduction > 0) details.push(`控除: ${shift.deduction}円`);
    const descriptionParts = shift.memo ? [shift.memo, '------------------', ...details] : details;

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
  }

  rawLines.push('END:VCALENDAR');
  
  // Apply line folding and join with CRLF
  const lines = rawLines.map(foldLine);
  return lines.join('\r\n');
}
