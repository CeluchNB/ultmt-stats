import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import Player from '../../../../src/models/player'
import { getPlayer } from '../../../fixtures/data'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'
import { Types } from 'mongoose'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('/GET player by id', () => {
    it('with found player', async () => {
        const player = getPlayer(1)
        await Player.create({
            ...player,
            ...getInitialPlayerData({ goals: 1 }),
        })
        const response = await request(app).get(`/api/v1/stats/player/${player._id}`).expect(200)
        const result = response.body.player

        expect(result).toMatchObject({
            goals: 1,
            plusMinus: 1,
        })
    })

    it('with unfound player', async () => {
        const response = await request(app).get(`/api/v1/stats/player/${new Types.ObjectId()}`).expect(404)

        expect(response.body.message).toBe(Constants.PLAYER_NOT_FOUND)
    })
})
