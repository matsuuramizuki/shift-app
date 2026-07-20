import { useState, useEffect } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { decodeShiftMetadata, encodeTentativeMemo } from "./shiftMetadata";

export interface Settings {
  defaultHourlyWage: number;
  payday?: number;
}

export interface Shift {
  id?: string;
  date: string;
  startTime: string;
  endTime: string;
  breakMinutes: number;
  deduction: number;
  hourlyWage: number;
  allowance?: number;
  memo?: string;
  isTentative?: boolean;
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
        setSettings({ 
          defaultHourlyWage: settingsRes.data.default_hourly_wage,
          payday: settingsRes.data.payday
        });
      }
      
      if (shiftsRes.data) {
        setShifts(shiftsRes.data.map(item => {
          const metadata = decodeShiftMetadata(item.memo, item.is_tentative);
          return {
            id: item.id,
            date: item.date,
            startTime: item.start_time,
            endTime: item.end_time,
            breakMinutes: item.break_minutes,
            deduction: item.deduction,
            hourlyWage: item.hourly_wage,
            allowance: item.allowance || 0,
            memo: metadata.memo,
            isTentative: metadata.isTentative
          };
        }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoaded(true);
    }
  };

  const saveSettings = async (newSettings: Settings) => {
    const previousSettings = settings;
    setSettings(newSettings);
    if (!user) return;

    const { error } = await supabase.from('settings').upsert({
      user_id: user.id,
      default_hourly_wage: newSettings.defaultHourlyWage,
      payday: newSettings.payday
    });

    if (error) {
      setSettings(previousSettings);
      throw error;
    }
  };

  const saveShift = async (shift: Shift) => {
    const previousShifts = shifts;
    const newShifts = shifts.filter((s) => s.date !== shift.date);
    newShifts.push(shift);
    setShifts(newShifts);
    
    if (!user) return;
    
    const payload = {
      user_id: user.id,
      date: shift.date,
      start_time: shift.startTime,
      end_time: shift.endTime,
      break_minutes: shift.breakMinutes,
      deduction: shift.deduction,
      hourly_wage: shift.hourlyWage,
      allowance: shift.allowance || 0,
      memo: shift.memo,
      is_tentative: shift.isTentative ?? false
    };

    let { error } = await supabase.from('shifts').upsert(payload, { onConflict: 'user_id, date' });

    // Keep the app usable before the optional database migration is applied.
    if (error && (error.code === 'PGRST204' || error.code === '42703' || error.message.includes('is_tentative'))) {
      ({ error } = await supabase.from('shifts').upsert({
        user_id: payload.user_id,
        date: payload.date,
        start_time: payload.start_time,
        end_time: payload.end_time,
        break_minutes: payload.break_minutes,
        deduction: payload.deduction,
        hourly_wage: payload.hourly_wage,
        allowance: payload.allowance,
        memo: encodeTentativeMemo(shift.memo, shift.isTentative ?? false)
      }, { onConflict: 'user_id, date' }));
    }

    if (error) {
      setShifts(previousShifts);
      throw error;
    }
  };

  const deleteShift = async (date: string) => {
    if (!user) return;
    const previousShifts = shifts;
    setShifts(shifts.filter((s) => s.date !== date));
    const { error } = await supabase.from('shifts').delete().eq('user_id', user.id).eq('date', date);

    if (error) {
      setShifts(previousShifts);
      throw error;
    }
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
