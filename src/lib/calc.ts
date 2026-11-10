import type { Shift } from "./store";

export function timeToMinutes(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function calculateSalary(
  startTime: string,
  endTime: string,
  breakMinutes: number,
  deduction: number,
  hourlyWage: number,
  allowance: number = 0
): { hours: number; salary: number; error?: string } {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);

  if (end < start) {
    return { hours: 0, salary: 0, error: "終了時間は開始時間より後にしてください" };
  }

  const hours = Math.max(0, end - start - breakMinutes) / 60;
  const salary = Math.max(0, Math.floor(hours * hourlyWage) + allowance - deduction); // never negative

  return { hours, salary };
}

/** Shorthand for calculating a saved shift's hours and pay. */
export function calculateShiftSalary(shift: Shift) {
  return calculateSalary(
    shift.startTime,
    shift.endTime,
    shift.breakMinutes,
    shift.deduction,
    shift.hourlyWage,
    shift.allowance || 0
  );
}
