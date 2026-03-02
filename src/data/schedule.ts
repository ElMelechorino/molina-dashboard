import { ScheduleClass } from '../types';

export function getCurrentClass(schedule: ScheduleClass[]): ScheduleClass | null {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  for (const cls of schedule) {
    if (cls.day === currentDay) {
      const [startH, startM] = cls.startTime.split(':').map(Number);
      const [endH, endM] = cls.endTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      if (currentTime >= startMinutes && currentTime <= endMinutes) {
        return cls;
      }
    }
  }
  return null;
}

export function getNextClass(schedule: ScheduleClass[]): { class: ScheduleClass; minutesUntil: number } | null {
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.getHours() * 60 + now.getMinutes();

  // Find classes today that haven't started yet
  const todayClasses = schedule
    .filter(cls => cls.day === currentDay)
    .map(cls => {
      const [startH, startM] = cls.startTime.split(':').map(Number);
      const startMinutes = startH * 60 + startM;
      return { cls, startMinutes };
    })
    .filter(({ startMinutes }) => startMinutes > currentTime)
    .sort((a, b) => a.startMinutes - b.startMinutes);

  if (todayClasses.length > 0) {
    const next = todayClasses[0];
    return {
      class: next.cls,
      minutesUntil: next.startMinutes - currentTime,
    };
  }

  // Find next class on upcoming days
  for (let i = 1; i <= 7; i++) {
    const checkDay = (currentDay + i) % 7;
    const dayClasses = schedule
      .filter(cls => cls.day === checkDay)
      .map(cls => {
        const [startH, startM] = cls.startTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        return { cls, startMinutes };
      })
      .sort((a, b) => a.startMinutes - b.startMinutes);

    if (dayClasses.length > 0) {
      const next = dayClasses[0];
      const minutesUntilMidnight = (24 * 60) - currentTime;
      const fullDays = (i - 1) * 24 * 60;
      const minutesFromMidnight = next.startMinutes;
      return {
        class: next.cls,
        minutesUntil: minutesUntilMidnight + fullDays + minutesFromMidnight,
      };
    }
  }

  return null;
}

export function getDayName(day: number): string {
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  return days[day];
}

export function formatTimeRemaining(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours < 24) {
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}
