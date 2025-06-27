# Continuous Integration Setup

This document describes how to set up CI for the daily-cat project with the new root-level package.json structure.

## Overview

The project now uses a two-level dependency structure:
- **Root level**: Project-wide tools (firebase-tools, prettier)  
- **Functions level**: Function-specific dependencies (typescript, firebase-functions, etc.)

## CI Setup Steps

### 1. Install Root Dependencies

Install project-wide tools and dependencies:

```bash
npm ci
```

This installs:
- `firebase-tools` for deployment
- `prettier` for code formatting

### 2. Install Function Dependencies

Install function-specific dependencies:

```bash
cd functions
npm ci
```

### 3. Check Code Formatting

Run formatting checks from the root directory:

```bash
npm run format:check
```

This checks formatting for all TypeScript, JSON, and HTML files across the entire project.

### 4. Build Functions

Build the TypeScript functions:

```bash
cd functions
npm run build
```

### 5. Run Tests

Execute the function tests:

```bash
cd functions
npm test
```

## Complete CI Workflow

Here's a complete example for GitHub Actions:

```yaml
- name: Install root dependencies
  run: npm ci

- name: Install function dependencies
  run: |
    cd functions
    npm ci

- name: Check formatting
  run: npm run format:check

- name: Build functions
  run: |
    cd functions
    npm run build

- name: Run tests
  run: |
    cd functions
    npm test
```

## Cache Configuration

For optimal performance, cache both root and functions node_modules:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20.x'
    cache: 'npm'
    cache-dependency-path: |
      package-lock.json
      functions/package-lock.json
```

## Benefits

- **Centralized tooling**: Firebase CLI and Prettier available project-wide
- **Consistent formatting**: Single configuration applies to all files
- **Efficient caching**: Both dependency levels are cached
- **Clear separation**: Project tools vs function-specific dependencies