import { createSafeFraction } from '../../../src/utils/utils'

describe('createSafeFraction', () => {
    it('with 0 denominator', () => {
        const result = createSafeFraction(1, 0)
        expect(result).toBe(0)
    })

    it('with non-0 denominator', () => {
        const result = createSafeFraction(1, 2)
        expect(result).toBe(0.5)
    })
})
