import * as Constants from '../../utils/constants'
import { ApiError } from '../../types/error'
import IPlayer from '../../types/player'
import { IAtomicPlayer } from '../../types/atomic-stat'
import AtomicPlayer from '../../models/atomic-player'
import {
    addPlayerData,
    calculateCatchingPercentage,
    calculateDefensiveEfficiency,
    calculateOffensiveEfficiency,
    calculatePlusMinus,
    calculatePpAssists,
    calculatePpBlocks,
    calculatePpDrops,
    calculatePpGoals,
    calculatePpHockeyAssists,
    calculatePpThrowaways,
    calculateThrowingPercentage,
    calculateWinPercentage,
    getInitialPlayerData,
} from '../../utils/player-stats'

export const getPlayerById = async (playerId: string): Promise<IPlayer> => {
    const players = await AtomicPlayer.find({ playerId })
    if (players.length === 0) {
        throw new ApiError(Constants.PLAYER_NOT_FOUND, 404)
    }

    const playerData = players[players.length - 1]

    const stats = players.reduce((prev, curr) => {
        return addPlayerData(prev, curr)
    }, getInitialPlayerData({}))

    return {
        ...playerData,
        ...playerData.toJSON(),
        ...stats,
        plusMinus: calculatePlusMinus(stats),
        catchingPercentage: calculateCatchingPercentage(stats),
        throwingPercentage: calculateThrowingPercentage(stats),
        ppGoals: calculatePpGoals(stats),
        ppAssists: calculatePpAssists(stats),
        ppHockeyAssists: calculatePpHockeyAssists(stats),
        ppThrowaways: calculatePpThrowaways(stats),
        ppDrops: calculatePpDrops(stats),
        ppBlocks: calculatePpBlocks(stats),
        winPercentage: calculateWinPercentage(stats),
        offensiveEfficiency: calculateOffensiveEfficiency(stats),
        defensiveEfficiency: calculateDefensiveEfficiency(stats),
        games: [],
        teams: [],
    }
}

export const filterPlayerStats = async (
    playerId: string,
    gameIds: string[],
    teamIds: string[],
): Promise<IAtomicPlayer[]> => {
    const filter: { $and: unknown[] } = { $and: [] }
    if (gameIds.length > 0) {
        filter.$and.push({ gameId: { $in: gameIds } })
    }
    if (teamIds.length > 0) {
        filter.$and.push({ teamId: { $in: teamIds } })
    }
    const stats = await AtomicPlayer.where({
        playerId,
        ...filter,
    })

    return stats
}
