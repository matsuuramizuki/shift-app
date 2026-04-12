import React from 'react';
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { format, parseISO, isAfter, isSameDay, startOfDay } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Props {
  shifts: Shift[];
}

export function UpcomingShifts({ shifts }: Props) {
  const today = startOfDay(new Date());

  const upcoming = shifts
    .map(s => ({ ...s, dateObj: parseISO(s.date) }))
    .filter(s => isAfter(s.dateObj, today) || isSameDay(s.dateObj, today))
    .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime())
    .slice(0, 3);

  if (upcoming.length === 0) {
    return null;
  }

  return (
    <div className={styles.sectionContainer}>
      <h3 className={styles.sectionTitle}>直近の予定</h3>
      <div className={styles.upcomingList}>
        {upcoming.map(s => (
          <div key={s.date} className={styles.upcomingItem}>
            <div className={styles.upcomingDate}>
              {format(s.dateObj, "M月d日(E)", { locale: ja })}
            </div>
            <div className={styles.upcomingTime}>
              {s.startTime} - {s.endTime}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
