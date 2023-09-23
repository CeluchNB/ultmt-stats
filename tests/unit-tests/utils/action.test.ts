import { Types } from 'mongoose'
import { Action, ActionType } from '../../../src/types/point'
import {
    isCallahan,
    isNotDiscMovementAction,
    isCurrentTeamScore,
    isCompletion,
    isCurrentTeamTurnover,
    isOpposingTeamTurnover,
} from '../../../src/utils/action'
import { teamOne } from '../../fixtures/data'
import { EmbeddedTeam } from '../../../src/types/team'

describe('isCallahan', () => {
    it('is false with non-score action', () => {
        const action: Action = {
            actionNumber: 1,
            actionType: ActionType.CATCH,
            team: teamOne,
        }

        expect(isCallahan(action, undefined)).toBe(false)
    })

    it('is false with scoring action', () => {
        const action: Action = {
            actionNumber: 2,
            actionType: ActionType.TEAM_ONE_SCORE,
            team: teamOne,
        }

        const prevAction: Action = {
            actionNumber: 1,
            actionType: ActionType.CATCH,
            team: teamOne,
        }

        expect(isCallahan(action, prevAction)).toBe(false)
    })

    it('is false with scoring action and no prev action', () => {
        const action: Action = {
            actionNumber: 1,
            actionType: ActionType.TEAM_ONE_SCORE,
            team: teamOne,
        }
        expect(isCallahan(action, undefined)).toBe(false)
    })

    it('is true with callahan', () => {
        const action: Action = {
            actionNumber: 2,
            actionType: ActionType.TEAM_ONE_SCORE,
            team: teamOne,
        }

        const prevAction: Action = {
            actionNumber: 1,
            actionType: ActionType.PULL,
            team: teamOne,
        }

        expect(isCallahan(action, prevAction)).toBe(true)
    })
})

describe('isDiscMovementAction', () => {
    const action: Action = {
        actionNumber: 1,
        actionType: ActionType.PULL,
        team: teamOne,
    }
    beforeEach(() => {
        action.actionType = ActionType.PULL
    })

    it('with timeout', () => {
        action.actionType = ActionType.TIMEOUT
        const result = isNotDiscMovementAction(action)
        expect(result).toBe(false)
    })

    it('with substitution', () => {
        action.actionType = ActionType.SUBSTITUTION
        const result = isNotDiscMovementAction(action)
        expect(result).toBe(false)
    })

    it('with call on field', () => {
        action.actionType = ActionType.CALL_ON_FIELD
        const result = isNotDiscMovementAction(action)
        expect(result).toBe(false)
    })

    it('with other type', () => {
        action.actionType = ActionType.PULL
        const result1 = isNotDiscMovementAction(action)
        expect(result1).toBe(true)

        action.actionType = ActionType.DROP
        const result2 = isNotDiscMovementAction(action)
        expect(result2).toBe(true)

        action.actionType = ActionType.CATCH
        const result3 = isNotDiscMovementAction(action)
        expect(result3).toBe(true)
    })
})

describe('isCurrentTeamScore', () => {
    const action: Action = {
        actionNumber: 1,
        actionType: ActionType.CATCH,
        team: {
            _id: new Types.ObjectId(),
            name: 'name',
            place: 'place',
        },
    }
    it('with team one score', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        const result = isCurrentTeamScore(action, 'one')
        expect(result).toBe(true)
    })

    it('with team two score', () => {
        action.actionType = ActionType.TEAM_TWO_SCORE
        const result = isCurrentTeamScore(action, 'two')
        expect(result).toBe(true)
    })

    it('with score mismatch', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        const result = isCurrentTeamScore(action, 'two')
        expect(result).toBe(false)
    })

    it('with other action type', () => {
        action.actionType = ActionType.BLOCK
        const result = isCurrentTeamScore(action, 'one')
        expect(result).toBe(false)
    })
})

describe('isCatch', () => {
    const action: Action = {
        actionNumber: 2,
        actionType: ActionType.CATCH,
        team: {
            _id: new Types.ObjectId(),
            name: 'name',
            place: 'place',
        },
    }
    it('non-first catch returns true', () => {
        const result = isCompletion(action)
        expect(result).toBe(true)
    })

    it('first catch returns false', () => {
        action.actionNumber = 1
        const result = isCompletion(action)
        expect(result).toBe(false)
    })

    it('non-catch returns false', () => {
        action.actionType = ActionType.BLOCK
        action.actionNumber = 2
        const result = isCompletion(action)
        expect(result).toBe(false)
    })
})

describe('isTeamOneTurnover', () => {
    it('throwaway is turnover', () => {
        const result = isCurrentTeamTurnover({
            actionNumber: 1,
            actionType: ActionType.THROWAWAY,
            team: {} as EmbeddedTeam,
        })
        expect(result).toBe(true)
    })
    it('drop is turnover', () => {
        const result = isCurrentTeamTurnover({
            actionNumber: 1,
            actionType: ActionType.DROP,
            team: {} as EmbeddedTeam,
        })
        expect(result).toBe(true)
    })
    it('stall is turnover', () => {
        const result = isCurrentTeamTurnover({
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
                isCurrentTeamTurnover({
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
                isOpposingTeamTurnover(
                    { actionNumber: 2, actionType: ActionType.PICKUP, team: {} as EmbeddedTeam },
                    { actionNumber: 1, actionType: type, team: {} as EmbeddedTeam },
                ),
            ).toBe(true)
        }
    })

    it('with correct current action type', () => {
        for (const type of [ActionType.PICKUP, ActionType.BLOCK]) {
            expect(
                isOpposingTeamTurnover(
                    { actionNumber: 2, actionType: type, team: {} as EmbeddedTeam },
                    { actionNumber: 1, actionType: ActionType.PULL, team: {} as EmbeddedTeam },
                ),
            ).toBe(true)
        }
    })

    it('returns false with non-turnover combination', () => {
        expect(
            isOpposingTeamTurnover(
                { actionNumber: 2, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
                { actionNumber: 1, actionType: ActionType.CATCH, team: {} as EmbeddedTeam },
            ),
        ).toBe(false)
    })
})
