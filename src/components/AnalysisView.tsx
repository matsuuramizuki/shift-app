import React, { useCallback, useEffect, useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from "recharts";
import styles from "@/app/page.module.css";
import type { Shift } from "@/lib/store";
import { calculateShiftSalary, timeToMinutes } from "@/lib/calc";
import { useHorizontalSwipe } from "@/lib/useHorizontalSwipe";
import { format, subMonths, addMonths, parseISO, getDay, isSameMonth } from "date-fns";
import { MonthSwitcher } from "./MonthSwitcher";
import { StatCard } from "./StatCard";

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

interface TimeOfDayTotals {
  morning: number;
  afternoon: number;
  night: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
  totals: TimeOfDayTotals;
}

const TREND_LEGEND = [
  { label: '手取り', color: '#6C5CE7' },
  { label: '手当', color: '#00C48C' },
  { label: '天引き', color: '#FF4757' },
];

/** Pull the clicked item out of a Recharts click event (chart-level or shape-level). */
function readChartPayload<T extends { name: string }>(state: unknown, items: T[]): T | null {
  const chartState = state as ChartClickState<T> | undefined;
  const payload = chartState?.activePayload?.[0]?.payload;
  if (payload) return payload;

  if (chartState?.activeLabel) {
    return items.find(item => item.name === chartState.activeLabel) ?? null;
  }

  return (state as ShapeClickData<T> | undefined)?.payload ?? null;
}

/** Map a tap on the invisible overlay button to the item under the finger. */
function readIndexedPayload<T>(event: React.MouseEvent<HTMLButtonElement>, items: T[]) {
  const rect = event.currentTarget.getBoundingClientRect();
  if (items.length === 0 || rect.width <= 0) return null;

  const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width - 1);
  const index = Math.min(items.length - 1, Math.max(0, Math.floor((x / rect.width) * items.length)));

  return items[index] ?? null;
}

/**
 * Tapping an item selects it; tapping it again deselects it.
 * `shown` keeps the last selection so the summary can animate closed with its content.
 */
