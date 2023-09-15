/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { Types } from 'mongoose'
import { Action, ActionType, IngestedPoint } from '../../../src/types/point'
import {
    updateTeamPointData,
    updateTeamData,
    updateTeamPlayerData,
    getInitialTeamData,
    calculateTeamData,
    calculateMomentumData,
    isTeamOneTurnover,
    isTeamTwoTurnover,
} from '../../../src/utils/team-stats'
import { teamOne, teamTwo } from '../../fixtures/data'
import { EmbeddedTeam } from '../../../src/types/team'

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

describe('updateTeamData', () => {
    const action: Action = {
        actionNumber: 1,
        actionType: ActionType.PULL,
        team: teamOne,
    }

    beforeEach(() => {
        action.actionType = ActionType.PULL
        action.team = teamOne
    })

    it('with drop', () => {
        action.actionType = ActionType.DROP
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ turnovers: 1 }))
    })

    it('with throwaway', () => {
        action.actionType = ActionType.THROWAWAY
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ turnovers: 1 }))
    })

    it('with block', () => {
        action.actionType = ActionType.BLOCK
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ turnoversForced: 1 }))
    })

    it('with team one score on team one', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1 }))
    })

    it('with team one score on team two', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'two', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsAgainst: 1 }))
    })

    it('with team one callahan', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        const data = getInitialTeamData({})

        const prevAction: Action = {
            actionNumber: 1,
            actionType: ActionType.PULL,
            team: teamOne,
        }

        updateTeamData(data, action, 'one', prevAction)
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1, turnoversForced: 1 }))
    })

    it('with team two score on team one', () => {
        action.actionType = ActionType.TEAM_TWO_SCORE
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsAgainst: 1 }))
    })

    it('with team two score on team two', () => {
        action.actionType = ActionType.TEAM_TWO_SCORE
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'two', undefined)
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1 }))
    })

    it('with team two callahan', () => {
        action.actionType = ActionType.TEAM_TWO_SCORE
        const data = getInitialTeamData({})

        const prevAction: Action = {
            actionNumber: 1,
            actionType: ActionType.PULL,
            team: teamOne,
        }

        updateTeamData(data, action, 'two', prevAction)
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1, turnoversForced: 1 }))
    })

    it('with pickup before any other actions', () => {
        action.actionType = ActionType.PICKUP
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', undefined)
        expect(data).toMatchObject(getInitialTeamData({ turnoversForced: 0 }))
    })

    it('with pickup after action', () => {
        const prevAction: Action = {
            actionNumber: 1,
            actionType: ActionType.PULL,
            team: teamOne,
        }
        action.actionType = ActionType.PICKUP
        const data = getInitialTeamData({})

        updateTeamData(data, action, 'one', prevAction)
        expect(data).toMatchObject(getInitialTeamData({ turnoversForced: 1 }))
    })
})

describe('updateTeamPlayerData', () => {
    it('handles complex action list', () => {
        const actions: Action[] = [
            {
                actionNumber: 1,
                actionType: ActionType.PULL,
                team: teamOne,
            },
            {
                actionNumber: 2,
                actionType: ActionType.TEAM_ONE_SCORE,
                team: teamOne,
            },
        ]

        const data = getInitialTeamData({})
        updateTeamPlayerData(actions, data, 'one')
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1, turnoversForced: 1 }))
    })
})

describe('calculateTeamData', () => {
    const inputPoint: IngestedPoint = {
        teamOneActions: [
            {
                actionNumber: 1,
                actionType: ActionType.PULL,
                team: teamOne,
            },
            {
                actionNumber: 2,
                actionType: ActionType.TEAM_ONE_SCORE,
                team: teamOne,
            },
        ],
        teamTwoActions: [],
        pointId: new Types.ObjectId(),
        gameId: new Types.ObjectId(),
        pullingTeam: teamOne,
        receivingTeam: teamTwo,
        teamOnePlayers: [],
        teamTwoPlayers: [],
        scoringTeam: teamOne,
        teamOneScore: 1,
        teamTwoScore: 0,
    }
    it('for team one', () => {
        const data = calculateTeamData(inputPoint, 'one', new Types.ObjectId())
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1, turnoversForced: 1 }))
    })

    it('for team two', () => {
        inputPoint.pullingTeam = teamTwo
        inputPoint.receivingTeam = teamOne
        inputPoint.scoringTeam = teamTwo
        inputPoint.teamTwoActions = [
            {
                actionNumber: 1,
                actionType: ActionType.PULL,
                team: teamTwo,
            },
            {
                actionNumber: 2,
                actionType: ActionType.TEAM_TWO_SCORE,
                team: teamTwo,
            },
        ]

        const data = calculateTeamData(inputPoint, 'two', new Types.ObjectId())
        expect(data).toMatchObject(getInitialTeamData({ goalsFor: 1, turnoversForced: 1 }))
    })
})

