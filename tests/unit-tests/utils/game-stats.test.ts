import { calculatePlayerPlusMinus } from '../../../src/utils/game-stats'
import { getInitialPlayerData } from '../../../src/utils/player-stats'

describe('calculatePlayerPlusMinus', () => {
    it('with goal', () => {
        const result = calculatePlayerPlusMinus(getInitialPlayerData({ goals: 1 }))
        expect(result).toBe(1)
    })

    it('with assist', () => {
        const result = calculatePlayerPlusMinus(getInitialPlayerData({ assists: 1 }))
        expect(result).toBe(1)
    })

    it('with block', () => {
        const result = calculatePlayerPlusMinus(getInitialPlayerData({ blocks: 1 }))
        expect(result).toBe(1)
    })

    it('with throwaway', () => {
        const result = calculatePlayerPlusMinus(getInitialPlayerData({ throwaways: 1 }))
        expect(result).toBe(-1)
    })

    it('with drop', () => {
        const result = calculatePlayerPlusMinus(getInitialPlayerData({ drops: 1 }))
        expect(result).toBe(-1)
    })
})
