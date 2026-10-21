import type { TimeMode } from '../../types/world';
import type { StateReporter } from './context';

/** How much of each phase of the day is showing, for lights, glows and the sky */
export interface DaylightFactors {
  day: number;
  twilight: number;
  night: number;
  /** Lamps, windows and fires: fades in through twilight, full at night */
  warmGlow: number;
}

/** Turns a time of day (0..1) into how much day, twilight and night is showing */
export function computeDaylight(timeOfDay: number): DaylightFactors {
  const t = timeOfDay;
  let day = 0;
  let twilight = 0;
  let night = 0;

  if (t < 0.38) {
    day = 1.0;
  } else if (t < 0.54) {
    const p = (t - 0.38) / 0.16;
    day = 1.0 - p;
    twilight = p;
  } else if (t < 0.68) {
    const p = (t - 0.54) / 0.14;
    twilight = 1.0 - p;
    night = p;
  } else if (t < 0.88) {
    night = 1.0;
  } else {
    const p = (t - 0.88) / 0.12;
    night = 1.0 - p;
    day = p;
  }

  return {
    day,
    twilight,
    night,
    warmGlow: Math.min(1.0, twilight * 0.85 + night * 1.0),
  };
}

/**
 * Day/night cycle: the clock, the auto/fixed time modes, and the day counter.
 * 0.25 is warm afternoon, 0.52 blue twilight, 0.78 deep night.
 */
export class DayNightSystem {
  timeMode: TimeMode = 'auto';
  timeOfDay = 0.24; // Starts in warm sunlit afternoon
  dayCount = 1;

  constructor(private report: StateReporter) {}

  get isEveningOrNight() {
    return this.timeOfDay > 0.42 && this.timeOfDay < 0.9;
  }

  /** Advance the auto clock; true when a new day starts */
  advance(dt: number): boolean {
    if (this.timeMode !== 'auto') return false;
    const prevTime = this.timeOfDay;
    this.timeOfDay = (this.timeOfDay + dt * 0.014) % 1.0;
    if (this.timeOfDay < prevTime) {
      this.dayCount += 1;
      return true;
    }
    return false;
  }

  daylight(): DaylightFactors {
    return computeDaylight(this.timeOfDay);
  }

  setTimeMode(mode: TimeMode) {
    this.timeMode = mode;
    if (mode === 'day') {
      this.timeOfDay = 0.22;
    } else if (mode === 'twilight') {
      this.timeOfDay = 0.52;
    } else if (mode === 'night') {
      this.timeOfDay = 0.78;
    }
    this.report((prev) => ({
      ...prev,
      timeMode: mode,
      timeOfDay: this.timeOfDay,
    }));
  }

  setTimeOfDayManual(val: number) {
    this.timeMode = 'auto';
    this.timeOfDay = ((val % 1) + 1) % 1;
    this.report((prev) => ({
      ...prev,
      timeOfDay: this.timeOfDay,
    }));
  }
}
