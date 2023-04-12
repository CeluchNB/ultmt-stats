import * as Constants from '../../../../src/utils/constants'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import request from 'supertest'
import { Types } from 'mongoose'
import { getPlayer, teamOne } from '../../../fixtures/data'
import { EmbeddedTeam } from '../../../../src/types/team'
import Game from '../../../../src/models/game'
import Player from '../../../../src/models/player'
import Team from '../../../../src/models/team'
import AtomicStat from '../../../../src/models/atomic-stat'
import { Action, ActionType } from '../../../../src/types/point'
import app from '../../../../src/app'

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
        await Team.create(teamOne)
        await Player.create(playerOne)
        await Player.create(playerTwo)
        await Player.create(playerThree)
        await AtomicStat.create({ gameId, playerId: playerOne._id, teamId: teamOne._id })
        await AtomicStat.create({ gameId, playerId: playerTwo._id, teamId: teamOne._id })
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