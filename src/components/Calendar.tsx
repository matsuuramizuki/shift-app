import { memo, useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addMonths, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "@/app/page.module.css";
import type { Shift, Settings } from "@/lib/store";
import { calculateSalary } from "@/lib/calc";

interface CalendarProps {
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  shifts: Shift[];
  settings: Settings;
  onDateClick: (date: Date) => void;
}

const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

export const Calendar = memo(function Calendar({ currentDate, setCurrentDate, shifts, settings, onDateClick }: CalendarProps) {
  const { monthStart, days, shiftsByDate, actualPayday, prevMonthSalary } = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const days = eachDayOfInterval({ start: startOfWeek(monthStart), end: endOfWeek(monthEnd) });
    const shiftsByDate = new Map(shifts.map(shift => [shift.date, shift]));
    let actualPayday: Date | null = null;
    let prevMonthSalary = 0;

    if (settings.payday) {
      const payDayNum = Math.min(settings.payday, monthEnd.getDate());
      actualPayday = new Date(currentDate.getFullYear(), currentDate.getMonth(), payDayNum);
      const dayOfWeek = actualPayday.getDay();

      if (dayOfWeek === 6) actualPayday.setDate(actualPayday.getDate() - 1);
      if (dayOfWeek === 0) actualPayday.setDate(actualPayday.getDate() - 2);

      const prevMonthStr = format(subMonths(currentDate, 1), "yyyy-MM");
      for (const shift of shifts) {
        if (!shift.date.startsWith(prevMonthStr)) continue;
        prevMonthSalary += calculateSalary(
          shift.startTime,
          shift.endTime,
          shift.breakMinutes,
          shift.deduction,
          shift.hourlyWage,
          shift.allowance || 0
        ).salary;
      }
    }

    return { monthStart, days, shiftsByDate, actualPayday, prevMonthSalary };
  }, [currentDate, settings.payday, shifts]);

  const today = new Date();

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <button onClick={() => setCurrentDate(subMonths(currentDate, 1))} className={styles.iconBtn}>
          <ChevronLeft size={20} />
        </button>
        <span>{format(currentDate, "yyyy年 M月", { locale: ja })}</span>
        <button onClick={() => setCurrentDate(addMonths(currentDate, 1))} className={styles.iconBtn}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className={styles.grid}>
        {weekDays.map(d => (
          <div key={d} className={styles.dayLabel}>{d}</div>
        ))}

        {days.map(day => {
          const formattedDate = format(day, "yyyy-MM-dd");
          const shift = shiftsByDate.get(formattedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, today);

          if (!isCurrentMonth) {
            return (
              <div
                key={day.toISOString()}
                aria-hidden="true"
                className={`${styles.dayCell} ${styles.empty}`}
              />
            );
          }

          return (
            <button
              type="button"
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={`${styles.dayCell} ${isToday ? styles.today : ""} ${shift ? styles.hasShift : ""} ${shift?.isTentative ? styles.tentativeShift : ""}`}
            >
              {format(day, "d")}
              {shift && (
                <div className={styles.shiftIndicator}>
                  <span>{shift.startTime}</span>
                  <span>{shift.endTime}</span>
                  {shift.isTentative && <span className={styles.tentativeDot}>仮</span>}
                </div>
              )}
              {actualPayday && isSameDay(day, actualPayday) && (
                <div className={styles.paydayIndicator}>
                  ¥{prevMonthSalary.toLocaleString()}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
});
