import { Action, ActionType } from '../types/point'

export const isCallahan = (action: Action, prevAction?: Action): boolean => {
    return (
        ([ActionType.TEAM_ONE_SCORE, ActionType.TEAM_TWO_SCORE].includes(action.actionType) &&
            prevAction &&
            [ActionType.PULL, ActionType.DROP, ActionType.THROWAWAY].includes(prevAction.actionType)) ||
        false
    )
}

export const isNotDiscMovementAction = (action: Action): boolean => {
    return ![ActionType.CALL_ON_FIELD, ActionType.TIMEOUT, ActionType.SUBSTITUTION].includes(action.actionType)
}

export const isCurrentTeamScore = (action: Action, teamNumber: 'one' | 'two'): boolean => {
    return (
        (action.actionType === ActionType.TEAM_ONE_SCORE && teamNumber === 'one') ||
        (action.actionType === ActionType.TEAM_TWO_SCORE && teamNumber === 'two')
    )
}

export const isCompletion = (action: Action): boolean => {
    return action.actionType === ActionType.CATCH && action.actionNumber !== 1
}

export const isCurrentTeamTurnover = (action: Action): boolean => {
    return [ActionType.THROWAWAY, ActionType.DROP, ActionType.STALL].includes(action.actionType)
}

export const isOpposingTeamTurnover = (action: Action, prevAction: Action): boolean => {
    if ([ActionType.PULL, ActionType.THROWAWAY, ActionType.DROP, ActionType.STALL].includes(prevAction.actionType)) {
        return [ActionType.PICKUP, ActionType.BLOCK].includes(action.actionType)
    }
    return false
}
