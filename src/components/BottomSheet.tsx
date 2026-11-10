import type { ReactNode } from "react";
import { X } from "lucide-react";
import styles from "@/app/page.module.css";

interface BottomSheetProps {
  title: ReactNode;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({ title, closeLabel, onClose, children }: BottomSheetProps) {
  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHandle} />
        <div className={styles.modalHeader}>
          <div>{title}</div>
          <button type="button" aria-label={closeLabel} onClick={onClose}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
