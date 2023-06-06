import * as Constants from '../../utils/constants'
import Team from '../../models/team'
import { ApiError } from '../../types/error'
import { FilteredTeamData, TeamData } from '../../types/team'
import { addTeamData, getInitialTeamData } from '../../utils/team-stats'
import AtomicTeam from '../../models/atomic-team'
import AtomicPlayer from '../../models/atomic-player'
import { calculatePlayerDataWithLeaders } from './game'

export const getTeamById = async (teamId: string): Promise<FilteredTeamData> => {
    const team = await Team.findById(teamId)
    if (!team) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }

    const stats = await AtomicPlayer.where({ teamId })
    const { players, leaders } = await calculatePlayerDataWithLeaders(stats)

    return {
        ...team.toJSON(),
        ...leaders,
        players,
        place: team.place,
        name: team.name,
        winPercentage: team.winPercentage,
        defensiveConversion: team.defensiveConversion,
        offensiveConversion: team.offensiveConversion,
    }
}

export const filterTeamStats = async (teamId: string, gameIds: string[]): Promise<FilteredTeamData> => {
    const team = await Team.findById(teamId)
    if (!team) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }

    const filter = { $and: [{ teamId }, { gameId: { $in: gameIds } }] }
    const teamStats = await AtomicTeam.where({ teamId, ...filter })
    let data: TeamData = getInitialTeamData({})

    teamStats.forEach((stat) => {
        data = { ...addTeamData(stat, data) }
    })

    const stats = await AtomicPlayer.where({ teamId, gameId: { $in: gameIds } })
    const { players, leaders } = await calculatePlayerDataWithLeaders(stats)

    return {
        _id: team._id,
        place: team.place,
        name: team.name,
        players,
        winPercentage: team.winPercentage,
        offensiveConversion: team.offensiveConversion,
        defensiveConversion: team.defensiveConversion,
        ...data,
        ...leaders,
    }
}
