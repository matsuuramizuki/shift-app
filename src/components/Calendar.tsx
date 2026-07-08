import React from "react";
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

export function Calendar({ currentDate, setCurrentDate, shifts, settings, onDateClick }: CalendarProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const days = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  // Payday logic
  let actualPayday: Date | null = null;
  let prevMonthSalary = 0;

  if (settings.payday) {
    const lastDay = endOfMonth(currentDate).getDate();
    const payDayNum = Math.min(settings.payday, lastDay);
    let tempPayday = new Date(currentDate.getFullYear(), currentDate.getMonth(), payDayNum);

    const dayOfWeek = tempPayday.getDay();
    if (dayOfWeek === 6) {
      tempPayday = new Date(currentDate.getFullYear(), currentDate.getMonth(), payDayNum - 1);
    } else if (dayOfWeek === 0) {
      tempPayday = new Date(currentDate.getFullYear(), currentDate.getMonth(), payDayNum - 2);
    }
    actualPayday = tempPayday;

    // Calculate previous month's salary
    const prevMonth = subMonths(currentDate, 1);
    const prevMonthStr = format(prevMonth, "yyyy-MM");
    
    shifts.forEach(s => {
      if (s.date.startsWith(prevMonthStr)) {
        const { salary } = calculateSalary(s.startTime, s.endTime, s.breakMinutes, s.deduction, s.hourlyWage, s.allowance || 0);
        prevMonthSalary += salary;
      }
    });
  }

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
          const shift = shifts.find(s => s.date === formattedDate);
          const isCurrentMonth = isSameMonth(day, monthStart);
          const isToday = isSameDay(day, new Date());

          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateClick(day)}
              className={`${styles.dayCell} ${!isCurrentMonth ? styles.empty : ""} ${(isToday && isCurrentMonth) ? styles.today : ""} ${(shift && isCurrentMonth) ? styles.hasShift : ""}`}
            >
              {isCurrentMonth && (
                <>
                  {format(day, "d")}
                  {shift && (
                    <div className={styles.shiftIndicator}>
                      <span>{shift.startTime}</span>
                      <span>{shift.endTime}</span>
                    </div>
                  )}
                  {actualPayday && isSameDay(day, actualPayday) && (
                    <div className={styles.paydayIndicator}>
                      ¥{prevMonthSalary.toLocaleString()}
                    </div>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
