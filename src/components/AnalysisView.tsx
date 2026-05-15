import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
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

  let displayEarnings = 0;
  let futureEarnings = 0;
  let displayHours = 0;
  let futureHours = 0;
  
  let prevMonthEarnings = 0;
  let prevMonthHours = 0;

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
    const isPrevMonth = subTab === 'monthly' && isSameMonth(d, subMonths(selectedMonth, 1));

    if (isPrevMonth) {
      const { salary, hours } = calculateSalary(s.startTime, s.endTime, s.breakMinutes, s.deduction, s.hourlyWage, s.allowance || 0);
      prevMonthEarnings += salary;
      prevMonthHours += hours;
    }

    if (isTarget) {
      const past = isPast(s.date);
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

  const totalChartHours = mEarnedHours + mFutureHours + aEarnedHours + aFutureHours + nEarnedHours + nFutureHours;
  const spacerValue = totalChartHours * 0.02; // 2% gap
  const timeOfDayData: any[] = [];

  const addGroup = (earned: number, future: number, name: string, color: string) => {
    let added = false;
    if (earned > 0) {
      timeOfDayData.push({ name, value: earned, color, showLabel: true });
      added = true;
    }
    if (future > 0) {
      timeOfDayData.push({ name: `${name}(予)`, value: future, color, opacity: 0.65, showLabel: !added });
    }
    if (earned > 0 || future > 0) {
      timeOfDayData.push({ name: `${name}_spacer`, value: spacerValue, color: 'transparent', isSpacer: true });
    }
  };

  addGroup(mEarnedHours, mFutureHours, '午前', '#ffb74d');
  addGroup(aEarnedHours, aFutureHours, '午後', '#81c784');
  addGroup(nEarnedHours, nFutureHours, '夜間', '#ba68c8');

  const dayOfWeekData = dayNames.map((name, i) => ({
    name,
    earned: dayOfWeekEarnedCounts[i],
    future: dayOfWeekFutureCounts[i],
  }));

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
    let totalHours = 0;
    
    shifts.forEach(s => {
      if (s.date.startsWith(monthStr)) {
        const { hours } = calculateSalary(s.startTime, s.endTime, s.breakMinutes, s.deduction, s.hourlyWage, s.allowance || 0);
        totalHours += hours;
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
      totalHours,
    });
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      // If pie chart tooltip
      if (payload[0].payload && payload[0].payload.isSpacer) return null;

      // Group pie chart hover output to show only 1 line
      if (payload[0].name.includes('午前') || payload[0].name.includes('午後') || payload[0].name.includes('夜間')) {
        let displayName = payload[0].name.replace('(予)', '');
        let formattedValue = '';
        if (displayName === '午前') formattedValue = `${(mEarnedHours + mFutureHours).toFixed(1)}時間`;
        if (displayName === '午後') formattedValue = `${(aEarnedHours + aFutureHours).toFixed(1)}時間`;
        if (displayName === '夜間') formattedValue = `${(nEarnedHours + nFutureHours).toFixed(1)}時間`;
        
        return (
          <div style={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 8, padding: '8px', color: "#fff", fontSize: '12px', zIndex: 100 }}>
             <p style={{ margin: 0, color: payload[0].payload.color }}>
               {displayName}: {formattedValue}
             </p>
          </div>
        );
      }

      // Bar charts tooltip
      return (
        <div style={{ background: "#1e1e1e", border: "1px solid #333", borderRadius: 8, padding: '8px', color: "#fff", fontSize: '12px', zIndex: 100 }}>
          <p style={{ margin: 0, fontWeight: 'bold', marginBottom: '4px' }}>{label}</p>
          {payload.map((entry: any, index: number) => {
            const isFuture = entry.name.includes('予');
            const color = entry.payload?.color || entry.color;
            const opacity = isFuture ? 0.6 : 1;
            const formattedValue = entry.name === 'earned' || entry.name === 'future' || entry.name === '確定' || entry.name === '予定' 
              ? `${entry.value}回` 
              : entry.name === 'totalHours' || entry.name === '労働時間'
                ? `${Number(entry.value).toFixed(1)}時間`
                : `¥${Number(entry.value).toLocaleString()}`;
            
            let displayName = entry.name;
            if (displayName === 'totalHours') displayName = '労働時間';
            if (displayName === 'earned') displayName = '確定';
            if (displayName === 'future') displayName = '予定';
            if (displayName === 'netBaseEarned') displayName = '手取り(確定)';
            if (displayName === 'netBaseFuture') displayName = '手取り(予定)';
            if (displayName === 'allowanceEarned') displayName = '手当(確定)';
            if (displayName === 'allowanceFuture') displayName = '手当(予定)';
            if (displayName === 'deductionEarned') displayName = '天引き(確定)';
            if (displayName === 'deductionFuture') displayName = '天引き(予定)';

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

  const totalEarnings = displayEarnings + futureEarnings;
  const totalHours = displayHours + futureHours;
  const diffEarnings = totalEarnings - prevMonthEarnings;
  const diffHours = totalHours - prevMonthHours;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
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

      <div className={styles.summaryGrid} style={{ marginBottom: 0 }}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>{subTab === 'monthly' ? '当月の総額' : '累計給与'}</div>
          <div className={styles.cardValue}>
            ¥{subTab === 'monthly' ? totalEarnings.toLocaleString() : displayEarnings.toLocaleString()}
            {subTab === 'monthly' && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '4px' }}>
                {diffEarnings >= 0 ? '+' : ''}¥{diffEarnings.toLocaleString()}
              </div>
            )}
          </div>
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>{subTab === 'monthly' ? '当月の総労働時間' : '累計労働時間'}</div>
          <div className={styles.cardValue} style={{ color: 'var(--secondary)' }}>
            {subTab === 'monthly' ? totalHours.toFixed(1) : displayHours.toFixed(1)}<span style={{ fontSize: '14px' }}>h</span>
            {subTab === 'monthly' && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '4px' }}>
                {diffHours >= 0 ? '+' : ''}{diffHours.toFixed(1)}h
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.chartContainer} style={{ marginBottom: 0 }}>
        <h3 className={styles.chartTitle}>{subTab === 'monthly' ? '月間曜日別シフト回数' : '通算曜日別シフト回数'}</h3>
        <div style={{ width: '100%', height: 200 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dayOfWeekData} margin={{ top: 10, right: 20, left: -20, bottom: 0 }}>
              <XAxis dataKey="name" tick={{ fill: "#a0a0a0", fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#a0a0a0", fontSize: 12 }} width={40} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip />} />
              <Bar dataKey="earned" name="確定" stackId="a" fill="#03dac6" radius={subTab === 'monthly' && dayOfWeekData.some(d => d.future > 0) ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
              <Bar dataKey="future" name="予定" stackId="a" fill="#03dac6" fillOpacity={0.65} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.chartContainer} style={{ marginBottom: 0 }}>
        <h3 className={styles.chartTitle}>{subTab === 'monthly' ? '月間時間帯別シフト割合 (時間)' : '通算時間帯別シフト割合 (時間)'}</h3>
        {timeOfDayData.filter(d => !d.isSpacer).length > 0 ? (
          <div style={{ width: '100%', height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={timeOfDayData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={0}
                  startAngle={90}
                  endAngle={-270}
                  dataKey="value"
                  label={({ name, percent, x, y, textAnchor, payload }) => {
                    if (!payload.showLabel) return null;
                    const cleanName = String(name).replace('(予)', '');
                    const catTotal = cleanName === '午前' ? mEarnedHours + mFutureHours : cleanName === '午後' ? aEarnedHours + aFutureHours : nEarnedHours + nFutureHours;
                    const catPercent = catTotal / totalChartHours;
                    return (
                      <text x={x} y={y} fill="#fff" fontSize={10} fontWeight="bold" textAnchor={textAnchor} dominantBaseline="central">
                        {`${cleanName} ${(catPercent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                  labelLine={false}
                  stroke="none"
                >
                  {timeOfDayData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={entry.opacity || 1} stroke="none" />
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
                <Bar dataKey="netBaseEarned" name="手取り(確定)" stackId="a" fill="#bb86fc" />
                <Bar dataKey="allowanceEarned" name="手当(確定)" stackId="a" fill="#03dac6" />
                <Bar dataKey="deductionEarned" name="天引き(確定)" stackId="a" fill="#cf6679" radius={monthlyTrendData.some(d => d.netBaseFuture > 0 || d.allowanceFuture > 0 || d.deductionFuture > 0) ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
                <Bar dataKey="netBaseFuture" name="手取り(予定)" stackId="a" fill="#bb86fc" fillOpacity={0.65} />
                <Bar dataKey="allowanceFuture" name="手当(予定)" stackId="a" fill="#03dac6" fillOpacity={0.65} />
                <Bar dataKey="deductionFuture" name="天引き(予定)" stackId="a" fill="#cf6679" fillOpacity={0.65} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {subTab === 'cumulative' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>過去６ヶ月 労働時間推移</h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fill: "#a0a0a0", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a0a0a0", fontSize: 12 }} width={40} axisLine={false} tickLine={false} />
                <Tooltip cursor={{ stroke: 'transparent', fill: 'transparent' }} content={<CustomTooltip />} />
                <Line type="monotone" dataKey="totalHours" name="労働時間" stroke="var(--primary)" strokeWidth={3} dot={{ fill: 'var(--primary)', strokeWidth: 2 }} activeDot={{ r: 6, stroke: 'transparent' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

    </div>
  );
}
