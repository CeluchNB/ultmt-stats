import * as Constants from '../../utils/constants'
import { IngestedPoint } from '../../types/point'
import { Types } from 'mongoose'
import { PlayerDataId } from '../../types/player'
import Game from '../../models/game'
import AtomicPlayer from '../../models/atomic-player'
import Player from '../../models/player'
import { TeamData } from '../../types/team'
import { calculatePlayerData, getDecPlayerData, updatePlayerStatsByTeamStats } from '../../utils/player-stats'
import { IPoint, IdentifiedTeamData } from '../../types/game'
import {
    calculateMomentumData,
    calculateTeamData,
    getIncTeamData,
    getPushTeamData,
    getSubtractedTeamValues,
} from '../../utils/team-stats'
import { ApiError } from '../../types/error'
import AtomicTeam from '../../models/atomic-team'
import { IConnection } from '../../types/connection'
import AtomicConnection from '../../models/atomic-connection'
import { connectionHasValue, getDecConnectionValues } from '../../utils/connection-stats'
import { idEquals } from '../../utils/utils'

export const ingestPoint = async (inputPoint: IngestedPoint) => {
    const game = await Game.findById(inputPoint.gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    const { _id: gameId, teamOneId, teamTwoId } = game
    const { players: teamOnePlayerStats, connections: teamOneConnections } = calculatePlayerData(
        inputPoint.teamOnePlayers,
        inputPoint.teamOneActions,
        'one',
    )
    const { players: teamTwoPlayerStats, connections: teamTwoConnections } = calculatePlayerData(
        inputPoint.teamTwoPlayers,
        inputPoint.teamTwoActions,
        'two',
    )

    const teamOneData = calculateTeamData(inputPoint, 'one', teamOneId)
    const teamTwoData = calculateTeamData(inputPoint, 'two', teamTwoId)

    // await updateAddedTeamStats(teamOneData, teamOneId)
    // await updateAddedTeamStats(teamTwoData, teamTwoId)
    await updateAddedAtomicTeamStats(teamOneData, game._id, teamOneId)
    await updateAddedAtomicTeamStats(teamTwoData, game._id, teamTwoId)

    updatePlayerStatsByTeamStats(teamOnePlayerStats, teamOneData)
    updatePlayerStatsByTeamStats(teamTwoPlayerStats, teamTwoData)

    await savePlayerData(teamOnePlayerStats, gameId, teamOneId)
    await savePlayerData(teamTwoPlayerStats, gameId, teamTwoId)

    await saveConnectionData(teamOneConnections, gameId, teamOneId)
    await saveConnectionData(teamTwoConnections, gameId, teamTwoId)

    const idPlayerDataOne = teamOnePlayerStats.map((stats) => {
        return { _id: stats.playerId, ...stats }
    })

    const idPlayerDataTwo = teamTwoPlayerStats.map((stats) => {
        return { _id: stats.playerId, ...stats }
    })

    const idPlayerData = [...idPlayerDataOne, ...idPlayerDataTwo]
    const connectionData = [...teamOneConnections, ...teamTwoConnections]

    const gamePoint: IPoint = {
        _id: new Types.ObjectId(inputPoint.pointId),
        teamOne: { _id: teamOneId, ...teamOneData },
        teamTwo: { _id: teamTwoId, ...teamTwoData },
        players: idPlayerData,
        connections: connectionData,
    }
    const momentumData = calculateMomentumData(
        inputPoint.teamOneActions,
        game.momentumData[game.momentumData.length - 1],
    )
    game.momentumData.push(...momentumData)
    game.points.push(gamePoint)

    await Game.findOneAndUpdate(
        { _id: inputPoint.gameId },
        { $push: { momentumData: { $each: momentumData }, points: gamePoint } },
    )
}

const savePlayerData = async (
    playerStats: PlayerDataId[],
    gameId: Types.ObjectId,
    // players: EmbeddedPlayer[],
    teamId?: Types.ObjectId,
) => {
    const promises = []
    for (const stats of playerStats) {
        promises.push(saveAtomicPlayer(stats, gameId, teamId))
        promises.push(savePlayerStats(stats))
    }
    await Promise.all(promises)
}

const saveAtomicPlayer = async (stats: PlayerDataId, gameId: Types.ObjectId, teamId?: Types.ObjectId) => {
    if (teamId) {
        const tempStats = JSON.parse(JSON.stringify(stats))
        delete tempStats.playerId

        await AtomicPlayer.findOneAndUpdate(
            { playerId: stats.playerId, gameId, teamId },
            { $inc: { ...tempStats } },
            { upsert: true },
        )
    }
}

const savePlayerStats = async (stats: PlayerDataId) => {
    await Player.findOneAndUpdate(
        { _id: stats.playerId },
        {
            $inc: stats,
        },
        { upsert: true },
    )
}

export const updateAddedAtomicTeamStats = async (
    teamData: TeamData,
    gameId: Types.ObjectId,
    teamId?: Types.ObjectId,
) => {
    if (!teamId) return

    const incValues = getIncTeamData(teamData)
    const pushValues = getPushTeamData(teamData)

    await AtomicTeam.findOneAndUpdate(
        { gameId, teamId },
        {
            $inc: incValues,
            $push: pushValues,
        },
        { upsert: true },
    )
}

const saveConnectionData = async (connections: IConnection[], gameId: Types.ObjectId, teamId?: Types.ObjectId) => {
    const promises = []
    for (const connection of connections) {
        if (!connectionHasValue(connection)) continue

        promises.push(saveAtomicConnection(connection, gameId, teamId))
    }
    await Promise.all(promises)
}

const saveAtomicConnection = async (connection: IConnection, gameId: Types.ObjectId, teamId?: Types.ObjectId) => {
    await AtomicConnection.findOneAndUpdate(
        { gameId, teamId, throwerId: connection.throwerId, receiverId: connection.receiverId },
        {
            $inc: {
                catches: connection.catches,
                drops: connection.drops,
                scores: connection.scores,
            },
        },
        { upsert: true },
    )
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

    // subtract point stats from players
    // subtract point stats from atomic stats
    const playerPromises = []
    for (const player of point.players) {
        playerPromises.push(Player.findOneAndUpdate({ _id: player._id }, { $inc: getDecPlayerData(player) }))
        playerPromises.push(
            AtomicPlayer.findOneAndUpdate(
                { playerId: player._id, gameId: game._id },
                { $inc: getDecPlayerData(player) },
            ),
        )
    }
    await Promise.all(playerPromises)

    const connectionPromises = []
    for (const connection of point.connections) {
        connectionPromises.push(removePointDataFromConnection(connection, gameId))
    }
    await Promise.all(connectionPromises)

    // subtract stats from teams
    await removePointDataFromTeams(point, game._id)

    await Game.findByIdAndUpdate(gameId, {
        $pull: { points: { _id: pointId } },
    })
}

const removePointDataFromTeams = async (point: IPoint, gameId: Types.ObjectId) => {
    const atomicTeamOnePromise = updateSubtractedAtomicTeamStats(gameId, point.teamOne)
    const atomicTeamTwoPromise = updateSubtractedAtomicTeamStats(gameId, point.teamTwo)

    await Promise.all([atomicTeamOnePromise, atomicTeamTwoPromise])
}

export const updateSubtractedAtomicTeamStats = async (gameId: Types.ObjectId, team?: IdentifiedTeamData) => {
    if (!team?._id) return

    const atomicTeam = await AtomicTeam.findOne({ gameId, teamId: team._id })
    if (!atomicTeam) return

    const { values, completionsToScore, completionsToTurnover } = getSubtractedTeamValues(atomicTeam, team)

    await AtomicTeam.findOneAndUpdate(
        { gameId, teamId: team._id },
        {
            $inc: values,
            $set: { completionsToScore, completionsToTurnover },
        },
    )
}

const removePointDataFromConnection = async (connection: IConnection, gameId: string) => {
    const values = getDecConnectionValues(connection)

    await AtomicConnection.findOneAndUpdate(
        { gameId, throwerId: connection.throwerId, receiverId: connection.receiverId },
        { $inc: values },
    )
}
