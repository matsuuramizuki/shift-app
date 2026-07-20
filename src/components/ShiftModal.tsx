import React, { useState } from "react";
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
  onSave: (shift: Shift) => Promise<void> | void;
  onDelete: (date: string) => Promise<void> | void;
}

export function ShiftModal({ date, shift, settings, onClose, onSave, onDelete }: ShiftModalProps) {
  const [startTime, setStartTime] = useState(() => shift?.startTime ?? "09:00");
  const [endTime, setEndTime] = useState(() => shift?.endTime ?? "18:00");
  const [breakMins, setBreakMins] = useState(() => (shift?.breakMinutes ?? 0).toString());
  const [deduction, setDeduction] = useState(() => (shift?.deduction ?? 0).toString());
  const [allowance, setAllowance] = useState(() => (shift?.allowance ?? 0).toString());
  const [hourlyWage, setHourlyWage] = useState(() => (shift?.hourlyWage ?? settings.defaultHourlyWage).toString());
  const [memo, setMemo] = useState(() => shift?.memo ?? "");
  const [isTentative, setIsTentative] = useState(() => shift?.isTentative ?? false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  if (!date) return null;

  const dateStr = format(date, "yyyy-MM-dd");

  const handleSave = async () => {
    const numericBreak = parseInt(breakMins) || 0;
    const numericDeduct = parseInt(deduction) || 0;
    const numericAllowance = parseInt(allowance) || 0;
    const numericHourlyWage = parseInt(hourlyWage) || 0;

    if (numericHourlyWage <= 0) {
      setError("時給は1円以上で入力してください");
      return;
    }

    const calc = calculateSalary(startTime, endTime, numericBreak, numericDeduct, numericHourlyWage, numericAllowance);

    if (calc.error) {
      setError(calc.error);
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onSave({
        date: dateStr,
        startTime,
        endTime,
        breakMinutes: numericBreak,
        deduction: numericDeduct,
        hourlyWage: numericHourlyWage,
        allowance: numericAllowance,
        memo,
        isTentative
      });

      onClose();
    } catch {
      setError("保存に失敗しました。通信状態を確認してもう一度お試しください。");
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsSaving(true);
    setError("");

    try {
      await onDelete(dateStr);
      onClose();
    } catch {
      setError("削除に失敗しました。通信状態を確認してもう一度お試しください。");
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHandle} />
        <div className={styles.modalHeader}>
          <div>{format(date, "M月d日(E)", { locale: ja })} のシフト</div>
          <button type="button" aria-label="シフト入力を閉じる" onClick={onClose}><X size={20} /></button>
        </div>

        {error && <div className={styles.errorText}>{error}</div>}

        <div className={styles.timeGrid}>
          <div className={styles.inputGroup}>
            <label>開始</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label>終了</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
          </div>
        </div>

        <div className={styles.amountGrid}>
          <div className={styles.inputGroup}>
            <label>休憩（分）</label>
            <input type="number" inputMode="numeric" value={breakMins} onChange={e => setBreakMins(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label>天引き（円）</label>
            <input type="number" inputMode="numeric" value={deduction} onChange={e => setDeduction(e.target.value)} />
          </div>
          <div className={styles.inputGroup}>
            <label>手当（円）</label>
            <input type="number" inputMode="numeric" value={allowance} onChange={e => setAllowance(e.target.value)} />
          </div>
        </div>

        <div className={styles.compactSettingsRow}>
          <div className={styles.inputGroup}>
            <label>時給（円）</label>
            <input type="number" inputMode="numeric" min="1" value={hourlyWage} onChange={e => setHourlyWage(e.target.value)} />
          </div>
          <div className={styles.compactToggleRow}>
            <span className={styles.toggleLabel}>仮のシフト</span>
            <button
              type="button"
              role="switch"
              aria-checked={isTentative}
              aria-label="仮のシフト"
              className={`${styles.toggle} ${isTentative ? styles.toggleOn : ""}`}
              onClick={() => setIsTentative(value => !value)}
            >
              <span className={styles.toggleThumb} />
            </button>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <label>メモ</label>
          <textarea
            rows={1}
            className={styles.memoInput}
            value={memo}
            onChange={e => setMemo(e.target.value)}
            placeholder="特記事項"
          />
        </div>

        <div className={styles.modalActions}>
          {shift && (
            <button className={styles.btnDanger} onClick={handleDelete} disabled={isSaving}>
              {isSaving ? "処理中..." : "削除"}
            </button>
          )}
          <button className={styles.btnPrimary} onClick={handleSave} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存"}
          </button>
        </div>
      </div>
    </div>
  );
}
