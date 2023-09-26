import * as Constants from '../../utils/constants'
import Player from '../../models/player'
import { ApiError } from '../../types/error'
import IPlayer from '../../types/player'
import { IAtomicPlayer } from '../../types/atomic-stat'
import AtomicPlayer from '../../models/atomic-player'
import { addPlayerData } from '../../utils/player-stats'
import Game from '../../models/game'

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

export const rebuildAtomicPlayers = async (gameId: string) => {
    const game = await Game.findById(gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    // get ids of all players that played in the game
    const playerIds = game.points.map((point) => point.players.map((p) => p._id)).flat()
    // get all atomic players in this game
    const oldAtomicPlayers = await AtomicPlayer.find({ playerId: { $in: playerIds }, gameId: game._id })

    for (const player of oldAtomicPlayers) {
        const teamId = player.teamId

        // delete old atomic player with bad data
        await player.deleteOne()

        // create new atomic player
        await AtomicPlayer.create({
            teamId,
            gameId: game._id,
            playerId: player._id,
        })
    }

    // rebuild atomic players
    for (const point of game.points) {
        for (const player of point.players) {
            const atomicPlayer = await AtomicPlayer.findOne({ gameId: game._id, playerId: player._id })
            if (!atomicPlayer) continue

            atomicPlayer.set({ ...addPlayerData(atomicPlayer, player) })
            await atomicPlayer.save()
        }
    }

    // not adding new atomic player
}
