import { Types } from 'mongoose'
import Player from '../models/player'
import IGame from '../types/game'
import { EmbeddedPlayer, PlayerData } from '../types/player'
import { addPlayerData } from './player-stats'

export const getGamePlayerData = (game: IGame): Map<Types.ObjectId, PlayerData> => {
    const playerMap = new Map<Types.ObjectId, PlayerData>()
    for (const point of game.points) {
        for (const player of point.players) {
            const playerValues = playerMap.get(player._id)
            if (playerValues) {
                playerMap.set(player._id, addPlayerData(playerValues, player))
            } else {
                playerMap.set(player._id, player)
            }
        }
    }
    return playerMap
}

export const updateGameLeaders = async (
    game: IGame,
    playerMap: Map<Types.ObjectId, PlayerData>,
    pointPlayers: EmbeddedPlayer[],
) => {
    for (const values of playerMap.entries()) {
        let player = pointPlayers.find((p) => p._id.equals(values[0]))
        if (!player) {
            // TODO: get players more efficiently
            player = (await Player.findById(values[0])) || undefined
        }
        if (!player) continue

        if (values[1].goals > game.goalsLeader.total) {
            game.goalsLeader.player = player
            game.goalsLeader.total = values[1].goals
        }
        if (values[1].assists > game.assistsLeader.total) {
            game.assistsLeader.player = player
            game.assistsLeader.total = values[1].assists
        }
        if (values[1].pointsPlayed > game.pointsPlayedLeader.total) {
            game.pointsPlayedLeader.player = player
            game.pointsPlayedLeader.total = values[1].pointsPlayed
        }
        if (values[1].blocks > game.blocksLeader.total) {
            game.blocksLeader.player = player
            game.blocksLeader.total = values[1].blocks
        }
        if (values[1].drops + values[1].throwaways > game.turnoversLeader.total) {
            game.turnoversLeader.player = player
            game.turnoversLeader.total = values[1].drops + values[1].throwaways
        }
        if (calculatePlayerPlusMinus(values[1]) > game.plusMinusLeader.total) {
            game.plusMinusLeader.player = player
            game.plusMinusLeader.total = calculatePlayerPlusMinus(values[1])
        }
    }
}

export const calculatePlayerPlusMinus = (player: PlayerData): number => {
    return player.goals + player.assists + player.blocks - (player.drops + player.throwaways)
}
