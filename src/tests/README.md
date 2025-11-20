# Unit Tests

This directory contains unit tests for core utility functions in the AI Image Gallery application.

## Test Structure

```
src/tests/
├── setup.js                  # Test setup and configuration
├── utils/
│   ├── imageUtils.test.js    # Tests for image utility functions
│   └── searchUtils.test.js   # Tests for search utility functions
└── README.md                 # This file
```

## Running Tests

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests with coverage
```bash
npm run test:coverage
```

## Test Coverage

### Image Utilities (`imageUtils.test.js`)
- `isValidImageFormat` - Validates image file formats (JPEG, PNG)
- `formatFileSize` - Formats file sizes for display
- `generateUniqueFilename` - Generates unique filenames for uploads
- `createThumbnail` - Creates thumbnail images from files

### Search Utilities (`searchUtils.test.js`)
- `filterBySearchQuery` - Filters metadata by search query (tags/description)
- `filterByColor` - Filters metadata by color
- `cosineSimilarity` - Calculates cosine similarity between vectors
- `extractUniqueTags` - Extracts unique tags from metadata

## Test Framework

- **Vitest** - Fast unit test framework for Vite
- **React Testing Library** - React component testing utilities
- **jsdom** - DOM environment for testing

## Adding New Tests

When adding new utility functions, create corresponding test files following this pattern:

```javascript
import { describe, it, expect } from 'vitest'
import { myFunction } from '../../utils/myUtils'

describe('myUtils', () => {
  describe('myFunction', () => {
    it('should do something', () => {
      expect(myFunction(input)).toBe(expectedOutput)
    })
  })
})
```

## Coverage Goals

- Aim for >80% code coverage on utility functions
- Test edge cases and error handling
- Test both valid and invalid inputs

