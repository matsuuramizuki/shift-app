import React, { useState } from "react";
import { X } from "lucide-react";
import styles from "@/app/page.module.css";
import type { Settings } from "@/lib/store";

interface SettingsModalProps {
  settings: Settings;
  onClose: () => void;
  onSave: (settings: Settings) => void;
}

export function SettingsModal({ settings, onClose, onSave }: SettingsModalProps) {
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
      </div>
    </div>
  );
}
