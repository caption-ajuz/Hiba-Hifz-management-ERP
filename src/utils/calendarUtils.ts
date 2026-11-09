import { CollegeEvent } from '../types';

/**
 * Parses date string (YYYY-MM-DD) and optional time string (e.g. "09:00 AM", "14:30")
 * into a Date object or formatted strings for calendars.
 */
function parseDateTime(dateStr: string, timeStr?: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, (month || 1) - 1, day || 1);

  if (timeStr) {
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const modifier = match[3]?.toUpperCase();

      if (modifier === 'PM' && hours < 12) hours += 12;
      if (modifier === 'AM' && hours === 12) hours = 0;

      d.setHours(hours, minutes, 0, 0);
    }
  } else {
    d.setHours(9, 0, 0, 0);
  }
  return d;
}

function toIsoCompact(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());
  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Creates a direct Google Calendar event creation link.
 */
export function getGoogleCalendarUrl(event: CollegeEvent): string {
  const startDate = parseDateTime(event.startDate, event.startTime);
  const endDate = event.endDate
    ? parseDateTime(event.endDate, event.endTime)
    : event.endTime
    ? parseDateTime(event.startDate, event.endTime)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // 2 hours default

  const datesParam = `${toIsoCompact(startDate)}/${toIsoCompact(endDate)}`;

  const detailsText = `${event.description || ''}\n\nCategory: ${event.category}\nAudience: ${event.targetAudience}\nOrganized by: ${event.createdBy || 'Markazul Hidayathil Islamiyya'}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.title,
    dates: datesParam,
    details: detailsText,
    location: event.venue || 'Markazul Hidayathil Islamiyya',
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Generates and triggers download of an RFC 5545 .ics iCalendar file
 * compatible with Apple Calendar, Google Calendar, Outlook, and all smartphones.
 */
export function downloadIcsFile(event: CollegeEvent): void {
  const startDate = parseDateTime(event.startDate, event.startTime);
  const endDate = event.endDate
    ? parseDateTime(event.endDate, event.endTime)
    : event.endTime
    ? parseDateTime(event.startDate, event.endTime)
    : new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  const startUtc = toIsoCompact(startDate);
  const endUtc = toIsoCompact(endDate);
  const nowUtc = toIsoCompact(new Date());

  const escapeIcs = (text: string) =>
    (text || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\r?\n/g, '\\n');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Markazul Hidayathil Islamiyya//HYBA Events Portal//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:HYBA College Events',
    'BEGIN:VEVENT',
    `UID:hyba-event-${event.id}-${Date.now()}@markazulhidaya.edu.in`,
    `DTSTAMP:${nowUtc}`,
    `DTSTART:${startUtc}`,
    `DTEND:${endUtc}`,
    `SUMMARY:${escapeIcs(event.title)}`,
    `DESCRIPTION:${escapeIcs(event.description || '')}\\n\\nCategory: ${event.category}\\nAudience: ${event.targetAudience}\\nOrganized by: ${escapeIcs(event.createdBy || 'Markazul Hidayathil Islamiyya')}`,
    `LOCATION:${escapeIcs(event.venue || 'Markazul Hidayathil Islamiyya')}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  const blob = new Blob([icsLines.join('\r\n')], { type: 'text/calendar;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeFilename = (event.title || 'event').replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30);
  a.download = `${safeFilename}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
