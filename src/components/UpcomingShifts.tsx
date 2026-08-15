import { memo } from 'react';
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { calculateSalary } from "@/lib/calc";
import { format, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';
import { Clock } from 'lucide-react';

interface Props {
  shifts: Shift[];
}

export const UpcomingShifts = memo(function UpcomingShifts({ shifts }: Props) {
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const upcoming = shifts
    .filter(shift => shift.date >= todayStr)
    .sort((a, b) => a.date.localeCompare(b.date) || a.startTime.localeCompare(b.startTime))
    .slice(0, 4)
    .map(shift => {
      const calc = calculateSalary(shift.startTime, shift.endTime, shift.breakMinutes, shift.deduction, shift.hourlyWage, shift.allowance || 0);
      return { ...shift, dateObj: parseISO(shift.date), hours: calc.hours };
    });

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <div className={styles.sectionContainer}>
      <div className={styles.sectionHeader}>
        <h3 className={styles.sectionTitle}>直近の予定</h3>
        <span className={styles.sectionBadge}>{upcoming.length}件</span>
      </div>
      <div className={styles.upcomingList}>
        {upcoming.map(s => {
          const dayNum = format(s.dateObj, "d");
          const monthName = format(s.dateObj, "M月");
          
          return (
            <div key={s.date} className={styles.upcomingItem}>
              <div className={styles.upcomingItemLeft}>
                <div className={styles.upcomingArt}>
                  <span className={styles.upcomingArtMonth}>{monthName}</span>
                  <span className={styles.upcomingArtDay}>{dayNum}</span>
                </div>
                <div className={styles.upcomingInfo}>
                  <div className={styles.upcomingDate}>
                    <span>{format(s.dateObj, "M月d日(E)", { locale: ja })}</span>
                    {s.isTentative && <span className={styles.tentativeBadge}>仮</span>}
                  </div>
                  <div className={styles.upcomingTime}>
                    <Clock size={12} className={styles.upcomingTimeIcon} />
                    <span>{s.startTime} - {s.endTime}</span>
                  </div>
                  {s.memo && (
                    <div className={styles.upcomingMemo}>
                      {s.memo}
                    </div>
                  )}
                </div>
              </div>
              <div className={styles.upcomingItemRight}>
                <span className={styles.upcomingHoursPill}>{s.hours.toFixed(1)}h</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
