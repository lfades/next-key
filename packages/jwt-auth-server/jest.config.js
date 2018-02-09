module.exports = {
  "globals": {
    "ts-jest": {
      "tsConfigFile": "tsconfig.test.json"
    }
  },
  "roots": [
    "<rootDir>/src"
  ],
  "transform": {
    "^.+\\.tsx?$": "ts-jest"
  },
  "testRegex": "(/__tests__/.*|(\\.|/)(test|spec))\\.(jsx?|tsx?)$",
  "moduleFileExtensions": [
    "ts",
    "tsx",
    "js",
    "jsx",
    "json"
  ],
  "mapCoverage": true,
  "coverageDirectory": "coverage",
  "collectCoverageFrom": [
    "src/**"
  ]
}
