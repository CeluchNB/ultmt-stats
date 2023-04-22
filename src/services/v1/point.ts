import * as Constants from '../../utils/constants'
import { IngestedPoint } from '../../types/point'
import { Types } from 'mongoose'
import { EmbeddedPlayer, PlayerDataId } from '../../types/player'
import Game from '../../models/game'
import AtomicStat from '../../models/atomic-stat'
import Player from '../../models/player'
import { TeamData } from '../../types/team'
import Team from '../../models/team'
import { addPlayerData, calculatePlayerData, subtractPlayerData } from '../../utils/player-stats'
import { IPoint } from '../../types/game'
import { addTeamData, calculateTeamData, idEquals, subtractTeamData } from '../../utils/team-stats'
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

    await savePlayerData(teamOnePlayerStats, gameId, inputPoint.teamOnePlayers, teamOneId)
    await savePlayerData(teamTwoPlayerStats, gameId, inputPoint.teamTwoPlayers, teamTwoId)

    const teamOneData = calculateTeamData(inputPoint, 'one', teamOneId)
    const teamTwoData = calculateTeamData(inputPoint, 'two', teamTwoId)

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
        _id: new Types.ObjectId(inputPoint.pointId),
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
    players: EmbeddedPlayer[],
    teamId?: Types.ObjectId,
) => {
    for (const stats of playerStats) {
        await saveAtomicStat(stats, gameId, teamId)
        await savePlayerStats(stats, players)
    }
}

const saveAtomicStat = async (stats: PlayerDataId, gameId: Types.ObjectId, teamId?: Types.ObjectId) => {
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
        const embeddedPlayer = players.find((p) => idEquals(p._id, stats.playerId))
        await Player.create({ ...stats, ...embeddedPlayer })
    }
}

const saveTeamData = async (teamData: TeamData, teamId?: Types.ObjectId) => {
    const teamRecord = await Team.findById(teamId)
    teamRecord?.set({ ...addTeamData(teamRecord, teamData) })
    await teamRecord?.save()
}

export const deletePoint = async (gameId: string, pointId: string) => {
    const game = await Game.findById(gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    const point = game.points.find((p) => idEquals(p._id, pointId))
    if (!point) {
        throw new ApiError(Constants.POINT_NOT_FOUND, 404)
    }
    const players = await Player.where({ _id: { $in: point?.players.map((p) => p._id) } })
    const atomicStats = await AtomicStat.where({ playerId: { $in: point?.players.map((p) => p._id) } })

    // subtract point stats from players
    // subtract point stats from atomic stats
    for (const player of point.players) {
        const playerRecord = players.find((p) => idEquals(p._id, player._id))
        const atomicStatRecord = atomicStats.find((a) => idEquals(a.playerId, player._id))

        playerRecord?.set({ ...subtractPlayerData(playerRecord, player) })
        atomicStatRecord?.set({ ...subtractPlayerData(atomicStatRecord, player) })

        await playerRecord?.save()
        await atomicStatRecord?.save()
    }

    // subtract teamone stats from team one
    const teamOne = await Team.findById(point.teamOne._id)
    teamOne?.set({ ...subtractTeamData(teamOne, point.teamOne) })
    await teamOne?.save()

    // subtract team two stats from team two
    const teamTwo = await Team.findById(point.teamTwo._id)
    teamTwo?.set({ ...subtractTeamData(teamTwo, point.teamTwo) })
    await teamTwo?.save()

    // delete point from game
    game.points = game.points.filter((p) => !idEquals(p._id, pointId))

    // recalculate game leaders
    const playerMap = getGamePlayerData(game)
    await updateGameLeaders(game, playerMap, [])
    await game.save()
}
