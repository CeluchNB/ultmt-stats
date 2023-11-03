import * as Constants from '../../utils/constants'
import AtomicPlayer from '../../models/atomic-player'
import Game from '../../models/game'
import IGame, { FilteredGameData, FilteredGamePlayer, GameData, GameInput } from '../../types/game'
import Team from '../../models/team'
import Player from '../../models/player'
import { EmbeddedPlayer } from '../../types/player'
import { FilterQuery, Types } from 'mongoose'
import { ApiError } from '../../types/error'
import { calculateWinner, updateGameData } from '../../utils/game-stats'
import AtomicTeam from '../../models/atomic-team'
import { getIncTeamData, getInitialTeamData, getPushTeamData, getSubtractedTeamValues } from '../../utils/team-stats'
import { IAtomicPlayer } from '../../types/atomic-stat'
import { addPlayerData, getInitialPlayerData, subtractPlayerData } from '../../utils/player-stats'
import { idEquals } from '../../utils/utils'
import AtomicConnection from '../../models/atomic-connection'
import Connection from '../../models/connection'
import { subtractConnectionData } from '../../utils/connection-stats'
import { IConnection } from '../../types/connection'

export const createGame = async (gameInput: GameInput) => {
    const prevGame = await Game.findById(gameInput._id)

    if (prevGame) {
        throw new ApiError(Constants.GAME_ALREADY_EXISTS, 400)
    }

    // create game
    const game = await Game.create({
        _id: gameInput._id,
        startTime: gameInput.startTime,
        teamOneId: gameInput.teamOne._id,
        teamTwoId: gameInput.teamTwo?._id,
        momentumData: [{ x: 0, y: 0 }],
    })

    const incValues = getIncTeamData(getInitialTeamData({}))
    const pushValues = getPushTeamData(getInitialTeamData({}))

    const teamOne = await Team.findOneAndUpdate(
        { _id: gameInput.teamOne._id },
        {
            $set: { ...gameInput.teamOne },
            $push: { games: game._id },
            $addToSet: { players: { $each: gameInput.teamOnePlayers } },
        },
        { upsert: true, new: true },
    )

    await AtomicTeam.findOneAndUpdate(
        { gameId: game._id, teamId: teamOne?._id },
        { $inc: incValues, $push: pushValues },
        { upsert: true },
    )

    for (const p of gameInput.teamOnePlayers) {
        await createPlayerStatRecords(p, game._id, teamOne._id)
    }

    if (gameInput.teamTwo._id) {
        const teamTwo = await Team.findOneAndUpdate(
            { _id: gameInput.teamTwo._id },
            {
                $set: { ...gameInput.teamTwo },
                $push: { games: game._id },
                $addToSet: { players: { $each: gameInput.teamTwoPlayers } },
            },
            { upsert: true, new: true },
        )

        await AtomicTeam.findOneAndUpdate(
            { gameId: game._id, teamId: teamTwo._id },
            { $inc: incValues, $push: pushValues },
            { upsert: true },
        )

        for (const p of gameInput.teamTwoPlayers) {
            await createPlayerStatRecords(p, game._id, teamTwo._id)
        }
    }
}

const createPlayerStatRecords = async (player: EmbeddedPlayer, gameId: Types.ObjectId, teamId: Types.ObjectId) => {
    await upsertPlayerRecord(player, gameId)
    // cannot take this out b/c some players may not play in a point and they should still exist
    // but $inc is VITAL here
    await AtomicPlayer.findOneAndUpdate(
        { playerId: player._id, teamId, gameId },
        { $inc: getInitialPlayerData({}) },
        {
            upsert: true,
        },
    )
}

const upsertPlayerRecord = async (player: EmbeddedPlayer, gameId: Types.ObjectId) => {
    let playerRecord = await Player.findById(player._id)
    if (!playerRecord) {
        playerRecord = await Player.create({ ...player })
    }
    playerRecord.games.push(gameId)
    await playerRecord.save()
}

