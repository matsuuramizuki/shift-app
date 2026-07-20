"use client";

import React, { useRef, useState } from "react";
import { addMonths, format, subMonths, parseISO } from "date-fns";
import { ja } from "date-fns/locale";
import { Settings as SettingsIcon, Home as HomeIcon, BarChart2, ChevronRight, CalendarDays } from "lucide-react";
import styles from "./page.module.css";
import { useStore } from "@/lib/store";

import { Calendar } from "@/components/Calendar";
import { SummaryCards } from "@/components/SummaryCards";
import { UpcomingShifts } from "@/components/UpcomingShifts";
import { AnalysisView } from "@/components/AnalysisView";
import { ShiftModal } from "@/components/ShiftModal";
import { SettingsModal } from "@/components/SettingsModal";


export default function Home() {
  const { user, settings, shifts, isLoaded, saveSettings, saveShift, deleteShift, signInWithGoogle, signOut } = useStore();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Modals state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'home' | 'analysis'>('home');
  const homeSwipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const suppressHomeClickUntilRef = useRef(0);

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

  const selectedShift = selectedDate 
    ? shifts.find(s => s.date === format(selectedDate, "yyyy-MM-dd")) 
    : undefined;

  const shouldSuppressHomeClick = () => Date.now() < suppressHomeClickUntilRef.current;

  const setHomeMonth = (date: Date) => {
    if (shouldSuppressHomeClick()) return;
    setCurrentDate(date);
  };

  const moveHomeMonth = (date: Date) => {
    setCurrentDate(date);
  };

  const handleHomeSwipeStart = (event: React.TouchEvent<HTMLDivElement>) => {
    const touch = event.touches[0];
    if (!touch) return;

    homeSwipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
    };
  };

  const handleHomeSwipeEnd = (event: React.TouchEvent<HTMLDivElement>) => {
    if (!homeSwipeStartRef.current) return;

    const touch = event.changedTouches[0];
    if (!touch) {
      homeSwipeStartRef.current = null;
      return;
    }

    const deltaX = touch.clientX - homeSwipeStartRef.current.x;
    const deltaY = touch.clientY - homeSwipeStartRef.current.y;
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    homeSwipeStartRef.current = null;

    if (absX < 50 || absX < absY * 1.25) return;

    suppressHomeClickUntilRef.current = Date.now() + 350;
    if (event.cancelable) event.preventDefault();
    moveHomeMonth(deltaX < 0 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
  };

  const handleHomeSwipeCancel = () => {
    homeSwipeStartRef.current = null;
  };

  // Dynamic greetings based on current time
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "おはようございます";
    if (hour >= 12 && hour < 18) return "こんにちは";
    return "こんばんは";
  };

  // Find active or next upcoming shift
  const getActiveOrNextShift = () => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const eligible = shifts
      .map(s => {
        const [sh, sm] = s.startTime.split(':').map(Number);
        const [eh, em] = s.endTime.split(':').map(Number);
        const startMins = sh * 60 + sm;
        let endMins = eh * 60 + em;
        if (endMins < startMins) endMins += 24 * 60; // overnight
        return { ...s, startMins, endMins };
      })
      .filter(s => {
        if (s.date > todayStr) return true;
        if (s.date === todayStr) {
          return currentMins < s.endMins;
        }
        return false;
      })
      .sort((a, b) => a.date.localeCompare(b.date) || a.startMins - b.startMins);

    if (eligible.length === 0) return null;

    const candidate = eligible[0];
    const isCurrent = candidate.date === todayStr && currentMins >= candidate.startMins && currentMins <= candidate.endMins;
    return { shift: candidate, isCurrent };
  };

  const activeOrNext = getActiveOrNextShift();
  const greeting = getGreeting();
  const userInitial = user.email ? user.email[0].toUpperCase() : "U";

  return (
    <div className={styles.container}>
      {/* Soft ambient background */}
      <div className={styles.gradientBg} />

      <header className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.userAvatar} title={user.email || "ユーザー"}>
            {userInitial}
          </div>
          <h1 className={styles.title}>{activeTab === 'home' ? greeting : "分析"}</h1>
        </div>
        <button className={styles.iconBtn} aria-label="設定を開く" onClick={() => setIsSettingsOpen(true)}>
          <SettingsIcon size={20} />
        </button>
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
            onDateClick={(date) => {
              if (shouldSuppressHomeClick()) return;
              setSelectedDate(date);
            }}
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

      {/* Sticky Now Playing Shift Bar */}
      {activeOrNext && (
        <div 
          className={styles.nowPlayingBar}
          onClick={() => {
            setSelectedDate(parseISO(activeOrNext.shift.date));
          }}
        >
          <div className={styles.nowPlayingContent}>
            <div className={styles.nowPlayingArt}>
              <span className={styles.nowPlayingArtIcon}>🍞</span>
            </div>
            <div className={styles.nowPlayingInfo}>
              <div className={styles.nowPlayingTitle}>
                {activeOrNext.isCurrent ? "現在勤務中" : "次のシフト"}
                {activeOrNext.shift.isTentative && <span className={styles.nowPlayingBadge}>仮</span>}
              </div>
              <div className={styles.nowPlayingSubtitle}>
                {format(parseISO(activeOrNext.shift.date), "M月d日(E)", { locale: ja })} {activeOrNext.shift.startTime} - {activeOrNext.shift.endTime}
              </div>
            </div>
            <button 
              className={styles.nowPlayingBtn}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedDate(parseISO(activeOrNext.shift.date));
              }}
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className={styles.nowPlayingProgressBg}>
            <div 
              className={styles.nowPlayingProgressBar} 
              style={{ 
                width: activeOrNext.isCurrent 
                  ? `${Math.min(100, Math.max(0, ((new Date().getHours() * 60 + new Date().getMinutes() - activeOrNext.shift.startMins) / (activeOrNext.shift.endMins - activeOrNext.shift.startMins)) * 100))}%`
                  : '0%' 
              }} 
            />
          </div>
        </div>
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
