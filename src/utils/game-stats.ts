import { IAtomicPlayer } from '../types/atomic-stat'
import IGame, { GameData } from '../types/game'
import { EmbeddedPlayer, PlayerData } from '../types/player'
import { addPlayerData } from './player-stats'

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

export const updateGameData = async (gameData: GameData, playerData?: IAtomicPlayer) => {
    if (!playerData) return
    if (playerData.goals > gameData.goalsLeader.total) {
        gameData.goalsLeader.player = parsePlayer(playerData)
        gameData.goalsLeader.total = playerData.goals
    }
    if (playerData.assists > gameData.assistsLeader.total) {
        gameData.assistsLeader.player = parsePlayer(playerData)
        gameData.assistsLeader.total = playerData.assists
    }
    if (playerData.pointsPlayed > gameData.pointsPlayedLeader.total) {
        gameData.pointsPlayedLeader.player = parsePlayer(playerData)
        gameData.pointsPlayedLeader.total = playerData.pointsPlayed
    }
    if (playerData.blocks > gameData.blocksLeader.total) {
        gameData.blocksLeader.player = parsePlayer(playerData)
        gameData.blocksLeader.total = playerData.blocks
    }
    if (calculatePlayerTurnovers(playerData) > gameData.turnoversLeader.total) {
        gameData.turnoversLeader.player = parsePlayer(playerData)
        gameData.turnoversLeader.total = calculatePlayerTurnovers(playerData)
    }
    if (!gameData.plusMinusLeader.player || calculatePlayerPlusMinus(playerData) > gameData.plusMinusLeader.total) {
        gameData.plusMinusLeader.player = parsePlayer(playerData)
        gameData.plusMinusLeader.total = calculatePlayerPlusMinus(playerData)
    }
}

const parsePlayer = (player: IAtomicPlayer): EmbeddedPlayer => {
    return {
        _id: player.playerId,
        firstName: player.firstName,
        lastName: player.lastName,
        username: player.username,
    }
}

export const calculatePlayerPlusMinus = (player: PlayerData): number => {
    return player.goals + player.assists + player.blocks - (player.drops + player.throwaways)
}

export const calculatePlayerTurnovers = (player: PlayerData): number => {
    return player.drops + player.throwaways + player.stalls
}

export const calculateWinner = (game: IGame): 'one' | 'two' => {
    const scores = { teamOne: 0, teamTwo: 0 }
    for (const point of game.points) {
        // only using team one stats b/c team one is guaranteed to exist
        // unlike team two
        if (point.teamOne.goalsFor === 1) {
            scores.teamOne += 1
        } else if (point.teamOne.goalsAgainst === 1) {
            scores.teamTwo += 1
        }
    }

    return scores.teamOne >= scores.teamTwo ? 'one' : 'two'
}
