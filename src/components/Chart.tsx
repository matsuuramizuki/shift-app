import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { calculateSalary } from "@/lib/calc";
import { startOfMonth, endOfMonth, isWithinInterval, parseISO, compareAsc } from 'date-fns';

interface ChartProps {
  currentDate: Date;
  shifts: Shift[];
}

export function CumulativeChart({ currentDate, shifts }: ChartProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);

  // Filter shifts to current month and sort by date ascending
  const currentMonthShifts = shifts
    .filter(s => {
      const date = parseISO(s.date);
      return isWithinInterval(date, { start: monthStart, end: monthEnd });
    })
    .sort((a, b) => compareAsc(parseISO(a.date), parseISO(b.date)));

  let cumulative = 0;
  const data = currentMonthShifts.map(s => {
    const { salary } = calculateSalary(s.startTime, s.endTime, s.breakMinutes, s.deduction, s.hourlyWage);
    cumulative += salary;
    
    return {
      date: s.date.slice(8, 10) + '日', // 'MM-DD' extract 'DD日'
      salary: cumulative
    };
  });

  return (
    <div className={styles.chartContainer}>
      <div className={styles.chartTitle}>累積給与推移</div>
      {data.length === 0 ? (
        <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '40px' }}>データがありません</div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="date" stroke="var(--text-muted)" fontSize={12} tickMargin={10} />
            <YAxis stroke="var(--text-muted)" fontSize={12} width={50} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--surface-hover)', border: 'none', borderRadius: '8px' }}
              itemStyle={{ color: 'var(--primary)' }}
            />
            <Line type="monotone" dataKey="salary" name="累計(円)" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
