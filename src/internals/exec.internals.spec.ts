import { expect } from 'chai';
import { execInternals } from './exec-internals';

describe(`execInternals`, () => {
    it(`should return a string`, () => {
        const result = execInternals();
        expect(typeof result).equal(`string`);
    });
});
