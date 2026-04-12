import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { calculateSalary } from "@/lib/calc";
import { format, subMonths } from "date-fns";

interface Props {
  shifts: Shift[];
}

export function MonthlyChart({ shifts }: Props) {
  const now = new Date();
  
  const data = [];
  for (let i = 5; i >= 0; i--) {
    const targetMonth = subMonths(now, i);
    const monthStr = format(targetMonth, "yyyy-MM");
    const displayMonth = format(targetMonth, "M月");
    
    let totalSalary = 0;
    shifts.forEach(s => {
      if (s.date.startsWith(monthStr)) {
        const { salary } = calculateSalary(s.startTime, s.endTime, s.breakMinutes, s.deduction, s.hourlyWage);
        totalSalary += salary;
      }
    });

    data.push({
      name: displayMonth,
      salary: totalSalary
    });
  }

  return (
    <div className={styles.sectionContainer}>
      <h3 className={styles.sectionTitle}>月別給与推移</h3>
      <div style={{ width: '100%', height: 250 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <XAxis dataKey="name" tick={{ fill: "#a0a0a0", fontSize: 12 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "#a0a0a0", fontSize: 12 }} width={60} axisLine={false} tickLine={false} tickFormatter={(val) => val === 0 ? "0" : val >= 1000 ? `¥${val/1000}k` : `¥${val}`} />
            <Tooltip 
              cursor={{ fill: "rgba(255,255,255,0.05)" }}
              contentStyle={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 8, color: "#fff" }}
              formatter={(value: any, name: any) => [`¥${Number(value).toLocaleString()}`, "給与"]}
            />
            <Bar dataKey="salary" fill="#bb86fc" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
