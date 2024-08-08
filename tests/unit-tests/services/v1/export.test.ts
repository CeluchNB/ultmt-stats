import * as Constants from '../../../../src/utils/constants'
import * as Services from '../../../../src/utils/services'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../../fixtures/setup-db'
import { exportGameStats, exportTeamStats, getPlayerStatMaps, getSheetName } from '../../../../src/services/v1/export'
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

describe('Export services', () => {
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
    describe('exportTeamStats', () => {
        it('fails with missing user', async () => {
            jest.spyOn(Services, 'getUser').mockReturnValue(Promise.resolve({ data: undefined } as AxiosResponse))
            await expect(exportTeamStats('user', 'team')).rejects.toThrow(Constants.PLAYER_NOT_FOUND)
        })

        it('fails with no atomic teams', async () => {
            jest.spyOn(Services, 'getUser').mockReturnValue(Promise.resolve({ data: { _id: 'user' } } as AxiosResponse))

            await expect(exportTeamStats('user', new Types.ObjectId().toHexString())).rejects.toThrow(
                Constants.TEAM_NOT_FOUND,
            )
        })

        it('fails with unfound game from game services', async () => {
            await AtomicTeam.create({ ...teamOne, teamId: teamOne._id, gameId })
            await Game.create({ _id: gameId, startTime: new Date(), teamOneId: teamOne._id, teamTwoId: teamTwo?._id })
            jest.spyOn(Services, 'getUser').mockReturnValue(Promise.resolve({ data: { _id: 'user' } } as AxiosResponse))
            jest.spyOn(Services, 'getGame').mockReturnValue(
                Promise.resolve({ data: { game: undefined } } as AxiosResponse),
            )

            await expect(exportTeamStats('user', teamOne._id.toHexString())).rejects.toThrow(Constants.GAME_NOT_FOUND)
        })

        it('full team success', async () => {
            const playerOne = getPlayer(1)
            const sendSpy = jest.spyOn(sgMail, 'send').mockReturnValue(Promise.resolve({} as [ClientResponse, object]))

            await Game.create({ _id: gameId, startTime: new Date(), teamOneId: teamOne._id, teamTwoId: teamTwo?._id })
            await AtomicTeam.create({ ...teamOne, teamId: teamOne._id, gameId })
            await AtomicPlayer.create({ ...playerOne, playerId: playerOne._id, gameId, teamId: teamOne._id })

            jest.spyOn(Services, 'getUser').mockReturnValue(Promise.resolve({ data: { _id: 'user' } } as AxiosResponse))
            jest.spyOn(Services, 'getGame').mockReturnValue(
                Promise.resolve({ data: { game: { _id: gameId, teamOne, teamTwo } } } as AxiosResponse),
            )

            await exportTeamStats('user', teamOne._id.toHexString())
            expect(sendSpy).toHaveBeenCalled()
        })
    })

    describe('exportGameStats', () => {
        it('fails with unfound user', async () => {
            jest.spyOn(Services, 'getUser').mockReturnValue(Promise.resolve({ data: undefined } as AxiosResponse))

            await expect(exportGameStats('user', 'game')).rejects.toThrow(Constants.PLAYER_NOT_FOUND)
        })

        it('fails with unfound game from games service', async () => {
            jest.spyOn(Services, 'getUser').mockReturnValue(Promise.resolve({ data: { _id: 'user' } } as AxiosResponse))
            jest.spyOn(Services, 'getGame').mockReturnValue(
                Promise.resolve({ data: { game: undefined } } as AxiosResponse),
            )

            await expect(exportGameStats('user', 'game')).rejects.toThrow(Constants.GAME_NOT_FOUND)
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

        it('full game success', async () => {
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

    describe('getSheetName', () => {
        const teamOneId = new Types.ObjectId()
        const game = {
            teamOne: { name: 'Team One', _id: teamOneId },
            teamTwo: { name: 'Team Two', _id: new Types.ObjectId() },
        }
        it('gets team two name', () => {
            const result = getSheetName(game, teamOneId.toHexString())
            expect(result).toBe(`vs. ${game.teamTwo.name}`)
        })

        it('gets team one name', () => {
            const result = getSheetName(game, new Types.ObjectId().toHexString())
            expect(result).toBe(`vs. ${game.teamOne.name}`)
        })
    })

    describe('getPlayerStatsMap', () => {
        it('generates map with multiple instances of same player', async () => {
            const teamId = new Types.ObjectId()
            const playerOne = getPlayer(1)
            const ap1 = await AtomicPlayer.create({
                ...playerOne,
                _id: new Types.ObjectId(),
                playerId: playerOne._id,
                gameId: new Types.ObjectId(),
                teamId,
                goals: 1,
                assists: 2,
            })
            const ap2 = await AtomicPlayer.create({
                ...playerOne,
                _id: new Types.ObjectId(),
                playerId: playerOne._id,
                gameId: new Types.ObjectId(),
                teamId,
                goals: 2,
                assists: 1,
            })

            const result = getPlayerStatMaps([ap1, ap2])
            const arrayResult = Array.from(result.values())
            expect(arrayResult.length).toBe(1)
            expect(arrayResult[0]).toMatchObject({ username: playerOne.username, goals: 3, assists: 3 })
        })
    })
})
