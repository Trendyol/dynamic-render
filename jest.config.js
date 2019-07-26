module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  modulePathIgnorePatterns: ["helpers"],
  collectCoverage: true,
  collectCoverageFrom: [
    "src/**/*.ts"
  ]
};
