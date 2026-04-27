# Tests

This directory contains unit and integration tests for the Rocket Rush game.

## Test Files

- `utils.test.js` - Tests for utility functions (math helpers, RNG, geometry)
- `config.test.js` - Tests for configuration constants and tuning values
- `state.test.js` - Tests for game state management

## Running Tests

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch
```

## Adding New Tests

Create new test files following the pattern `[module].test.js` in this directory.
Tests use Jest with jsdom environment for DOM-related testing.
