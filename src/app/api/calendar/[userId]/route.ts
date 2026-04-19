import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateICal } from '@/lib/ical';

export const dynamic = 'force-dynamic';

export async function GET(request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return new NextResponse('Server Configuration Error', { status: 500 });
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    const { data: shifts, error } = await supabaseAdmin
      .from('shifts')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      console.error('Supabase error fetching shifts:', error);
      return new NextResponse('Error fetching shifts', { status: 500 });
    }

    if (!shifts) {
      return new NextResponse(generateICal([]), {
        headers: {
           'Content-Type': 'text/calendar; charset=utf-8',
        }
      });
    }

    const mappedShifts = shifts.map(item => ({
      id: item.id,
      date: item.date,
      startTime: item.start_time,
      endTime: item.end_time,
      breakMinutes: item.break_minutes,
      deduction: item.deduction,
      hourlyWage: item.hourly_wage
    }));

    const icalString = generateICal(mappedShifts);

    return new NextResponse(icalString, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="shifts-${userId.substring(0, 8)}.ics"`,
      }
    });

  } catch (error) {
    console.error('API Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
