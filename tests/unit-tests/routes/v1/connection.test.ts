import * as Constants from '../../../../src/utils/constants'
import request from 'supertest'
import app from '../../../../src/app'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { Types } from 'mongoose'
import AtomicConnection from '../../../../src/models/atomic-connection'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('connection routes', () => {
    describe('GET /connection', () => {
        const throwerId = new Types.ObjectId()
        const receiverId = new Types.ObjectId()

        it('returns found connection', async () => {
            await AtomicConnection.create({
                throwerId,
                receiverId,
                gameId: new Types.ObjectId(),
                teamId: new Types.ObjectId(),
                catches: 10,
                drops: 1,
                scores: 1,
            })

            const response = await request(app)
                .get(`/api/v1/stats/connection?thrower=${throwerId}&receiver=${receiverId}`)
                .expect(200)

            const { connection } = response.body
            expect(connection).toMatchObject({
                catches: 10,
                drops: 1,
                scores: 1,
            })
        })

        it('throws error with unfound connection', async () => {
            const response = await request(app)
                .get(`/api/v1/stats/connection?thrower=${receiverId}&receiver=${throwerId}`)
                .expect(404)

            const { message } = response.body
            expect(message).toBe(Constants.CONNECTION_NOT_FOUND)
        })
    })

    describe('GET /connection/game', () => {
        const throwerId = new Types.ObjectId()
        const receiverId = new Types.ObjectId()
        const gameId = new Types.ObjectId()
        const teamId = new Types.ObjectId(0)

        it('returns found connection by game', async () => {
            await AtomicConnection.create({
                gameId,
                throwerId,
                receiverId,
                teamId,
                catches: 10,
                drops: 1,
                scores: 1,
            })

            const response = await request(app)
                .get(
                    `/api/v1/stats/filter/connection?thrower=${throwerId}&receiver=${receiverId}&games=${gameId},${teamId}&teams=${teamId},${gameId}`,
                )
                .expect(200)

            const { connections } = response.body
            expect(connections.length).toBe(1)
            expect(connections[0]).toMatchObject({
                catches: 10,
                drops: 1,
                scores: 1,
            })
        })

        it('throws error with unfound connection', async () => {
            const response = await request(app)
                .get(`/api/v1/stats/filter/connection?thrower=${receiverId}&receiver=${throwerId}`)
                .expect(404)

            const { message } = response.body
            expect(message).toBe(Constants.CONNECTION_NOT_FOUND)
        })
    })
})
