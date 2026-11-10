import { addMonths, format, subMonths } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";
import styles from "@/app/page.module.css";

interface MonthSwitcherProps {
  month: Date;
  onChange: (month: Date) => void;
  className?: string;
}

export function MonthSwitcher({ month, onChange, className = "" }: MonthSwitcherProps) {
  return (
    <div className={`${styles.calendarHeader} ${className}`}>
      <button type="button" aria-label="前の月" onClick={() => onChange(subMonths(month, 1))} className={styles.iconBtn}>
        <ChevronLeft size={20} />
      </button>
      <span key={format(month, "yyyy-MM")} className={styles.calendarMonthLabel}>
        {format(month, "yyyy年 M月", { locale: ja })}
      </span>
      <button type="button" aria-label="次の月" onClick={() => onChange(addMonths(month, 1))} className={styles.iconBtn}>
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
