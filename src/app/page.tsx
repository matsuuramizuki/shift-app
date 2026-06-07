"use client";

import React, { useRef, useState } from "react";
import { addMonths, format, subMonths } from "date-fns";
import { Settings as SettingsIcon, Home as HomeIcon, BarChart2 } from "lucide-react";
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
    return <div className={styles.container}>Loading...</div>;
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <div className={styles.loginCard}>
          <h1>Shift App</h1>
          <p>シフト情報をクラウドで安全に管理</p>
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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>Shifts</div>
        <button className={styles.iconBtn} onClick={() => setIsSettingsOpen(true)}>
          <SettingsIcon size={24} />
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

      {/* Bottom Navigation */}
      <nav className={styles.bottomNav}>
        <button 
          className={`${styles.navItem} ${activeTab === 'home' ? styles.active : ''}`}
          onClick={() => setActiveTab('home')}
        >
          <HomeIcon size={24} />
          <span>ホーム</span>
        </button>
        <button 
          className={`${styles.navItem} ${activeTab === 'analysis' ? styles.active : ''}`}
          onClick={() => setActiveTab('analysis')}
        >
          <BarChart2 size={24} />
          <span>分析</span>
        </button>
      </nav>
    </div>
  );
}
