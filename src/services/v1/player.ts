import * as Constants from '../../utils/constants'
import Player from '../../models/player'
import { ApiError } from '../../types/error'
import IPlayer from '../../types/player'
import { IAtomicPlayer } from '../../types/atomic-stat'
import AtomicPlayer from '../../models/atomic-player'

export const getPlayerById = async (playerId: string): Promise<IPlayer> => {
    const player = await Player.findById(playerId)
    if (!player) {
        throw new ApiError(Constants.PLAYER_NOT_FOUND, 404)
    }

    return player
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
