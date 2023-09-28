/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as Constants from '../../../../src/utils/constants'
import {
    createGame,
    finishGame,
    filterGameStats,
    getGameById,
    rebuildAtomicPlayers,
} from '../../../../src/services/v1/game'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { Types } from 'mongoose'
import Game from '../../../../src/models/game'
import Team from '../../../../src/models/team'
import AtomicPlayer from '../../../../src/models/atomic-player'
import { getPlayer } from '../../../fixtures/data'
import { EmbeddedTeam, TeamData } from '../../../../src/types/team'
import Player from '../../../../src/models/player'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import { IdentifiedPlayerData, IPoint } from '../../../../src/types/game'
import { ApiError } from '../../../../src/types/error'
import AtomicTeam from '../../../../src/models/atomic-team'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

const teamOne: EmbeddedTeam = {
    _id: new Types.ObjectId(),
    place: 'Place 1',
    name: 'Name 1',
    teamname: 'placename1',
}
const teamTwo: EmbeddedTeam = {
    _id: new Types.ObjectId(),
    place: 'Place 1',
    name: 'Name 1',
    teamname: 'placename1',
}

describe('test create game', () => {
    const _id = new Types.ObjectId()
    const startTime = new Date()
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)

    it('with simple data', async () => {
        await createGame({
            _id: _id.toHexString(),
            startTime,
            teamOne,
            teamTwo: {},
            teamOnePlayers: [],
            teamTwoPlayers: [],
        })

        const game = await Game.findById(_id)
        expect(game?.teamOneId.toString()).toEqual(teamOne._id!.toString())
        expect(game?.points.length).toBe(0)

        const team = await Team.findById(teamOne._id)
        expect(team).toMatchObject(teamOne)
        expect(team?.games.length).toBe(1)
        expect(team?.games[0].toString()).toBe(_id.toString())

        const players = await AtomicPlayer.find({})
        expect(players.length).toBe(0)

        const atomicTeams = await AtomicTeam.find({})
        expect(atomicTeams.length).toBe(1)
        expect(atomicTeams[0].teamId.toHexString()).toBe(teamOne._id!.toHexString())
        expect(atomicTeams[0].gameId.toHexString()).toBe(game?._id.toHexString())
    })

    it('with team two and players', async () => {
        await createGame({
            _id: _id.toHexString(),
            startTime,
            teamOne,
            teamTwo,
            teamOnePlayers: [playerOne],
            teamTwoPlayers: [playerTwo],
        })
        const game = await Game.findById(_id)
        expect(game?.teamOneId.toString()).toEqual(teamOne._id!.toString())
        expect(game?.points.length).toBe(0)

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject(teamOne)
        expect(teamOneRecord?.games.length).toBe(1)
        expect(teamOneRecord?.games[0].toString()).toBe(_id.toString())
        expect(teamOneRecord?.players.length).toBe(1)
        expect(teamOneRecord?.players[0].toHexString()).toBe(playerOne._id.toHexString())

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject(teamTwo)
        expect(teamTwoRecord?.games.length).toBe(1)
        expect(teamTwoRecord?.games[0].toString()).toBe(_id.toString())
        expect(teamTwoRecord?.players.length).toBe(1)
        expect(teamTwoRecord?.players[0].toHexString()).toBe(playerTwo._id.toHexString())

        const stats = await AtomicPlayer.find({})
        expect(stats.length).toBe(2)

        const atomicTeams = await AtomicTeam.find({})
        expect(atomicTeams.length).toBe(2)
        expect(atomicTeams[0].teamId.toHexString()).toBe(teamOne._id!.toHexString())
        expect(atomicTeams[0].gameId.toHexString()).toBe(game?._id.toHexString())
        expect(atomicTeams[1].teamId.toHexString()).toBe(teamTwo._id!.toHexString())
        expect(atomicTeams[1].gameId.toHexString()).toBe(game?._id.toHexString())
    })

    it('with team two players but no team two', async () => {
        await createGame({
            _id: _id.toHexString(),
            startTime,
            teamOne,
            teamTwo: {},
            teamOnePlayers: [playerOne],
            teamTwoPlayers: [playerTwo],
        })

        const game = await Game.findById(_id)
        expect(game?.teamOneId.toString()).toEqual(teamOne._id!.toString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject(teamOne)

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toBeNull()

        const stats = await AtomicPlayer.find({})
        expect(stats.length).toBe(1)
    })

    it('with previously existing game', async () => {
        await Game.create({
            _id,
            startTime: new Date(),
            teamOneId: new Types.ObjectId(),
            teamTwoId: new Types.ObjectId(),
        })

        await expect(
            createGame({
                _id: _id.toHexString(),
                startTime,
                teamOne,
                teamTwo: {},
                teamOnePlayers: [],
                teamTwoPlayers: [],
            }),
        ).rejects.toThrowError()

        const games = await Game.find({})
        expect(games.length).toBe(1)

        const teams = await Team.find({})
        expect(teams.length).toBe(0)
    })
})

