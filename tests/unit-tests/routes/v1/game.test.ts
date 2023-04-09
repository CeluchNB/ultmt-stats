import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import { Types } from 'mongoose'
import Game from '../../../../src/models/game'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { teamOne } from '../../../fixtures/data'

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
