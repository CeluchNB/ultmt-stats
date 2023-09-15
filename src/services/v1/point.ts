import * as Constants from '../../utils/constants'
import { IngestedPoint } from '../../types/point'
import { Types } from 'mongoose'
import { EmbeddedPlayer, PlayerDataId } from '../../types/player'
import Game from '../../models/game'
import AtomicPlayer from '../../models/atomic-player'
import Player from '../../models/player'
import { TeamData } from '../../types/team'
import Team from '../../models/team'
import { addPlayerData, calculatePlayerData, subtractPlayerData } from '../../utils/player-stats'
import { IPoint } from '../../types/game'
import {
    addTeamData,
    calculateMomentumData,
    calculateTeamData,
    idEquals,
    subtractTeamData,
} from '../../utils/team-stats'
import { getGamePlayerData, updateGameLeaders } from '../../utils/game-stats'
import { ApiError } from '../../types/error'
import AtomicTeam from '../../models/atomic-team'

export const ingestPoint = async (inputPoint: IngestedPoint) => {
    const game = await Game.findById(inputPoint.gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    const { _id: gameId, teamOneId, teamTwoId } = game
    const teamOnePlayerStats = calculatePlayerData(inputPoint.teamOnePlayers, inputPoint.teamOneActions, 'one')
    const teamTwoPlayerStats = calculatePlayerData(inputPoint.teamTwoPlayers, inputPoint.teamTwoActions, 'two')

    await savePlayerData(teamOnePlayerStats, gameId, inputPoint.teamOnePlayers, teamOneId)
    await savePlayerData(teamTwoPlayerStats, gameId, inputPoint.teamTwoPlayers, teamTwoId)

    const teamOneData = calculateTeamData(inputPoint, 'one', teamOneId)
    const teamTwoData = calculateTeamData(inputPoint, 'two', teamTwoId)

    await saveTeamData(teamOneData, teamOneId)
    await saveTeamData(teamTwoData, teamTwoId)
    await saveAtomicTeam(teamOneData, game._id, teamOneId)
    await saveAtomicTeam(teamTwoData, game._id, teamTwoId)

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
    const momentumData = calculateMomentumData(
        inputPoint.teamOneActions,
        game.momentumData[game.momentumData.length - 1],
    )
    game.momentumData.push(...momentumData)
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
        await saveAtomicPlayer(stats, gameId, teamId)
        await savePlayerStats(stats, players)
    }
}

const saveAtomicPlayer = async (stats: PlayerDataId, gameId: Types.ObjectId, teamId?: Types.ObjectId) => {
    const query = await AtomicPlayer.find({ playerId: stats.playerId, gameId })
    if (query.length === 1) {
        const record = query[0]
        record.set({
            ...addPlayerData(record, stats),
        })
        await record.save()
    } else if (teamId) {
        await AtomicPlayer.create({
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

const saveAtomicTeam = async (teamData: TeamData, gameId: Types.ObjectId, teamId?: Types.ObjectId) => {
    const query = await AtomicTeam.where({ gameId, teamId })
    if (query.length === 1) {
        const record = query[0]
        record.set({ ...addTeamData(record, teamData) })
        record.save()
    } else if (teamId) {
        await AtomicTeam.create({
            ...teamData,
            gameId,
            teamId,
        })
    }
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
    const atomicPlayers = await AtomicPlayer.where({ playerId: { $in: point?.players.map((p) => p._id) } })

    // subtract point stats from players
    // subtract point stats from atomic stats
    for (const player of point.players) {
        const playerRecord = players.find((p) => idEquals(p._id, player._id))
        const atomicPlayerRecord = atomicPlayers.find((a) => idEquals(a.playerId, player._id))

        playerRecord?.set({ ...subtractPlayerData(playerRecord, player) })
        atomicPlayerRecord?.set({ ...subtractPlayerData(atomicPlayerRecord, player) })

        await playerRecord?.save()
        await atomicPlayerRecord?.save()
    }

    // subtract stats from teams
    await removePointDataFromTeam(point, game._id)

    // delete point from game
    game.points = game.points.filter((p) => !idEquals(p._id, pointId))

    // recalculate game leaders
    const playerMap = getGamePlayerData(game)
    await updateGameLeaders(game, playerMap, [])
    await game.save()
}

const removePointDataFromTeam = async (point: IPoint, gameId: Types.ObjectId) => {
    const teamOne = await Team.findById(point.teamOne._id)
    teamOne?.set({ ...subtractTeamData(teamOne, point.teamOne) })
    await teamOne?.save()

    const teamTwo = await Team.findById(point.teamTwo._id)
    teamTwo?.set({ ...subtractTeamData(teamTwo, point.teamTwo) })
    await teamTwo?.save()

    const atomicTeamOne = await AtomicTeam.findOne({ gameId, teamId: point.teamOne._id })
    atomicTeamOne?.set({ ...subtractTeamData(atomicTeamOne, point.teamOne) })
    await atomicTeamOne?.save()

    const atomicTeamTwo = await AtomicTeam.findOne({ gameId, teamId: point.teamTwo._id })
    atomicTeamTwo?.set({ ...subtractTeamData(atomicTeamTwo, point.teamTwo) })
    await atomicTeamTwo?.save()
}
