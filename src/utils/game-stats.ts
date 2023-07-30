import Player from '../models/player'
import IGame, { GameData } from '../types/game'
import { EmbeddedPlayer, PlayerData } from '../types/player'
import { addPlayerData } from './player-stats'
import { idEquals } from './team-stats'

export const getGamePlayerData = (game: IGame): Map<string, PlayerData> => {
    const playerMap = new Map<string, PlayerData>()
    for (const point of game.points) {
        for (const player of point.players) {
            const playerValues = playerMap.get(player._id.toString())
            if (playerValues) {
                playerMap.set(player._id.toString(), addPlayerData(playerValues, player))
            } else {
                playerMap.set(player._id.toString(), player)
            }
        }
    }
    return playerMap
}

export const updateGameLeaders = async (
    game: IGame,
    playerMap: Map<string, PlayerData>,
    pointPlayers: EmbeddedPlayer[],
) => {
    if (playerMap.size === 0) {
        game.goalsLeader.player = undefined
        game.goalsLeader.total = 0
        game.assistsLeader.player = undefined
        game.assistsLeader.total = 0
        game.pointsPlayedLeader.player = undefined
        game.pointsPlayedLeader.total = 0
        game.blocksLeader.player = undefined
        game.blocksLeader.total = 0
        game.turnoversLeader.player = undefined
        game.turnoversLeader.total = 0
        game.plusMinusLeader.player = undefined
        game.plusMinusLeader.total = 0
        return
    }
    for (const values of playerMap.entries()) {
        let player = pointPlayers.find((p) => idEquals(p._id, values[0]))
        if (!player) {
            // TODO: get players more efficiently
            player = (await Player.findById(values[0])) || undefined
        }

        updateGameData(game, values[1], player)
    }
}

export const updateGameData = async (gameData: GameData, playerData: PlayerData, player?: EmbeddedPlayer | null) => {
    if (!player) return
    if (playerData.goals > gameData.goalsLeader.total) {
        gameData.goalsLeader.player = player
        gameData.goalsLeader.total = playerData.goals
    }
    if (playerData.assists > gameData.assistsLeader.total) {
        gameData.assistsLeader.player = player
        gameData.assistsLeader.total = playerData.assists
    }
    if (playerData.pointsPlayed > gameData.pointsPlayedLeader.total) {
        gameData.pointsPlayedLeader.player = player
        gameData.pointsPlayedLeader.total = playerData.pointsPlayed
    }
    if (playerData.blocks > gameData.blocksLeader.total) {
        gameData.blocksLeader.player = player
        gameData.blocksLeader.total = playerData.blocks
    }
    if (calculatePlayerTurnovers(playerData) > gameData.turnoversLeader.total) {
        gameData.turnoversLeader.player = player
        gameData.turnoversLeader.total = calculatePlayerTurnovers(playerData)
    }
    if (!gameData.plusMinusLeader.player || calculatePlayerPlusMinus(playerData) > gameData.plusMinusLeader.total) {
        gameData.plusMinusLeader.player = player
        gameData.plusMinusLeader.total = calculatePlayerPlusMinus(playerData)
    }
}

export const calculatePlayerPlusMinus = (player: PlayerData): number => {
    return player.goals + player.assists + player.blocks - (player.drops + player.throwaways)
}

export const calculatePlayerTurnovers = (player: PlayerData): number => {
    return player.drops + player.throwaways + player.stalls
}