function useChartSelection<T extends { name: string }>() {
  const [selected, setSelected] = useState<T | null>(null);
  const [shown, setShown] = useState<T | null>(null);

  const toggle = (item: T) => {
    if (selected?.name === item.name) {
      setSelected(null);
      return;
    }

    setShown(item);
    setSelected(item);
  };

  const clear = useCallback(() => setSelected(null), []);

  return { selected, shown, toggle, clear };
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
  const startMins = timeToMinutes(sTime);
  let endMins = timeToMinutes(eTime);
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
}: {
  timeOfDayData: TimeOfDayData[];
  usesCompactCharts: boolean;
  tooltipTotals: TimeOfDayTotals;
  totalChartHours: number;
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
            const catTotal = cleanName === '午前' ? tooltipTotals.morning : cleanName === '午後' ? tooltipTotals.afternoon : tooltipTotals.night;
            const catPercent = catTotal / totalChartHours;
            return (
              <text
                x={x}
                y={y}
                fill="var(--text-main)"
                stroke="var(--surface)"
                strokeWidth={3}
                paintOrder="stroke"
                fontSize={10}
                fontWeight="bold"
                textAnchor={textAnchor}
                dominantBaseline="central"
                style={{ pointerEvents: 'none' }}
              >
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
  const [isTimeOfDayOpen, setIsTimeOfDayOpen] = useState(false);
  const weekdaySelection = useChartSelection<DayOfWeekData>();
  const trendSelection = useChartSelection<MonthlyTrendData>();
  const hoursSelection = useChartSelection<MonthlyTrendData>();
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

    const monthlyTrendData: MonthlyTrendData[] = [];
    const trendByMonth = new Map<string, MonthlyTrendData>();

    for (let i = 5; i >= 0; i--) {
      const targetMonth = subMonths(now, i);
      const trend: MonthlyTrendData = {
        name: format(targetMonth, "M月"),
        netBaseEarned: 0,
        allowanceEarned: 0,
        deductionEarned: 0,
        netBaseFuture: 0,
        allowanceFuture: 0,
        deductionFuture: 0,
        totalHours: 0,
      };
      monthlyTrendData.push(trend);
      trendByMonth.set(format(targetMonth, "yyyy-MM"), trend);
    }

    for (const s of shifts) {
      const d = parseISO(s.date);
      const isTarget = subTab === 'cumulative' || isSameMonth(d, selectedMonth);
      const isPrevMonth = subTab === 'monthly' && isSameMonth(d, subMonths(selectedMonth, 1));
      const past = isPast(s.date);
      const isTentativeForecast = !past && Boolean(s.isTentative);
      let calculation: ReturnType<typeof calculateShiftSalary> | null = null;
      const getCalculation = () => calculation ??= calculateShiftSalary(s);

      const trend = trendByMonth.get(s.date.slice(0, 7));
      if (trend && !isTentativeForecast) {
        const { hours } = getCalculation();
        const allowance = s.allowance || 0;
        const deduction = s.deduction || 0;
        const netBase = Math.max(0, Math.floor(hours * s.hourlyWage) - deduction);
        trend.totalHours += hours;

        if (past) {
          trend.netBaseEarned += netBase;
          trend.allowanceEarned += allowance;
          trend.deductionEarned += deduction;
        } else {
          trend.netBaseFuture += netBase;
          trend.allowanceFuture += allowance;
          trend.deductionFuture += deduction;
        }
      }

      if (isPrevMonth) {
        const { salary, hours } = getCalculation();
        prevMonthEarnings += salary;
        prevMonthHours += hours;
      }

      if (isTarget && (subTab !== 'cumulative' || past) && !isTentativeForecast) {
        const { salary, hours } = getCalculation();
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
    }

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

    addGroup(mEarnedHours, mFutureHours, '午前', '#FF8A00');
    addGroup(aEarnedHours, aFutureHours, '午後', '#00C48C');
    addGroup(nEarnedHours, nFutureHours, '夜間', '#6C5CE7');

    const dayOfWeekData: DayOfWeekData[] = dayNames.map((name, i) => ({
      name,
      earned: dayOfWeekEarnedCounts[i],
      future: dayOfWeekFutureCounts[i],
      total: dayOfWeekEarnedCounts[i] + dayOfWeekFutureCounts[i],
    }));

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
    };
  }, [shifts, subTab, selectedMonth]);
  const hasTimeOfDayData = timeOfDayData.some(data => !data.isSpacer);
  const hasFutureTrendData = monthlyTrendData.some(data => data.netBaseFuture > 0 || data.allowanceFuture > 0 || data.deductionFuture > 0);
  const handleMonthSwipe = (direction: "next" | "prev") => {
    moveSelectedMonth(direction === "next" ? addMonths(selectedMonth, 1) : subMonths(selectedMonth, 1));
  };
  const { handlers: monthlySwipeHandlers, isClickSuppressed } = useHorizontalSwipe(handleMonthSwipe, subTab === 'monthly');

  /** Builds the click (desktop) and tap-overlay (touch) handlers for one chart. */
  const chartHandlers = <T extends { name: string }>(items: T[], toggle: (item: T) => void, readDirect?: (data: unknown) => T | null) => ({
    onChartClick: (data: unknown) => {
      if (isClickSuppressed()) return;
      const payload = readDirect?.(data) ?? readChartPayload(data, items);
      if (payload) toggle(payload);
    },
    onTap: (event: React.MouseEvent<HTMLButtonElement>) => {
      if (isClickSuppressed()) return;
      const payload = readIndexedPayload(event, items);
      if (payload) toggle(payload);
    },
  });

  const weekdayHandlers = chartHandlers(dayOfWeekData, weekdaySelection.toggle);
  const trendHandlers = chartHandlers(monthlyTrendData, trendSelection.toggle);
  const hoursHandlers = chartHandlers(monthlyTrendData, hoursSelection.toggle, data =>
    data && typeof data === 'object' && 'totalHours' in data ? data as MonthlyTrendData : null
  );

  const handleTimeOfDayTap = () => {
    if (isClickSuppressed()) return;
    setIsTimeOfDayOpen(open => !open);
  };

  const renderHoursDot = (alwaysLarge: boolean) => function HoursDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: MonthlyTrendData }) {
    if (cx === undefined || cy === undefined) return <></>;

    const isLarge = alwaysLarge || hoursSelection.selected?.name === payload?.name;

    return (
      <g style={{ cursor: "pointer", touchAction: "manipulation" }} onClick={(event) => { event.stopPropagation(); if (payload) hoursSelection.toggle(payload); }}>
        <circle cx={cx} cy={cy} r={24} fill="transparent" />
        <circle cx={cx} cy={cy} r={isLarge ? 9 : 5} fill="var(--primary)" stroke="transparent" />
      </g>
    );
  };

  function clearSelections() {
    weekdaySelection.clear();
    setIsTimeOfDayOpen(false);
    trendSelection.clear();
    hoursSelection.clear();
  }

  const selectSubTab = (nextSubTab: 'monthly' | 'cumulative') => {
    setSubTab(nextSubTab);
    clearSelections();
  };

  const moveSelectedMonth = (nextMonth: Date) => {
    setSelectedMonth(nextMonth);
    clearSelections();
  };

  return (
    <div
      {...monthlySwipeHandlers}
      className={styles.analysisView}
      style={{ touchAction: subTab === 'monthly' ? 'pan-y' : undefined }}
    >
      
      <div className={styles.segmented} role="tablist" aria-label="集計期間">
        <span aria-hidden="true" className={`${styles.segmentedIndicator} ${subTab === 'cumulative' ? styles.segmentedIndicatorRight : ''}`} />
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'monthly'}
          onClick={() => selectSubTab('monthly')}
          className={`${styles.segmentedBtn} ${subTab === 'monthly' ? styles.segmentedBtnActive : ''}`}
        >
          月ごと
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subTab === 'cumulative'}
          onClick={() => selectSubTab('cumulative')}
          className={`${styles.segmentedBtn} ${subTab === 'cumulative' ? styles.segmentedBtnActive : ''}`}
        >
          通算
        </button>
      </div>

      {subTab === 'monthly' && (
        <MonthSwitcher month={selectedMonth} onChange={moveSelectedMonth} className={styles.monthSwitcher} />
      )}

      <div className={styles.analysisGrid}>
        <StatCard
          label={subTab === 'monthly' ? '当月の総額' : '累計給与'}
          value={`¥${(subTab === 'monthly' ? totalEarnings : displayEarnings).toLocaleString()}`}
          detail={subTab === 'monthly' && `${diffEarnings >= 0 ? '+' : ''}¥${diffEarnings.toLocaleString()}`}
        />
        <StatCard
          label={subTab === 'monthly' ? '当月の総労働時間' : '累計労働時間'}
          value={<>{(subTab === 'monthly' ? totalHours : displayHours).toFixed(1)}<span className={styles.valueUnit}>h</span></>}
          valueStyle={{ color: 'var(--secondary)' }}
          detail={subTab === 'monthly' && `${diffHours >= 0 ? '+' : ''}${diffHours.toFixed(1)}h`}
        />
      </div>

      <div className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>{subTab === 'monthly' ? '月間曜日別シフト回数' : '通算曜日別シフト回数'}</h3>
        <div className={styles.chartTapTarget} style={{ height: 200 }}>
          <button
            type="button"
            aria-label="曜日別シフト回数を表示"
            className={styles.chartTapLayer}
            style={weekdayTapLayerStyle}
            onClick={weekdayHandlers.onTap}
          />
          <ResponsiveContainer width="100%" height="100%">
            <BarChart 
              data={dayOfWeekData} 
              margin={{ top: 10, right: 20, left: -20, bottom: 0 }} 
              onClick={weekdayHandlers.onChartClick}
            >
              <XAxis dataKey="name" tick={{ fill: "var(--chart-axis)", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 11, fontWeight: 600 }} width={40} axisLine={false} tickLine={false} allowDecimals={false} />
              {!usesCompactCharts && <Tooltip cursor={{ fill: 'var(--chart-cursor)' }} content={<CustomTooltip totals={tooltipTotals} />} />}
              {subTab === 'monthly' && !isViewingPastMonth ? (
                <>
                  <Bar
                    dataKey="earned"
                    name="確定"
                    stackId="a"
                    fill="var(--primary)"
                    radius={dayOfWeekData.some(d => d.future > 0) ? [0, 0, 0, 0] : [4, 4, 0, 0]}
                  />
                  <Bar
                    dataKey="future"
                    name="予定"
                    stackId="a"
                    fill="var(--primary)"
                    fillOpacity={0.5}
                    radius={[4, 4, 0, 0]}
                  />
                </>
              ) : (
                <Bar
                  dataKey="total"
                  name="シフト回数"
                  fill="var(--primary)"
                  radius={[4, 4, 0, 0]}
                />
              )}
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className={`${styles.chartSummaryWrapper} ${weekdaySelection.selected ? styles.open : ''}`}>
          <div className={styles.chartSummaryInner}>
            {weekdaySelection.shown && (
              <div className={styles.chartSummaryRow}>
                <span>{weekdaySelection.shown.name}曜</span>
                {subTab === 'monthly' && !isViewingPastMonth && <span>確定 {weekdaySelection.shown.earned}回</span>}
                {subTab === 'monthly' && !isViewingPastMonth && <span>予定 {weekdaySelection.shown.future}回</span>}
                <span>{subTab === 'monthly' && !isViewingPastMonth ? '合計' : 'シフト'} {weekdaySelection.shown.total}回</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <h3 className={styles.chartTitle}>{subTab === 'monthly' ? '月間時間帯別シフト割合 (時間)' : '通算時間帯別シフト割合 (時間)'}</h3>
        {hasTimeOfDayData ? (
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
            />
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>データがありません</p>
        )}
        <div className={`${styles.chartSummaryWrapper} ${(hasTimeOfDayData && isTimeOfDayOpen) ? styles.open : ''}`}>
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
              onClick={trendHandlers.onTap}
            />
            <ResponsiveContainer width="100%" height="100%">
              <BarChart 
                data={monthlyTrendData} 
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }} 
                onClick={trendHandlers.onChartClick}
              >
                <XAxis dataKey="name" tick={{ fill: "var(--chart-axis)", fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 11, fontWeight: 600 }} width={50} axisLine={false} tickLine={false} tickFormatter={(val) => val === 0 ? "0" : val >= 1000 ? `¥${val/1000}k` : `¥${val}`} />
                {!usesCompactCharts && <Tooltip cursor={{ fill: 'var(--chart-cursor)' }} content={<CustomTooltip totals={tooltipTotals} />} />}
                <Legend content={() => (
                  <ul style={{ display: 'flex', justifyContent: 'center', listStyle: 'none', padding: 0, margin: 0, fontSize: '11px', gap: '16px', fontWeight: 600, color: 'var(--text-muted)' }}>
                    {TREND_LEGEND.map(({ label, color }) => (
                      <li key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: color }} />
                        {label}
                      </li>
                    ))}
                  </ul>
                )} />
                <Bar dataKey="netBaseEarned" name="手取り(確定)" stackId="a" fill="#6C5CE7" />
                <Bar dataKey="allowanceEarned" name="手当(確定)" stackId="a" fill="#00C48C" />
                <Bar dataKey="deductionEarned" name="天引き(確定)" stackId="a" fill="#FF4757" radius={hasFutureTrendData ? [0, 0, 0, 0] : [6, 6, 0, 0]} />
                <Bar dataKey="netBaseFuture" name="手取り(予定)" stackId="a" fill="#6C5CE7" fillOpacity={0.5} />
                <Bar dataKey="allowanceFuture" name="手当(予定)" stackId="a" fill="#00C48C" fillOpacity={0.5} />
                <Bar dataKey="deductionFuture" name="天引き(予定)" stackId="a" fill="#FF4757" fillOpacity={0.5} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className={`${styles.chartSummaryWrapper} ${trendSelection.selected ? styles.open : ''}`}>
            <div className={styles.chartSummaryInner}>
              {trendSelection.shown && (
                <div className={styles.chartSummaryRow}>
                  <span>{trendSelection.shown.name}</span>
                  <span>手取り ¥{((trendSelection.shown.netBaseEarned ?? 0) + (trendSelection.shown.netBaseFuture ?? 0)).toLocaleString()}</span>
                  <span>手当 ¥{((trendSelection.shown.allowanceEarned ?? 0) + (trendSelection.shown.allowanceFuture ?? 0)).toLocaleString()}</span>
                  <span>天引き ¥{((trendSelection.shown.deductionEarned ?? 0) + (trendSelection.shown.deductionFuture ?? 0)).toLocaleString()}</span>
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
              onClick={hoursHandlers.onTap}
            />
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={monthlyTrendData}
                margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
                onClick={hoursHandlers.onChartClick}
              >
                <XAxis dataKey="name" tick={{ fill: "var(--chart-axis)", fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "var(--chart-axis)", fontSize: 12 }} width={40} axisLine={false} tickLine={false} />
                {!usesCompactCharts && <Tooltip cursor={{ stroke: 'transparent', fill: 'transparent' }} content={<CustomTooltip totals={tooltipTotals} />} />}
                <Line
                  type="linear"
                  dataKey="totalHours"
                  name="労働時間"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={renderHoursDot(false)}
                  activeDot={renderHoursDot(true)}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className={`${styles.chartSummaryWrapper} ${hoursSelection.selected ? styles.open : ''}`}>
            <div className={styles.chartSummaryInner}>
              {hoursSelection.shown && (
                <div className={styles.chartSummaryRow}>
                  <span>{hoursSelection.shown.name}</span>
                  <span>労働時間 {(hoursSelection.shown.totalHours ?? 0).toFixed(1)}h</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
