# Daily Cat Firebase Functions

A Firebase Function that serves daily cat images from the Unsplash API, written in TypeScript.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Set your Unsplash API client ID as an environment variable:
   ```bash
   export UNSPLASH_CLIENT_ID=your_client_id_here
   ```

## Development

- **Build**: `npm run build` - Compiles TypeScript to JavaScript
- **Build (watch)**: `npm run build:watch` - Compiles with file watching
- **Test**: `npm test` - Runs tests with mocked dependencies
- **Serve locally**: `npm run serve` - Starts local Firebase emulator
- **Deploy**: `npm run deploy` - Deploys to Firebase
- **Format**: `npm run format` - Format code with Prettier
- **Format (check)**: `npm run format:check` - Check code formatting

## Project Structure

```
src/
├── index.ts      # Main Firebase function
├── cat-api.ts    # Unsplash API client
└── types.ts      # TypeScript type definitions

test/
└── compiled.test.js  # Test suite

lib/              # Compiled JavaScript output (gitignored)
```

## Features

- **TypeScript**: Full type safety with proper interfaces for Unsplash API responses
- **Error handling**: Graceful handling of API failures and missing configuration
- **Caching**: Appropriate cache headers for performance
- **Testing**: Comprehensive test suite with mocked dependencies
- **Environment flexibility**: Supports both Firebase config and environment variables

## API Response

The function returns an HTML page with:

- A cat image from Unsplash
- Responsive CSS for full-screen display
- A link to the original photo on Unsplash

## Tests

The test suite covers:

- HTTP method validation (GET only)
- API key configuration validation
- Cache header setting
- HTML response validation
- Error handling for API failures
- Unsplash API client functionality

Run tests with `npm test`.
