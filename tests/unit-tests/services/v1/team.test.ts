import Team from '../../../../src/models/team'
import * as Constants from '../../../../src/utils/constants'
import { setUpDatabase, tearDownDatabase, resetDatabase } from '../../../fixtures/setup-db'
import { teamOne } from '../../../fixtures/data'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import { filterTeamStats, getTeamById } from '../../../../src/services/v1/team'
import { Types } from 'mongoose'
import { ApiError } from '../../../../src/types/error'
import AtomicTeam from '../../../../src/models/atomic-team'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('test get team by id', () => {
    it('with found team', async () => {
        await Team.create({ ...teamOne, ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 1, wins: 1 }) })
        const team = await getTeamById(teamOne._id.toHexString())
        expect(team).toMatchObject({ ...teamOne, ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 1, wins: 1 }) })
    })

    it('with missing team', async () => {
        await expect(getTeamById(new Types.ObjectId().toHexString())).rejects.toThrowError(
            new ApiError(Constants.TEAM_NOT_FOUND, 404),
        )
    })
})

describe('test filter team stats', () => {
    it('with team', async () => {
        const gameOneId = new Types.ObjectId()
        const gameTwoId = new Types.ObjectId()
        const gameThreeId = new Types.ObjectId()

        await Team.create({
            ...teamOne,
            ...getInitialTeamData({ goalsFor: 11, goalsAgainst: 11, wins: 17, losses: 4 }),
        })

        await AtomicTeam.create({
            teamId: teamOne._id,
            gameId: gameOneId,
            ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 2, wins: 0, losses: 1 }),
        })
        await AtomicTeam.create({
            teamId: teamOne._id,
            gameId: gameTwoId,
            ...getInitialTeamData({ goalsFor: 5, goalsAgainst: 4, wins: 1, losses: 0 }),
        })

        await AtomicTeam.create({
            teamId: teamOne._id,
            gameId: gameThreeId,
            ...getInitialTeamData({ goalsFor: 5, goalsAgainst: 4, wins: 1, losses: 0 }),
        })

        const result = await filterTeamStats(teamOne._id.toHexString(), [
            gameOneId.toHexString(),
            gameTwoId.toHexString(),
        ])

        expect(result).toMatchObject({
            _id: teamOne._id,
            name: teamOne.name,
            goalsFor: 6,
            goalsAgainst: 6,
            wins: 1,
            losses: 1,
        })
    })

    it('with unfound team', async () => {
        await expect(filterTeamStats(new Types.ObjectId().toHexString(), [])).rejects.toThrowError(
            new ApiError(Constants.TEAM_NOT_FOUND, 404),
        )
    })
})