describe('calculateMomentumData', () => {
    it('handles team one score', () => {
        const result = calculateMomentumData(
            [{ actionNumber: 2, actionType: ActionType.TEAM_ONE_SCORE, team: {} as EmbeddedTeam }],
            { x: 0, y: 0 },
        )

        expect(result.length).toBe(1)
        expect(result).toEqual([{ x: 1, y: 10 }])
    })

    it('handles team two score', () => {
        const result = calculateMomentumData(
            [{ actionNumber: 2, actionType: ActionType.TEAM_TWO_SCORE, team: {} as EmbeddedTeam }],
            { x: 0, y: 0 },
        )

        expect(result.length).toBe(1)
        expect(result).toEqual([{ x: 1, y: -10 }])
    })

    it('handles team one turnover', () => {
        const result = calculateMomentumData(
            [
                { actionNumber: 1, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 2, actionType: ActionType.THROWAWAY, team: {} as EmbeddedTeam },
            ],
            { x: 0, y: 0 },
        )

        expect(result.length).toBe(1)
        expect(result).toEqual([{ x: 1, y: -5 }])
    })

    it('handles team two turnover', () => {
        const result = calculateMomentumData(
            [
                { actionNumber: 1, actionType: ActionType.PULL, team: {} as EmbeddedTeam },
                { actionNumber: 2, actionType: ActionType.BLOCK, team: {} as EmbeddedTeam },
            ],
            { x: 0, y: 0 },
        )

        expect(result.length).toBe(1)
        expect(result).toEqual([{ x: 1, y: 5 }])
    })

    it('handles team one break', () => {
        const result = calculateMomentumData(
            [
                { actionNumber: 1, actionType: ActionType.PULL, team: {} as EmbeddedTeam },
                { actionNumber: 2, actionType: ActionType.BLOCK, team: {} as EmbeddedTeam },
                { actionNumber: 3, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 4, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 5, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 6, actionType: ActionType.TEAM_ONE_SCORE, team: {} as EmbeddedTeam },
            ],
            { x: 0, y: 0 },
        )
        expect(result.length).toBe(2)
        expect(result).toEqual([
            { x: 1, y: 5 },
            { x: 2, y: 15 },
        ])
    })

    it('handles team two break', () => {
        const result = calculateMomentumData(
            [
                { actionNumber: 1, actionType: ActionType.PICKUP, team: {} as EmbeddedTeam },
                { actionNumber: 2, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 3, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 4, actionType: ActionType.THROWAWAY, team: {} as EmbeddedTeam },
                { actionNumber: 5, actionType: ActionType.PICKUP, team: {} as EmbeddedTeam },
                { actionNumber: 6, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 6, actionType: ActionType.DROP, team: {} as EmbeddedTeam },
                { actionNumber: 6, actionType: ActionType.TEAM_TWO_SCORE, team: {} as EmbeddedTeam },
            ],
            { x: 0, y: 0 },
        )
        expect(result.length).toBe(4)
        expect(result).toEqual([
            { x: 1, y: -5 },
            { x: 2, y: 0 },
            { x: 3, y: -5 },
            { x: 4, y: -15 },
        ])
    })
})

describe('isTeamOneTurnover', () => {
    it('throwaway is turnover', () => {
        const result = isTeamOneTurnover({
            actionNumber: 1,
            actionType: ActionType.THROWAWAY,
            team: {} as EmbeddedTeam,
        })
        expect(result).toBe(true)
    })
    it('drop is turnover', () => {
        const result = isTeamOneTurnover({
            actionNumber: 1,
            actionType: ActionType.DROP,
            team: {} as EmbeddedTeam,
        })
        expect(result).toBe(true)
    })
    it('stall is turnover', () => {
        const result = isTeamOneTurnover({
            actionNumber: 1,
            actionType: ActionType.STALL,
            team: {} as EmbeddedTeam,
        })
        expect(result).toBe(true)
    })
    it('others are not turnover', () => {
        for (const type of [
            ActionType.CALL_ON_FIELD,
            ActionType.CATCH,
            ActionType.PICKUP,
            ActionType.PULL,
            ActionType.SUBSTITUTION,
            ActionType.TEAM_ONE_SCORE,
            ActionType.TEAM_TWO_SCORE,
            ActionType.TIMEOUT,
        ]) {
            expect(
                isTeamOneTurnover({
                    actionNumber: 1,
                    actionType: type,
                    team: {} as EmbeddedTeam,
                }),
            ).toBe(false)
        }
    })
})

describe('isTeamTwoTurnover', () => {
    it('with correct prev action type', () => {
        for (const type of [ActionType.PULL, ActionType.THROWAWAY, ActionType.DROP, ActionType.STALL]) {
            expect(
                isTeamTwoTurnover(
                    { actionNumber: 2, actionType: ActionType.PICKUP, team: {} as EmbeddedTeam },
                    { actionNumber: 1, actionType: type, team: {} as EmbeddedTeam },
                ),
            ).toBe(true)
        }
    })

    it('with correct current action type', () => {
        for (const type of [ActionType.PICKUP, ActionType.BLOCK]) {
            expect(
                isTeamTwoTurnover(
                    { actionNumber: 2, actionType: type, team: {} as EmbeddedTeam },
                    { actionNumber: 1, actionType: ActionType.PULL, team: {} as EmbeddedTeam },
                ),
            ).toBe(true)
        }
    })

    it('returns false with non-turnover combination', () => {
        expect(
            isTeamTwoTurnover(
                { actionNumber: 2, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 1, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
            ),
        ).toBe(false)
    })
})
