import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { calculateSalary } from "@/lib/calc";
import { format, subMonths, addMonths, parseISO, getDay, isSameMonth } from "date-fns";
import { ja } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface Props {
  shifts: Shift[];
}

export function AnalysisView({ shifts }: Props) {
  const [subTab, setSubTab] = useState<'monthly' | 'cumulative'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const isPast = (dateStr: string) => dateStr <= todayStr;
  
  // Helper for Time Block Allocation (hours)
  const calcTimeBlocks = (sTime: string, eTime: string, bMins: number) => {
    const [sh, sm] = sTime.split(':').map(Number);
    const [eh, em] = eTime.split(':').map(Number);
    const startMins = sh * 60 + sm;
    let endMins = eh * 60 + em;
    if (endMins < startMins) endMins += 24 * 60;
    
    const totalMins = endMins - startMins;
    if (totalMins <= 0) return { morning: 0, afternoon: 0, night: 0 };

    const getOverlap = (bStart: number, bEnd: number) => {
      const os = Math.max(startMins, bStart);
      const oe = Math.min(endMins, bEnd);
      return Math.max(0, oe - os);
    };

    let m = getOverlap(300, 720);
    let a = getOverlap(720, 1080);
    let n = getOverlap(1080, 1740) + getOverlap(0, 300);

    let remBreak = bMins;

    const aSub = Math.min(a, remBreak);
    a -= aSub;
    remBreak -= aSub;

    if (remBreak > 0) {
      const nSub = Math.min(n, remBreak);
      n -= nSub;
      remBreak -= nSub;
    }

    if (remBreak > 0) {
      const mSub = Math.min(m, remBreak);
      m -= mSub;
      remBreak -= mSub;
    }

    return {
      morning: m / 60,
      afternoon: a / 60,
      night: n / 60
    };
  };

  // 1. Calculations based on active subTab
  let displayEarnings = 0;
  let futureEarnings = 0;
  let displayHours = 0;
  let futureHours = 0;
  
  const dayOfWeekEarnedCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayOfWeekFutureCounts = [0, 0, 0, 0, 0, 0, 0];
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];
  
  let mEarnedHours = 0;
  let aEarnedHours = 0;
  let nEarnedHours = 0;
  let mFutureHours = 0;
  let aFutureHours = 0;
  let nFutureHours = 0;

  shifts.forEach(s => {
    const d = parseISO(s.date);
    const isTarget = subTab === 'cumulative' || isSameMonth(d, selectedMonth);

    if (isTarget) {
      const past = isPast(s.date);
      
      // In cumulative tab, we completely ignore future shifts
      if (subTab === 'cumulative' && !past) return;

      const { salary, hours } = calculateSalary(s.startTime, s.endTime, s.breakMinutes, s.deduction, s.hourlyWage, s.allowance || 0);
      
      const dayIndex = getDay(d);
      const blocks = calcTimeBlocks(s.startTime, s.endTime, s.breakMinutes);

      if (past) {
        displayEarnings += salary;
        displayHours += hours;
        dayOfWeekEarnedCounts[dayIndex]++;
        mEarnedHours += blocks.morning;
        aEarnedHours += blocks.afternoon;
        nEarnedHours += blocks.night;
      } else {
        futureEarnings += salary;
        futureHours += hours;
        dayOfWeekFutureCounts[dayIndex]++;
        mFutureHours += blocks.morning;
        aFutureHours += blocks.afternoon;
        nFutureHours += blocks.night;
      }
    }
  });

  const timeOfDayData = [
    { name: '午前', value: parseFloat((mEarnedHours + mFutureHours).toFixed(1)), color: '#ffb74d' },
    { name: '午後', value: parseFloat((aEarnedHours + aFutureHours).toFixed(1)), color: '#81c784' },
    { name: '夜間', value: parseFloat((nEarnedHours + nFutureHours).toFixed(1)), color: '#ba68c8' },
  ].filter(d => d.value > 0);

  const dayOfWeekData = dayNames.map((name, i) => ({
    name,
    earned: dayOfWeekEarnedCounts[i],
    future: dayOfWeekFutureCounts[i],
  }));

  // 2. 6-Month Trend Data (only shown in monthly tab)
  const monthlyTrendData = [];
  for (let i = 5; i >= 0; i--) {
    const targetMonth = subMonths(now, i);
    const monthStr = format(targetMonth, "yyyy-MM");
    const displayMonth = format(targetMonth, "M月");
    
    let netBaseEarned = 0;
    let allowanceEarned = 0;
    let deductionEarned = 0;
    let netBaseFuture = 0;
    let allowanceFuture = 0;
    let deductionFuture = 0;
    
    shifts.forEach(s => {
      if (s.date.startsWith(monthStr)) {
        const { hours } = calculateSalary(s.startTime, s.endTime, s.breakMinutes, s.deduction, s.hourlyWage, s.allowance || 0);
        const rawBase = Math.floor(hours * s.hourlyWage);
        const allow = s.allowance || 0;
        const ded = s.deduction || 0;
        const netBase = Math.max(0, rawBase - ded);
        
        if (isPast(s.date)) {
          netBaseEarned += netBase;
          allowanceEarned += allow;
          deductionEarned += ded;
        } else {
          netBaseFuture += netBase;
          allowanceFuture += allow;
          deductionFuture += ded;
        }
      }
    });

    monthlyTrendData.push({
      name: displayMonth,
      netBaseEarned,
      allowanceEarned,
      deductionEarned,
      netBaseFuture,
      allowanceFuture,
      deductionFuture,
    });
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div style={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 8, padding: '8px', color: "#fff", fontSize: '12px', zIndex: 100 }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '4px' }}>{label}</p>
          {payload.map((entry: any, index: number) => {
            const isFuture = entry.name.includes('予');
            const color = entry.payload?.color || entry.color;
            const opacity = isFuture ? 0.6 : 1;
            const formattedValue = entry.name === 'earned' || entry.name === 'future' || entry.name === '確定' || entry.name === '予定' 
              ? `${entry.value}回` 
              : entry.name.includes('前') || entry.name.includes('後') || entry.name.includes('夜') 
                ? `${entry.value}時間` 
                : `¥${Number(entry.value).toLocaleString()}`;
            
            // Map keys to readable names
            let displayName = entry.name;
            if (displayName === 'earned') displayName = '確定';
            if (displayName === 'future') displayName = '予定';
            if (displayName === 'netBaseEarned') displayName = '手取り(確定)';
            if (displayName === 'netBaseFuture') displayName = '手取り(予定)';
            if (displayName === 'allowanceEarned') displayName = '手当(確定)';
            if (displayName === 'allowanceFuture') displayName = '手当(予定)';
            if (displayName === 'deductionEarned') displayName = '天引き(確定)';
            if (displayName === 'deductionFuture') displayName = '天引き(予定)';

            // Hide 0 values in tooltip for cleaner display
            if (entry.value === 0) return null;

            return (
              <p key={index} style={{ margin: 0, color: color, opacity }}>
                {displayName}: {formattedValue}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Sub-Tabs */}
      <div style={{ display: 'flex', background: 'var(--surface)', borderRadius: 'var(--radius-md)', padding: '4px' }}>
        <button
          onClick={() => setSubTab('monthly')}
          style={{
            flex: 1, padding: '10px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', borderRadius: 'var(--radius-sm)',
            background: subTab === 'monthly' ? 'var(--primary)' : 'transparent',
            color: subTab === 'monthly' ? '#000' : 'var(--text-muted)'
          }}
        >
          月ごと
        </button>
        <button
          onClick={() => setSubTab('cumulative')}
          style={{
            flex: 1, padding: '10px', textAlign: 'center', fontSize: '14px', fontWeight: 'bold', borderRadius: 'var(--radius-sm)',
            background: subTab === 'cumulative' ? 'var(--primary)' : 'transparent',
            color: subTab === 'cumulative' ? '#000' : 'var(--text-muted)'
          }}
        >
          通算
        </button>
      </div>

      {/* Monthly Selector (Only in monthly tab) */}
      {subTab === 'monthly' && (
        <div className={styles.calendarHeader} style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 0 }}>
          <button onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))} className={styles.iconBtn}>
            <ChevronLeft size={20} />
          </button>
          <span>{format(selectedMonth, "yyyy年 M月", { locale: ja })}</span>
          <button onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))} className={styles.iconBtn}>
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      {/* Stats Summary */}
      <div className={styles.summaryGrid} style={{ marginBottom: 0 }}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>{subTab === 'monthly' ? '月間給与' : '累計給与'}</div>
          <div className={styles.cardValue}>
            ¥{displayEarnings.toLocaleString()}
            {futureEarnings > 0 && subTab === 'monthly' && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '4px' }}>
                +¥{futureEarnings.toLocaleString()}
              </div>
            )}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>{subTab === 'monthly' ? '月間労働時間' : '累計労働時間'}</div>
          <div className={styles.cardValue} style={{ color: 'var(--secondary)' }}>
            {displayHours.toFixed(1)}<span style={{ fontSize: '14px' }}>h</span>
            {futureHours > 0 && subTab === 'monthly' && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '4px' }}>
                +{futureHours.toFixed(1)}h
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Day of Week */}
      <div className={styles.chartContainer} style={{ marginBottom: 0 }}>
        <h3 className={styles.chartTitle}>{subTab === 'monthly' ? '月間曜日別シフト回数' : '通算曜日別シフト回数'}</h3>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayOfWeekData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#a0a0a0", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a0a0a0", fontSize: 12 }} width={40} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
              <Bar dataKey="earned" name="確定" stackId="a" fill="#03dac6" radius={subTab === 'monthly' && dayOfWeekData.some(d => d.future > 0) ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
              <Bar dataKey="future" name="予定" stackId="a" fill="#03dac6" fillOpacity={0.4} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Time of Day Pie Chart */}
      <div className={styles.chartContainer} style={{ marginBottom: 0 }}>
        <h3 className={styles.chartTitle}>{subTab === 'monthly' ? '月間時間帯別シフト割合 (時間)' : '通算時間帯別シフト割合 (時間)'}</h3>
        {timeOfDayData.length > 0 ? (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={timeOfDayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  label={({ name, percent, x, y, textAnchor }) => (
                    <text x={x} y={y} fill="#fff" fontSize={10} fontWeight="bold" textAnchor={textAnchor} dominantBaseline="central">
                      {`${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    </text>
                  )}
                  labelLine={false}
                >
                  {timeOfDayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="#1e1e1e" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>データがありません</p>
        )}
      </div>

      {/* Monthly Trend (Stacked Bar) - Only in Monthly Tab */}
      {subTab === 'monthly' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>過去６ヶ月推移</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#a0a0a0", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a0a0a0", fontSize: 12 }} width={50} axisLine={false} tickLine={false} tickFormatter={(val) => val === 0 ? "0" : val >= 1000 ? `¥${val/1000}k` : `¥${val}`} />
                <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
                <Legend content={() => (
                  <ul style={{ display: 'flex', justifyContent: 'center', listStyle: 'none', padding: 0, margin: 0, fontSize: '12px', gap: '16px' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#bb86fc' }}></span>手取り</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#03dac6' }}></span>手当</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#cf6679' }}></span>天引き</li>
                  </ul>
                )} />
                {/* Earned */}
                <Bar dataKey="netBaseEarned" name="手取り(確定)" stackId="a" fill="#bb86fc" />
                <Bar dataKey="allowanceEarned" name="手当(確定)" stackId="a" fill="#03dac6" />
                <Bar dataKey="deductionEarned" name="天引き(確定)" stackId="a" fill="#cf6679" radius={monthlyTrendData.some(d => d.netBaseFuture > 0 || d.allowanceFuture > 0 || d.deductionFuture > 0) ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
                {/* Future */}
                <Bar dataKey="netBaseFuture" name="手取り(予定)" stackId="a" fill="#bb86fc" fillOpacity={0.4} />
                <Bar dataKey="allowanceFuture" name="手当(予定)" stackId="a" fill="#03dac6" fillOpacity={0.4} />
                <Bar dataKey="deductionFuture" name="天引き(予定)" stackId="a" fill="#cf6679" fillOpacity={0.4} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
