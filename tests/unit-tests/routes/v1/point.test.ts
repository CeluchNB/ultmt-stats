import * as Constants from '../../../../src/utils/constants'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import request from 'supertest'
import { Types } from 'mongoose'
import { getPlayer, teamOne } from '../../../fixtures/data'
import { EmbeddedTeam } from '../../../../src/types/team'
import Game from '../../../../src/models/game'
import Player from '../../../../src/models/player'
import AtomicPlayer from '../../../../src/models/atomic-player'
import { Action, ActionType } from '../../../../src/types/point'
import app from '../../../../src/app'
import { IPoint } from '../../../../src/types/game'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'
import { getInitialTeamData } from '../../../../src/utils/team-stats'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('POST /point', () => {
    const gameId = new Types.ObjectId()
    const teamTwoId = new Types.ObjectId()
    const pointId = new Types.ObjectId()
    const startTime = new Date()

    const teamTwo: EmbeddedTeam = {
        place: 'Pittsburgh',
        name: 'Hazard',
    }

    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)

    beforeEach(async () => {
        await Game.create({
            _id: gameId,
            teamOneId: teamOne._id,
            teamTwoId,
            startTime,
            momentumData: [{ x: 0, y: 0 }],
        })

        await Player.create(playerOne)
        await Player.create(playerTwo)
        await Player.create(playerThree)
        await AtomicPlayer.create({ gameId, playerId: playerOne._id, teamId: teamOne._id })
        await AtomicPlayer.create({ gameId, playerId: playerTwo._id, teamId: teamOne._id })
    })

    it('with correct data', async () => {
        const actions: Action[] = [
            {
                actionNumber: 1,
                actionType: ActionType.CATCH,
                playerOne,
                team: teamOne,
            },
            {
                actionNumber: 2,
                actionType: ActionType.CATCH,
                playerOne: playerTwo,
                playerTwo: playerOne,
                team: teamOne,
            },
            {
                actionNumber: 3,
                actionType: ActionType.CATCH,
                playerOne,
                playerTwo,
                team: teamOne,
            },
            {
                actionNumber: 4,
                actionType: ActionType.TEAM_ONE_SCORE,
                playerOne: playerThree,
                playerTwo: playerOne,
                team: teamOne,
            },
        ]

        const response = await request(app)
            .post('/api/v1/stats/point')
            .send({
                point: {
                    pointId,
                    gameId,
                    teamOneActions: actions,
                    teamTwoActions: [],
                    pullingTeam: teamTwo,
                    receivingTeam: teamOne,
                    scoringTeam: teamOne,
                    teamOnePlayers: [playerOne, playerTwo, playerThree],
                    teamTwoPlayers: [],
                    teamOneScore: 1,
                    teamTwoScore: 0,
                },
            })
            .expect(201)

        expect(response.body).toMatchObject({})
    })

    it('with error', async () => {
        const response = await request(app)
            .post('/api/v1/stats/point')
            .send({
                point: {
                    pointId,
                    gameId: new Types.ObjectId(),
                    teamOneActions: [],
                    teamTwoActions: [],
                    pullingTeam: teamTwo,
                    receivingTeam: teamOne,
                    scoringTeam: teamOne,
                    teamOnePlayers: [playerOne, playerTwo, playerThree],
                    teamTwoPlayers: [],
                    teamOneScore: 1,
                    teamTwoScore: 0,
                },
            })
            .expect(404)

        expect(response.body.message).toBe(Constants.GAME_NOT_FOUND)
    })
})

describe('PUT /point/:id/delete', () => {
    const gameId = new Types.ObjectId()
    const startTime = new Date()
    const teamTwoId = new Types.ObjectId()
    const pointId = new Types.ObjectId()

    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)

    beforeEach(async () => {
        const game = await Game.create({
            _id: gameId,
            teamOneId: teamOne._id,
            teamTwoId,
            startTime,
        })

        const point: IPoint = {
            _id: pointId,
            players: [
                {
                    _id: playerOne._id,
                    ...getInitialPlayerData({ goals: 1, touches: 2, catches: 2 }),
                },
                {
                    _id: playerTwo._id,
                    ...getInitialPlayerData({ assists: 1, touches: 1 }),
                },
                {
                    _id: playerThree._id,
                    ...getInitialPlayerData({ drops: 1 }),
                },
            ],
            teamOne: {
                _id: teamOne._id,
                ...getInitialTeamData({}),
            },
            teamTwo: {
                _id: teamTwoId,
                ...getInitialTeamData({}),
            },
            connections: [],
        }

        game.points.push(point)
        await game.save()
    })
    it('with successful call', async () => {
        await request(app).put(`/api/v1/stats/point/${pointId}/delete`).send({ gameId }).expect(200)

        const gameRecord = await Game.findOne({})
        expect(gameRecord?.points.length).toBe(0)
    })

    it('with unsuccessful call', async () => {
        const response = await request(app)
            .put(`/api/v1/stats/point/${new Types.ObjectId()}/delete`)
            .send({ gameId })
            .expect(404)

        expect(response.body.message).toBe(Constants.POINT_NOT_FOUND)
    })
})
