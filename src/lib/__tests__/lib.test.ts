import { toLocalDate } from '../dates';
import { newId } from '../ids';

describe('toLocalDate', () => {
  it('uses the device’s calendar day', () => {
    expect(toLocalDate(new Date(2026, 10, 1, 23, 30).getTime())).toBe('2026-11-01');
  });

  it('counts time before the day-end hour as the previous day', () => {
    expect(toLocalDate(new Date(2026, 10, 1, 2, 30).getTime(), 3)).toBe('2026-10-31');
    expect(toLocalDate(new Date(2026, 10, 1, 3, 0).getTime(), 3)).toBe('2026-11-01');
  });
});

describe('newId', () => {
  it('creates version 7 UUIDs that sort by creation time', () => {
    const first = newId();
    const second = newId();
    expect(first).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(first < second).toBe(true);
  });
});
