import { EmbeddedTeam } from './team'
import { EmbeddedPlayer } from './player'
import { Types } from 'mongoose'

export enum ActionType {
    PULL = 'Pull',
    CATCH = 'Catch',
    DROP = 'Drop',
    THROWAWAY = 'Throwaway',
    BLOCK = 'Block',
    PICKUP = 'Pickup',
    TEAM_ONE_SCORE = 'TeamOneScore',
    TEAM_TWO_SCORE = 'TeamTwoScore',
    TIMEOUT = 'Timeout',
    SUBSTITUTION = 'Substitution',
    CALL_ON_FIELD = 'CallOnField',
}

export interface Action {
    actionNumber: number
    actionType: ActionType
    team: EmbeddedTeam
    playerOne?: EmbeddedPlayer
    playerTwo?: EmbeddedPlayer
}

export interface IngestedPoint {
    pointId: Types.ObjectId
    gameId: Types.ObjectId
    pullingTeam: EmbeddedTeam
    receivingTeam: EmbeddedTeam
    scoringTeam: EmbeddedTeam
    teamOnePlayers: EmbeddedPlayer[]
    teamTwoPlayers: EmbeddedPlayer[]
    teamOneScore: number
    teamTwoScore: number
    teamOneActions: Action[]
    teamTwoActions: Action[]
}
