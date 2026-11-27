module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.spec.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/e2e/"],
  transform: { "^.+\\.tsx?$": ["ts-jest", { tsconfig: "tsconfig.spec.json" }] },
  collectCoverageFrom: [
    "src/app/domain/*.ts",
    "src/app/data/*.ts",
    "!**/*.spec.ts",
  ],
};
