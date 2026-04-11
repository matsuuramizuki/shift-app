import { useState, useEffect } from "react";

export interface Settings {
  defaultHourlyWage: number;
}

export interface Shift {
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  deduction: number;
  hourlyWage: number;
}

export function useStore() {
  const [settings, setSettings] = useState<Settings>({ defaultHourlyWage: 1000 });
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem("shift-settings");
    const savedShifts = localStorage.getItem("shift-data");

    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    } else {
      localStorage.setItem("shift-settings", JSON.stringify({ defaultHourlyWage: 1000 }));
    }

    if (savedShifts) {
      setShifts(JSON.parse(savedShifts));
    }

    setIsLoaded(true);
  }, []);

  const saveSettings = (newSettings: Settings) => {
    setSettings(newSettings);
    localStorage.setItem("shift-settings", JSON.stringify(newSettings));
  };

  const saveShift = (shift: Shift) => {
    const newShifts = shifts.filter((s) => s.date !== shift.date);
    newShifts.push(shift);
    setShifts(newShifts);
    localStorage.setItem("shift-data", JSON.stringify(newShifts));
  };

  const deleteShift = (date: string) => {
    const newShifts = shifts.filter((s) => s.date !== date);
    setShifts(newShifts);
    localStorage.setItem("shift-data", JSON.stringify(newShifts));
  };

  return { settings, shifts, isLoaded, saveSettings, saveShift, deleteShift };
}
