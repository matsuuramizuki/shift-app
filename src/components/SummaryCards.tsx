import { memo } from 'react';
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { calculateSalary } from "@/lib/calc";
import { format } from 'date-fns';
import { Clock, Coins } from 'lucide-react';

interface SummaryProps {
  currentDate: Date;
  shifts: Shift[];
}

export const SummaryCards = memo(function SummaryCards({ currentDate, shifts }: SummaryProps) {
  const monthPrefix = format(currentDate, "yyyy-MM");
  const todayStr = format(new Date(), "yyyy-MM-dd");
  let totalHours = 0;
  let totalSalary = 0;

  for (const shift of shifts) {
    if (!shift.date.startsWith(monthPrefix) || shift.date > todayStr) continue;
    const result = calculateSalary(shift.startTime, shift.endTime, shift.breakMinutes, shift.deduction, shift.hourlyWage, shift.allowance || 0);
    totalHours += result.hours;
    totalSalary += result.salary;
  }

  const monthLabel = format(currentDate, "M月");

  return (
    <div className={styles.summaryGrid}>
      <div className={styles.card}>
        <div className={styles.cardArtHours}>
          <Clock size={22} />
        </div>
        <div className={styles.cardInfo}>
          <div className={styles.cardLabel}>{monthLabel} 労働時間</div>
          <div className={styles.cardValue}>{totalHours.toFixed(1)} h</div>
        </div>
      </div>
      <div className={styles.card}>
        <div className={styles.cardArtEarnings}>
          <Coins size={22} />
        </div>
        <div className={styles.cardInfo}>
          <div className={styles.cardLabel}>{monthLabel} 見込給与</div>
          <div className={styles.cardValue}>¥{totalSalary.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
});
