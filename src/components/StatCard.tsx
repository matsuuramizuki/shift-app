import type { CSSProperties, ReactNode } from "react";
import styles from "@/app/page.module.css";

interface StatCardProps {
  label: ReactNode;
  value: ReactNode;
  detail?: ReactNode;
  valueStyle?: CSSProperties;
}

export function StatCard({ label, value, detail, valueStyle }: StatCardProps) {
  return (
    <div className={styles.analysisCard}>
      <div className={styles.analysisCardLabel}>{label}</div>
      <div className={styles.analysisCardValue} style={valueStyle}>
        {value}
        {detail && <div className={styles.cardDetail}>{detail}</div>}
      </div>
    </div>
  );
}
