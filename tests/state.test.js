/* Rocket Rush — State Tests
 * Tests for game state management
 */

// Mock the global RR namespace and config for testing
global.RR = {};

describe('State', () => {
  let state, fx, dom;

  beforeEach(() => {
    // Load config first (required by state)
    require('../src/js/core/config.js');
    // Load state module
    require('../src/js/core/state.js');
    state = RR.state;
    fx = RR.fx;
    dom = RR.dom;
  });

  test('should have initial state values', () => {
    expect(state).toBeDefined();
    expect(state.mode).toBe('menu');
    expect(state.score).toBe(0);
    expect(state.lives).toBe(5);
    expect(state.level).toBe(1);
  });

  test('should have effects state', () => {
    expect(fx).toBeDefined();
    expect(fx.shake).toBe(0);
    expect(fx.flash).toBe(0);
    expect(fx.slowMo).toBe(0);
  });

  test('should have dom references object', () => {
    expect(dom).toBeDefined();
    expect(typeof dom).toBe('object');
  });

  test('should have loadBest function', () => {
    expect(RR.loadBest).toBeDefined();
    expect(typeof RR.loadBest).toBe('function');
  });

  test('should have saveBest function', () => {
    expect(RR.saveBest).toBeDefined();
    expect(typeof RR.saveBest).toBe('function');
  });

  test('loadBest should return number', () => {
    const best = RR.loadBest();
    expect(typeof best).toBe('number');
    expect(best).toBeGreaterThanOrEqual(0);
  });
});
