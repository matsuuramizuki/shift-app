import { memo, useState } from 'react';
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { calculateSalary } from "@/lib/calc";
import { format } from 'date-fns';

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

  return (
    <div
      className={`${styles.analysisGrid} ${styles.summaryInteractive}`}
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
      <div className={styles.analysisCard}>
        <div className={styles.analysisCardLabel}>{monthLabel} 労働時間</div>
        <div className={styles.analysisCardValue}>
          {totalHours.toFixed(1)}<span style={{ fontSize: '14px', fontWeight: 600, marginLeft: '2px' }}>h</span>
          {isExpanded && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '4px' }}>
              月末見込 {monthEndHours.toFixed(1)}h
            </div>
          )}
        </div>
      </div>

      {/* 給与実績カード */}
      <div className={styles.analysisCard}>
        <div className={styles.analysisCardLabel}>{monthLabel} 給与実績</div>
        <div className={styles.analysisCardValue}>
          ¥{totalSalary.toLocaleString()}
          {isExpanded && (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '4px' }}>
              月末見込 ¥{monthEndEstimate.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
