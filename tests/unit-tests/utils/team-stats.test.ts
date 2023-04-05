/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Types } from 'mongoose'
import { EmbeddedTeam } from '../../../src/types/team'
import { updateTeamPointData, getInitialTeamData } from '../../../src/utils/team-stats'

const teamOne: EmbeddedTeam = {
    _id: new Types.ObjectId(),
    place: 'Pittsburgh',
    name: 'Temper',
    teamName: 'pghtemper',
    seasonStart: new Date(),
    seasonEnd: new Date(),
}

const teamTwo: EmbeddedTeam = {
    _id: new Types.ObjectId(),
    place: 'DC',
    name: 'Truck Stop',
    teamName: 'dctruck',
    seasonStart: new Date(),
    seasonEnd: new Date(),
}

describe('updateTeamPointStats', () => {
    const point = {
        pointId: new Types.ObjectId(),
        gameId: new Types.ObjectId(),
        pullingTeam: teamOne,
        teamOnePlayers: [],
        teamTwoPlayers: [],
        teamOneActions: [],
        teamTwoActions: [],
        teamOneScore: 0,
        teamTwoScore: 0,
        receivingTeam: teamTwo,
        scoringTeam: teamOne,
    }
    it('with defensive point with no score', () => {
        const data = getInitialTeamData({})
        updateTeamPointData(point, data, teamOne._id!)

        expect(data.defensePoints).toBe(1)
        expect(data.offensePoints).toBe(0)
        expect(data.breaks).toBe(0)
    })

    it('with break', () => {
        const data = getInitialTeamData({ goalsFor: 1 })
        updateTeamPointData(point, data, teamOne._id!)

        expect(data.defensePoints).toBe(1)
        expect(data.offensePoints).toBe(0)
        expect(data.breaks).toBe(1)
    })

    it('with offensive point with no score', () => {
        const data = getInitialTeamData({})
        updateTeamPointData(point, data, teamTwo._id!)

        expect(data.offensePoints).toBe(1)
        expect(data.defensePoints).toBe(0)
        expect(data.holds).toBe(0)
    })

    it('with offensive score with turnovers', () => {
        const data = getInitialTeamData({ goalsFor: 1, turnovers: 1 })
        updateTeamPointData(point, data, teamTwo._id!)

        expect(data.offensePoints).toBe(1)
        expect(data.defensePoints).toBe(0)
        expect(data.holds).toBe(1)
        expect(data.turnoverFreeHolds).toBe(0)
    })

    it('with offensive score with no turnovers', () => {
        const data = getInitialTeamData({ goalsFor: 1 })
        updateTeamPointData(point, data, teamTwo._id!)

        expect(data.offensePoints).toBe(1)
        expect(data.defensePoints).toBe(0)
        expect(data.holds).toBe(1)
        expect(data.turnoverFreeHolds).toBe(1)
    })
})
