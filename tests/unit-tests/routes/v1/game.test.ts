import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import { Types } from 'mongoose'
import Game from '../../../../src/models/game'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { getPlayer, teamOne } from '../../../fixtures/data'
import Team from '../../../../src/models/team'
import Player from '../../../../src/models/player'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'
import { EmbeddedTeam } from '../../../../src/types/team'

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
        teamName: 'placename1',
    }
    const teamTwo: EmbeddedTeam = {
        _id: new Types.ObjectId(),
        place: 'Place 1',
        name: 'Name 1',
        teamName: 'placename1',
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
            },
            {
                _id: new Types.ObjectId(),
                players: [idPlayerOne, idPlayerTwo, idPlayerThree, idPlayerFour],
                teamOne: { _id: teamOne._id, ...getInitialTeamData({ goalsFor: 1 }) },
                teamTwo: { _id: teamTwo._id, ...getInitialTeamData({ goalsFor: 0 }) },
            },
        ]
        game?.points.push(...points)
        await game?.save()

        await request(app).put(`/api/v1/stats/game/finish/${gameId}`).send().expect(200)

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

    it('with not found error', async () => {
        const response = await request(app).put(`/api/v1/stats/game/finish/${new Types.ObjectId()}`).expect(404)

        expect(response.body.message).toBe(Constants.GAME_NOT_FOUND)
    })
})
