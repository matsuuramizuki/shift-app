"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Settings as SettingsIcon } from "lucide-react";
import styles from "./page.module.css";
import { useStore } from "@/lib/store";

import { Calendar } from "@/components/Calendar";
import { SummaryCards } from "@/components/SummaryCards";
import { CumulativeChart } from "@/components/Chart";
import { ShiftModal } from "@/components/ShiftModal";
import { SettingsModal } from "@/components/SettingsModal";

export default function Home() {
  const { settings, shifts, isLoaded, saveSettings, saveShift, deleteShift } = useStore();
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  
  // Modals state
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!isLoaded) {
    return <div className={styles.container}>Loading...</div>;
  }

  const selectedShift = selectedDate 
    ? shifts.find(s => s.date === format(selectedDate, "yyyy-MM-dd")) 
    : undefined;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.title}>Shifts</div>
        <button className={styles.iconBtn} onClick={() => setIsSettingsOpen(true)}>
          <SettingsIcon size={24} />
        </button>
      </header>

      <SummaryCards currentDate={currentDate} shifts={shifts} />

      <Calendar 
        currentDate={currentDate} 
        setCurrentDate={setCurrentDate} 
        shifts={shifts}
        onDateClick={(date) => setSelectedDate(date)} 
      />

      <CumulativeChart currentDate={currentDate} shifts={shifts} />

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
