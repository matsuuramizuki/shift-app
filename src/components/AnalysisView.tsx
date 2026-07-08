import React, { useEffect, useState, useRef, useMemo } from "react";
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

interface TimeOfDayData {
  name: string;
  value: number;
  color: string;
  opacity?: number;
  showLabel?: boolean;
  isSpacer?: boolean;
}

interface DayOfWeekData {
  name: string;
  earned: number;
  future: number;
  total: number;
}

interface MonthlyTrendData {
  name: string;
  netBaseEarned: number;
  allowanceEarned: number;
  deductionEarned: number;
  netBaseFuture: number;
  allowanceFuture: number;
  deductionFuture: number;
  totalHours: number;
}

interface ChartClickState<T> {
  activeLabel?: string;
  activePayload?: Array<{
    payload?: T;
  }>;
}

interface ShapeClickData<T> {
  payload?: T;
}

interface TooltipPayload {
  name?: string;
  value?: number | string;
  color?: string;
  payload?: {
    color?: string;
    isSpacer?: boolean;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  totals: {
    morning: number;
    afternoon: number;
    night: number;
  };
}

type TapLayerStyle = React.CSSProperties & {
  "--tap-left"?: string;
  "--tap-right"?: string;
};

const weekdayTapLayerStyle: TapLayerStyle = {
  "--tap-left": "20px",
  "--tap-right": "20px",
};

const monthlyTrendTapLayerStyle: TapLayerStyle = {
  "--tap-left": "40px",
  "--tap-right": "20px",
};

function CustomTooltip({ active, payload, label, totals }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  if (payload[0].payload?.isSpacer) return null;

  const firstName = String(payload[0].name ?? "");

  if (firstName.includes("午前") || firstName.includes("午後") || firstName.includes("夜間")) {
    const displayName = firstName.replace("(予)", "");
    let formattedValue = "";
    if (displayName === "午前") formattedValue = `${totals.morning.toFixed(1)}時間`;
    if (displayName === "午後") formattedValue = `${totals.afternoon.toFixed(1)}時間`;
    if (displayName === "夜間") formattedValue = `${totals.night.toFixed(1)}時間`;

    return (
      <div className={styles.tooltipBox}>
        <p style={{ margin: 0, color: payload[0].payload?.color }}>
          {displayName}: {formattedValue}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.tooltipBox}>
      <p style={{ margin: 0, fontWeight: "bold", marginBottom: "4px" }}>{label}</p>
      {payload.map((entry, index) => {
        const entryName = String(entry.name ?? "");
        const value = Number(entry.value ?? 0);
        const isFuture = entryName.includes("予");
        const color = entry.payload?.color || entry.color;
        const opacity = isFuture ? 0.6 : 1;
        const formattedValue = entryName === "earned" || entryName === "future" || entryName === "確定" || entryName === "予定" || entryName === "シフト回数"
          ? `${value}回`
          : entryName === "totalHours" || entryName === "労働時間"
            ? `${value.toFixed(1)}時間`
            : `¥${value.toLocaleString()}`;

        let displayName = entryName;
        if (displayName === "totalHours") displayName = "労働時間";
        if (displayName === "earned") displayName = "確定";
        if (displayName === "future") displayName = "予定";
        if (displayName === "netBaseEarned") displayName = "手取り(確定)";
        if (displayName === "netBaseFuture") displayName = "手取り(予定)";
        if (displayName === "allowanceEarned") displayName = "手当(確定)";
        if (displayName === "allowanceFuture") displayName = "手当(予定)";
        if (displayName === "deductionEarned") displayName = "天引き(確定)";
        if (displayName === "deductionFuture") displayName = "天引き(予定)";

        if (value === 0) return null;

        return (
          <p key={`${displayName}-${index}`} style={{ margin: 0, color, opacity }}>
            {displayName}: {formattedValue}
          </p>
        );
      })}
    </div>
  );
}

function calcTimeBlocks(sTime: string, eTime: string, bMins: number) {
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
}

const TimeOfDayPieChart = React.memo(({
  timeOfDayData,
  usesCompactCharts,
  tooltipTotals,
  totalChartHours,
  mEarnedHours,
  mFutureHours,
  aEarnedHours,
  aFutureHours,
  nEarnedHours,
  nFutureHours
}: {
  timeOfDayData: TimeOfDayData[];
  usesCompactCharts: boolean;
  tooltipTotals: { morning: number; afternoon: number; night: number };
  totalChartHours: number;
  mEarnedHours: number;
  mFutureHours: number;
  aEarnedHours: number;
  aFutureHours: number;
  nEarnedHours: number;
  nFutureHours: number;
}) => {
  return (
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
          label={({ name, x, y, textAnchor, payload }) => {
            if (!payload.showLabel) return null;
            const cleanName = String(name).replace('(予)', '');
            const catTotal = cleanName === '午前' ? mEarnedHours + mFutureHours : cleanName === '午後' ? aEarnedHours + aFutureHours : nEarnedHours + nFutureHours;
            const catPercent = catTotal / totalChartHours;
            return (
              <text x={x} y={y} fill="#fff" fontSize={10} fontWeight="bold" textAnchor={textAnchor} dominantBaseline="central" style={{ pointerEvents: 'none' }}>
                {`${cleanName} ${(catPercent * 100).toFixed(0)}%`}
              </text>
            );
          }}
          labelLine={false}
          stroke="none"
          isAnimationActive={true}
          animationDuration={600}
        >
          {timeOfDayData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={entry.opacity || 1} stroke="none" />
          ))}
        </Pie>
        {!usesCompactCharts && <Tooltip cursor={{ fill: 'transparent' }} content={<CustomTooltip totals={tooltipTotals} />} />}
      </PieChart>
    </ResponsiveContainer>
  );
});
TimeOfDayPieChart.displayName = "TimeOfDayPieChart";

