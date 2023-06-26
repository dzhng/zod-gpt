module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  clearMocks: true,
  roots: ['<rootDir>/src'],
  modulePaths: ['<rootDir>/src'],
  testRegex: '(/__tests__/.*|(\\.|/)(test))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  reporters: ['default'],
  globals: {
    // we must specify a custom tsconfig for tests because we need the typescript transform
    // to transform jsx into js rather than leaving it jsx such as the next build requires.  you
    // can see this setting in tsconfig.jest.json -> "jsx": "react"
    'ts-jest': {
      tsconfig: 'tsconfig.json',

      // set isolatedModules to fix jest memory leak with ts include directories
      // https://github.com/kulshekhar/ts-jest/issues/1967
      isolatedModules: true,
    },

    // disable types from preventing tests from running
    // https://github.com/kulshekhar/ts-jest/issues/822
    diagnostics: {
      exclude: ['!**/*.(spec|test).ts?(x)'],
    },
  },
};
