import { safeFraction, removeElementsFromArray } from '../../../src/utils/utils'

describe('createSafeFraction', () => {
    it('with 0 denominator', () => {
        const result = safeFraction(1, 0)
        expect(result).toBe(0)
    })

    it('with non-0 denominator', () => {
        const result = safeFraction(1, 2)
        expect(result).toBe(0.5)
    })
})

describe('removeElementsFromArray', () => {
    it('single element case', () => {
        const superset = [1, 2, 3, 4, 5, 6, 7, 8, 9]
        const subset = [2, 4, 6, 8]
        const result = removeElementsFromArray(superset, subset)
        expect(result).toEqual([1, 3, 5, 7, 9])
    })

    it('multiple elements', () => {
        const superset = [5, 12, 9, 23, 5, 21, 5, 9, 18, 13, 4, 10, 4, 2, 4]
        const subset = [5, 4, 4, 13]
        const result = removeElementsFromArray(superset, subset)
        expect(result).toEqual([5, 12, 9, 23, 5, 21, 9, 18, 4, 10, 2])
    })

    it('with unfound elements', () => {
        const superset = [1, 2, 3]
        const subset = [3, 4, 5]
        const result = removeElementsFromArray(superset, subset)
        expect(result).toEqual([1, 2])
    })
})
