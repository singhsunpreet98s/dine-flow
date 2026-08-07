export default {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    // Must come before the generic @/ mapper so it takes precedence.
    // Redirects to a Jest-compatible stub that avoids import.meta.env.
    '^@/app/api$': '<rootDir>/src/__mocks__/appApi.ts',
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: { jsx: 'react-jsx' } }],
  },
}
