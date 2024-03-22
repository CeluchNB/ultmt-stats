import * as Constants from '../../../../src/utils/constants'
import * as ReconcileGuestService from '../../../../src/services/v1/reconcile-guest'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import Game from '../../../../src/models/game'
import { Types } from 'mongoose'
import request from 'supertest'
import app from '../../../../src/app'
import { ApiError } from '../../../../src/types/error'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('PUT /reconcile-guest', () => {
    const teamOneId = new Types.ObjectId()
    const teamTwoId = new Types.ObjectId()

    const guestId = new Types.ObjectId()
    const realUserId = new Types.ObjectId()
    const userOneId = new Types.ObjectId()
    const userTwoId = new Types.ObjectId()

    it('handles success', async () => {
        await Game.create({
            teamOneId,
            teamTwoId: new Types.ObjectId(),
            points: [
                {
                    players: [{ _id: userOneId }, { _id: guestId }, { _id: userTwoId }],
                    connections: [
                        { throwerId: guestId, receiverId: userOneId },
                        { throwerId: userOneId, receiverId: userTwoId },
                    ],
                    teamOne: {},
                    teamTwo: {},
                },
            ],
        })
        await Game.create({
            teamOneId: new Types.ObjectId(),
            teamTwoId,
            points: [
                {
                    players: [{ _id: userOneId }, { _id: guestId }, { _id: userTwoId }],
                    connections: [
                        { throwerId: userTwoId, receiverId: guestId },
                        { throwerId: userOneId, receiverId: userTwoId },
                    ],
                    teamOne: {},
                    teamTwo: {},
                },
            ],
        })

        await request(app)
            .put('/api/v1/stats/reconcile-guest')
            .send({
                teams: [teamOneId, teamTwoId],
                guestId,
                user: { _id: realUserId, firstName: 'Real', lastName: 'Real', username: 'real' },
            })
            .expect(200)

        const gameResults = await Game.find()
        expect(gameResults[0].points[0].players).toEqual(
            expect.arrayContaining([expect.objectContaining({ _id: realUserId })]),
        )
        expect(gameResults[0].points[0].connections).toEqual(
            expect.arrayContaining([expect.objectContaining({ throwerId: realUserId })]),
        )

        expect(gameResults[1].points[0].players).toEqual(
            expect.arrayContaining([expect.objectContaining({ _id: realUserId })]),
        )
        expect(gameResults[1].points[0].connections).toEqual(
            expect.arrayContaining([expect.objectContaining({ receiverId: realUserId })]),
        )
    })

    it('handles failure', async () => {
        jest.spyOn(ReconcileGuestService, 'reconcileGuest').mockImplementation(() => {
            throw new ApiError(Constants.GENERIC_ERROR, 500)
        })

        const response = await request(app)
            .put('/api/v1/stats/reconcile-guest')
            .send({
                teams: [teamOneId, teamTwoId],
                guestId,
                user: { _id: realUserId, firstName: 'Real', lastName: 'Real', username: 'real' },
            })
            .expect(500)
        expect(response.body.message).toBe(Constants.GENERIC_ERROR)
    })
})
