import * as Constants from '../../../../src/utils/constants'
import * as Services from '../../../../src/utils/services'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { exportGameStats } from '../../../../src/services/v1/export'
import { Types } from 'mongoose'
import { AxiosResponse } from 'axios'
import Game from '../../../../src/models/game'
import AtomicTeam from '../../../../src/models/atomic-team'
import sgMail, { ClientResponse } from '@sendgrid/mail'
import AtomicPlayer from '../../../../src/models/atomic-player'
import { getPlayer } from '../../../fixtures/data'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('exportGameStats', () => {
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

    it('fails with unfound user', async () => {
        jest.spyOn(Services, 'getUser').mockReturnValue(Promise.resolve({ data: undefined } as AxiosResponse))

        await expect(exportGameStats('user', 'game')).rejects.toThrow(Constants.PLAYER_NOT_FOUND)
    })

    it('fails with unfound game from games service', async () => {
        jest.spyOn(Services, 'getUser').mockReturnValue(Promise.resolve({ data: { _id: 'user' } } as AxiosResponse))
        jest.spyOn(Services, 'getGame').mockReturnValue(Promise.resolve({ data: { game: undefined } } as AxiosResponse))

        await expect(exportGameStats('user', 'game')).rejects.toThrow(Constants.GAME_NOT_FOUND)
    })

    it('fails with unfound game', async () => {
        jest.spyOn(Services, 'getUser').mockReturnValue(Promise.resolve({ data: { _id: 'user' } } as AxiosResponse))
        jest.spyOn(Services, 'getGame').mockReturnValue(
            Promise.resolve({
                data: { game: { teamOne: { _id: 'teamone', name: 'Team One' }, teamTwo: { name: 'Team Two' } } },
            } as AxiosResponse),
        )

        await expect(exportGameStats('user', gameId.toHexString())).rejects.toThrow(Constants.GAME_NOT_FOUND)
    })

    it('fails with unfound team', async () => {
        await Game.create({ _id: gameId, startTime: new Date(), teamOneId: teamOne._id, teamTwoId: teamTwo?._id })
        jest.spyOn(Services, 'getUser').mockReturnValue(Promise.resolve({ data: { _id: 'user' } } as AxiosResponse))
        jest.spyOn(Services, 'getGame').mockReturnValue(
            Promise.resolve({
                data: { game: { teamOne, teamTwo } },
            } as AxiosResponse),
        )

        await expect(exportGameStats('user', gameId.toHexString())).rejects.toThrow(Constants.TEAM_NOT_FOUND)
    })

    it('succeeds', async () => {
        const playerOne = getPlayer(1)
        const sendSpy = jest.spyOn(sgMail, 'send').mockReturnValue(Promise.resolve({} as [ClientResponse, object]))
        await Game.create({ _id: gameId, startTime: new Date(), teamOneId: teamOne._id, teamTwoId: teamTwo?._id })
        await AtomicTeam.create({ ...teamOne, teamId: teamOne._id, gameId })
        await AtomicTeam.create({ ...teamTwo, teamId: teamTwo._id, gameId })
        await AtomicPlayer.create({ ...playerOne, playerId: playerOne._id, gameId, teamId: teamOne._id })
        jest.spyOn(Services, 'getUser').mockReturnValue(Promise.resolve({ data: { _id: 'user' } } as AxiosResponse))
        jest.spyOn(Services, 'getGame').mockReturnValue(
            Promise.resolve({
                data: { game: { teamOne, teamTwo } },
            } as AxiosResponse),
        )

        await exportGameStats('user', gameId.toHexString())
        expect(sendSpy).toHaveBeenCalled()
    })
})
