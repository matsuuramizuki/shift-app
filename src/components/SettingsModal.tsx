import { useState } from "react";
import { X, LogOut, Copy, Check, CalendarDays } from "lucide-react";
import styles from "@/app/page.module.css";
import type { Settings } from "@/lib/store";

interface SettingsModalProps {
  userId: string;
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => Promise<void> | void;
  onSignOut: () => void;
}

export function SettingsModal({ userId, settings, onClose, onSave, onSignOut }: SettingsModalProps) {
  const [wage, setWage] = useState(settings.defaultHourlyWage.toString());
  const [paydayStr, setPaydayStr] = useState(settings.payday ? settings.payday.toString() : "");
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const calendarUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/calendar/${userId}` 
    : '';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(calendarUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const handleSave = async () => {
    const numValue = parseInt(wage, 10);
    const numPayday = parseInt(paydayStr, 10);
    
    if (isNaN(numValue) || numValue < 0) {
      setError("基本時給は0円以上で入力してください。");
      return;
    }

    setIsSaving(true);
    setError("");

    try {
      await onSave({
        defaultHourlyWage: numValue,
        payday: !isNaN(numPayday) && numPayday >= 1 && numPayday <= 31 ? numPayday : undefined
      });
      onClose();
    } catch {
      setError("設定の保存に失敗しました。通信状態を確認してもう一度お試しください。");
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHandle} />
        <div className={styles.modalHeader}>
          <div>設定</div>
          <button type="button" aria-label="設定を閉じる" onClick={onClose}><X size={20} /></button>
        </div>

        {error && <div className={styles.errorText}>{error}</div>}

        <div className={styles.inputGroup}>
          <label>基本時給 (円)</label>
          <input 
            type="number" 
            inputMode="numeric" 
            value={wage} 
            onChange={e => setWage(e.target.value)} 
          />
        </div>

        <div className={styles.inputGroup}>
          <label>給与日 (1〜31日 / 空白で未設定)</label>
          <input 
            type="number" 
            inputMode="numeric" 
            min="1"
            max="31"
            value={paydayStr} 
            onChange={e => setPaydayStr(e.target.value)} 
            placeholder="例: 25"
          />
        </div>

        <p className={styles.settingsNote}>
          ※時給を変更しても、すでに保存されている過去のシフトの給与は変わりません。未来の新しいシフトに適用されます。<br/>
          ※給与日を設定すると、カレンダーのその日に前月の給与合計が表示されます。
        </p>

        <button className={styles.btnPrimary} onClick={handleSave} disabled={isSaving}>
          {isSaving ? "保存中..." : "保存する"}
        </button>

        <hr className={styles.divider} />

        <div className={styles.calendarSection}>
          <h3 className={styles.calendarTitle}>
            <CalendarDays size={16} /> カレンダー連携 (iCal)
          </h3>
          <p className={styles.calendarDescription}>
            GoogleカレンダーやiPhoneカレンダーの「URLで追加(照会)」に以下のURLを設定すると、シフトが自動同期されます。
          </p>
          <div className={styles.calendarCopyRow}>
            <input 
              readOnly 
              value={calendarUrl} 
              aria-label="カレンダー連携URL"
              className={styles.calendarUrl}
            />
            <button 
              type="button"
              onClick={handleCopyUrl}
              aria-label={copied ? "コピーしました" : "URLをコピー"}
              className={styles.copyButton}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <hr className={styles.divider} />

        <button 
          className={styles.btnDanger} 
          onClick={onSignOut} 
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
        >
          <LogOut size={20} />
          ログアウト
        </button>
      </div>
    </div>
  );
}
