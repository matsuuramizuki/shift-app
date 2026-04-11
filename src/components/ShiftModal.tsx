import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import { ja } from "date-fns/locale";
import { X } from "lucide-react";
import styles from "@/app/page.module.css";
import type { Shift, Settings } from "@/lib/store";
import { calculateSalary } from "@/lib/calc";

interface ShiftModalProps {
  date: Date | null;
  shift: Shift | undefined;
  settings: Settings;
  onClose: () => void;
  onSave: (shift: Shift) => void;
  onDelete: (date: string) => void;
}

export function ShiftModal({ date, shift, settings, onClose, onSave, onDelete }: ShiftModalProps) {
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");
  const [breakMins, setBreakMins] = useState("0");
  const [deduction, setDeduction] = useState("0");
  const [error, setError] = useState("");

  useEffect(() => {
    if (shift) {
      setStartTime(shift.startTime);
      setEndTime(shift.endTime);
      setBreakMins(shift.breakMinutes.toString());
      setDeduction(shift.deduction.toString());
    } else {
      setStartTime("09:00");
      setEndTime("18:00");
      setBreakMins("0");
      setDeduction("0");
    }
    setError("");
  }, [shift, date]);

  if (!date) return null;

  const dateStr = format(date, "yyyy-MM-dd");

  const handleSave = () => {
    const numericBreak = parseInt(breakMins) || 0;
    const numericDeduct = parseInt(deduction) || 0;
    
    // Save uses setting's wage if new, or retains existing wage if edited (per requirements: "過去のシフトは時給変更の影響を受けない")
    // Wait, the prompt requirements: "各シフトにその時点の時給を保存する（ShiftにhourlyWageを含める）"
    const hourlyWage = shift ? shift.hourlyWage : settings.defaultHourlyWage;

    const calc = calculateSalary(startTime, endTime, numericBreak, numericDeduct, hourlyWage);

    if (calc.error) {
      setError(calc.error);
      return;
    }

    onSave({
      date: dateStr,
      startTime,
      endTime,
      breakMinutes: numericBreak,
      deduction: numericDeduct,
      hourlyWage
    });
    
    onClose(); // Automatically close as requested
  };

  const handleDelete = () => {
    onDelete(dateStr);
    onClose();
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div>{format(date, "M月d日(E)", { locale: ja })} のシフト</div>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        {error && <div className={styles.errorText}>{error}</div>}

        <div className={styles.inputGroup}>
          <label>開始時間</label>
          <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
        </div>
        
        <div className={styles.inputGroup}>
          <label>終了時間</label>
          <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
        </div>

        <div className={styles.inputGroup}>
          <label>休憩時間 (分)</label>
          <input type="number" inputMode="numeric" value={breakMins} onChange={e => setBreakMins(e.target.value)} />
        </div>

        <div className={styles.inputGroup}>
          <label>天引き金額 (円)</label>
          <input type="number" inputMode="numeric" value={deduction} onChange={e => setDeduction(e.target.value)} />
        </div>

        <button className={styles.btnPrimary} onClick={handleSave}>
          保存する
        </button>

        {shift && (
          <button className={styles.btnDanger} onClick={handleDelete}>
            削除する
          </button>
        )}
      </div>
    </div>
  );
}
