"use client";

import React, { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { addMonths, format, subMonths } from "date-fns";
import { Settings as SettingsIcon, Home as HomeIcon, BarChart2, CalendarDays } from "lucide-react";
import styles from "./page.module.css";
import { useStore } from "@/lib/store";
import { useHorizontalSwipe } from "@/lib/useHorizontalSwipe";

import { Calendar } from "@/components/Calendar";
import { SummaryCards } from "@/components/SummaryCards";
import { UpcomingShifts } from "@/components/UpcomingShifts";
import { ShiftModal } from "@/components/ShiftModal";
import { SettingsModal } from "@/components/SettingsModal";

const AnalysisView = dynamic(
  () => import("@/components/AnalysisView").then(module => module.AnalysisView),
  { loading: () => <div className={styles.analysisLoading}>分析データを読み込んでいます…</div> }
);

type Tab = 'home' | 'analysis';

const NAV_ITEMS = [
  { tab: 'home', label: 'ホーム', Icon: HomeIcon },
  { tab: 'analysis', label: '分析', Icon: BarChart2 },
] as const;

function getGreeting() {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return "おはようございます";
  if (hour >= 12 && hour < 18) return "こんにちは";
  return "こんばんは";
}

export default function Home() {
  const { user, settings, shifts, isLoaded, saveSettings, saveShift, deleteShift, signInWithGoogle, signOut } = useStore();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  // Modals state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<Tab>('home');
  const isHome = activeTab === 'home';

  const selectedShift = useMemo(() => selectedDate
    ? shifts.find(shift => shift.date === format(selectedDate, "yyyy-MM-dd"))
    : undefined,
  [selectedDate, shifts]);
  const greeting = useMemo(() => getGreeting(), []);

  const handleHomeSwipe = useCallback((direction: "next" | "prev") => {
    setCurrentDate(date => direction === "next" ? addMonths(date, 1) : subMonths(date, 1));
  }, []);
  const { handlers: homeSwipeHandlers, isClickSuppressed } = useHorizontalSwipe(handleHomeSwipe);

  const setHomeMonth = useCallback((date: Date) => {
    if (!isClickSuppressed()) setCurrentDate(date);
  }, [isClickSuppressed]);

  const handleDateClick = useCallback((date: Date) => {
    if (!isClickSuppressed()) setSelectedDate(date);
  }, [isClickSuppressed]);

  if (!isLoaded) {
    return <div className={styles.loadingState}>シフトを読み込んでいます…</div>;
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loginCard}>
          <div className={styles.loginIcon}><CalendarDays size={28} /></div>
          <h1>シフト管理</h1>
          <p>勤務予定と給与を、ひとつのカレンダーで。</p>
          <button className={styles.btnPrimary} onClick={signInWithGoogle}>
            Googleでログイン
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.headerViewingArea}>
          <div className={styles.headerTopRow}>
            <span className={styles.headerYearLabel}>
              {isHome ? format(currentDate, "yyyy年") : "シフト管理"}
            </span>
            <button className={styles.iconBtn} aria-label="設定を開く" onClick={() => setIsSettingsOpen(true)}>
              <SettingsIcon size={20} />
            </button>
          </div>
          <h1 key={isHome ? format(currentDate, "yyyy-MM") : 'analysis'} className={styles.title}>
            {isHome ? format(currentDate, "M月") : "勤務分析"}
          </h1>
          <p className={styles.headerSubtitle}>
            {isHome ? greeting : "シフトの統計・給与推移"}
          </p>
        </div>
      </header>

      {isHome ? (
        <div className={styles.homeSwipeArea} {...homeSwipeHandlers}>
          <SummaryCards currentDate={currentDate} shifts={shifts} />

          <Calendar
            currentDate={currentDate}
            setCurrentDate={setHomeMonth}
            shifts={shifts}
            settings={settings}
            onDateClick={handleDateClick}
          />

          <UpcomingShifts shifts={shifts} />
        </div>
      ) : (
        <AnalysisView shifts={shifts} />
      )}

      {/* Modals */}
      {selectedDate && (
        <ShiftModal
          date={selectedDate}
          shift={selectedShift}
          settings={settings}
          onClose={() => setSelectedDate(null)}
          onSave={saveShift}
          onDelete={deleteShift}
        />
      )}

      {isSettingsOpen && (
        <SettingsModal
          userId={user.id}
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={saveSettings}
          onSignOut={signOut}
        />
      )}

      {/* Bottom Navigation */}
      <nav className={styles.bottomNav} aria-label="メインメニュー">
        <span aria-hidden="true" className={`${styles.navIndicator} ${isHome ? '' : styles.navIndicatorRight}`} />
        {NAV_ITEMS.map(({ tab, label, Icon }) => (
          <button
            key={tab}
            className={`${styles.navItem} ${activeTab === tab ? styles.active : ''}`}
            aria-current={activeTab === tab ? 'page' : undefined}
            onClick={() => setActiveTab(tab)}
          >
            <Icon size={20} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
