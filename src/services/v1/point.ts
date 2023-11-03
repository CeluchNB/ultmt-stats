import * as Constants from '../../utils/constants'
import { IngestedPoint } from '../../types/point'
import { Types } from 'mongoose'
import { PlayerDataId } from '../../types/player'
import Game from '../../models/game'
import AtomicPlayer from '../../models/atomic-player'
import Connection from '../../models/connection'
import Player from '../../models/player'
import { TeamData } from '../../types/team'
import Team from '../../models/team'
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
import { connectionHasValue, subtractConnectionData } from '../../utils/connection-stats'
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

    await saveTeamData(teamOneData, teamOneId)
    await saveTeamData(teamTwoData, teamTwoId)
    await saveAtomicTeam(teamOneData, game._id, teamOneId)
    await saveAtomicTeam(teamTwoData, game._id, teamTwoId)

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

const saveTeamData = async (teamData: TeamData, teamId?: Types.ObjectId) => {
    if (!teamId) return

    const values = getIncTeamData(teamData)
    const pushData = getPushTeamData(teamData)

    await Team.findOneAndUpdate(
        { _id: teamId },
        {
            $inc: values,
            $push: pushData,
        },
    )
}

const saveAtomicTeam = async (teamData: TeamData, gameId: Types.ObjectId, teamId?: Types.ObjectId) => {
    if (teamId) {
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
}

const saveConnectionData = async (connections: IConnection[], gameId: Types.ObjectId, teamId?: Types.ObjectId) => {
    const promises = []
    for (const connection of connections) {
        if (!connectionHasValue(connection)) continue

        promises.push(saveAtomicConnection(connection, gameId, teamId))
        promises.push(saveConnections(connection))
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

const saveConnections = async (connection: IConnection) => {
    await Connection.findOneAndUpdate(
        { throwerId: connection.throwerId, receiverId: connection.receiverId },
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
    const teamOnePromise = updateSubtractedTeamData(point.teamOne)
    const teamTwoPromise = updateSubtractedTeamData(point.teamTwo)

    const atomicTeamOnePromise = updateSubtractedAtomicTeamData(gameId, point.teamOne)
    const atomicTeamTwoPromise = updateSubtractedAtomicTeamData(gameId, point.teamTwo)

    await Promise.all([teamOnePromise, teamTwoPromise, atomicTeamOnePromise, atomicTeamTwoPromise])
}

const updateSubtractedTeamData = async (team?: IdentifiedTeamData) => {
    if (!team) return

    const teamRecord = await Team.findById(team._id)
    if (!teamRecord) return

    const { values, completionsToScore, completionsToTurnover } = getSubtractedTeamValues(teamRecord, team)

    await Team.findOneAndUpdate(
        { _id: team._id },
        {
            $inc: values,
            $set: { completionsToScore, completionsToTurnover },
        },
    )
}

const updateSubtractedAtomicTeamData = async (gameId: Types.ObjectId, team?: IdentifiedTeamData) => {
    if (!team) return

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
    const connectionRecord = await Connection.findOne({
        throwerId: connection.throwerId,
        receiverId: connection.receiverId,
    })
    const atomicConnectionRecord = await AtomicConnection.findOne({
        gameId,
        throwerId: connection.throwerId,
        receiverId: connection.receiverId,
    })

    connectionRecord?.set({ ...subtractConnectionData(connectionRecord, connection) })
    atomicConnectionRecord?.set({ ...subtractConnectionData(atomicConnectionRecord, connection) })
    await connectionRecord?.save()
    await atomicConnectionRecord?.save()
}
