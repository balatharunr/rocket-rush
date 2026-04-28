/* Rocket Rush — Config Tests
 * Tests for configuration constants and tuning values
 */

// Mock the global RR namespace for testing
global.RR = {};

describe('Config', () => {
  let config;

  beforeEach(() => {
    jest.resetModules();
    global.RR = {};
    // Load the config module
    require('../src/js/core/config.js');
    require('../src/js/content/bosses/zone-1-bosses.js');
    require('../src/js/content/bosses/zone-2-bosses.js');
    config = RR.config;
  });

  test('should have defined dimensions', () => {
    expect(config.W).toBeDefined();
    expect(config.H).toBeDefined();
    expect(config.W).toBe(960);
    expect(config.H).toBe(540);
  });

  test('should have palette colors', () => {
    expect(config.PALETTE).toBeDefined();
    expect(config.PALETTE.cyan).toBe('#36f5ff');
    expect(config.PALETTE.pink).toBe('#ff4fd8');
  });

  test('should have tuning values', () => {
    expect(config.TUNE).toBeDefined();
    expect(config.TUNE.rocket).toBeDefined();
    expect(config.TUNE.world).toBeDefined();
    expect(config.TUNE.spawn).toBeDefined();
    expect(config.TUNE.perf).toBeDefined();
  });

  test('should have boss roster', () => {
    expect(config.BOSSES).toBeDefined();
    expect(Array.isArray(config.BOSSES)).toBe(true);
    expect(config.BOSSES.length).toBeGreaterThan(0);
  });

  test('bosses should have required properties', () => {
    config.BOSSES.forEach(boss => {
      expect(boss.id).toBeDefined();
      expect(boss.type).toBeDefined();
      expect(boss.atLevel).toBeDefined();
      expect(boss.name).toBeDefined();
      expect(boss.hp).toBeGreaterThan(0);
    });
  });

  test('should have storage key', () => {
    expect(config.STORAGE_KEY).toBeDefined();
    expect(typeof config.STORAGE_KEY).toBe('string');
  });

  test('should have victory level', () => {
    expect(config.LEVEL_FOR_VICTORY).toBeDefined();
    expect(config.LEVEL_FOR_VICTORY).toBe(40);
  });
});
