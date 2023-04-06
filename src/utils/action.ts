import { Action, ActionType } from '../types/point'

export const isCallahan = (action: Action, prevAction?: Action): boolean => {
    return (
        ([ActionType.TEAM_ONE_SCORE, ActionType.TEAM_TWO_SCORE].includes(action.actionType) &&
            prevAction &&
            [ActionType.PULL, ActionType.DROP, ActionType.THROWAWAY].includes(prevAction.actionType)) ||
        false
    )
}

export const isDiscMovementAction = (action: Action): boolean => {
    return ![ActionType.CALL_ON_FIELD, ActionType.TIMEOUT, ActionType.SUBSTITUTION].includes(action.actionType)
}
