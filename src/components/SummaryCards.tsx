import { memo, useMemo, useState } from 'react';
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { calculateShiftSalary } from "@/lib/calc";
import { format } from 'date-fns';
import { StatCard } from "./StatCard";

interface SummaryProps {
  currentDate: Date;
  shifts: Shift[];
}

export const SummaryCards = memo(function SummaryCards({ currentDate, shifts }: SummaryProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const { totalHours, totalSalary, monthEndHours, monthEndEstimate } = useMemo(() => {
    const monthPrefix = format(currentDate, "yyyy-MM");
    const todayStr = format(new Date(), "yyyy-MM-dd");
    let totalHours = 0;
    let totalSalary = 0;
    let monthEndHours = 0;
    let monthEndEstimate = 0;

    for (const shift of shifts) {
      if (!shift.date.startsWith(monthPrefix)) continue;

      const { hours, salary } = calculateShiftSalary(shift);

      if (shift.date <= todayStr) {
        totalHours += hours;
        totalSalary += salary;
      }

      if (!shift.isTentative) {
        monthEndHours += hours;
        monthEndEstimate += salary;
      }
    }

    return { totalHours, totalSalary, monthEndHours, monthEndEstimate };
  }, [currentDate, shifts]);

  const monthLabel = format(currentDate, "M月");
  const toggle = () => setIsExpanded(prev => !prev);

  return (
    <div
      className={`${styles.analysisGrid} ${styles.summaryInteractive}`}
      onClick={toggle}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      aria-label="労働時間と給与の詳細を展開"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          toggle();
        }
      }}
    >
      <StatCard
        label={`${monthLabel} 労働時間`}
        value={<>{totalHours.toFixed(1)}<span className={styles.valueUnit}>h</span></>}
        detail={isExpanded && `月末見込 ${monthEndHours.toFixed(1)}h`}
      />
      <StatCard
        label={`${monthLabel} 給与実績`}
        value={`¥${totalSalary.toLocaleString()}`}
        detail={isExpanded && `月末見込 ¥${monthEndEstimate.toLocaleString()}`}
      />
    </div>
  );
});
