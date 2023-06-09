import * as Constants from '../../utils/constants'
import AtomicPlayer from '../../models/atomic-player'
import Game from '../../models/game'
import IGame, { FilteredGameData, FilteredGamePlayer, GameData, GameInput } from '../../types/game'
import Team from '../../models/team'
import Player from '../../models/player'
import { EmbeddedPlayer } from '../../types/player'
import { Types } from 'mongoose'
import { ApiError } from '../../types/error'
import ITeam, { TeamData } from '../../types/team'
import { updateGameData } from '../../utils/game-stats'
import AtomicTeam from '../../models/atomic-team'
import { getInitialTeamData } from '../../utils/team-stats'
import { IAtomicPlayer } from '../../types/atomic-stat'

export const createGame = async (gameInput: GameInput) => {
    const prevGame = await Game.findById(gameInput._id)

    if (prevGame) {
        throw new ApiError(Constants.GAME_ALREADY_EXISTS, 400)
    }

    // create teams if not exists
    let teamOne = await Team.findById(gameInput.teamOne._id)
    if (!teamOne) {
        teamOne = await Team.create({ ...gameInput.teamOne })
    }
    updateTeamPlayers(gameInput.teamOnePlayers, teamOne)

    let teamTwo = await Team.findById(gameInput.teamTwo._id)
    if (!teamTwo && gameInput.teamTwo?._id) {
        teamTwo = await Team.create({ ...gameInput.teamTwo })
    }
    updateTeamPlayers(gameInput.teamTwoPlayers, teamTwo)

    // create game
    const game = await Game.create({
        _id: gameInput._id,
        startTime: gameInput.startTime,
        teamOneId: teamOne._id,
        teamTwoId: teamTwo?._id,
        goalsLeader: {
            player: undefined,
            total: 0,
        },
        assistsLeader: {
            player: undefined,
            total: 0,
        },
        blocksLeader: {
            player: undefined,
            total: 0,
        },
        turnoversLeader: {
            player: undefined,
            total: 0,
        },
        pointsPlayedLeader: {
            player: undefined,
            total: 0,
        },
        plusMinusLeader: {
            player: undefined,
            total: 0,
        },
    })

    teamOne.games.push(game._id)
    teamTwo?.games.push(game._id)
    await teamOne.save()
    await teamTwo?.save()

    await AtomicTeam.create({ gameId: game._id, teamId: teamOne._id, ...getInitialTeamData({}) })
    if (teamTwo) {
        await AtomicTeam.create({ gameId: game._id, teamId: teamTwo._id, ...getInitialTeamData({}) })
    }

    // create players if not exists
    for (const p of gameInput.teamOnePlayers) {
        await createPlayerStatRecords(p, game._id, teamOne._id)
    }

    for (const p of gameInput.teamTwoPlayers) {
        if (!teamTwo) break
        await createPlayerStatRecords(p, game._id, teamTwo._id)
    }
}

const updateTeamPlayers = (players: EmbeddedPlayer[], team: ITeam | undefined | null) => {
    if (!team) return
    for (const player of players) {
        if (!team.players.includes(player._id)) {
            team.players.push(player._id)
        }
    }
}

const createPlayerStatRecords = async (player: EmbeddedPlayer, gameId: Types.ObjectId, teamId: Types.ObjectId) => {
    await upsertPlayerRecord(player, gameId)
    await AtomicPlayer.create({ playerId: player._id, teamId, gameId })
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
    const atomicTeamOne = await AtomicTeam.findOne({ gameId: game._id, teamId: teamOne?._id })
    const atomicTeamTwo = await AtomicTeam.findOne({ gameId: game._id, teamId: teamTwo?._id })
    const prevWinner = game.winningTeam

    const winner = calculateWinner(game)

    if (winner === 'one') {
        if (prevWinner === 'two') {
            updateTeam(1, -1, teamOne)
            updateTeam(-1, 1, teamTwo)
            updateTeam(1, -1, atomicTeamOne)
            updateTeam(-1, 1, atomicTeamTwo)
            await updatePlayers({ losses: -1, wins: 1 }, teamOne?.players)
            await updatePlayers({ losses: 1, wins: -1 }, teamTwo?.players)
        } else if (!prevWinner) {
            updateTeam(1, 0, teamOne)
            updateTeam(0, 1, teamTwo)
            updateTeam(1, 0, atomicTeamOne)
            updateTeam(0, 1, atomicTeamTwo)
            await updatePlayers({ wins: 1 }, teamOne?.players)
            await updatePlayers({ losses: 1 }, teamTwo?.players)
        }
    } else {
        if (prevWinner === 'one') {
            updateTeam(1, -1, teamTwo)
            updateTeam(-1, 1, teamOne)
            updateTeam(1, -1, atomicTeamTwo)
            updateTeam(-1, 1, atomicTeamOne)
            await updatePlayers({ wins: 1, losses: -1 }, teamTwo?.players)
            await updatePlayers({ wins: -1, losses: 1 }, teamOne?.players)
        } else if (!prevWinner) {
            updateTeam(1, 0, teamTwo)
            updateTeam(0, 1, teamOne)
            updateTeam(1, 0, atomicTeamTwo)
            updateTeam(0, 1, atomicTeamOne)
            await updatePlayers({ wins: 1 }, teamTwo?.players)
            await updatePlayers({ losses: 1 }, teamOne?.players)
        }
    }

    await teamOne?.save()
    await teamTwo?.save()
    await atomicTeamOne?.save()
    await atomicTeamTwo?.save()
    game.winningTeam = winner
    await game.save()
}

const updatePlayers = async (updates: { [x: string]: number }, players?: Types.ObjectId[]) => {
    if (!players || players.length === 0) return
    await Player.updateMany({ _id: { $in: players } }, { $inc: updates })
}

const updateTeam = async (wins: number, losses: number, team?: TeamData | null) => {
    if (!team) return
    team.wins += wins
    team.losses += losses
}

const calculateWinner = (game: IGame): 'one' | 'two' => {
    const scores = { teamOne: 0, teamTwo: 0 }
    for (const point of game.points) {
        if (point.teamOne.goalsFor === 1) {
            scores.teamOne += 1
        } else if (point.teamTwo.goalsFor === 1) {
            scores.teamTwo += 1
        }
    }

    return scores.teamOne >= scores.teamTwo ? 'one' : 'two'
}

export const getGameById = async (gameId: string): Promise<IGame> => {
    const game = await Game.findById(gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }
    return game
}

export const filterGameStats = async (gameId: string, teamId: string): Promise<FilteredGameData> => {
    const game = await Game.findById(gameId)
    if (!game) {
        throw new ApiError(Constants.GAME_NOT_FOUND, 404)
    }

    const stats = await AtomicPlayer.where({ gameId, teamId })
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
    const playerRecords = await Player.where({ _id: { $in: stats.map((s) => s.playerId) } })
    const players: FilteredGamePlayer[] = []
    for (const stat of stats) {
        // calculate leaders for single team
        const player = playerRecords.find((p) => p._id.equals(stat.playerId))
        updateGameData(leaders, stat, player)

        // generate player object
        if (player) {
            players.push({ ...player.toJSON(), ...stat.toJSON() })
        }
    }

    return { players, leaders }
}
