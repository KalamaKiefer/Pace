import type { LocalDate } from '@/engine/types';

const pad = (value: number) => String(value).padStart(2, '0');

// The day a moment belongs to. With a day-end hour of 3, 2:30 am still counts as yesterday.
export function toLocalDate(ms: number, dayEndHour = 0): LocalDate {
  const date = new Date(ms);
  date.setHours(date.getHours() - dayEndHour);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
