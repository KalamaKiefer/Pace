import type { LocalDate } from './types';

const MS_PER_DAY = 86_400_000;

// Parsed as UTC so daylight-saving changes can't shift a day count.
const toUtc = (date: LocalDate) => Date.parse(`${date}T00:00:00Z`);

export const daysBetween = (from: LocalDate, to: LocalDate) =>
  Math.round((toUtc(to) - toUtc(from)) / MS_PER_DAY);

export const addDays = (date: LocalDate, days: number): LocalDate =>
  new Date(toUtc(date) + days * MS_PER_DAY).toISOString().slice(0, 10);

export function ageOn(birthDate: LocalDate, date: LocalDate) {
  const years = Number(date.slice(0, 4)) - Number(birthDate.slice(0, 4));
  return date.slice(5) < birthDate.slice(5) ? years - 1 : years;
}
