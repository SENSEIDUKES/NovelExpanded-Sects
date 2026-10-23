import assert from 'node:assert/strict';
import { EngineRuntime, type EngineFrame, type EngineSystem } from '../src/engine';

function near(actual: number, expected: number) {
  assert.ok(Math.abs(actual - expected) < 1e-9, `${actual} should equal ${expected}`);
}

// Simulation progresses identically across different render frequencies, in stable system order.
{
  const run = (frames: number, delta: number) => {
    const calls: string[] = [];
    let position = 0;
    const runtime = new EngineRuntime({ systems: [
      { id: 'movement', fixedUpdate: frame => { position += 3 * frame.deltaSeconds; calls.push(`movement:${frame.tick}`); } },
      { id: 'collision', fixedUpdate: frame => { calls.push(`collision:${frame.tick}`); } },
      { id: 'render', update: frame => { calls.push(`render:${frame.frame}`); } },
    ] });
    for (let i = 0; i < frames; i++) runtime.advance(delta);
    return { diagnostics: runtime.diagnostics(), calls, position };
  };
  const slow = run(30, 1 / 30), fast = run(120, 1 / 120);
  assert.equal(slow.diagnostics.tick, 60);
  assert.equal(fast.diagnostics.tick, 60);
  near(slow.position, 3);
  near(fast.position, 3);
  assert.deepEqual(slow.calls.slice(0, 5), ['movement:1', 'collision:1', 'movement:2', 'collision:2', 'render:1']);
  assert.deepEqual(fast.calls.slice(0, 4), ['render:1', 'movement:1', 'collision:1', 'render:2']);
  near(slow.diagnostics.droppedSeconds, 0);
  near(fast.diagnostics.droppedSeconds, 0);
}

// Both clocks freeze while paused, but frames can still redraw with a zero delta.
{
  const frames: EngineFrame[] = [];
  const runtime = new EngineRuntime({ fixedDeltaSeconds: 0.1, systems: [{ id: 'presentation', update: frame => frames.push(frame) }] });
  runtime.advance(0.15);
  runtime.pause();
  runtime.advance(12);
  assert.equal(runtime.diagnostics().tick, 1);
  near(runtime.diagnostics().elapsedSeconds, 0.15);
  assert.equal(runtime.diagnostics().alpha, 0);
  assert.equal(runtime.diagnostics().fixedSteps, 0);
  assert.equal(frames[1].deltaSeconds, 0);
  near(frames[1].elapsedSeconds, 0.15);
  runtime.resume();
  runtime.advance(0.05);
  assert.equal(runtime.diagnostics().tick, 1, 'resume carried fractional time from before the pause');
  runtime.advance(0.05);
  assert.equal(runtime.diagnostics().tick, 2);
  near(runtime.diagnostics().elapsedSeconds, 0.25);
  near(runtime.diagnostics().droppedSeconds, 0);
}

// Frame clamping and step limits bound catch-up, report discarded time, and preserve a remainder.
{
  const runtime = new EngineRuntime({ systems: [], fixedDeltaSeconds: 0.1, maxFrameDeltaSeconds: 0.55, maxSubSteps: 2 });
  runtime.advance(1);
  const diagnostics = runtime.diagnostics();
  assert.equal(diagnostics.tick, 2);
  assert.equal(diagnostics.fixedSteps, 2);
  near(diagnostics.simulationSeconds, 0.2);
  near(diagnostics.elapsedSeconds, 0.55);
  near(diagnostics.droppedSeconds, 0.75);
  near(diagnostics.alpha, 0.5);
  runtime.advance(0.05);
  assert.equal(runtime.diagnostics().tick, 3, 'fractional time was not retained');
  near(runtime.diagnostics().alpha, 0);
  assert.equal(runtime.diagnostics().fixedSteps, 1);
}

// Callers cannot mutate registration or another system's timing through references.
{
  const seen: number[] = [];
  const systems: EngineSystem[] = [
    { id: 'first', update: frame => { frame.elapsedSeconds = -10; } },
    { id: 'second', update: frame => { seen.push(frame.elapsedSeconds); } },
  ];
  const runtime = new EngineRuntime({ systems });
  systems.reverse();
  systems[0].id = 'changed';
  const diagnostics = runtime.diagnostics();
  diagnostics.systemIds.reverse();
  diagnostics.tick = 999;
  runtime.advance(0.1);
  near(seen[0], 0.1);
  assert.deepEqual(runtime.diagnostics().systemIds, ['first', 'second']);
  assert.equal(runtime.diagnostics().tick, 6);
}

// Class method receivers are preserved, teardown is reverse-ordered and failure does not skip peers.
{
  const order: string[] = [];
  class Participant implements EngineSystem {
    id = 'class-system';
    count = 0;
    update() { this.count++; }
    dispose() { order.push(this.id); }
  }
  const participant = new Participant();
  const firstError = new Error('first disposal failure'), lastError = new Error('last disposal failure');
  const runtime = new EngineRuntime({ systems: [
    { id: 'first', dispose() { order.push('first'); throw firstError; } },
    participant,
    { id: 'last', dispose() { order.push('last'); throw lastError; } },
  ] });
  runtime.advance(0);
  assert.equal(participant.count, 1);
  assert.throws(() => runtime.dispose(), error => {
    assert.ok(error instanceof AggregateError);
    assert.deepEqual(error.errors, [lastError, firstError]);
    return true;
  });
  assert.deepEqual(order, ['last', 'class-system', 'first']);
  runtime.dispose();
  assert.equal(order.length, 3, 'disposal was not idempotent after a failure');
  assert.throws(() => runtime.advance(0), /disposed/);
  assert.throws(() => runtime.pause(), /disposed/);
  assert.throws(() => runtime.resume(), /disposed/);
  assert.equal(runtime.diagnostics().frame, 1);
}

// Invalid registrations and time values fail before callbacks run or clocks change.
{
  for (const id of ['', '   ']) assert.throws(() => new EngineRuntime({ systems: [{ id }] }), /nonempty/);
  assert.throws(() => new EngineRuntime({ systems: [{ id: 'same' }, { id: 'same' }] }), /Duplicate/);
  for (const value of [0, -1, NaN, Infinity]) {
    assert.throws(() => new EngineRuntime({ systems: [], fixedDeltaSeconds: value }), /fixedDeltaSeconds/);
    assert.throws(() => new EngineRuntime({ systems: [], maxFrameDeltaSeconds: value }), /maxFrameDeltaSeconds/);
    assert.throws(() => new EngineRuntime({ systems: [], maxSubSteps: value }), /maxSubSteps/);
  }
  assert.throws(() => new EngineRuntime({ systems: [], maxSubSteps: 1.5 }), /maxSubSteps/);
  const runtime = new EngineRuntime({ systems: [] });
  for (const value of [-1, NaN, Infinity]) assert.throws(() => runtime.advance(value), /deltaSeconds/);
  assert.equal(runtime.diagnostics().frame, 0);
  assert.equal(runtime.diagnostics().tick, 0);
}

console.log('✓ All SEIHouse engine runtime tests passed.');
