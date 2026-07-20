function timeToMinutes(time: string) {
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

  const diffMins = end - start;
  const actualWorkMins = Math.max(0, diffMins - breakMinutes);
  
  const hours = actualWorkMins / 60;
  
  const rawSalary = Math.floor(hours * hourlyWage) + allowance - deduction;
  const salary = Math.max(0, rawSalary); // never negative
  
  return { hours, salary };
}
