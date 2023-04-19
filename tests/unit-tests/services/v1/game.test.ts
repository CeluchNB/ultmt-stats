/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as Constants from '../../../../src/utils/constants'
import { createGame, finishGame } from '../../../../src/services/v1/game'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { Types } from 'mongoose'
import Game from '../../../../src/models/game'
import Team from '../../../../src/models/team'
import AtomicStat from '../../../../src/models/atomic-stat'
import { teamOne, teamTwo, getPlayer } from '../../../fixtures/data'
import { EmbeddedTeam, TeamData } from '../../../../src/types/team'
import Player from '../../../../src/models/player'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import { IdentifiedPlayerData, IPoint } from '../../../../src/types/game'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

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
        expect(game?.teamOneId.toString()).toEqual(teamOne._id.toString())
        expect(game?.assistsLeader).toMatchObject({})
        expect(game?.points.length).toBe(0)

        const team = await Team.findById(teamOne._id)
        expect(team).toMatchObject(teamOne)
        expect(team?.games.length).toBe(1)
        expect(team?.games[0].toString()).toBe(_id.toString())

        const stats = await AtomicStat.find({})
        expect(stats.length).toBe(0)
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
        expect(game?.teamOneId.toString()).toEqual(teamOne._id.toString())
        expect(game?.assistsLeader.player).toMatchObject({})
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

        const stats = await AtomicStat.find({})
        expect(stats.length).toBe(2)
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
        expect(game?.teamOneId.toString()).toEqual(teamOne._id.toString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject(teamOne)

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toBeNull()

        const stats = await AtomicStat.find({})
        expect(stats.length).toBe(1)
    })

    it('with previously existing game', async () => {
        await Game.create({
            _id,
            startTime: new Date(),
            teamOneId: new Types.ObjectId(),
            teamTwoId: new Types.ObjectId(),
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

    beforeEach(async () => {
        await Team.create({
            ...teamOne,
            players: [playerOne._id, playerTwo._id],
        })
        await Team.create({
            ...teamTwo,
            players: [playerThree._id, playerFour._id],
        })

        await Game.create({
            _id: gameId,
            startTime: new Date(),
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
        const playerOneModify = await Player.findById(playerOne._id)
        playerOneModify!.wins = 1
        const playerTwoModify = await Player.findById(playerTwo._id)
        playerTwoModify!.wins = 1

        const teamTwoModify = await Team.findById(teamTwo._id)
        teamTwoModify!.losses = 1
        const playerThreeModify = await Player.findById(playerThree._id)
        playerThreeModify!.losses = 1
        const playerFourModify = await Player.findById(playerFour._id)
        playerFourModify!.losses = 1

        await teamOneModify?.save()
        await teamTwoModify?.save()
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
        game!.winningTeam = 'one'
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 0, losses: 1 })

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
        const playerOneModify = await Player.findById(playerOne._id)
        playerOneModify!.losses = 1
        const playerTwoModify = await Player.findById(playerTwo._id)
        playerTwoModify!.losses = 1

        const teamTwoModify = await Team.findById(teamTwo._id)
        teamTwoModify!.wins = 1
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
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], {}, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], {}, { goalsFor: 1 }),
        ]
        game?.points.push(...points)
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

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
        const playerOneModify = await Player.findById(playerOne._id)
        playerOneModify!.losses = 1
        const playerTwoModify = await Player.findById(playerTwo._id)
        playerTwoModify!.losses = 1

        const teamTwoModify = await Team.findById(teamTwo._id)
        teamTwoModify!.wins = 1
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
        await teamOneModify?.save()
        await teamTwoModify?.save()
        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], {}, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], {}, { goalsFor: 1 }),
        ]
        game!.winningTeam = 'two'
        game?.points.push(...points)
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

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
        const playerOneModify = await Player.findById(playerOne._id)
        playerOneModify!.wins = 1
        const playerTwoModify = await Player.findById(playerTwo._id)
        playerTwoModify!.wins = 1

        const teamTwoModify = await Team.findById(teamTwo._id)
        teamTwoModify!.losses = 1
        const playerThreeModify = await Player.findById(playerThree._id)
        playerThreeModify!.losses = 1
        const playerFourModify = await Player.findById(playerFour._id)
        playerFourModify!.losses = 1

        await teamOneModify?.save()
        await teamTwoModify?.save()
        await playerOneModify?.save()
        await playerTwoModify?.save()
        await playerThreeModify?.save()
        await playerFourModify?.save()

        const [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour] = getIdPlayers()

        const points = [
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], {}, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour], {}, { goalsFor: 1 }),
        ]
        game!.winningTeam = 'one'
        game?.points.push(...points)
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 1, losses: 0 })

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
            createPoint([idPlayerOne, idPlayerTwo], {}, { goalsFor: 1 }),
            createPoint([idPlayerOne, idPlayerTwo], {}, { goalsFor: 1 }),
        ]
        game?.points.push(...points)
        game!.teamTwoId = undefined
        await game?.save()

        await finishGame(gameId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ wins: 0, losses: 1 })

        const teamTwoRecord = await Team.findById(teamTwo._id)
        expect(teamTwoRecord).toMatchObject({ wins: 0, losses: 0 })

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
