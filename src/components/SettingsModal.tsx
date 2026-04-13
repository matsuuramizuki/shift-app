import React, { useState } from "react";
import { X, LogOut } from "lucide-react";
import styles from "@/app/page.module.css";
import type { Settings } from "@/lib/store";

interface SettingsModalProps {
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => void;
  onSignOut: () => void;
}

export function SettingsModal({ settings, onClose, onSave, onSignOut }: SettingsModalProps) {
  const [wage, setWage] = useState(settings.defaultHourlyWage.toString());

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
