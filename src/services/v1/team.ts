import * as Constants from '../../utils/constants'
import Team from '../../models/team'
import { ApiError } from '../../types/error'
import ITeam, { TeamData } from '../../types/team'
import { addTeamData, getInitialTeamData } from '../../utils/team-stats'
import AtomicTeam from '../../models/atomic-team'

export const getTeamById = async (teamId: string): Promise<ITeam> => {
    const team = await Team.findById(teamId)
    if (!team) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }
    return team
}

export const filterTeamStats = async (teamId: string, gameIds: string[]): Promise<ITeam> => {
    const team = await Team.findById(teamId)
    if (!team) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }

    const filter: { $and: unknown[] } = { $and: [] }
    if (gameIds.length > 0) {
        filter.$and.push({ gameId: { $in: gameIds } })
    }
    const stats = await AtomicTeam.where({ teamId, ...filter })
    const data: TeamData = getInitialTeamData({})

    stats.forEach((stat) => {
        return addTeamData(data, stat)
    })

    return { ...team, ...data }
}
