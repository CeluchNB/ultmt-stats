import * as Constants from '../../utils/constants'
import Team from '../../models/team'
import { ApiError } from '../../types/error'
import { FilteredTeamData, TeamData } from '../../types/team'
import { addTeamData, getInitialTeamData } from '../../utils/team-stats'
import AtomicTeam from '../../models/atomic-team'
import AtomicPlayer from '../../models/atomic-player'
import { FilteredGamePlayer, GameData } from '../../types/game'
import Player from '../../models/player'
import { updateGameData } from '../../utils/game-stats'
import { IAtomicPlayer } from '../../types/atomic-stat'
import { addPlayerData, calculatePlayerStats } from '../../utils/player-stats'

export const getTeamById = async (teamId: string): Promise<FilteredTeamData> => {
    const team = await Team.findById(teamId)
    if (!team) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }

    const stats = await AtomicPlayer.find({ teamId })
    const { players, leaders } = await calculatePlayerDataWithLeaders(stats)

    return {
        ...team,
        ...team.toJSON(),
        ...leaders,
        players,
        place: team.place,
        name: team.name,
        winPercentage: team.winPercentage,
        defensiveConversion: team.defensiveConversion,
        offensiveConversion: team.offensiveConversion,
        games: team.games,
    }
}

export const filterTeamStats = async (teamId: string, gameIds: string[]): Promise<FilteredTeamData> => {
    const team = await Team.findById(teamId)
    if (!team) {
        throw new ApiError(Constants.TEAM_NOT_FOUND, 404)
    }

    const filter = { $and: [{ teamId }, { gameId: { $in: gameIds } }] }
    const teamStats = await AtomicTeam.find({ teamId, ...filter })
    let data: TeamData = getInitialTeamData({})

    teamStats.forEach((stat) => {
        data = { ...addTeamData(stat, data) }
    })

    const stats = await AtomicPlayer.find({ teamId, gameId: { $in: gameIds } })
    const { players, leaders } = await calculatePlayerDataWithLeaders(stats)

    return {
        _id: team._id,
        place: team.place,
        name: team.name,
        players,
        winPercentage: team.winPercentage,
        offensiveConversion: team.offensiveConversion,
        defensiveConversion: team.defensiveConversion,
        games: team.games,
        ...data,
        ...leaders,
    }
}

const calculatePlayerDataWithLeaders = async (
    stats: IAtomicPlayer[],
): Promise<{ players: FilteredGamePlayer[]; leaders: GameData }> => {
    const leaders: GameData = {
        goalsLeader: { total: 0, player: undefined },
        assistsLeader: { total: 0, player: undefined },
        blocksLeader: { total: 0, player: undefined },
        plusMinusLeader: { total: 0, player: undefined },
        pointsPlayedLeader: { total: 0, player: undefined },
        turnoversLeader: { total: 0, player: undefined },
    }
    const playerRecords = await Player.find({ _id: { $in: stats.map((s) => s.playerId) } })
    const playerMap = new Map<string, FilteredGamePlayer>()
    for (const stat of stats) {
        // calculate leaders for single team
        const playerRecord = playerRecords.find((p) => p._id.equals(stat.playerId))

        const playerId = playerRecord?._id?.toHexString()
        const player = playerMap.get(playerId || '')
        if (!playerId || !playerRecord) continue

        // generate player object
        if (player) {
            playerMap.set(playerId, { ...player, ...stat.toJSON(), ...addPlayerData(player, stat) })
        } else {
            playerMap.set(playerId, { ...playerRecord.toJSON(), ...stat.toJSON() })
        }
    }

    const playerArray = Array.from(playerMap).map(([, player]) => player)
    const players: FilteredGamePlayer[] = []
    for (const player of playerArray) {
        updateGameData(leaders, player, player)
        players.push({ ...player, ...calculatePlayerStats(player) })
    }

    return { players, leaders }
}
