/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as Constants from '../../../../src/utils/constants'
import { Types } from 'mongoose'
import AtomicStat from '../../../../src/models/atomic-stat'
import Game from '../../../../src/models/game'
import Player from '../../../../src/models/player'
import Team from '../../../../src/models/team'
import { deletePoint, ingestPoint } from '../../../../src/services/v1/point'
import { Action, ActionType } from '../../../../src/types/point'
import { EmbeddedTeam } from '../../../../src/types/team'
import { setUpDatabase, tearDownDatabase, resetDatabase } from '../../../fixtures/setup-db'
import { teamOne, getPlayer, teamTwo } from '../../../fixtures/data'
import { IPoint } from '../../../../src/types/game'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import { getGamePlayerData, updateGameLeaders } from '../../../../src/utils/game-stats'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('test ingest point', () => {
    const gameId = new Types.ObjectId()
    const teamTwoId = new Types.ObjectId()
    const pointId = new Types.ObjectId()
    const startTime = new Date()

    const teamTwo: EmbeddedTeam = {
        place: 'Pittsburgh',
        name: 'Hazard',
    }

    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)
    const playerFour = getPlayer(4)
    const playerFive = getPlayer(5)
    const playerSix = getPlayer(6)

    beforeEach(async () => {
        await Game.create({
            _id: gameId,
            teamOneId: teamOne._id,
            teamTwoId,
            startTime,
            goalsLeader: {
                player: undefined,
                total: 0,
            },
            assistsLeader: {
                player: undefined,
                total: 0,
            },
            blocksLeader: {
                player: undefined,
                total: 0,
            },
            turnoversLeader: {
                player: undefined,
                total: 0,
            },
            pointsPlayedLeader: {
                player: undefined,
                total: 0,
            },
            plusMinusLeader: {
                player: undefined,
                total: 0,
            },
        })
        await Team.create(teamOne)
        await Player.create(playerOne)
        await Player.create(playerTwo)
        await Player.create(playerThree)
        await AtomicStat.create({ gameId, playerId: playerOne._id, teamId: teamOne._id })
        await AtomicStat.create({ gameId, playerId: playerTwo._id, teamId: teamOne._id })
    })

    it('handles basic O point', async () => {
        const actions: Action[] = [
            {
                actionNumber: 1,
                actionType: ActionType.CATCH,
                playerOne,
                team: teamOne,
            },
            {
                actionNumber: 2,
                actionType: ActionType.CATCH,
                playerOne: playerTwo,
                playerTwo: playerOne,
                team: teamOne,
            },
            {
                actionNumber: 3,
                actionType: ActionType.CATCH,
                playerOne,
                playerTwo,
                team: teamOne,
            },
            {
                actionNumber: 4,
                actionType: ActionType.TEAM_ONE_SCORE,
                playerOne: playerThree,
                playerTwo: playerOne,
                team: teamOne,
            },
        ]

        await ingestPoint({
            pointId,
            gameId,
            teamOneActions: actions,
            teamTwoActions: [],
            pullingTeam: teamTwo,
            receivingTeam: teamOne,
            scoringTeam: teamOne,
            teamOnePlayers: [playerOne, playerTwo, playerThree],
            teamTwoPlayers: [],
            teamOneScore: 1,
            teamTwoScore: 0,
        })

        const playerOneStatQuery = await AtomicStat.find({ playerId: playerOne._id, gameId })
        const playerOneStat = playerOneStatQuery[0]
        expect(playerOneStat?.goals).toBe(0)
        expect(playerOneStat?.assists).toBe(1)
        expect(playerOneStat?.pointsPlayed).toBe(1)
        expect(playerOneStat?.touches).toBe(2)
        expect(playerOneStat?.catches).toBe(2)

        const playerTwoStatQuery = await AtomicStat.find({ playerId: playerTwo._id, gameId })
        const playerTwoStat = playerTwoStatQuery[0]
        expect(playerTwoStat?.goals).toBe(0)
        expect(playerTwoStat?.assists).toBe(0)
        expect(playerTwoStat?.pointsPlayed).toBe(1)
        expect(playerTwoStat?.touches).toBe(1)
        expect(playerTwoStat?.catches).toBe(1)

        const playerThreeStatQuery = await AtomicStat.find({ playerId: playerThree._id, gameId })
        const playerThreeStat = playerThreeStatQuery[0]
        expect(playerThreeStat?.goals).toBe(1)
        expect(playerThreeStat?.assists).toBe(0)
        expect(playerThreeStat?.pointsPlayed).toBe(1)
        expect(playerThreeStat?.touches).toBe(1)
        expect(playerThreeStat?.catches).toBe(1)

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord?.goals).toBe(0)
        expect(playerOneRecord?.assists).toBe(1)
        expect(playerOneRecord?.pointsPlayed).toBe(1)
        expect(playerOneRecord?.touches).toBe(2)
        expect(playerOneRecord?.catches).toBe(2)

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord?.goals).toBe(0)
        expect(playerTwoRecord?.assists).toBe(0)
        expect(playerTwoRecord?.pointsPlayed).toBe(1)
        expect(playerTwoRecord?.touches).toBe(1)
        expect(playerTwoRecord?.catches).toBe(1)

        const playerThreeRecord = await Player.findById(playerThree._id)
        expect(playerThreeRecord?.goals).toBe(1)
        expect(playerThreeRecord?.assists).toBe(0)
        expect(playerThreeRecord?.pointsPlayed).toBe(1)
        expect(playerThreeRecord?.touches).toBe(1)
        expect(playerThreeRecord?.catches).toBe(1)

        const teamRecord = await Team.findById(teamOne._id)
        expect(teamRecord?.offensePoints).toBe(1)
        expect(teamRecord?.defensePoints).toBe(0)
        expect(teamRecord?.holds).toBe(1)
        expect(teamRecord?.turnoverFreeHolds).toBe(1)
        expect(teamRecord?.turnovers).toBe(0)
        expect(teamRecord?.goalsFor).toBe(1)
        expect(teamRecord?.goalsAgainst).toBe(0)
        expect(teamRecord?.wins).toBe(0)
        expect(teamRecord?.losses).toBe(0)

        const game = await Game.findById(gameId)
        expect(game?.goalsLeader.player?._id.toString()).toBe(playerThree._id.toString())
        expect(game?.goalsLeader.total).toBe(1)
        expect(game?.assistsLeader.player?._id.toString()).toBe(playerOne._id.toString())
        expect(game?.assistsLeader.total).toBe(1)
        expect(game?.blocksLeader.player).toEqual({})
        expect(game?.turnoversLeader.player).toEqual({})
        expect(game?.plusMinusLeader.player?._id.toString()).toBe(playerOne._id.toString())
        expect(game?.plusMinusLeader.total).toBe(1)
        expect(game?.pointsPlayedLeader.player?._id.toString()).toBe(playerOne._id.toString())
        expect(game?.pointsPlayedLeader.total).toBe(1)
        expect(game?.points.length).toBe(1)
        expect(game?.points[0].players.length).toBe(3)
        expect(game?.points[0].players[0].assists).toBe(1)
    })

    it('handles basic D actions', async () => {
        const actions: Action[] = [
            {
                actionNumber: 1,
                actionType: ActionType.PULL,
                playerOne,
                team: teamOne,
            },
            {
                actionNumber: 2,
                actionType: ActionType.TEAM_TWO_SCORE,
                team: teamOne,
            },
        ]

        await ingestPoint({
            pointId,
            gameId,
            teamOneActions: actions,
            teamTwoActions: [],
            pullingTeam: teamOne,
            receivingTeam: teamTwo,
            scoringTeam: teamOne,
            teamOnePlayers: [playerOne, playerTwo, playerThree],
            teamTwoPlayers: [],
            teamOneScore: 1,
            teamTwoScore: 0,
        })

        const playerOneStatQuery = await AtomicStat.find({ playerId: playerOne._id, gameId })
        const playerOneStat = playerOneStatQuery[0]
        expect(playerOneStat?.goals).toBe(0)
        expect(playerOneStat?.assists).toBe(0)
        expect(playerOneStat?.pointsPlayed).toBe(1)
        expect(playerOneStat?.touches).toBe(0)
        expect(playerOneStat?.catches).toBe(0)
        expect(playerOneStat?.pulls).toBe(1)

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord?.goals).toBe(0)
        expect(playerOneRecord?.assists).toBe(0)
        expect(playerOneRecord?.pointsPlayed).toBe(1)
        expect(playerOneRecord?.touches).toBe(0)
        expect(playerOneRecord?.catches).toBe(0)
        expect(playerOneRecord?.pulls).toBe(1)

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord?.goals).toBe(0)
        expect(playerTwoRecord?.assists).toBe(0)
        expect(playerTwoRecord?.pointsPlayed).toBe(1)

        const playerThreeRecord = await Player.findById(playerThree._id)
        expect(playerThreeRecord?.goals).toBe(0)
        expect(playerThreeRecord?.assists).toBe(0)
        expect(playerThreeRecord?.pointsPlayed).toBe(1)

        const teamRecord = await Team.findById(teamOne._id)
        expect(teamRecord?.defensePoints).toBe(1)
        expect(teamRecord?.offensePoints).toBe(0)
        expect(teamRecord?.holds).toBe(0)
        expect(teamRecord?.turnoverFreeHolds).toBe(0)
        expect(teamRecord?.turnovers).toBe(0)
        expect(teamRecord?.goalsFor).toBe(0)
        expect(teamRecord?.goalsAgainst).toBe(1)
        expect(teamRecord?.breaks).toBe(0)
        expect(teamRecord?.wins).toBe(0)
        expect(teamRecord?.losses).toBe(0)

        const game = await Game.findById(gameId)
        expect(game?.assistsLeader.player).toEqual({})
        expect(game?.blocksLeader.player).toEqual({})
        expect(game?.turnoversLeader.player).toEqual({})
        expect(game?.goalsLeader.player).toEqual({})
        expect(game?.plusMinusLeader.player).toEqual({})
        expect(game?.pointsPlayedLeader.player?._id.toString()).toBe(playerOne._id.toString())
        expect(game?.points.length).toBe(1)
    })

    it('handles callahan point', async () => {
        const actions: Action[] = [
            {
                actionNumber: 1,
                actionType: ActionType.PULL,
                playerOne,
                team: teamOne,
            },
            {
                actionNumber: 2,
                actionType: ActionType.TEAM_ONE_SCORE,
                team: teamOne,
                playerOne: playerTwo,
            },
        ]

        await ingestPoint({
            pointId,
            gameId,
            teamOneActions: actions,
            teamTwoActions: [],
            pullingTeam: teamOne,
            receivingTeam: teamTwo,
            scoringTeam: teamOne,
            teamOnePlayers: [playerOne, playerTwo, playerThree],
            teamTwoPlayers: [],
            teamOneScore: 1,
            teamTwoScore: 0,
        })

        const playerOneResult = {
            goals: 0,
            assists: 0,
            pointsPlayed: 1,
            touches: 0,
            catches: 0,
            pulls: 1,
        }
        const playerOneStatQuery = await AtomicStat.find({ playerId: playerOne._id, gameId })
        const playerOneStat = playerOneStatQuery[0]
        expect(playerOneStat).toMatchObject(playerOneResult)

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord).toMatchObject(playerOneResult)

        const playerTwoResult = {
            goals: 1,
            assists: 0,
            callahans: 1,
            blocks: 1,
            pointsPlayed: 1,
            touches: 1,
            catches: 1,
            pulls: 0,
        }
        const playerTwoStatQuery = await AtomicStat.find({ playerId: playerTwo._id, gameId })
        const playerTwoStat = playerTwoStatQuery[0]
        expect(playerTwoStat).toMatchObject(playerTwoResult)

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord).toMatchObject(playerTwoResult)

        const teamRecord = await Team.findById(teamOne._id)
        expect(teamRecord).toMatchObject({
            goalsFor: 1,
            goalsAgainst: 0,
            turnoversForced: 1,
            turnovers: 0,
            defensePoints: 1,
            offensePoints: 0,
        })

        const game = await Game.findById(gameId)
        expect(game?.goalsLeader.player?._id.toString()).toBe(playerTwo._id.toString())
        expect(game?.goalsLeader.total).toBe(1)
        expect(game?.assistsLeader.player).toEqual({})
        expect(game?.blocksLeader.player?._id.toString()).toBe(playerTwo._id.toString())
        expect(game?.blocksLeader.total).toBe(1)
        expect(game?.turnoversLeader.player).toEqual({})
        expect(game?.plusMinusLeader.player?._id.toString()).toBe(playerTwo._id.toString())
        expect(game?.plusMinusLeader.total).toBe(2)
        expect(game?.points.length).toBe(1)
    })

    it('handles turnovers', async () => {
        const fullTeamTwo = {
            ...teamTwo,
            _id: teamTwoId,
            teamName: 'team2',
            seasonStart: new Date(),
            seasonEnd: new Date(),
        }
        await Team.create(fullTeamTwo)
        const teamOneActions: Action[] = [
            {
                actionNumber: 1,
                actionType: ActionType.PULL,
                team: teamOne,
                playerOne,
            },
            {
                actionNumber: 2,
                actionType: ActionType.BLOCK,
                team: teamOne,
                playerOne: playerTwo,
            },
            {
                actionNumber: 3,
                actionType: ActionType.PICKUP,
                team: teamOne,
                playerOne: playerTwo,
            },
            {
                actionNumber: 4,
                actionType: ActionType.CATCH,
                team: teamOne,
                playerOne,
                playerTwo,
            },
            {
                actionNumber: 5,
                actionType: ActionType.THROWAWAY,
                team: teamOne,
                playerOne,
            },
            {
                actionNumber: 6,
                actionType: ActionType.TEAM_TWO_SCORE,
                team: teamOne,
            },
        ]

        const teamTwoActions: Action[] = [
            {
                actionNumber: 1,
                actionType: ActionType.CATCH,
                team: teamTwo,
                playerOne: playerFour,
            },
            {
                actionNumber: 2,
                actionType: ActionType.THROWAWAY,
                team: teamTwo,
                playerOne: playerFour,
            },
            {
                actionNumber: 3,
                actionType: ActionType.PICKUP,
                team: teamTwo,
                playerOne: playerFive,
            },
            {
                actionNumber: 4,
                actionType: ActionType.TEAM_TWO_SCORE,
                team: teamTwo,
                playerOne: playerSix,
                playerTwo: playerFive,
            },
        ]

        await ingestPoint({
            pointId,
            gameId,
            teamOneActions,
            teamTwoActions,
            pullingTeam: teamOne,
            receivingTeam: fullTeamTwo,
            scoringTeam: fullTeamTwo,
            teamOnePlayers: [playerOne, playerTwo, playerThree],
            teamTwoPlayers: [playerFour, playerFive, playerSix],
            teamOneScore: 0,
            teamTwoScore: 1,
        })

        const playerOneStatQuery = await AtomicStat.find({ playerId: playerOne._id, gameId })
        const playerOneStat = playerOneStatQuery[0]
        expect(playerOneStat).toMatchObject({ pulls: 1, touches: 1, throwaways: 1, pointsPlayed: 1, blocks: 0 })

        const playerTwoStatQuery = await AtomicStat.find({ playerId: playerTwo._id, gameId })
        const playerTwoStat = playerTwoStatQuery[0]
        expect(playerTwoStat).toMatchObject({ blocks: 1, pulls: 0, pointsPlayed: 1, throwaways: 0, touches: 1 })

        const playerThreeStatQuery = await AtomicStat.find({ playerId: playerThree._id, gameId })
        const playerThreeStat = playerThreeStatQuery[0]
        expect(playerThreeStat).toMatchObject({ blocks: 0, pulls: 0, pointsPlayed: 1, throwaways: 0, touches: 0 })

        const playerFourStatQuery = await AtomicStat.find({ playerId: playerFour._id, gameId })
        const playerFourStat = playerFourStatQuery[0]
        expect(playerFourStat).toMatchObject({
            catches: 1,
            touches: 1,
            throwaways: 1,
            pointsPlayed: 1,
            goals: 0,
            assists: 0,
        })

        const playerFiveStatQuery = await AtomicStat.find({ playerId: playerFive._id, gameId })
        const playerFiveStat = playerFiveStatQuery[0]
        expect(playerFiveStat).toMatchObject({
            touches: 1,
            assists: 1,
            pointsPlayed: 1,
            goals: 0,
            catches: 0,
        })

        const playerSixStatQuery = await AtomicStat.find({ playerId: playerSix._id, gameId })
        const playerSixStat = playerSixStatQuery[0]
        expect(playerSixStat).toMatchObject({
            touches: 1,
            catches: 1,
            goals: 1,
            pointsPlayed: 1,
            assists: 0,
            throwaways: 0,
        })

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({
            goalsFor: 0,
            goalsAgainst: 1,
            turnovers: 1,
            turnoversForced: 1,
            holds: 0,
            breaks: 0,
            defensePoints: 1,
            offensePoints: 0,
        })

        const teamTwoRecord = await Team.findById(teamTwoId)
        expect(teamTwoRecord).toMatchObject({
            goalsFor: 1,
            goalsAgainst: 0,
            turnovers: 1,
            turnoversForced: 1,
            holds: 1,
            turnoverFreeHolds: 0,
            breaks: 0,
            defensePoints: 0,
            offensePoints: 1,
        })

        const game = await Game.findById(gameId)
        expect(game?.goalsLeader.player?._id.toString()).toBe(playerSix._id.toString())
        expect(game?.goalsLeader.total).toBe(1)
        expect(game?.assistsLeader.player?._id.toString()).toBe(playerFive._id.toString())
        expect(game?.assistsLeader.total).toBe(1)
        expect(game?.blocksLeader.player?._id.toString()).toBe(playerTwo._id.toString())
        expect(game?.blocksLeader.total).toBe(1)
        expect(game?.turnoversLeader.total).toBe(1)
        expect(game?.pointsPlayedLeader.player?._id.toString()).toBe(playerOne._id.toString())
        expect(game?.pointsPlayedLeader.total).toBe(1)
        expect(game?.plusMinusLeader.total).toBe(1)
        expect(game?.points.length).toBe(1)
        expect(game?.points[0].players.length).toBe(6)
    })

    it('with unfound game', async () => {
        await expect(
            ingestPoint({
                pointId,
                gameId: new Types.ObjectId(),
                teamOneActions: [],
                teamTwoActions: [],
                pullingTeam: teamTwo,
                receivingTeam: teamOne,
                scoringTeam: teamOne,
                teamOnePlayers: [playerOne, playerTwo, playerThree],
                teamTwoPlayers: [],
                teamOneScore: 1,
                teamTwoScore: 0,
            }),
        ).rejects.toThrow()
    })
})