describe('test finish game', () => {
    const gameId = new Types.ObjectId()
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)
    const playerFour = getPlayer(4)

    beforeEach(async () => {
        await Team.create({
            ...teamOne,
            players: [playerOne._id, playerTwo._id],
        })
        await Team.create({
            ...teamTwo,
            players: [playerThree._id, playerFour._id],
        })
        await AtomicTeam.create({ ...teamOne, gameId, teamId: teamOne._id })
        await AtomicTeam.create({ ...teamTwo, gameId, teamId: teamTwo._id })

        await Game.create({
            _id: gameId,
            startTime: new Date(),
            teamOneId: teamOne._id,
            teamTwoId: teamTwo?._id,
        })

        await Player.create(playerOne)
        await Player.create(playerTwo)
        await Player.create(playerThree)
        await Player.create(playerFour)
    })

    const getIdPlayers = (): IdentifiedPlayerData[] => {
        const idPlayerOne = { _id: playerOne._id, ...getInitialPlayerData({}) }
        const idPlayerTwo = { _id: playerTwo._id, ...getInitialPlayerData({}) }
        const idPlayerThree = { _id: playerThree._id, ...getInitialPlayerData({}) }
        const idPlayerFour = { _id: playerFour._id, ...getInitialPlayerData({}) }
        return [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour]
    }

    const createPoint = (
        players: IdentifiedPlayerData[],
        teamOneOverrides: Partial<TeamData>,
        teamTwoOverrides: Partial<TeamData>,
    ): IPoint => {
        return {
            _id: new Types.ObjectId(),
            players,
            teamOne: { _id: teamOne._id, ...getInitialTeamData(teamOneOverrides) },
            teamTwo: { _id: teamTwo._id, ...getInitialTeamData(teamTwoOverrides) },
        }
    }

    it('with team one winning', async () => {
        const game = await Game.findOne({})
        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
        ]
        game?.points.push(...points)
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerThreeRecord = await Player.findById(playerThree._id)
        expect(playerThreeRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerFourRecord = await Player.findById(playerFour._id)
        expect(playerFourRecord).toMatchObject({ wins: 0, losses: 1 })
    })

    it('with team one re-winning', async () => {
        const game = await Game.findOne({})
        const teamOneModify = await Team.findById(teamOne._id)
        teamOneModify!.wins = 1
        const atomicTeamOneModify = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        atomicTeamOneModify!.wins = 1
        const playerOneModify = await Player.findById(playerOne._id)
        playerOneModify!.wins = 1
        const playerTwoModify = await Player.findById(playerTwo._id)
        playerTwoModify!.wins = 1

        const teamTwoModify = await Team.findById(teamTwo._id)
        teamTwoModify!.losses = 1
        const atomicTeamTwoModify = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        atomicTeamTwoModify!.losses = 1
        const playerThreeModify = await Player.findById(playerThree._id)
        playerThreeModify!.losses = 1
        const playerFourModify = await Player.findById(playerFour._id)
        playerFourModify!.losses = 1

        await teamOneModify?.save()
        await teamTwoModify?.save()
        await atomicTeamOneModify?.save()
        await atomicTeamTwoModify?.save()
        await playerOneModify?.save()
        await playerTwoModify?.save()
        await playerThreeModify?.save()
        await playerFourModify?.save()
        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, {}),
        ]
        game?.points.push(...points)
        game!.winningTeam = 'one'
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerThreeRecord = await Player.findById(playerThree._id)
        expect(playerThreeRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerFourRecord = await Player.findById(playerFour._id)
        expect(playerFourRecord).toMatchObject({ wins: 0, losses: 1 })
    })

    it('with team one winning after team two', async () => {
        const game = await Game.findOne({})
        const teamOneModify = await Team.findById(teamOne._id)
        teamOneModify!.losses = 1
        const atomicTeamOneModify = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        atomicTeamOneModify!.losses = 1
        const playerOneModify = await Player.findById(playerOne._id)
        playerOneModify!.losses = 1
        const playerTwoModify = await Player.findById(playerTwo._id)
        playerTwoModify!.losses = 1

        const teamTwoModify = await Team.findById(teamTwo._id)
        teamTwoModify!.wins = 1
        const atomicTeamTwoModify = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        atomicTeamTwoModify!.wins = 1
        const playerThreeModify = await Player.findById(playerThree._id)
        playerThreeModify!.wins = 1
        const playerFourModify = await Player.findById(playerFour._id)
        playerFourModify!.wins = 1

        await teamOneModify?.save()
        await teamTwoModify?.save()
        await atomicTeamOneModify?.save()
        await atomicTeamTwoModify?.save()
        await playerOneModify?.save()
        await playerTwoModify?.save()
        await playerThreeModify?.save()
        await playerFourModify?.save()
        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, {}),
        ]
        game?.points.push(...points)
        game!.winningTeam = 'two'
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerThreeRecord = await Player.findById(playerThree._id)
        expect(playerThreeRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerFourRecord = await Player.findById(playerFour._id)
        expect(playerFourRecord).toMatchObject({ wins: 0, losses: 1 })
    })

    it('with existent team two winning', async () => {
        const game = await Game.findOne({})
        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsFor: 1 }, { goalsAgainst: 1 }),
        ]
        game?.points.push(...points)
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerThreeRecord = await Player.findById(playerThree._id)
        expect(playerThreeRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerFourRecord = await Player.findById(playerFour._id)
        expect(playerFourRecord).toMatchObject({ wins: 1, losses: 0 })
    })

    it('with team two re-winning', async () => {
        const game = await Game.findOne({})
        const teamOneModify = await Team.findById(teamOne._id)
        teamOneModify!.losses = 1
        const atomicTeamOneModify = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        atomicTeamOneModify!.losses = 1
        const playerOneModify = await Player.findById(playerOne._id)
        playerOneModify!.losses = 1
        const playerTwoModify = await Player.findById(playerTwo._id)
        playerTwoModify!.losses = 1

        const teamTwoModify = await Team.findById(teamTwo._id)
        teamTwoModify!.wins = 1
        const atomicTeamTwoModify = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        atomicTeamTwoModify!.wins = 1
        const playerThreeModify = await Player.findById(playerThree._id)
        playerThreeModify!.wins = 1
        const playerFourModify = await Player.findById(playerFour._id)
        playerFourModify!.wins = 1

        await teamOneModify?.save()
        await teamTwoModify?.save()
        await playerOneModify?.save()
        await playerTwoModify?.save()
        await playerThreeModify?.save()
        await playerFourModify?.save()
        await atomicTeamOneModify?.save()
        await atomicTeamTwoModify?.save()
        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
        ]
        game!.winningTeam = 'two'
        game?.points.push(...points)
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerThreeRecord = await Player.findById(playerThree._id)
        expect(playerThreeRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerFourRecord = await Player.findById(playerFour._id)
        expect(playerFourRecord).toMatchObject({ wins: 1, losses: 0 })
    })

    it('with team two winning after team one', async () => {
        const game = await Game.findOne({})
        const teamOneModify = await Team.findById(teamOne._id)
        teamOneModify!.wins = 1
        const atomicTeamOneModify = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        atomicTeamOneModify!.wins = 1
        const playerOneModify = await Player.findById(playerOne._id)
        playerOneModify!.wins = 1
        const playerTwoModify = await Player.findById(playerTwo._id)
        playerTwoModify!.wins = 1

        const teamTwoModify = await Team.findById(teamTwo._id)
        teamTwoModify!.losses = 1
        const atomicTeamTwoModify = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        atomicTeamTwoModify!.losses = 1
        const playerThreeModify = await Player.findById(playerThree._id)
        playerThreeModify!.losses = 1
        const playerFourModify = await Player.findById(playerFour._id)
        playerFourModify!.losses = 1

        await teamOneModify?.save()
        await teamTwoModify?.save()
        await atomicTeamOneModify?.save()
        await atomicTeamTwoModify?.save()
        await playerOneModify?.save()
        await playerTwoModify?.save()
        await playerThreeModify?.save()
        await playerFourModify?.save()

        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], { goalsAgainst: 1 }, { goalsFor: 1 }),
        ]
        game!.winningTeam = 'one'
        game?.points.push(...points)
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerThreeRecord = await Player.findById(playerThree._id)
        expect(playerThreeRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerFourRecord = await Player.findById(playerFour._id)
        expect(playerFourRecord).toMatchObject({ wins: 1, losses: 0 })
    })

    it('with non-existent team two winning', async () => {
        const game = await Game.findOne({})
        const [idPlayerOne, idPlayerTwo] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo], { goalsAgainst: 1 }, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo], { goalsAgainst: 1 }, { goalsFor: 1 }),
        ]
        game?.points.push(...points)
        game!.teamTwoId = undefined
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 0, losses: 0 })

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwo._id, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({ wins: 0, losses: 0 })

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerThreeRecord = await Player.findById(playerThree._id)
        expect(playerThreeRecord).toMatchObject({ wins: 0, losses: 0 })

        const playerFourRecord = await Player.findById(playerFour._id)
        expect(playerFourRecord).toMatchObject({ wins: 0, losses: 0 })
    })

    it('with unfound gamd', async () => {
        await expect(finishGame(new Types.ObjectId().toHexString())).rejects.toThrowError(Constants.GAME_NOT_FOUND)
    })
})

