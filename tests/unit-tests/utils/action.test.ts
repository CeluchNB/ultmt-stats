import { Action, ActionType } from '../../../src/types/point'
import { isCallahan, isNotDiscMovementAction } from '../../../src/utils/action'
import { teamOne } from '../../fixtures/data'

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
