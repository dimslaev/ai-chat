module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  clearMocks: true,
  coverageDirectory: "coverage",
  coverageProvider: "v8",
  roots: ["<rootDir>/src"],
  testMatch: [
    "**/__tests__/**/*.+(ts|tsx|js)",
    "**/?(*.)+(spec|test).+(ts|tsx|js)",
  ],
  testPathIgnorePatterns: ["/node_modules/", "/out/"],
  transform: {
    "^.+.(ts|tsx)$": "ts-jest",
  },
};
