import { differenceInMinutes, parse, isBefore } from "date-fns";

export function calculateSalary(
  startTime: string,
  endTime: string,
  breakMinutes: number,
  deduction: number,
  hourlyWage: number
): { hours: number; salary: number; error?: string } {
  const start = parse(startTime, "HH:mm", new Date());
  const end = parse(endTime, "HH:mm", new Date());

  if (isBefore(end, start)) {
    return { hours: 0, salary: 0, error: "終了時間は開始時間より後にしてください" };
  }

  const diffMins = differenceInMinutes(end, start);
  const actualWorkMins = Math.max(0, diffMins - breakMinutes);
  
  const hours = actualWorkMins / 60;
  
  const rawSalary = Math.floor(hours * hourlyWage) - deduction;
  const salary = Math.max(0, rawSalary); // never negative
  
  return { hours, salary };
}
