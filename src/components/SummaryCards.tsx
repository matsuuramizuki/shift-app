import React from 'react';
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { calculateSalary } from "@/lib/calc";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO } from 'date-fns';

interface SummaryProps {
  currentDate: Date;
  shifts: Shift[];
}

export function SummaryCards({ currentDate, shifts }: SummaryProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  const currentMonthShifts = shifts.filter(s => {
    const date = parseISO(s.date);
    return isWithinInterval(date, { start: monthStart, end: monthEnd });
  });

  let totalHours = 0;
  let totalSalary = 0;

  currentMonthShifts.forEach(s => {
    const { hours, salary } = calculateSalary(s.startTime, s.endTime, s.breakMinutes, s.deduction, s.hourlyWage);
    totalHours += hours;
    totalSalary += salary;
  });

  return (
    <div className={styles.summaryGrid}>
      <div className={styles.card}>
        <div className={styles.cardLabel}>当月 総労働時間</div>
        <div className={styles.cardValue}>{totalHours.toFixed(1)} h</div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardLabel}>当月 予定給与</div>
        <div className={styles.cardValue}>¥{totalSalary.toLocaleString()}</div>
      </div>
    </div>
  );
}
