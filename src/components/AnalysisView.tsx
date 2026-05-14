import React from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { calculateSalary } from "@/lib/calc";
import { format, subMonths, parseISO, getDay } from "date-fns";

interface Props {
  shifts: Shift[];
}

export function AnalysisView({ shifts }: Props) {
  const now = new Date();
  
  // 1. Cumulative Calculations
  let totalEarnings = 0;
  let totalHours = 0;

  // 2. Day of Week Distribution
  // 0: Sun, 1: Mon, ... 6: Sat
  const dayOfWeekCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  // 3. Time of Day Distribution
  let morning = 0; // 05:00 - 11:59
  let afternoon = 0; // 12:00 - 17:59
  let night = 0; // 18:00 - 28:59 (04:59)

  shifts.forEach(s => {
    const { salary, hours } = calculateSalary(s.startTime, s.endTime, s.breakMinutes, s.deduction, s.hourlyWage);
    totalEarnings += salary;
    totalHours += hours;

    // Day of week
    const d = parseISO(s.date);
    const dayIndex = getDay(d);
    dayOfWeekCounts[dayIndex]++;

    // Time of day (using start time)
    const [hStr] = s.startTime.split(':');
    const h = parseInt(hStr, 10);
    if (h >= 5 && h < 12) {
      morning++;
    } else if (h >= 12 && h < 18) {
      afternoon++;
    } else {
      night++;
    }
  });

  const timeOfDayData = [
    { name: '午前 (5-12)', value: morning, color: '#03dac6' },
    { name: '午後 (12-18)', value: afternoon, color: '#bb86fc' },
    { name: '夜間 (18-)', value: night, color: '#cf6679' },
  ].filter(d => d.value > 0);

  const dayOfWeekData = dayNames.map((name, i) => ({
    name,
    count: dayOfWeekCounts[i]
  }));

  // 4. Monthly Trend (Stacked Bar)
  const monthlyData = [];
  for (let i = 5; i >= 0; i--) {
    const targetMonth = subMonths(now, i);
    const monthStr = format(targetMonth, "yyyy-MM");
    const displayMonth = format(targetMonth, "M月");
    
    let baseSalary = 0;
    let totalDeduction = 0;
    
    shifts.forEach(s => {
      if (s.date.startsWith(monthStr)) {
        const { salary } = calculateSalary(s.startTime, s.endTime, s.breakMinutes, s.deduction, s.hourlyWage);
        baseSalary += (salary + s.deduction); // Salary before deduction
        totalDeduction += s.deduction;
      }
    });

    monthlyData.push({
      name: displayMonth,
      salary: baseSalary - totalDeduction,
      deduction: totalDeduction
    });
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 8, padding: '8px', color: "#fff", fontSize: '12px' }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '4px' }}>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ margin: 0, color: entry.color }}>
              {entry.name}: {entry.name === '回数' ? `${entry.value}回` : `¥${Number(entry.value).toLocaleString()}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Cumulative Stats */}
      <div className={styles.summaryGrid} style={{ marginBottom: 0 }}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>累計稼ぎ</div>
          <div className={styles.cardValue}>¥{totalEarnings.toLocaleString()}</div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>累計労働時間</div>
          <div className={styles.cardValue} style={{ color: 'var(--secondary)' }}>{totalHours.toFixed(1)}<span style={{ fontSize: '14px' }}>h</span></div>
        </div>
      </div>

      {/* Monthly Stacked Bar */}
      <div className={styles.chartContainer} style={{ marginBottom: 0 }}>
        <h3 className={styles.chartTitle}>月別推移 (給与/天引き)</h3>
        <div style={{ width: '100%', height: 250 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#a0a0a0", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a0a0a0", fontSize: 12 }} width={60} axisLine={false} tickLine={false} tickFormatter={(val) => val === 0 ? "0" : val >= 1000 ? `¥${val/1000}k` : `¥${val}`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="salary" name="手取り" stackId="a" fill="#bb86fc" radius={[0, 0, 4, 4]} />
              <Bar dataKey="deduction" name="天引き" stackId="a" fill="#cf6679" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Day of Week */}
      <div className={styles.chartContainer} style={{ marginBottom: 0 }}>
        <h3 className={styles.chartTitle}>曜日別シフト回数</h3>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayOfWeekData} margin={{ top: 10, right: 10, left: -30, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#a0a0a0", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a0a0a0", fontSize: 12 }} width={40} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="count" name="回数" fill="#03dac6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time of Day Pie Chart */}
      <div className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>時間帯別シフト割合</h3>
        {timeOfDayData.length > 0 ? (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={timeOfDayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  labelLine={false}
                  style={{ fontSize: '10px', fill: '#fff' }}
                >
                  {timeOfDayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>データがありません</p>
        )}
      </div>

    </div>
  );
}