describe('test get game by id', () => {
    it('with found game', async () => {
        const gameId = new Types.ObjectId()
        await Game.create({
            _id: gameId,
            startTime: new Date(),
            teamOneId: teamOne._id,
            teamTwoId: teamTwo?._id,
        })

        const result = await getGameById(gameId.toHexString())
        expect(result).toMatchObject({
            teamOneId: teamOne._id,
            teamTwoId: teamTwo._id,
            goalsLeader: { total: 0 },
        })
    })

    it('with unfound game', async () => {
        await expect(getGameById(new Types.ObjectId().toHexString())).rejects.toThrowError(
            new ApiError(Constants.GAME_NOT_FOUND, 404),
        )
    })
})

describe('test get filtered game stats', () => {
    const gameId = new Types.ObjectId()
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)

    beforeEach(async () => {
        await Player.create({ ...playerOne, goals: 5 })
        await Player.create({ ...playerTwo, assists: 3 })
        await Player.create({ ...playerThree })
        await AtomicPlayer.create({
            gameId,
            teamId: teamOne._id,
            playerId: playerOne._id,
            ...getInitialPlayerData({ goals: 1, pointsPlayed: 2 }),
        })
        await AtomicPlayer.create({
            gameId,
            teamId: teamOne._id,
            playerId: playerTwo._id,
            ...getInitialPlayerData({ assists: 1, pointsPlayed: 1 }),
        })
        await AtomicPlayer.create({
            gameId,
            teamId: teamTwo._id,
            playerId: playerThree._id,
            ...getInitialPlayerData({ throwaways: 1, pointsPlayed: 3 }),
        })
        await Game.create({
            _id: gameId,
            startTime: new Date(),
            teamOneId: teamOne._id,
            teamTwoId: teamTwo?._id,
        })
    })

    it('gets team one successfully', async () => {
        const result = await filterGameStats(gameId.toHexString(), teamOne._id!.toHexString())

        expect(result._id.toHexString()).toBe(gameId.toHexString())
        expect(result.goalsLeader).toMatchObject({ total: 1, player: playerOne })
        expect(result.pointsPlayedLeader).toMatchObject({ total: 2, player: playerOne })
        expect(result.assistsLeader).toMatchObject({ total: 1, player: playerTwo })
        expect(result.plusMinusLeader).toMatchObject({ total: 1, player: playerOne })
        expect(result.turnoversLeader).toMatchObject({ total: 0 })

        expect(result.players.length).toBe(2)
        expect(result.players[0]).toMatchObject({
            firstName: playerOne.firstName,
            lastName: playerOne.lastName,
            goals: 1,
            pointsPlayed: 2,
            ppGoals: 0.5,
        })
        expect(result.players[1]).toMatchObject({
            firstName: playerTwo.firstName,
            lastName: playerTwo.lastName,
            assists: 1,
            pointsPlayed: 1,
            ppAssists: 1,
        })
    })

    it('gets team two successfully', async () => {
        const result = await filterGameStats(gameId.toHexString(), teamTwo._id!.toHexString())

        expect(result._id.toHexString()).toBe(gameId.toHexString())
        expect(result.goalsLeader).toMatchObject({ total: 0 })
        expect(result.pointsPlayedLeader).toMatchObject({ total: 3, player: playerThree })
        expect(result.assistsLeader).toMatchObject({ total: 0 })
        expect(result.plusMinusLeader).toMatchObject({ total: -1, player: playerThree })
        expect(result.turnoversLeader).toMatchObject({ total: 1, player: playerThree })

        expect(result.players.length).toBe(1)
        expect(result.players[0]).toMatchObject({
            firstName: playerThree.firstName,
            lastName: playerThree.lastName,
            throwaways: 1,
            pointsPlayed: 3,
        })
    })

    it('with unfound game', async () => {
        await expect(
            filterGameStats(new Types.ObjectId().toHexString(), teamOne._id!.toHexString()),
        ).rejects.toThrowError(new ApiError(Constants.GAME_NOT_FOUND, 404))
    })
})

