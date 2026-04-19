import React, { useState } from "react";
import { X, LogOut, Copy, Check, CalendarDays } from "lucide-react";
import styles from "@/app/page.module.css";
import type { Settings } from "@/lib/store";

interface SettingsModalProps {
  userId: string;
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => void;
  onSignOut: () => void;
}

export function SettingsModal({ userId, settings, onClose, onSave, onSignOut }: SettingsModalProps) {
  const [wage, setWage] = useState(settings.defaultHourlyWage.toString());
  const [copied, setCopied] = useState(false);

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

  const handleSave = () => {
    const numValue = parseInt(wage, 10);
    if (!isNaN(numValue) && numValue >= 0) {
      onSave({ defaultHourlyWage: numValue });
      onClose(); // Automatically close
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
          <div>設定</div>
          <button onClick={onClose}><X size={24} /></button>
        </div>

        <div className={styles.inputGroup}>
          <label>基本時給 (円)</label>
          <input 
            type="number" 
            inputMode="numeric" 
            value={wage} 
            onChange={e => setWage(e.target.value)} 
          />
        </div>
        <p style={{fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px'}}>
          ※設定を変更しても、すでに保存されている過去のシフトの給付は変わりません。未来の新しいシフトに適用されます。
        </p>

        <button className={styles.btnPrimary} onClick={handleSave}>
          保存する
        </button>

        <hr style={{ borderColor: 'var(--border)', margin: '24px 0', borderStyle: 'solid', borderWidth: '1px 0 0 0' }} />

        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '14px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CalendarDays size={16} /> カレンダー連携 (iCal)
          </h3>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
            GoogleカレンダーやiPhoneカレンダーの「URLで追加(照会)」に以下のURLを設定すると、シフトが自動同期されます。
          </p>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input 
              readOnly 
              value={calendarUrl} 
              style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text-muted)', fontSize: '12px' }}
            />
            <button 
              onClick={handleCopyUrl}
              style={{ padding: '0 12px', borderRadius: '4px', background: 'var(--primary)', border: 'none', color: '#fff', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
          </div>
        </div>

        <hr style={{ borderColor: 'var(--border)', margin: '24px 0', borderStyle: 'solid', borderWidth: '1px 0 0 0' }} />

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
