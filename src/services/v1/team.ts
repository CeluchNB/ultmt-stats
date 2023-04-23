import * as Constants from '../../utils/constants'
import Team from '../../models/team'
import { ApiError } from '../../types/error'
import ITeam from '../../types/team'

export const getTeamById = async (teamId: string): Promise<ITeam> => {
    const team = await Team.findById(teamId)
    if (!team) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }
    return team
}
