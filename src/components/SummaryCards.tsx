import { memo, useState } from 'react';
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { calculateSalary } from "@/lib/calc";
import { format } from 'date-fns';
import { Clock, Coins, ChevronDown } from 'lucide-react';

interface SummaryProps {
  currentDate: Date;
  shifts: Shift[];
}

export const SummaryCards = memo(function SummaryCards({ currentDate, shifts }: SummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

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
    <div
      className={`${styles.summaryGrid} ${styles.summaryInteractive}`}
      onClick={() => setIsExpanded(prev => !prev)}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label="労働時間と給与の詳細を展開"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsExpanded(prev => !prev);
        }
      }}
    >
      {/* 労働時間カード */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryCardHeader}>
          <div className={styles.summaryIconBox}>
            <Clock size={16} />
          </div>
          <span className={styles.summaryCardLabel}>{monthLabel} 労働時間</span>
          <ChevronDown
            size={14}
            className={`${styles.summaryChevron} ${isExpanded ? styles.summaryChevronOpen : ""}`}
            aria-hidden="true"
          />
        </div>
        
        <div className={styles.summaryMetrics}>
          <div className={styles.summaryMainMetric}>
            <span className={styles.summaryMetricValue}>
              {totalHours.toFixed(1)}<span className={styles.summaryMetricUnit}>h</span>
            </span>
          </div>
        </div>

        {/* タップでふわっと展開する詳細エリア */}
        <div className={`${styles.summaryExpandArea} ${isExpanded ? styles.summaryExpandAreaOpen : ""}`}>
          <div className={styles.summaryExpandContent}>
            <div className={styles.summarySubMetric}>
              <span className={styles.summarySubLabel}>月末見込</span>
              <span className={styles.summarySubValue}>{monthEndHours.toFixed(1)}h</span>
            </div>
            {monthEndHours > 0 && (
              <div className={styles.summaryProgressBarTrack} aria-hidden="true">
                <div
                  className={`${styles.summaryProgressBarFill} ${styles.hoursProgressFill}`}
                  style={{ width: `${hoursProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 給与カード */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryCardHeader}>
          <div className={styles.summaryIconBox}>
            <Coins size={16} />
          </div>
          <span className={styles.summaryCardLabel}>{monthLabel} 給与実績</span>
          <ChevronDown
            size={14}
            className={`${styles.summaryChevron} ${isExpanded ? styles.summaryChevronOpen : ""}`}
            aria-hidden="true"
          />
        </div>

        <div className={styles.summaryMetrics}>
          <div className={styles.summaryMainMetric}>
            <span className={styles.summaryMetricValue}>
              <span className={styles.summaryCurrency}>¥</span>{totalSalary.toLocaleString()}
            </span>
          </div>
        </div>

        {/* タップでふわっと展開する詳細エリア */}
        <div className={`${styles.summaryExpandArea} ${isExpanded ? styles.summaryExpandAreaOpen : ""}`}>
          <div className={styles.summaryExpandContent}>
            <div className={styles.summarySubMetric}>
              <span className={styles.summarySubLabel}>月末見込</span>
              <span className={styles.summarySubValue}>¥{monthEndEstimate.toLocaleString()}</span>
            </div>
            {monthEndEstimate > 0 && (
              <div className={styles.summaryProgressBarTrack} aria-hidden="true">
                <div
                  className={`${styles.summaryProgressBarFill} ${styles.earningsProgressFill}`}
                  style={{ width: `${salaryProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
