import * as Constants from '../../../../src/utils/constants'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { getConnection, filterConnectionStats } from '../../../../src/services/v1/connection'
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

describe('connection services', () => {
    describe('getConnection', () => {
        const throwerId = new Types.ObjectId()
        const receiverId = new Types.ObjectId()

        beforeEach(async () => {
            await AtomicConnection.create({
                throwerId,
                receiverId,
                gameId: new Types.ObjectId(),
                teamId: new Types.ObjectId(),
                catches: 10,
                drops: 1,
                scores: 1,
            })

            await AtomicConnection.create({
                throwerId,
                receiverId,
                gameId: new Types.ObjectId(),
                teamId: new Types.ObjectId(),
                catches: 10,
                drops: 1,
                scores: 1,
            })
        })

        it('returns found connection', async () => {
            const result = await getConnection(throwerId.toHexString(), receiverId.toHexString())
            expect(result).toMatchObject({
                catches: 20,
                drops: 2,
                scores: 2,
            })
        })

        it('throws error with unfound connection', async () => {
            await expect(getConnection(receiverId.toHexString(), throwerId.toHexString())).rejects.toThrowError(
                Constants.CONNECTION_NOT_FOUND,
            )
        })
    })

    describe('getConnectionByGame', () => {
        const throwerId = new Types.ObjectId()
        const receiverId = new Types.ObjectId()
        const gameId = new Types.ObjectId()
        const teamId = new Types.ObjectId()

        beforeEach(async () => {
            await AtomicConnection.create({
                gameId,
                teamId,
                throwerId,
                receiverId,
                catches: 10,
                drops: 1,
                scores: 1,
            })
        })

        it('returns found connection', async () => {
            await AtomicConnection.create({
                gameId,
                teamId: new Types.ObjectId(),
                throwerId,
                receiverId,
                catches: 4,
                drops: 0,
                scores: 0,
            })
            const result = await filterConnectionStats(
                throwerId.toHexString(),
                receiverId.toHexString(),
                [gameId.toHexString()],
                [teamId.toHexString()],
            )
            expect(result.length).toBe(1)
            expect(result[0]).toMatchObject({
                catches: 10,
                drops: 1,
                scores: 1,
            })
        })

        it('throws error with unfound connection', async () => {
            await expect(
                filterConnectionStats(receiverId.toHexString(), throwerId.toHexString(), [], []),
            ).rejects.toThrowError(Constants.CONNECTION_NOT_FOUND)
        })
    })
})
