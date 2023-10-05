import * as Constants from '../../../../src/utils/constants'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { getConnection, getConnectionByGame } from '../../../../src/services/v1/connection'
import { Types } from 'mongoose'
import Connection from '../../../../src/models/connection'
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

        it('returns found connection', async () => {
            await Connection.create({
                throwerId,
                receiverId,
                catches: 10,
                drops: 1,
                scores: 1,
            })

            const result = await getConnection(throwerId.toHexString(), receiverId.toHexString())
            expect(result).toMatchObject({
                catches: 10,
                drops: 1,
                scores: 1,
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

        it('returns found connection', async () => {
            await AtomicConnection.create({
                gameId,
                throwerId,
                receiverId,
                catches: 10,
                drops: 1,
                scores: 1,
            })

            const result = await getConnectionByGame(
                throwerId.toHexString(),
                receiverId.toHexString(),
                gameId.toHexString(),
            )
            expect(result).toMatchObject({
                catches: 10,
                drops: 1,
                scores: 1,
            })
        })

        it('throws error with unfound connection', async () => {
            await expect(
                getConnectionByGame(receiverId.toHexString(), throwerId.toHexString(), gameId.toHexString()),
            ).rejects.toThrowError(Constants.CONNECTION_NOT_FOUND)
        })
    })
})