export function AnalysisView({ shifts }: Props) {
  const [subTab, setSubTab] = useState<'monthly' | 'cumulative'>('monthly');
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [usesCompactCharts, setUsesCompactCharts] = useState(false);
  const [selectedWeekday, setSelectedWeekday] = useState<DayOfWeekData | null>(null);
  const [isTimeOfDayOpen, setIsTimeOfDayOpen] = useState(false);
  const [selectedTrendMonth, setSelectedTrendMonth] = useState<MonthlyTrendData | null>(null);
  const [selectedHoursMonth, setSelectedHoursMonth] = useState<MonthlyTrendData | null>(null);
  const [activeWeekday, setActiveWeekday] = useState<DayOfWeekData | null>(null);
  const [activeTrendMonth, setActiveTrendMonth] = useState<MonthlyTrendData | null>(null);
  const [activeHoursMonth, setActiveHoursMonth] = useState<MonthlyTrendData | null>(null);
  const monthlySwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressChartTapUntilRef = useRef(0);
  const now = new Date();
  const isViewingPastMonth = subTab === 'monthly' && format(selectedMonth, "yyyy-MM") < format(now, "yyyy-MM");

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: none), (pointer: coarse), (max-width: 700px)");
    const updateChartMode = () => setUsesCompactCharts(mediaQuery.matches);

    updateChartMode();
    mediaQuery.addEventListener("change", updateChartMode);

    return () => mediaQuery.removeEventListener("change", updateChartMode);
  }, []);

  const {
    displayEarnings,
    displayHours,
    totalEarnings,
    totalHours,
    diffEarnings,
    diffHours,
    dayOfWeekData,
    timeOfDayData,
    monthlyTrendData,
    tooltipTotals,
    totalChartHours,
    mEarnedHours,
    mFutureHours,
    aEarnedHours,
    aFutureHours,
    nEarnedHours,
    nFutureHours
  } = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const isPast = (dateStr: string) => dateStr <= todayStr;

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
    const timeOfDayData: TimeOfDayData[] = [];

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

    addGroup(mEarnedHours, mFutureHours, '午前', '#FF8F00');
    addGroup(aEarnedHours, aFutureHours, '午後', '#1ED760');
    addGroup(nEarnedHours, nFutureHours, '夜間', '#A855F7');

    const dayOfWeekData: DayOfWeekData[] = dayNames.map((name, i) => ({
      name,
      earned: dayOfWeekEarnedCounts[i],
      future: dayOfWeekFutureCounts[i],
      total: dayOfWeekEarnedCounts[i] + dayOfWeekFutureCounts[i],
    }));

    const monthlyTrendData: MonthlyTrendData[] = [];
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

    const totalEarnings = displayEarnings + futureEarnings;
    const totalHours = displayHours + futureHours;
    const diffEarnings = totalEarnings - prevMonthEarnings;
    const diffHours = totalHours - prevMonthHours;
    const tooltipTotals = {
      morning: mEarnedHours + mFutureHours,
      afternoon: aEarnedHours + aFutureHours,
      night: nEarnedHours + nFutureHours,
    };

    return {
      displayEarnings,
      displayHours,
      totalEarnings,
      totalHours,
      diffEarnings,
      diffHours,
      dayOfWeekData,
      timeOfDayData,
      monthlyTrendData,
      tooltipTotals,
      totalChartHours,
      mEarnedHours,
      mFutureHours,
      aEarnedHours,
      aFutureHours,
      nEarnedHours,
      nFutureHours
    };
  }, [shifts, subTab, selectedMonth]);
  const readWeekdayPayload = (state: unknown) => {
    const chartState = state as ChartClickState<DayOfWeekData> | undefined;
    const payload = chartState?.activePayload?.[0]?.payload;
    if (payload) return payload;

    if (chartState?.activeLabel) {
      return dayOfWeekData.find(day => day.name === chartState.activeLabel) ?? null;
    }

    return null;
  };

  const readMonthlyPayload = (state: unknown) => {
    const chartState = state as ChartClickState<MonthlyTrendData> | undefined;
    const payload = chartState?.activePayload?.[0]?.payload;
    if (payload) return payload;

    if (chartState?.activeLabel) {
      return monthlyTrendData.find(month => month.name === chartState.activeLabel) ?? null;
    }

    return null;
  };

  const readShapePayload = <T,>(data: unknown) => {
    return (data as ShapeClickData<T> | undefined)?.payload ?? null;
  };

  const readIndexedPayload = <T,>(event: React.MouseEvent<HTMLButtonElement>, items: T[]) => {
    const rect = event.currentTarget.getBoundingClientRect();
    if (items.length === 0 || rect.width <= 0) return null;

    const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width - 1);
    const index = Math.min(items.length - 1, Math.max(0, Math.floor((x / rect.width) * items.length)));

    return items[index] ?? null;
  };

  const shouldSuppressChartTap = () => Date.now() < suppressChartTapUntilRef.current;

  const toggleWeekday = (payload: DayOfWeekData) => {
    if (selectedWeekday?.name === payload.name) {
      setSelectedWeekday(null);
      return;
    }

    setActiveWeekday(payload);
    setSelectedWeekday(payload);
  };

  const handleWeekdayClick = (data: unknown) => {
    if (shouldSuppressChartTap()) return;
    const payload = readWeekdayPayload(data) ?? readShapePayload<DayOfWeekData>(data);
    if (!payload) return;
    toggleWeekday(payload);
  };

  const handleWeekdayTap = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (shouldSuppressChartTap()) return;
    const payload = readIndexedPayload(event, dayOfWeekData);
    if (payload) toggleWeekday(payload);
  };

  const toggleTrendMonth = (payload: MonthlyTrendData) => {
    if (selectedTrendMonth?.name === payload.name) {
      setSelectedTrendMonth(null);
      return;
    }

    setActiveTrendMonth(payload);
    setSelectedTrendMonth(payload);
  };

  const handleTrendMonthClick = (data: unknown) => {
    if (shouldSuppressChartTap()) return;
    const payload = readMonthlyPayload(data) ?? readShapePayload<MonthlyTrendData>(data);
    if (!payload) return;
    toggleTrendMonth(payload);
  };

  const handleTrendMonthTap = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (shouldSuppressChartTap()) return;
    const payload = readIndexedPayload(event, monthlyTrendData);
    if (payload) toggleTrendMonth(payload);
  };

  const toggleHoursMonth = (payload: MonthlyTrendData) => {
    if (selectedHoursMonth?.name === payload.name) {
      setSelectedHoursMonth(null);
      return;
    }

    setActiveHoursMonth(payload);
    setSelectedHoursMonth(payload);
  };

  const handleHoursMonthClick = (data: unknown) => {
    if (shouldSuppressChartTap()) return;
    let payload: MonthlyTrendData | null = null;
    if (data && typeof data === 'object' && 'totalHours' in data) {
      payload = data as MonthlyTrendData;
    } else {
      payload = readMonthlyPayload(data) ?? readShapePayload<MonthlyTrendData>(data);
    }

    if (!payload) return;
    toggleHoursMonth(payload);
  };

  const handleHoursMonthTap = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (shouldSuppressChartTap()) return;
    const payload = readIndexedPayload(event, monthlyTrendData);
    if (payload) toggleHoursMonth(payload);
  };

  const handleTimeOfDayTap = () => {
    if (shouldSuppressChartTap()) return;
    setIsTimeOfDayOpen(open => !open);
  };

  const renderHoursDot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: MonthlyTrendData }) => {
    if (cx === undefined || cy === undefined) return <></>;

    const isSelected = selectedHoursMonth?.name === payload?.name;

    return (
      <g style={{ cursor: "pointer", touchAction: "manipulation" }} onClick={(event) => { event.stopPropagation(); if (payload) toggleHoursMonth(payload); }}>
        <circle cx={cx} cy={cy} r={24} fill="transparent" />
        <circle
          cx={cx}
          cy={cy}
          r={isSelected ? 9 : 5}
          fill="var(--primary)"
          stroke="transparent"
        />
      </g>
    );
  };

  const renderActiveHoursDot = ({ cx, cy, payload }: { cx?: number; cy?: number; payload?: MonthlyTrendData }) => {
    if (cx === undefined || cy === undefined) return <></>;

    return (
      <g style={{ cursor: "pointer", touchAction: "manipulation" }} onClick={(event) => { event.stopPropagation(); if (payload) toggleHoursMonth(payload); }}>
        <circle cx={cx} cy={cy} r={24} fill="transparent" />
        <circle
          cx={cx}
          cy={cy}
          r={9}
          fill="var(--primary)"
          stroke="transparent"
        />
      </g>
    );
  };

  const clearSelections = () => {
    setSelectedWeekday(null);
    setIsTimeOfDayOpen(false);
    setSelectedTrendMonth(null);
    setSelectedHoursMonth(null);
  };

  const selectSubTab = (nextSubTab: 'monthly' | 'cumulative') => {
    setSubTab(nextSubTab);
    clearSelections();
  };

  const moveSelectedMonth = (nextMonth: Date) => {
    setSelectedMonth(nextMonth);
    clearSelections();
  };

  const handleMonthlySwipeStart = (event: React.TouchEvent<HTMLDivElement>) => {
    if (subTab !== 'monthly') return;

    const touch = event.touches[0];
    if (!touch) return;

    monthlySwipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleMonthlySwipeEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (subTab !== 'monthly' || !monthlySwipeStartRef.current) return;

    const touch = event.changedTouches[0];
    if (!touch) {
      monthlySwipeStartRef.current = null;
      return;
    }

    const deltaX = touch.clientX - monthlySwipeStartRef.current.x;
    const deltaY = touch.clientY - monthlySwipeStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    monthlySwipeStartRef.current = null;

    if (absX < 50 || absX < absY * 1.25) return;

    suppressChartTapUntilRef.current = Date.now() + 350;
    moveSelectedMonth(deltaX < 0 ? addMonths(selectedMonth, 1) : subMonths(selectedMonth, 1));
  };

  const handleMonthlySwipeCancel = () => {
    monthlySwipeStartRef.current = null;
  };

  return (
    <div
      onTouchStart={handleMonthlySwipeStart}
      onTouchEnd={handleMonthlySwipeEnd}
      onTouchCancel={handleMonthlySwipeCancel}
      style={{ display: 'flex', flexDirection: 'column', gap: '24px', touchAction: subTab === 'monthly' ? 'pan-y' : undefined }}
    >
      
      <div style={{ display: 'flex', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 'var(--radius-pill)', padding: '4px', border: '1px solid rgba(255, 255, 255, 0.03)' }}>
        <button
          onClick={() => selectSubTab('monthly')}
          style={{
            flex: 1, padding: '8px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '800', borderRadius: 'var(--radius-pill)',
            background: subTab === 'monthly' ? '#ffffff' : 'transparent',
            color: subTab === 'monthly' ? '#000000' : 'var(--text-muted)'
          }}
        >
          月ごと
        </button>
        <button
          onClick={() => selectSubTab('cumulative')}
          style={{
            flex: 1, padding: '8px 16px', textAlign: 'center', fontSize: '13px', fontWeight: '800', borderRadius: 'var(--radius-pill)',
            background: subTab === 'cumulative' ? '#ffffff' : 'transparent',
            color: subTab === 'cumulative' ? '#000000' : 'var(--text-muted)'
          }}
        >
          通算
        </button>
      </div>

      {subTab === 'monthly' && (
        <div className={styles.calendarHeader} style={{ background: 'var(--surface)', padding: '12px 16px', borderRadius: 'var(--radius-md)', marginBottom: 0 }}>
          <button onClick={() => moveSelectedMonth(subMonths(selectedMonth, 1))} className={styles.iconBtn}>
            <ChevronLeft size={20} />
          </button>
          <span>{format(selectedMonth, "yyyy年 M月", { locale: ja })}</span>
          <button onClick={() => moveSelectedMonth(addMonths(selectedMonth, 1))} className={styles.iconBtn}>
            <ChevronRight size={20} />
          </button>
        </div>
      )}

      <div className={styles.analysisGrid} style={{ marginBottom: 0 }}>
        <div className={styles.analysisCard}>
          <div className={styles.analysisCardLabel}>{subTab === 'monthly' ? '当月の総額' : '累計給与'}</div>
          <div className={styles.analysisCardValue}>
            ¥{subTab === 'monthly' ? totalEarnings.toLocaleString() : displayEarnings.toLocaleString()}
            {subTab === 'monthly' && (
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 'normal', marginTop: '4px' }}>
                {diffEarnings >= 0 ? '+' : ''}¥{diffEarnings.toLocaleString()}
              </div>
            )}
          </div>
        </div>
        <div className={styles.analysisCard}>
          <div className={styles.analysisCardLabel}>{subTab === 'monthly' ? '当月の総労働時間' : '累計労働時間'}</div>
          <div className={styles.analysisCardValue} style={{ color: 'var(--secondary)' }}>
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
        <div className={styles.chartTapTarget} style={{ height: 200 }}>
          <button
            type="button"
            aria-label="曜日別シフト回数を表示"
            className={styles.chartTapLayer}
            style={weekdayTapLayerStyle}
            onClick={handleWeekdayTap}
          />
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={dayOfWeekData} 
              margin={{ top: 10, right: 20, left: -20, bottom: 0 }} 
              onClick={handleWeekdayClick}
            >
              <defs>
                <linearGradient id="colorEarned" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1ED760" stopOpacity={0.95}/>
                  <stop offset="100%" stopColor="#1ED760" stopOpacity={0.4}/>
                </linearGradient>
                <linearGradient id="colorFuture" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1ED760" stopOpacity={0.5}/>
                  <stop offset="100%" stopColor="#1ED760" stopOpacity={0.15}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="name" tick={{ fill: "#b3b3b3", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#b3b3b3", fontSize: 11, fontWeight: 600 }} width={40} axisLine={false} tickLine={false} allowDecimals={false} />
              {!usesCompactCharts && <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip totals={tooltipTotals} />} />}
              {subTab === 'monthly' && !isViewingPastMonth ? (
                <>
                  <Bar
                    dataKey="earned"
                    name="確定"
                    stackId="a"
                    fill="url(#colorEarned)"
                    radius={dayOfWeekData.some(d => d.future > 0) ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="future"
                    name="予定"
                    stackId="a"
                    fill="url(#colorFuture)"
                    radius={[4, 4, 0, 0]}
                  />
                </>
              ) : (
                <Bar
                  dataKey="total"
                  name="シフト回数"
                  fill="url(#colorEarned)"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={`${styles.chartSummaryWrapper} ${selectedWeekday ? styles.open : ''}`}>
          <div className={styles.chartSummaryInner}>
            {activeWeekday && (
              <div className={styles.chartSummaryRow}>
                <span>{activeWeekday.name}曜</span>
                {subTab === 'monthly' && !isViewingPastMonth && <span>確定 {activeWeekday.earned}回</span>}
                {subTab === 'monthly' && !isViewingPastMonth && <span>予定 {activeWeekday.future}回</span>}
                <span>{subTab === 'monthly' && !isViewingPastMonth ? '合計' : 'シフト'} {activeWeekday.total}回</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.chartContainer} style={{ marginBottom: 0 }}>
        <h3 className={styles.chartTitle}>{subTab === 'monthly' ? '月間時間帯別シフト割合 (時間)' : '通算時間帯別シフト割合 (時間)'}</h3>
        {timeOfDayData.filter(d => !d.isSpacer).length > 0 ? (
          <div className={styles.chartTapTarget}>
            <button
              type="button"
              aria-label="時間帯別シフト時間を表示"
              className={styles.chartTapLayer}
              onClick={handleTimeOfDayTap}
            />
            <TimeOfDayPieChart
              timeOfDayData={timeOfDayData}
              usesCompactCharts={usesCompactCharts}
              tooltipTotals={tooltipTotals}
              totalChartHours={totalChartHours}
              mEarnedHours={mEarnedHours}
              mFutureHours={mFutureHours}
              aEarnedHours={aEarnedHours}
              aFutureHours={aFutureHours}
              nEarnedHours={nEarnedHours}
              nFutureHours={nFutureHours}
            />
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>データがありません</p>
        )}
        <div className={`${styles.chartSummaryWrapper} ${(timeOfDayData.filter(d => !d.isSpacer).length > 0 && isTimeOfDayOpen) ? styles.open : ''}`}>
          <div className={styles.chartSummaryInner}>
            <div className={styles.chartSummaryRow}>
              <span>午前 {tooltipTotals.morning.toFixed(1)}h</span>
              <span>午後 {tooltipTotals.afternoon.toFixed(1)}h</span>
              <span>夜間 {tooltipTotals.night.toFixed(1)}h</span>
            </div>
          </div>
        </div>
      </div>

      {subTab === 'monthly' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>過去６ヶ月推移</h3>
          <div className={styles.chartTapTarget} style={{ height: 250 }}>
            <button
              type="button"
              aria-label="過去六ヶ月推移を表示"
              className={styles.chartTapLayer}
              style={monthlyTrendTapLayerStyle}
              onClick={handleTrendMonthTap}
            />
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={monthlyTrendData} 
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }} 
                onClick={handleTrendMonthClick}
              >
                <defs>
                  <linearGradient id="trendNetEarned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.95}/>
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="trendNetFuture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#8B5CF6" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#8B5CF6" stopOpacity={0.15}/>
                  </linearGradient>
                  <linearGradient id="trendAllowanceEarned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1ED760" stopOpacity={0.95}/>
                    <stop offset="100%" stopColor="#1ED760" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="trendAllowanceFuture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1ED760" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#1ED760" stopOpacity={0.15}/>
                  </linearGradient>
                  <linearGradient id="trendDeductionEarned" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.95}/>
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.4}/>
                  </linearGradient>
                  <linearGradient id="trendDeductionFuture" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.5}/>
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0.15}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" tick={{ fill: "#b3b3b3", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#b3b3b3", fontSize: 11, fontWeight: 600 }} width={50} axisLine={false} tickLine={false} tickFormatter={(val) => val === 0 ? "0" : val >= 1000 ? `¥${val/1000}k` : `¥${val}`} />
                {!usesCompactCharts && <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} content={<CustomTooltip totals={tooltipTotals} />} />}
                <Legend content={() => (
                  <ul style={{ display: 'flex', justifyContent: 'center', listStyle: 'none', padding: 0, margin: 0, fontSize: '11px', gap: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#8B5CF6' }}></span>手取り</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#1ED760' }}></span>手当</li>
                    <li style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: '#EF4444' }}></span>天引き</li>
                  </ul>
                )} />
                <Bar dataKey="netBaseEarned" name="手取り(確定)" stackId="a" fill="url(#trendNetEarned)" />
                <Bar dataKey="allowanceEarned" name="手当(確定)" stackId="a" fill="url(#trendAllowanceEarned)" />
                <Bar dataKey="deductionEarned" name="天引き(確定)" stackId="a" fill="url(#trendDeductionEarned)" radius={monthlyTrendData.some(d => d.netBaseFuture > 0 || d.allowanceFuture > 0 || d.deductionFuture > 0) ? [0, 0, 0, 0] : [4, 4, 0, 0]} />
                <Bar dataKey="netBaseFuture" name="手取り(予定)" stackId="a" fill="url(#trendNetFuture)" />
                <Bar dataKey="allowanceFuture" name="手当(予定)" stackId="a" fill="url(#trendAllowanceFuture)" />
                <Bar dataKey="deductionFuture" name="天引き(予定)" stackId="a" fill="url(#trendDeductionFuture)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={`${styles.chartSummaryWrapper} ${selectedTrendMonth ? styles.open : ''}`}>
            <div className={styles.chartSummaryInner}>
              {activeTrendMonth && (
                <div className={styles.chartSummaryRow}>
                  <span>{activeTrendMonth.name}</span>
                  <span>手取り ¥{((activeTrendMonth.netBaseEarned ?? 0) + (activeTrendMonth.netBaseFuture ?? 0)).toLocaleString()}</span>
                  <span>手当 ¥{((activeTrendMonth.allowanceEarned ?? 0) + (activeTrendMonth.allowanceFuture ?? 0)).toLocaleString()}</span>
                  <span>天引き ¥{((activeTrendMonth.deductionEarned ?? 0) + (activeTrendMonth.deductionFuture ?? 0)).toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {subTab === 'cumulative' && (
        <div className={styles.chartContainer}>
          <h3 className={styles.chartTitle}>過去６ヶ月 労働時間推移</h3>
          <div className={styles.chartTapTarget} style={{ height: 250 }}>
            <button
              type="button"
              aria-label="過去六ヶ月の労働時間を表示"
              className={styles.chartTapLayer}
              style={monthlyTrendTapLayerStyle}
              onClick={handleHoursMonthTap}
            />
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                onClick={handleHoursMonthClick}
              >
                <XAxis dataKey="name" tick={{ fill: "#a0a0a0", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#a0a0a0", fontSize: 12 }} width={40} axisLine={false} tickLine={false} />
                {!usesCompactCharts && <Tooltip cursor={{ stroke: 'transparent', fill: 'transparent' }} content={<CustomTooltip totals={tooltipTotals} />} />}
                <Line
                  type="linear"
                  dataKey="totalHours"
                  name="労働時間"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={renderHoursDot}
                  activeDot={renderActiveHoursDot}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={`${styles.chartSummaryWrapper} ${selectedHoursMonth ? styles.open : ''}`}>
            <div className={styles.chartSummaryInner}>
              {activeHoursMonth && (
                <div className={styles.chartSummaryRow}>
                  <span>{activeHoursMonth.name}</span>
                  <span>労働時間 {(activeHoursMonth.totalHours ?? 0).toFixed(1)}h</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
