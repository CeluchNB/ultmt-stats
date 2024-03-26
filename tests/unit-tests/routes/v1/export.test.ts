import * as Constants from '../../../../src/utils/constants'
import * as Services from '../../../../src/utils/services'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { Types } from 'mongoose'
import { AxiosResponse } from 'axios'
import Game from '../../../../src/models/game'
import AtomicTeam from '../../../../src/models/atomic-team'
import sgMail, { ClientResponse } from '@sendgrid/mail'
import AtomicPlayer from '../../../../src/models/atomic-player'
import { getPlayer } from '../../../fixtures/data'
import request from 'supertest'
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

describe('GET /export/game/:id', () => {
    const gameId = new Types.ObjectId()
    const teamOne = {
        _id: new Types.ObjectId(),
        name: 'Team One',
        place: 'Place One',
        teamname: 'teamone',
    }
    const teamTwo = {
        _id: new Types.ObjectId(),
        name: 'Team Two',
        place: 'Place Two',
        teamname: 'teamtwo',
    }
    const playerOne = getPlayer(1)

    it('handles success', async () => {
        const sendSpy = jest.spyOn(sgMail, 'send').mockReturnValueOnce(Promise.resolve({} as [ClientResponse, object]))
        await Game.create({ _id: gameId, startTime: new Date(), teamOneId: teamOne._id, teamTwoId: teamTwo?._id })
        await AtomicTeam.create({ ...teamOne, teamId: teamOne._id, gameId })
        await AtomicTeam.create({ ...teamTwo, teamId: teamTwo._id, gameId })
        await AtomicPlayer.create({ ...playerOne, playerId: playerOne._id, gameId, teamId: teamOne._id })
        jest.spyOn(Services, 'getUser').mockReturnValueOnce(Promise.resolve({ data: { _id: 'user' } } as AxiosResponse))
        jest.spyOn(Services, 'getGame').mockReturnValueOnce(
            Promise.resolve({
                data: { game: { teamOne, teamTwo } },
            } as AxiosResponse),
        )

        await request(app)
            .get(`/api/v1/stats/export/game/${gameId.toHexString()}?user=${playerOne._id}`)
            .send()
            .expect(200)

        expect(sendSpy).toHaveBeenCalled()
    })

    it('handles failure', async () => {
        jest.spyOn(Services, 'getUser').mockReturnValueOnce(Promise.resolve({ data: undefined } as AxiosResponse))

        const response = await request(app)
            .get(`/api/v1/stats/export/game/${gameId.toHexString()}?user=${playerOne._id}`)
            .send()
            .expect(404)

        expect(response.body.message).toBe(Constants.PLAYER_NOT_FOUND)
    })
})
