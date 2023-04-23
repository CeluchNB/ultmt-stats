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

    const filter = { $and: [{ teamId }, { gameId: { $in: gameIds } }] }
    const stats = await AtomicTeam.where({ teamId, ...filter })
    let data: TeamData = getInitialTeamData({})

    stats.forEach((stat) => {
        data = { ...addTeamData(stat, data) }
    })

    return { _id: team._id, place: team.place, name: team.name, players: team.players, games: team.games, ...data }
}