describe('test delete point', () => {
    const gameId = new Types.ObjectId()
    const startTime = new Date()
    const teamTwoId = new Types.ObjectId()
    const pointId = new Types.ObjectId()

    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const playerThree = getPlayer(3)

    beforeEach(async () => {
        const game = await Game.create({
            _id: gameId,
            teamOneId: teamOne._id,
            teamTwoId,
            startTime,
            goalsLeader: {
                player: undefined,
                total: 0,
            },
            assistsLeader: {
                player: undefined,
                total: 0,
            },
            blocksLeader: {
                player: undefined,
                total: 0,
            },
            turnoversLeader: {
                player: undefined,
                total: 0,
            },
            pointsPlayedLeader: {
                player: undefined,
                total: 0,
            },
            plusMinusLeader: {
                player: undefined,
                total: 0,
            },
        })
        await Team.create(teamOne)

        const point: IPoint = {
            _id: pointId,
            players: [
                {
                    _id: playerOne._id,
                    ...getInitialPlayerData({ goals: 1, touches: 2, catches: 2 }),
                },
                {
                    _id: playerTwo._id,
                    ...getInitialPlayerData({ assists: 1, touches: 1 }),
                },
                {
                    _id: playerThree._id,
                    ...getInitialPlayerData({ drops: 1 }),
                },
            ],
            teamOne: {
                _id: teamOne._id,
                ...getInitialTeamData({}),
            },
            teamTwo: {
                _id: teamTwoId,
                ...getInitialTeamData({}),
            },
        }

        game.points.push(point)
        await game.save()
    })

    it('updates player stats correctly', async () => {
        await Player.create({ ...playerOne, goals: 1, touches: 5, catches: 4 })
        await Player.create({ ...playerTwo, assists: 2, touches: 2, goals: 1 })
        await Player.create({ ...playerThree, touches: 1, drops: 1, completedPasses: 2 })

        await deletePoint(gameId.toHexString(), pointId.toHexString())

        const playerOneRecord = await Player.findById(playerOne._id)
        expect(playerOneRecord).toMatchObject({
            goals: 0,
            touches: 3,
            catches: 2,
        })

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord).toMatchObject({
            assists: 1,
            touches: 1,
            goals: 1,
        })

        const playerThreeRecord = await Player.findById(playerThree._id)
        expect(playerThreeRecord).toMatchObject({
            touches: 1,
            drops: 0,
            completedPasses: 2,
        })
    })

    it('updates atomic stats correctly', async () => {
        await AtomicStat.create({
            playerId: playerOne._id,
            teamId: teamOne._id,
            gameId,
            goals: 1,
            touches: 5,
            catches: 4,
        })
        await AtomicStat.create({
            playerId: playerTwo._id,
            teamId: teamOne._id,
            gameId,
            assists: 2,
            touches: 2,
            goals: 1,
        })
        await AtomicStat.create({
            playerId: playerThree._id,
            teamId: teamTwoId,
            gameId,
            touches: 1,
            drops: 1,
            completedPasses: 2,
        })

        await deletePoint(gameId.toHexString(), pointId.toHexString())

        const atomicStatOne = await AtomicStat.findOne({ playerId: playerOne._id })
        expect(atomicStatOne).toMatchObject({
            goals: 0,
            touches: 3,
            catches: 2,
        })

        const atomicStatTwo = await AtomicStat.findOne({ playerId: playerTwo._id })
        expect(atomicStatTwo).toMatchObject({
            assists: 1,
            touches: 1,
            goals: 1,
        })

        const atomicStatThree = await AtomicStat.findOne({ playerId: playerThree._id })
        expect(atomicStatThree).toMatchObject({
            touches: 1,
            drops: 0,
            completedPasses: 2,
        })
    })

    it('update team stats correctly', async () => {
        await Team.create({
            ...teamTwo,
            _id: teamTwoId,
            goalsFor: 2,
            goalsAgainst: 2,
            turnovers: 3,
            turnoversForced: 4,
            holds: 2,
        })

        const teamSetupRecord = await Team.findById(teamOne._id)
        teamSetupRecord?.set({ ...getInitialTeamData({ goalsAgainst: 2, breaks: 1, holds: 1, turnovers: 5 }) })
        await teamSetupRecord?.save()

        const point: IPoint = {
            _id: pointId,
            players: [],
            teamOne: {
                _id: teamOne._id,
                ...getInitialTeamData({ goalsAgainst: 1, turnovers: 2 }),
            },
            teamTwo: {
                _id: teamTwoId,
                ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 1, turnoversForced: 2, holds: 1 }),
            },
        }

        const game = await Game.findById(gameId)
        game!.points = [point]
        await game?.save()

        await deletePoint(gameId.toHexString(), pointId.toHexString())

        const teamOneRecord = await Team.findById(teamOne._id)
        expect(teamOneRecord).toMatchObject({ goalsAgainst: 1, turnovers: 3 })

        const teamTwoRecord = await Team.findById(teamTwoId)
        expect(teamTwoRecord).toMatchObject({ goalsFor: 1, goalsAgainst: 1, turnoversForced: 2, holds: 1 })
    })

    it('updates game correctly', async () => {
        await Player.create({ ...playerOne })
        await Player.create({ ...playerTwo })
        await Player.create({ ...playerThree })

        const game = await Game.findById(gameId)
        const playerMap = getGamePlayerData(game!)
        await updateGameLeaders(game!, playerMap, [])

        await game?.save()

        await deletePoint(gameId.toHexString(), pointId.toHexString())

        const gameRecord = await Game.findById(gameId)
        expect(gameRecord?.points.length).toBe(0)
        expect(gameRecord).toMatchObject({
            points: [],
            goalsLeader: {
                total: 0,
            },
            assistsLeader: {
                total: 0,
            },
            turnoversLeader: {
                total: 0,
            },
            plusMinusLeader: {
                total: 0,
            },
            pointsPlayedLeader: {
                total: 0,
            },
            blocksLeader: {
                total: 0,
            },
        })
        expect(gameRecord?.goalsLeader.player).toMatchObject({})
        expect(gameRecord?.assistsLeader.player).toMatchObject({})
    })

    it('throws error with unfound game', async () => {
        await expect(deletePoint(new Types.ObjectId().toHexString(), pointId.toHexString())).rejects.toThrowError(
            Constants.GAME_NOT_FOUND,
        )
    })

    it('throws error with unfound point', async () => {
        await expect(deletePoint(gameId.toHexString(), new Types.ObjectId().toHexString())).rejects.toThrowError(
            Constants.POINT_NOT_FOUND,
        )
    })
})