export const finishGame = async (gameId: string) => {
    const game = await Game.findById(gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    const teamOne = await Team.findById(game.teamOneId)
    const teamTwo = await Team.findById(game.teamTwoId)

    const prevWinner = game.winningTeam

    const winner = calculateWinner(game)

    const promises = []
    if (winner === 'one') {
        if (prevWinner === 'two') {
            // needed when a game is restarted
            promises.push(updateTeam(1, -1, game.teamOneId))
            promises.push(updateTeam(-1, 1, game.teamTwoId))
            promises.push(updateAtomicTeam(1, -1, game._id, game.teamOneId))
            promises.push(updateAtomicTeam(-1, 1, game._id, game.teamTwoId))
            promises.push(updatePlayers({ losses: -1, wins: 1 }, gameId, teamOne?._id.toHexString(), teamOne?.players))
            promises.push(updatePlayers({ losses: 1, wins: -1 }, gameId, teamTwo?._id.toHexString(), teamTwo?.players))
        } else if (!prevWinner) {
            promises.push(updateTeam(1, 0, game.teamOneId))
            promises.push(updateTeam(0, 1, game.teamTwoId))
            promises.push(updateAtomicTeam(1, 0, game._id, game.teamOneId))
            promises.push(updateAtomicTeam(0, 1, game._id, game.teamTwoId))
            promises.push(updatePlayers({ wins: 1 }, gameId, teamOne?._id.toHexString(), teamOne?.players))
            promises.push(updatePlayers({ losses: 1 }, gameId, teamTwo?._id.toHexString(), teamTwo?.players))
        }
    } else {
        if (prevWinner === 'one') {
            // needed when a game is restarted
            promises.push(updateTeam(1, -1, game.teamTwoId))
            promises.push(updateTeam(-1, 1, game.teamOneId))
            promises.push(updateAtomicTeam(1, -1, game._id, game.teamTwoId))
            promises.push(updateAtomicTeam(-1, 1, game._id, game.teamOneId))
            promises.push(updatePlayers({ wins: 1, losses: -1 }, gameId, teamTwo?._id.toHexString(), teamTwo?.players))
            promises.push(updatePlayers({ wins: -1, losses: 1 }, gameId, teamOne?._id.toHexString(), teamOne?.players))
        } else if (!prevWinner) {
            promises.push(updateTeam(1, 0, game.teamTwoId))
            promises.push(updateTeam(0, 1, game.teamOneId))
            promises.push(updateAtomicTeam(1, 0, game._id, game.teamTwoId))
            promises.push(updateAtomicTeam(0, 1, game._id, game.teamOneId))
            promises.push(updatePlayers({ wins: 1 }, gameId, teamTwo?._id.toHexString(), teamTwo?.players))
            promises.push(updatePlayers({ losses: 1 }, gameId, teamOne?._id.toHexString(), teamOne?.players))
        }
    }

    await Promise.all(promises)

    game.winningTeam = winner
    await game.save()
}

const updatePlayers = async (
    updates: { [x: string]: number },
    gameId: string,
    teamId = '',
    players?: Types.ObjectId[],
) => {
    if (!players || players.length === 0) return
    await Player.updateMany({ _id: { $in: players } }, { $inc: updates })
    await AtomicPlayer.updateMany({ gameId, teamId }, { $inc: updates })
}

const updateTeam = async (wins: number, losses: number, teamId?: Types.ObjectId) => {
    if (!teamId) return

    await Team.findOneAndUpdate({ _id: teamId }, { $inc: { wins, losses } })
}

const updateAtomicTeam = async (wins: number, losses: number, gameId: Types.ObjectId, teamId?: Types.ObjectId) => {
    if (!teamId) return

    await AtomicTeam.findOneAndUpdate({ gameId, teamId }, { $inc: { wins, losses } })
}

export const getGameById = async (gameId: string): Promise<IGame> => {
    const game = await Game.findById(gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }
    const stats = await AtomicPlayer.find({ gameId })
    const { leaders } = await calculatePlayerDataWithLeaders(stats)
    return { ...game.toObject(), ...leaders }
}

export const filterGameStats = async (gameId: string, teamId: string): Promise<FilteredGameData> => {
    const game = await Game.findById(gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    const stats = await AtomicPlayer.find({ gameId, teamId })
    const { players, leaders } = await calculatePlayerDataWithLeaders(stats)

    return {
        _id: game._id,
        teamOneId: game.teamOneId,
        teamTwoId: game.teamTwoId,
        startTime: game.startTime,
        players,
        ...leaders,
    }
}

const calculatePlayerDataWithLeaders = async (
    stats: IAtomicPlayer[],
): Promise<{ players: FilteredGamePlayer[]; leaders: GameData }> => {
    const leaders: GameData = {
        goalsLeader: { total: 0, player: undefined },
        assistsLeader: { total: 0, player: undefined },
        blocksLeader: { total: 0, player: undefined },
        plusMinusLeader: { total: 0, player: undefined },
        pointsPlayedLeader: { total: 0, player: undefined },
        turnoversLeader: { total: 0, player: undefined },
    }
    const playerRecords = await Player.find({ _id: { $in: stats.map((s) => s.playerId) } })
    const players: FilteredGamePlayer[] = []
    for (const stat of stats) {
        // calculate leaders for single team
        const player = playerRecords.find((p) => idEquals(p._id, stat.playerId))
        updateGameData(leaders, stat, player)

        // generate player object
        if (player) {
            players.push({ ...player.toJSON(), ...stat.toJSON() })
        }
    }

    return { players, leaders }
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
        const playerId = player.playerId

        // delete old atomic player with bad data
        await player.deleteOne()

        // create new atomic player
        await AtomicPlayer.create({
            teamId,
            gameId: game._id,
            playerId: playerId,
        })
    }

    // rebuild atomic players
    for (const point of game.points) {
        for (const player of point.players) {
            player.pointsPlayed = 1
            const atomicPlayer = await AtomicPlayer.findOne({ gameId: game._id, playerId: player._id })
            atomicPlayer?.set({ ...addPlayerData(atomicPlayer, player) })
            await atomicPlayer?.save()
        }
    }
    await game.save()
}

export const deleteGame = async (gameId: string, teamId: string) => {
    const game = await Game.findById(gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    await updateTeamOnGameDelete(gameId, teamId)
    await updatePlayersOnGameDelete(gameId, teamId)
    await updateConnectionsOnGameDelete(gameId, teamId)

    await game?.deleteOne()
}

const updateTeamOnGameDelete = async (gameId: string, teamId: string) => {
    const atomicTeam = await AtomicTeam.findOne({ gameId, teamId })
    const team = await Team.findById(teamId)

    if (!team || !atomicTeam) return

    const { values, completionsToScore, completionsToTurnover } = getSubtractedTeamValues(team, atomicTeam)

    await Team.findOneAndUpdate(
        { _id: teamId },
        {
            $inc: values,
            $set: { completionsToScore, completionsToTurnover },
        },
    )

    await AtomicTeam.deleteMany({ gameId, teamId })
}

const updatePlayersOnGameDelete = async (gameId: string, teamId: string) => {
    const atomicPlayers = await AtomicPlayer.find({ gameId, teamId })
    const playerIds = atomicPlayers.map((p) => p.playerId)
    const players = await Player.find({ _id: { $in: playerIds } })

    const playerPromises = []
    for (const player of players) {
        // TODO: can I improve this runtime? - just remove when refactor away from total stats
        const atomicPlayer = atomicPlayers.find((ap) => idEquals(ap.playerId, player._id))
        if (atomicPlayer) {
            player?.set({ ...subtractPlayerData(player, atomicPlayer) })
            playerPromises.push(player?.save())
        }
    }
    await Promise.all(playerPromises)
    await AtomicPlayer.deleteMany({ gameId, teamId })
}

const updateConnectionsOnGameDelete = async (gameId: string, teamId: string) => {
    const atomicConnections = await AtomicConnection.find({ gameId, teamId })
    const connectionIds = atomicConnections.map((c) => ({ throwerId: c.throwerId, receiverId: c.receiverId }))
    const filter: FilterQuery<IConnection> = {}
    if (connectionIds.length > 0) {
        filter.$or = connectionIds
    }
    const connections = await Connection.find(filter)

    const connectionPromises = []
    for (const connection of connections) {
        // TODO: can I improve this runtime? - just remove when refactor away from total stats
        const atomicConnection = atomicConnections.find(
            (ac) => idEquals(ac.throwerId, connection.throwerId) && idEquals(ac.receiverId, connection.receiverId),
        )
        if (atomicConnection) {
            connection?.set({ ...subtractConnectionData(connection, atomicConnection) })
            connectionPromises.push(connection?.save())
        }
    }

    await Promise.all(connectionPromises)
    await AtomicConnection.deleteMany({ gameId, teamId })
}
