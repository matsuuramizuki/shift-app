"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Settings as SettingsIcon, LogOut } from "lucide-react";
import styles from "./page.module.css";
import { useStore } from "@/lib/store";

import { Calendar } from "@/components/Calendar";
import { SummaryCards } from "@/components/SummaryCards";
import { UpcomingShifts } from "@/components/UpcomingShifts";
import { MonthlyChart } from "@/components/MonthlyChart";
import { ShiftModal } from "@/components/ShiftModal";
import { SettingsModal } from "@/components/SettingsModal";

export default function Home() {
  const { user, settings, shifts, isLoaded, saveSettings, saveShift, deleteShift, signInWithGoogle, signOut } = useStore();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Modals state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>Shifts</div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className={styles.iconBtn} onClick={() => setIsSettingsOpen(true)}>
            <SettingsIcon size={24} />
          </button>
          <button className={styles.iconBtn} onClick={signOut}>
            <LogOut size={24} />
          </button>
        </div>
      </header>

      <SummaryCards currentDate={currentDate} shifts={shifts} />

      <Calendar 
        currentDate={currentDate} 
        setCurrentDate={setCurrentDate} 
        shifts={shifts}
        onDateClick={(date) => setSelectedDate(date)} 
      />

      <UpcomingShifts shifts={shifts} />

      <MonthlyChart shifts={shifts} />

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
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onSave={saveSettings}
        />
      )}
    </div>
  );
}
