import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import { Types } from 'mongoose'
import Game from '../../../../src/models/game'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { getPlayer, teamOne, teamTwo } from '../../../fixtures/data'
import Player from '../../../../src/models/player'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'
import { EmbeddedTeam } from '../../../../src/types/team'
import AtomicPlayer from '../../../../src/models/atomic-player'
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

describe('/POST game', () => {
    const _id = new Types.ObjectId()
    const startTime = new Date()

    it('creates game', async () => {
        await request(app)
            .post('/api/v1/stats/game')
            .send({
                game: {
                    _id: _id.toHexString(),
                    startTime,
                    teamOne,
                    teamTwo: {},
                    teamOnePlayers: [],
                    teamTwoPlayers: [],
                },
            })
            .expect(201)

        const games = await Game.find({})
        expect(games.length).toBe(1)
        expect(games[0].momentumData.length).toBe(1)
    })

    it('returns error', async () => {
        await request(app)
            .post('/api/v1/stats/game')
            .send({
                game: {
                    _id: _id.toHexString(),
                    startTime,
                    teamOne,
                    teamTwo: {},
                    teamOnePlayers: [],
                    teamTwoPlayers: [],
                },
            })
            .expect(201)

        const response = await request(app)
            .post('/api/v1/stats/game')
            .send({
                game: {
                    _id: _id.toHexString(),
                    startTime,
                    teamOne,
                    teamTwo: {},
                    teamOnePlayers: [],
                    teamTwoPlayers: [],
                },
            })
            .expect(400)

        expect(response.body.message).toBe(Constants.GAME_ALREADY_EXISTS)
    })
})

describe('/POST finish game', () => {
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
        await AtomicTeam.create({
            ...teamOne,
            teamId: teamOne._id,
            gameId,
            _id: new Types.ObjectId(),
            players: [playerOne._id, playerTwo._id],
        })
        await AtomicTeam.create({
            ...teamTwo,
            teamId: teamTwo._id,
            gameId,
            _id: new Types.ObjectId(),
            players: [playerThree._id, playerFour._id],
        })

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

    it('with team one winning', async () => {
        const game = await Game.findOne({})
        const idPlayerOne = { _id: playerOne._id, ...getInitialPlayerData({}) }
        const idPlayerTwo = { _id: playerTwo._id, ...getInitialPlayerData({}) }
        const idPlayerThree = { _id: playerThree._id, ...getInitialPlayerData({}) }
        const idPlayerFour = { _id: playerFour._id, ...getInitialPlayerData({}) }

        const points = [
            {
                _id: new Types.ObjectId(),
                players: [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour],
                teamOne: { _id: teamOne._id, ...getInitialTeamData({ goalsFor: 1 }) },
                teamTwo: { _id: teamTwo._id, ...getInitialTeamData({ goalsFor: 0 }) },
                connections: [],
            },
            {
                _id: new Types.ObjectId(),
                players: [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour],
                teamOne: { _id: teamOne._id, ...getInitialTeamData({ goalsFor: 1 }) },
                teamTwo: { _id: teamTwo._id, ...getInitialTeamData({ goalsFor: 0 }) },
                connections: [],
            },
        ]
        game?.points.push(...points)
        await game?.save()

        await request(app).put(`/api/v1/stats/game/finish/${gameId}`).send().expect(200)

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord).toMatchObject({ wins: 1, losses: 0 })

        const playerThreeRecord = await Player.findById(playerThree._id)
        expect(playerThreeRecord).toMatchObject({ wins: 0, losses: 1 })

        const playerFourRecord = await Player.findById(playerFour._id)
        expect(playerFourRecord).toMatchObject({ wins: 0, losses: 1 })
    })

    it('with not found error', async () => {
        const response = await request(app).put(`/api/v1/stats/game/finish/${new Types.ObjectId()}`).expect(404)

        expect(response.body.message).toBe(Constants.GAME_NOT_FOUND)
    })
})