describe('test rebuild atomic players', () => {
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)
    const gameOneId = new Types.ObjectId()
    const gameTwoId = new Types.ObjectId()

    beforeEach(async () => {
        await Game.create({
            _id: gameOneId,
            startTime: new Date(),
            teamOneId: teamOne._id,
            teamTwoId: teamTwo?._id,
            points: [
                {
                    players: [
                        {
                            _id: playerOne._id,
                            ...getInitialPlayerData({ goals: 1, catches: 1, touches: 1, pointsPlayed: 2 }),
                        },
                        {
                            _id: playerTwo._id,
                            ...getInitialPlayerData({ assists: 1, completedPasses: 1, touches: 1, pointsPlayed: 1 }),
                        },
                        { _id: playerThree._id, ...getInitialPlayerData({ pointsPlayed: 1 }) },
                    ],
                    teamOne: {},
                    teamTwo: {},
                },
                {
                    players: [
                        {
                            _id: playerOne._id,
                            ...getInitialPlayerData({
                                goals: 0,
                                assists: 1,
                                touches: 1,
                                completedPasses: 1,
                                pointsPlayed: 1,
                            }),
                        },
                        {
                            _id: playerTwo._id,
                            ...getInitialPlayerData({ goals: 1, touches: 1, catches: 1, pointsPlayed: 1 }),
                        },
                        { _id: playerThree._id, ...getInitialPlayerData({ pointsPlayed: 2 }) },
                    ],
                    teamOne: {},
                    teamTwo: {},
                },
                {
                    players: [
                        {
                            _id: playerOne._id,
                            ...getInitialPlayerData({ goals: 1, touches: 1, catches: 1, pointsPlayed: 1 }),
                        },
                        { _id: playerTwo._id, ...getInitialPlayerData({ pointsPlayed: 2 }) },
                        {
                            _id: playerThree._id,
                            ...getInitialPlayerData({ assists: 1, completedPasses: 1, pointsPlayed: 1, touches: 1 }),
                        },
                    ],
                    teamOne: {},
                    teamTwo: {},
                },
            ],
        })

        await AtomicPlayer.create({
            playerId: playerOne._id,
            gameId: gameOneId,
            teamId: teamOne._id,
            ...getInitialPlayerData({ goals: 3, catches: 4, pointsPlayed: 4 }),
        })
        await AtomicPlayer.create({
            playerId: playerTwo._id,
            gameId: gameOneId,
            teamId: teamOne._id,
            ...getInitialPlayerData({ assists: 2, completedPasses: 2, touches: 2, catches: 1, pointsPlayed: 4 }),
        })
        await AtomicPlayer.create({
            playerId: playerThree._id,
            gameId: gameOneId,
            teamId: teamOne._id,
            ...getInitialPlayerData({ assists: 1, pointsPlayed: 4 }),
        })

        await AtomicPlayer.create({
            playerId: playerOne._id,
            gameId: gameTwoId,
            teamId: teamOne._id,
            ...getInitialPlayerData({ goals: 1, assists: 1 }),
        })
        await AtomicPlayer.create({
            playerId: playerTwo._id,
            gameId: gameTwoId,
            teamId: teamOne._id,
            ...getInitialPlayerData({ goals: 1, assists: 1 }),
        })
        await AtomicPlayer.create({
            playerId: playerThree._id,
            gameId: gameTwoId,
            teamId: teamOne._id,
            ...getInitialPlayerData({ goals: 1, assists: 1 }),
        })
    })

    it('correctly rebuilds data', async () => {
        await rebuildAtomicPlayers(gameOneId.toHexString())

        const ap1 = await AtomicPlayer.find({ playerId: playerOne._id, gameId: gameOneId })
        expect(ap1.length).toBe(1)
        expect(ap1[0].goals).toBe(2)
        expect(ap1[0].pointsPlayed).toBe(3)
        expect(ap1[0].assists).toBe(1)
        expect(ap1[0].touches).toBe(3)

        const ap2 = await AtomicPlayer.find({ playerId: playerTwo._id, gameId: gameOneId })
        expect(ap2.length).toBe(1)
        expect(ap2[0].goals).toBe(1)
        expect(ap2[0].assists).toBe(1)
        expect(ap2[0].pointsPlayed).toBe(3)
        expect(ap2[0].touches).toBe(2)

        const ap3 = await AtomicPlayer.find({ playerId: playerThree._id, gameId: gameOneId })
        expect(ap3.length).toBe(1)
        expect(ap3[0].goals).toBe(0)
        expect(ap3[0].assists).toBe(1)
        expect(ap3[0].pointsPlayed).toBe(3)
        expect(ap3[0].touches).toBe(1)

        const updatedGame = await Game.findById(gameOneId)
        for (const point of updatedGame!.points) {
            for (const player of point.players) {
                expect(player.pointsPlayed).toBe(1)
            }
        }
    })

    it('with unfound game', async () => {
        await expect(rebuildAtomicPlayers(new Types.ObjectId().toHexString())).rejects.toThrowError(
            new ApiError(Constants.GAME_NOT_FOUND, 404),
        )
    })
})
