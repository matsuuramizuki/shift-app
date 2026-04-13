import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface Settings {
  defaultHourlyWage: number;
}

export interface Shift {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  deduction: number;
  hourlyWage: number;
}

export function useStore() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<Settings>({ defaultHourlyWage: 1000 });
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setIsLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchData(session.user.id);
      } else {
        setShifts([]);
        setIsLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async (userId: string) => {
    try {
      const [settingsRes, shiftsRes] = await Promise.all([
        supabase.from('settings').select('*').eq('user_id', userId).maybeSingle(),
        supabase.from('shifts').select('*').eq('user_id', userId)
      ]);

      if (settingsRes.data) {
        setSettings({ defaultHourlyWage: settingsRes.data.default_hourly_wage });
      }
      
      if (shiftsRes.data) {
        setShifts(shiftsRes.data.map(item => ({
          id: item.id,
          date: item.date,
          startTime: item.start_time,
          endTime: item.end_time,
          breakMinutes: item.break_minutes,
          deduction: item.deduction,
          hourlyWage: item.hourly_wage
        })));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    setSettings(newSettings);
    if (!user) return;
    await supabase.from('settings').upsert({
      user_id: user.id,
      default_hourly_wage: newSettings.defaultHourlyWage
    });
  };

  const saveShift = async (shift: Shift) => {
    const newShifts = shifts.filter((s) => s.date !== shift.date);
    newShifts.push(shift);
    setShifts(newShifts);
    
    if (!user) return;
    
    await supabase.from('shifts').upsert({
      user_id: user.id,
      date: shift.date,
      start_time: shift.startTime,
      end_time: shift.endTime,
      break_minutes: shift.breakMinutes,
      deduction: shift.deduction,
      hourly_wage: shift.hourlyWage
    }, { onConflict: 'user_id, date' });
  };

  const deleteShift = async (date: string) => {
    if (!user) return;
    setShifts(shifts.filter((s) => s.date !== date));
    await supabase.from('shifts').delete().eq('user_id', user.id).eq('date', date);
  };

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({ 
      provider: 'google', 
      options: { redirectTo: typeof window !== 'undefined' ? window.location.origin : undefined } 
    });
  };
  
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { session, user, settings, shifts, isLoaded, saveSettings, saveShift, deleteShift, signInWithGoogle, signOut };
}