describe('/GET game by id', () => {
    it('with found game', async () => {
        const gameId = new Types.ObjectId()
        await Game.create({
            _id: gameId,
            startTime: new Date(),
            teamOneId: teamOne._id,
            teamTwoId: undefined,
            momentumData: [{ x: 0, y: 0 }],
        })

        const response = await request(app).get(`/api/v1/stats/game/${gameId}`).expect(200)
        expect(response.body.game).toMatchObject({
            teamOneId: teamOne._id.toHexString(),
            goalsLeader: { total: 0 },
            momentumData: [{ x: 0, y: 0 }],
        })
    })

    it('with unfound game', async () => {
        const response = await request(app).get(`/api/v1/stats/game/${new Types.ObjectId()}`).expect(404)
        expect(response.body.message).toBe(Constants.GAME_NOT_FOUND)
    })
})

describe('/GET filtered game', () => {
    const gameId = new Types.ObjectId()
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)

    beforeEach(async () => {
        await Player.create({ ...playerOne })
        await Player.create({ ...playerTwo })
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
            momentumData: [{ x: 0, y: 0 }],
        })
    })

    it('with filtered response', async () => {
        const response = await request(app).get(`/api/v1/stats/filter/game/${gameId}?team=${teamOne._id}`).expect(200)

        const { game } = response.body
        expect(game._id).toBe(gameId.toHexString())
        expect(game.goalsLeader.total).toBe(1)
        expect(game.goalsLeader.player._id).toBe(playerOne._id.toHexString())
        expect(game.pointsPlayedLeader.total).toBe(2)
        expect(game.pointsPlayedLeader.player._id).toBe(playerOne._id.toHexString())
        expect(game.assistsLeader.total).toBe(1)
        expect(game.assistsLeader.player._id).toBe(playerTwo._id.toHexString())
        expect(game.plusMinusLeader.total).toBe(1)
        expect(game.plusMinusLeader.player._id).toBe(playerOne._id.toHexString())
        expect(game.turnoversLeader).toMatchObject({ total: 0 })

        expect(game.players.length).toBe(2)
        expect(game.players[0]).toMatchObject({
            firstName: playerOne.firstName,
            lastName: playerOne.lastName,
            goals: 1,
            pointsPlayed: 2,
            ppGoals: 0.5,
        })
        expect(game.players[1]).toMatchObject({
            firstName: playerTwo.firstName,
            lastName: playerTwo.lastName,
            assists: 1,
            pointsPlayed: 1,
            ppAssists: 1,
        })
    })

    it('with error', async () => {
        const response = await request(app)
            .get(`/api/v1/stats/filter/game/${new Types.ObjectId()}?team=${teamOne._id}`)
            .expect(404)
        expect(response.body.message).toBe(Constants.GAME_NOT_FOUND)
    })
})

describe('/GET rebuild atomic players', () => {
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
                            ...getInitialPlayerData({ goals: 1, catches: 1, touches: 1, pointsPlayed: 1 }),
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
                        { _id: playerThree._id, ...getInitialPlayerData({ pointsPlayed: 1 }) },
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
                        { _id: playerTwo._id, ...getInitialPlayerData({ pointsPlayed: 1 }) },
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

    it('handles successful response', async () => {
        await request(app).put(`/api/v1/stats/game/rebuild/${gameOneId}`).expect(200)

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
    })

    it('handles error response', async () => {
        const response = await request(app).put(`/api/v1/stats/game/rebuild/${new Types.ObjectId()}`).expect(404)
        expect(response.body.message).toBe(Constants.GAME_NOT_FOUND)
    })
})

describe('/PUT delete game', () => {
    it('with successful response', async () => {
        const game = await Game.create({
            startTime: new Date(),
            teamOneId: teamOne._id,
            teamTwoId: teamTwo?._id,
            points: [],
        })

        await request(app).put(`/api/v1/stats/game/delete/${game._id}`).expect(200)
        const allGames = await Game.find()
        expect(allGames.length).toBe(0)
    })

    it('with error response', async () => {
        await request(app).put(`/api/v1/stats/game/delete/${new Types.ObjectId()}`).expect(404)
    })
})
