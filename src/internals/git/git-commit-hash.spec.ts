import { expect } from 'chai';
import { isInGitCommitHashFormat } from './git-commit-hash';

describe(`isInGitCommitHashFormat`, () => {
  it(`should validate if a string is a valid git commit hash`, () => {
    const testCases = [
      { input: "535f140d6d9d3532e6f4018cd02ea5b4e83c8e39", expected: true },  // Full hash
      { input: "aae72b4", expected: true },                                    // Short hash
      { input: "aae72b", expected: false },                                    // Too short
      { input: "xyz123", expected: false },                                    // Invalid chars
      { input: "  aae72b42  ", expected: true },                              // With whitespace
      { input: "", expected: false },                                          // Empty string
      { input: "aae72b42ad2a4d6a66f787e7297df455c0a2dfb6extra", expected: false }, // Too long
    ];

    testCases.forEach(({ input, expected }) => {
      const result = isInGitCommitHashFormat(input);
      expect(result).equal(expected, `Expected ${input} to be ${expected ? 'valid' : 'invalid'}`);
    });
  });

});