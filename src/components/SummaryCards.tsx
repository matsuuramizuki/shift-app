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
  let monthEndHours = 0;
  let monthEndEstimate = 0;

  for (const shift of shifts) {
    if (!shift.date.startsWith(monthPrefix)) continue;
    const result = calculateSalary(shift.startTime, shift.endTime, shift.breakMinutes, shift.deduction, shift.hourlyWage, shift.allowance || 0);

    if (shift.date <= todayStr) {
      totalHours += result.hours;
      totalSalary += result.salary;
    }

    if (!shift.isTentative) {
      monthEndHours += result.hours;
      monthEndEstimate += result.salary;
    }
  }

  const monthLabel = format(currentDate, "M月");
  const hoursProgress = monthEndHours > 0 ? Math.min(100, Math.round((totalHours / monthEndHours) * 100)) : 0;
  const salaryProgress = monthEndEstimate > 0 ? Math.min(100, Math.round((totalSalary / monthEndEstimate) * 100)) : 0;

  return (
    <div className={styles.summaryGrid}>
      <div className={styles.summaryCard}>
        <div className={styles.summaryCardHeader}>
          <div className={styles.cardArtHours}>
            <Clock size={18} />
          </div>
          <div className={styles.summaryCardTitleGroup}>
            <span className={styles.summaryCardLabel}>{monthLabel} 労働時間</span>
            {monthEndHours > 0 && (
              <span className={styles.summaryProgressBadge}>{hoursProgress}%</span>
            )}
          </div>
        </div>
        
        <div className={styles.summaryMetrics}>
          <div className={styles.summaryMainMetric}>
            <span className={styles.summaryMetricTag}>実績</span>
            <span className={styles.summaryMetricValue}>
              {totalHours.toFixed(1)}<span className={styles.summaryMetricUnit}>h</span>
            </span>
          </div>
          <div className={styles.summarySubMetric}>
            <span className={styles.summarySubLabel}>月末見込</span>
            <span className={styles.summarySubValue}>{monthEndHours.toFixed(1)}h</span>
          </div>
        </div>

        <div className={styles.summaryProgressBarTrack} aria-hidden="true">
          <div
            className={`${styles.summaryProgressBarFill} ${styles.hoursProgressFill}`}
            style={{ width: `${hoursProgress}%` }}
          />
        </div>
      </div>

      <div className={styles.summaryCard}>
        <div className={styles.summaryCardHeader}>
          <div className={styles.cardArtEarnings}>
            <Coins size={18} />
          </div>
          <div className={styles.summaryCardTitleGroup}>
            <span className={styles.summaryCardLabel}>{monthLabel} 見込給与</span>
            {monthEndEstimate > 0 && (
              <span className={styles.summaryProgressBadge}>{salaryProgress}%</span>
            )}
          </div>
        </div>

        <div className={styles.summaryMetrics}>
          <div className={styles.summaryMainMetric}>
            <span className={styles.summaryMetricTag}>実績</span>
            <span className={styles.summaryMetricValue}>
              <span className={styles.summaryCurrency}>¥</span>{totalSalary.toLocaleString()}
            </span>
          </div>
          <div className={styles.summarySubMetric}>
            <span className={styles.summarySubLabel}>月末見込</span>
            <span className={styles.summarySubValue}>¥{monthEndEstimate.toLocaleString()}</span>
          </div>
        </div>

        <div className={styles.summaryProgressBarTrack} aria-hidden="true">
          <div
            className={`${styles.summaryProgressBarFill} ${styles.earningsProgressFill}`}
            style={{ width: `${salaryProgress}%` }}
          />
        </div>
      </div>
    </div>
  );
});

