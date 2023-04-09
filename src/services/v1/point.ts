import * as Constants from '../../utils/constants'
import { IngestedPoint } from '../../types/point'
import { Types } from 'mongoose'
import { EmbeddedPlayer, PlayerDataId } from '../../types/player'
import Game from '../../models/game'
import AtomicStat from '../../models/atomic-stat'
import Player from '../../models/player'
import { TeamData } from '../../types/team'
import Team from '../../models/team'
import { addPlayerData, calculatePlayerData } from '../../utils/player-stats'
import { IPoint } from '../../types/game'
import { addTeamData, calculateTeamData, idEquals } from '../../utils/team-stats'
import { getGamePlayerData, updateGameLeaders } from '../../utils/game-stats'
import { ApiError } from '../../types/error'

export const ingestPoint = async (inputPoint: IngestedPoint) => {
    const game = await Game.findById(inputPoint.gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    const { _id: gameId, teamOneId, teamTwoId } = game
    const teamOnePlayerStats = calculatePlayerData(inputPoint.teamOnePlayers, inputPoint.teamOneActions)
    const teamTwoPlayerStats = calculatePlayerData(inputPoint.teamTwoPlayers, inputPoint.teamTwoActions)

    await savePlayerData(teamOnePlayerStats, gameId, teamOneId, inputPoint.teamOnePlayers)
    await savePlayerData(teamTwoPlayerStats, gameId, teamTwoId, inputPoint.teamTwoPlayers)

    const teamOneData = calculateTeamData(teamOneId, inputPoint, 'one')
    const teamTwoData = calculateTeamData(teamTwoId, inputPoint, 'two')

    await saveTeamData(teamOneData, teamOneId)
    await saveTeamData(teamTwoData, teamTwoId)

    const idPlayerDataOne = teamOnePlayerStats.map((stats) => {
        return { _id: stats.playerId, ...stats }
    })

    const idPlayerDataTwo = teamTwoPlayerStats.map((stats) => {
        return { _id: stats.playerId, ...stats }
    })

    const idPlayerData = [...idPlayerDataOne, ...idPlayerDataTwo]
    const pointPlayers = [...inputPoint.teamOnePlayers, ...inputPoint.teamTwoPlayers]

    const gamePoint: IPoint = {
        _id: new Types.ObjectId(),
        teamOne: { _id: teamOneId, ...teamOneData },
        teamTwo: { _id: teamTwoId, ...teamTwoData },
        players: idPlayerData,
    }
    game.points.push(gamePoint)

    const playerMap = getGamePlayerData(game)
    await updateGameLeaders(game, playerMap, pointPlayers)

    await game.save()
}

const savePlayerData = async (
    playerStats: PlayerDataId[],
    gameId: Types.ObjectId,
    teamId: Types.ObjectId,
    players: EmbeddedPlayer[],
) => {
    for (const stats of playerStats) {
        await saveAtomicStat(stats, gameId, teamId)
        await savePlayerStats(stats, players)
    }
}

const saveAtomicStat = async (stats: PlayerDataId, gameId: Types.ObjectId, teamId: Types.ObjectId) => {
    const statQuery = await AtomicStat.find({ playerId: stats.playerId, gameId })
    if (statQuery.length === 1) {
        const record = statQuery[0]
        record.set({
            ...addPlayerData(record, stats),
        })
        await record.save()
    } else {
        await AtomicStat.create({
            ...stats,
            gameId,
            teamId,
        })
    }
}

const savePlayerStats = async (stats: PlayerDataId, players: EmbeddedPlayer[]) => {
    const player = await Player.findById(stats.playerId)
    if (player) {
        player.set({ ...addPlayerData(player, stats) })
        await player.save()
    } else {
        // TODO: get player in a better way?
        const embeddedPlayer = players.find((p) => idEquals(p._id, stats.playerId))
        await Player.create({ ...stats, ...embeddedPlayer })
    }
}

const saveTeamData = async (teamData: TeamData, teamId: Types.ObjectId) => {
    const teamRecord = await Team.findById(teamId)
    teamRecord?.set({ ...addTeamData(teamRecord, teamData) })
    await teamRecord?.save()
}
