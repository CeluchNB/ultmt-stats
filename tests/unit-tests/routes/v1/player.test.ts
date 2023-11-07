import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { getPlayer, teamOne } from '../../../fixtures/data'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'
import { Types } from 'mongoose'
import AtomicPlayer from '../../../../src/models/atomic-player'

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
        const gameOneId = new Types.ObjectId()
        const gameTwoId = new Types.ObjectId()
        const player = getPlayer(1)

        await AtomicPlayer.create({
            ...player,
            playerId: player._id,
            teamId: teamOne._id,
            gameId: gameOneId,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ goals: 1 }),
        })
        await AtomicPlayer.create({
            ...player,
            playerId: player._id,
            teamId: teamOne._id,
            gameId: gameTwoId,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ goals: 1 }),
        })
        const response = await request(app).get(`/api/v1/stats/player/${player._id}`).expect(200)
        const result = response.body.player

        expect(result).toMatchObject({
            goals: 2,
            plusMinus: 2,
        })
    })

    it('with unfound player', async () => {
        const response = await request(app).get(`/api/v1/stats/player/${new Types.ObjectId()}`).expect(404)

        expect(response.body.message).toBe(Constants.PLAYER_NOT_FOUND)
    })
})

describe('/GET filtered player stats', () => {
    const playerOne = getPlayer(1)
    const gameOneId = new Types.ObjectId()
    const gameTwoId = new Types.ObjectId()

    beforeEach(async () => {
        await AtomicPlayer.create({
            playerId: playerOne._id,
            gameId: gameOneId,
            teamId: teamOne._id,
            ...playerOne,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ goals: 1 }),
        })

        await AtomicPlayer.create({
            playerId: playerOne._id,
            gameId: gameTwoId,
            teamId: teamOne._id,
            ...playerOne,
            _id: new Types.ObjectId(),
            ...getInitialPlayerData({ assists: 1 }),
        })
    })

    it('with team and id request', async () => {
        const response = await request(app)
            .get(
                `/api/v1/stats/filter/player/${playerOne._id}?teams=${teamOne._id}&games=${gameOneId._id},${gameTwoId._id}`,
            )
            .expect(200)

        const { stats } = response.body
        expect(stats.length).toBe(2)
        expect(stats[0].goals).toBe(1)
        expect(stats[1].assists).toBe(1)
    })

    it('with error', async () => {
        const response = await request(app)
            .get(`/api/v1/stats/filter/player/${playerOne._id}?teams=randomnonid`)
            .expect(500)

        expect(response.body.message).toBe(Constants.GENERIC_ERROR)
    })
})
