import type { Shift } from './store';

const TENTATIVE_MEMO_MARKER = '[[shift-app:tentative]]';

export function decodeShiftMetadata(memo: string | null | undefined, databaseFlag?: boolean | null) {
  const rawMemo = memo ?? '';
  const hasFallbackMarker = rawMemo.startsWith(TENTATIVE_MEMO_MARKER);
  const cleanMemo = hasFallbackMarker
    ? rawMemo.slice(TENTATIVE_MEMO_MARKER.length).replace(/^\r?\n/, '')
    : rawMemo;

  return {
    memo: cleanMemo,
    isTentative: Boolean(databaseFlag) || hasFallbackMarker,
  };
}

export function encodeTentativeMemo(memo: string | undefined, isTentative: boolean) {
  const cleanMemo = decodeShiftMetadata(memo).memo;
  return isTentative
    ? `${TENTATIVE_MEMO_MARKER}${cleanMemo ? `\n${cleanMemo}` : ''}`
    : cleanMemo;
}

export interface ShiftRow {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  deduction: number;
  hourly_wage: number;
  allowance?: number | null;
  memo?: string | null;
  is_tentative?: boolean | null;
}

/** Convert a row of the `shifts` table into the app's Shift shape. */
export function rowToShift(row: ShiftRow): Shift {
  const { memo, isTentative } = decodeShiftMetadata(row.memo, row.is_tentative);
  return {
    id: row.id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    breakMinutes: row.break_minutes,
    deduction: row.deduction,
    hourlyWage: row.hourly_wage,
    allowance: row.allowance || 0,
    memo,
    isTentative,
  };
}
