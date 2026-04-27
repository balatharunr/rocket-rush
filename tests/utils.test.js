/* Rocket Rush — Utils Tests
 * Tests for utility functions (math helpers, RNG, geometry)
 */

// Mock the global RR namespace for testing
global.RR = {};

describe('Utils', () => {
  let utils;

  beforeEach(() => {
    // Load the utils module
    require('../src/js/utils.js');
    utils = RR.utils;
  });

  describe('clamp', () => {
    test('should clamp value within range', () => {
      expect(utils.clamp(5, 0, 10)).toBe(5);
      expect(utils.clamp(-5, 0, 10)).toBe(0);
      expect(utils.clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('lerp', () => {
    test('should linearly interpolate between values', () => {
      expect(utils.lerp(0, 10, 0.5)).toBe(5);
      expect(utils.lerp(0, 100, 0.25)).toBe(25);
      expect(utils.lerp(10, 20, 0)).toBe(10);
      expect(utils.lerp(10, 20, 1)).toBe(20);
    });
  });

  describe('rand', () => {
    test('should return random number in range', () => {
      const result = utils.rand(0, 10);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(10);
    });
  });

  describe('randi', () => {
    test('should return random integer in range', () => {
      const result = utils.randi(0, 10);
      expect(result).toBeGreaterThanOrEqual(0);
      expect(result).toBeLessThan(10);
      expect(Number.isInteger(result)).toBe(true);
    });
  });

  describe('choose', () => {
    test('should return random element from array', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = utils.choose(arr);
      expect(arr).toContain(result);
    });
  });

  describe('circleHit', () => {
    test('should detect circle collision', () => {
      const a = { x: 0, y: 0, r: 5 };
      const b = { x: 3, y: 4, r: 5 };
      expect(utils.circleHit(a, b)).toBe(true);

      const c = { x: 0, y: 0, r: 5 };
      const d = { x: 20, y: 20, r: 5 };
      expect(utils.circleHit(c, d)).toBe(false);
    });
  });

  describe('dist2', () => {
    test('should calculate squared distance', () => {
      expect(utils.dist2(0, 0, 3, 4)).toBe(25);
      expect(utils.dist2(0, 0, 0, 0)).toBe(0);
    });
  });

  describe('pad', () => {
    test('should pad number with leading zeros', () => {
      expect(utils.pad(5)).toBe('000005');
      expect(utils.pad(123, 4)).toBe('0123');
      expect(utils.pad(123456, 6)).toBe('123456');
    });
  });

  describe('makePool', () => {
    test('should create object pool', () => {
      const factory = () => ({ value: 0 });
      const pool = utils.makePool(factory);

      expect(pool.count).toBe(0);

      const obj1 = pool.acquire((o) => { o.value = 1; });
      expect(pool.count).toBe(1);
      expect(obj1.value).toBe(1);

      const obj2 = pool.acquire((o) => { o.value = 2; });
      expect(pool.count).toBe(2);

      pool.release(0);
      expect(pool.count).toBe(1);

      pool.clear();
      expect(pool.count).toBe(0);
    });
  });
});
