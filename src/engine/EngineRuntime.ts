/** Fixed simulation time, independent of how frequently a host presents frames. */
export interface EngineFixedFrame {
  deltaSeconds: number;
  elapsedSeconds: number;
  tick: number;
}

/** Active presentation time plus the fraction toward the next simulation step. */
export interface EngineFrame {
  deltaSeconds: number;
  elapsedSeconds: number;
  alpha: number;
  frame: number;
}

/** A registered engine participant. Array order defines update order. */
export interface EngineSystem {
  id: string;
  fixedUpdate?: (frame: EngineFixedFrame) => void;
  update?: (frame: EngineFrame) => void;
  dispose?: () => void;
}

export interface EngineRuntimeOptions {
  systems: EngineSystem[];
  fixedDeltaSeconds?: number;
  maxFrameDeltaSeconds?: number;
  maxSubSteps?: number;
}

/** A detached runtime snapshot; counters are cumulative except fixedSteps and alpha. */
export interface EngineDiagnostics {
  frame: number;
  tick: number;
  simulationSeconds: number;
  elapsedSeconds: number;
  fixedSteps: number;
  alpha: number;
  droppedSeconds: number;
  paused: boolean;
  systemIds: string[];
}

/**
 * Browser-independent system scheduling, simulation time and lifecycle ownership.
 * The host supplies elapsed seconds and owns its renderer and animation-frame driver.
 */
export class EngineRuntime {
  private readonly systems: EngineSystem[];
  private readonly fixedDeltaSeconds: number;
  private readonly maxFrameDeltaSeconds: number;
  private readonly maxSubSteps: number;
  private accumulator = 0;
  private frame = 0;
  private tick = 0;
  private elapsedSeconds = 0;
  private fixedSteps = 0;
  private droppedSeconds = 0;
  private paused = false;
  private disposed = false;

  constructor({
    systems,
    fixedDeltaSeconds = 1 / 60,
    maxFrameDeltaSeconds = 0.25,
    maxSubSteps = 8,
  }: EngineRuntimeOptions) {
    if (!Number.isFinite(fixedDeltaSeconds) || fixedDeltaSeconds <= 0) {
      throw new RangeError('fixedDeltaSeconds must be finite and greater than zero');
    }
    if (!Number.isFinite(maxFrameDeltaSeconds) || maxFrameDeltaSeconds <= 0) {
      throw new RangeError('maxFrameDeltaSeconds must be finite and greater than zero');
    }
    if (!Number.isSafeInteger(maxSubSteps) || maxSubSteps <= 0) {
      throw new RangeError('maxSubSteps must be a positive safe integer');
    }
    if (!Array.isArray(systems)) throw new TypeError('systems must be an array');
    const ids = new Set<string>();
    this.systems = systems.map(system => {
      if (!system || typeof system.id !== 'string' || !system.id.trim()) {
        throw new TypeError('Every system must have a nonempty id');
      }
      if (ids.has(system.id)) throw new Error(`Duplicate engine system id: ${system.id}`);
      ids.add(system.id);
      for (const callback of ['fixedUpdate', 'update', 'dispose'] as const) {
        if (system[callback] !== undefined && typeof system[callback] !== 'function') {
          throw new TypeError(`${system.id}.${callback} must be a function`);
        }
      }
      // Capture registration and preserve class-method receivers without exposing registry mutation.
      return {
        id: system.id,
        fixedUpdate: system.fixedUpdate?.bind(system),
        update: system.update?.bind(system),
        dispose: system.dispose?.bind(system),
      };
    });
    this.fixedDeltaSeconds = fixedDeltaSeconds;
    this.maxFrameDeltaSeconds = maxFrameDeltaSeconds;
    this.maxSubSteps = maxSubSteps;
  }

  /** Run bounded fixed simulation work, then present one frame, including while paused. */
  advance(deltaSeconds: number): void {
    this.assertActive();
    if (!Number.isFinite(deltaSeconds) || deltaSeconds < 0) {
      throw new RangeError('deltaSeconds must be finite and nonnegative');
    }
    this.fixedSteps = 0;
    const acceptedDelta = this.paused ? 0 : Math.min(deltaSeconds, this.maxFrameDeltaSeconds);
    if (!this.paused) {
      this.elapsedSeconds += acceptedDelta;
      this.droppedSeconds += deltaSeconds - acceptedDelta;
      this.accumulator += acceptedDelta;
      const epsilon = this.fixedDeltaSeconds * 1e-9;
      while (this.accumulator + epsilon >= this.fixedDeltaSeconds && this.fixedSteps < this.maxSubSteps) {
        this.accumulator = Math.max(0, this.accumulator - this.fixedDeltaSeconds);
        this.tick++;
        this.fixedSteps++;
        for (const system of this.systems) {
          system.fixedUpdate?.({
            deltaSeconds: this.fixedDeltaSeconds,
            elapsedSeconds: this.tick * this.fixedDeltaSeconds,
            tick: this.tick,
          });
        }
      }
      // Discard whole overdue steps, preserving fractional time for interpolation.
      const overdueSteps = Math.floor((this.accumulator + epsilon) / this.fixedDeltaSeconds);
      if (overdueSteps > 0) {
        const discarded = overdueSteps * this.fixedDeltaSeconds;
        this.accumulator = Math.max(0, this.accumulator - discarded);
        this.droppedSeconds += discarded;
      }
    }
    this.frame++;
    for (const system of this.systems) {
      system.update?.({
        deltaSeconds: acceptedDelta,
        elapsedSeconds: this.elapsedSeconds,
        alpha: this.accumulator / this.fixedDeltaSeconds,
        frame: this.frame,
      });
    }
  }

  /** Freeze both clocks and forget fractional simulation debt. */
  pause(): void {
    this.assertActive();
    this.paused = true;
    this.accumulator = 0;
    this.fixedSteps = 0;
  }

  /** Resume using subsequent host deltas; paused time is never accumulated. */
  resume(): void {
    this.assertActive();
    this.paused = false;
  }

  /** Inspect state without obtaining mutable references to runtime internals. */
  diagnostics(): EngineDiagnostics {
    return {
      frame: this.frame,
      tick: this.tick,
      simulationSeconds: this.tick * this.fixedDeltaSeconds,
      elapsedSeconds: this.elapsedSeconds,
      fixedSteps: this.fixedSteps,
      alpha: this.accumulator / this.fixedDeltaSeconds,
      droppedSeconds: this.droppedSeconds,
      paused: this.paused,
      systemIds: this.systems.map(system => system.id),
    };
  }

  /** Release every system in reverse registration order, even if some releases fail. */
  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const errors: unknown[] = [];
    for (let i = this.systems.length - 1; i >= 0; i--) {
      try { this.systems[i].dispose?.(); } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, 'Engine system disposal failed');
  }

  private assertActive(): void {
    if (this.disposed) throw new Error('EngineRuntime has been disposed');
  }
}
