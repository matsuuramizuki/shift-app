"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { addMonths, format, subMonths } from "date-fns";
import { Settings as SettingsIcon, Home as HomeIcon, BarChart2, CalendarDays } from "lucide-react";
import styles from "./page.module.css";
import { useStore } from "@/lib/store";

import { Calendar } from "@/components/Calendar";
import { SummaryCards } from "@/components/SummaryCards";
import { UpcomingShifts } from "@/components/UpcomingShifts";
import { ShiftModal } from "@/components/ShiftModal";
import { SettingsModal } from "@/components/SettingsModal";

const AnalysisView = dynamic(
  () => import("@/components/AnalysisView").then(module => module.AnalysisView),
  { loading: () => <div className={styles.analysisLoading}>分析データを読み込んでいます…</div> }
);

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
  
  const [activeTab, setActiveTab] = useState<'home' | 'analysis'>('home');
  const homeSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressHomeClickUntilRef = useRef(0);

  const selectedShift = useMemo(() => selectedDate
    ? shifts.find(shift => shift.date === format(selectedDate, "yyyy-MM-dd"))
    : undefined,
  [selectedDate, shifts]);
  const greeting = useMemo(() => getGreeting(), []);

  const shouldSuppressHomeClick = useCallback(
    () => Date.now() < suppressHomeClickUntilRef.current,
    []
  );

  const setHomeMonth = useCallback((date: Date) => {
    if (!shouldSuppressHomeClick()) setCurrentDate(date);
  }, [shouldSuppressHomeClick]);

  const handleDateClick = useCallback((date: Date) => {
    if (!shouldSuppressHomeClick()) setSelectedDate(date);
  }, [shouldSuppressHomeClick]);

  const handleHomeSwipeStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (touch) homeSwipeStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleHomeSwipeEnd = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const start = homeSwipeStartRef.current;
    homeSwipeStartRef.current = null;
    if (!start) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;

    suppressHomeClickUntilRef.current = Date.now() + 350;
    if (event.cancelable) event.preventDefault();
    setCurrentDate(date => deltaX < 0 ? addMonths(date, 1) : subMonths(date, 1));
  }, []);

  const handleHomeSwipeCancel = useCallback(() => {
    homeSwipeStartRef.current = null;
  }, []);

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
      {/* Soft ambient background */}
      <div className={styles.gradientBg} />

      <header className={styles.header}>
        <div className={styles.headerViewingArea}>
          <div className={styles.headerTopRow}>
            <span className={styles.headerYearLabel}>
              {activeTab === 'home' ? format(currentDate, "yyyy年") : "シフト管理"}
            </span>
            <button className={styles.iconBtn} aria-label="設定を開く" onClick={() => setIsSettingsOpen(true)}>
              <SettingsIcon size={20} />
            </button>
          </div>
          <h1 className={styles.title}>
            {activeTab === 'home' ? format(currentDate, "M月") : "勤務分析"}
          </h1>
          <p className={styles.headerSubtitle}>
            {activeTab === 'home' ? greeting : "シフトの統計・給与推移"}
          </p>
        </div>
      </header>

      {activeTab === 'home' ? (
        <div
          className={styles.homeSwipeArea}
          onTouchStart={handleHomeSwipeStart}
          onTouchEnd={handleHomeSwipeEnd}
          onTouchCancel={handleHomeSwipeCancel}
        >
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
        <button 
          className={`${styles.navItem} ${activeTab === 'home' ? styles.active : ''}`}
          aria-current={activeTab === 'home' ? 'page' : undefined}
          onClick={() => setActiveTab('home')}
        >
          <HomeIcon size={20} />
          <span>ホーム</span>
        </button>
        <button 
          className={`${styles.navItem} ${activeTab === 'analysis' ? styles.active : ''}`}
          aria-current={activeTab === 'analysis' ? 'page' : undefined}
          onClick={() => setActiveTab('analysis')}
        >
          <BarChart2 size={20} />
          <span>分析</span>
        </button>
      </nav>
    </div>
  );
}
