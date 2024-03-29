/* eslint-disable @typescript-eslint/no-non-null-assertion */
import * as Constants from '../../../../src/utils/constants'
import { Types } from 'mongoose'
import AtomicPlayer from '../../../../src/models/atomic-player'
import Game from '../../../../src/models/game'
import {
    deletePoint,
    ingestPoint,
    updateAddedAtomicTeamStats,
    updateSubtractedAtomicTeamStats,
    savePlayerData,
} from '../../../../src/services/v1/point'
import { Action, ActionType } from '../../../../src/types/point'
import { EmbeddedTeam } from '../../../../src/types/team'
import { setUpDatabase, tearDownDatabase, resetDatabase } from '../../../fixtures/setup-db'
import { teamOne, getPlayer, teamTwo } from '../../../fixtures/data'
import { IPoint } from '../../../../src/types/game'
import { getInitialPlayerData } from '../../../../src/utils/player-stats'
import { getInitialTeamData } from '../../../../src/utils/team-stats'
import AtomicTeam from '../../../../src/models/atomic-team'
import AtomicConnection from '../../../../src/models/atomic-connection'
import { getInitialConnectionData } from '../../../../src/utils/connection-stats'

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
    const fullTeamTwo = {
        ...teamTwo,
        _id: teamTwoId,
        teamname: 'team2',
        seasonStart: new Date(),
        seasonEnd: new Date(),
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
            momentumData: [{ x: 0, y: 0 }],
        })

        await AtomicPlayer.create({
            gameId,
            playerId: playerOne._id,
            teamId: teamOne._id,
            ...playerOne,
            _id: new Types.ObjectId(),
        })
        await AtomicPlayer.create({
            gameId,
            playerId: playerTwo._id,
            teamId: teamOne._id,
            ...playerTwo,
            _id: new Types.ObjectId(),
        })

        await AtomicTeam.create({ gameId, teamId: teamOne._id, ...teamOne })
        await AtomicTeam.create({ gameId, teamId: teamTwoId, ...fullTeamTwo })
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

        const playerOneStat = await AtomicPlayer.findOne({ playerId: playerOne._id, gameId })
        expect(playerOneStat).toMatchObject({
            goals: 0,
            assists: 1,
            pointsPlayed: 1,
            touches: 2,
            catches: 2,
            hockeyAssists: 0,
            offensePoints: 1,
            holds: 1,
            defensePoints: 0,
            breaks: 0,
        })

        const playerTwoStat = await AtomicPlayer.findOne({ playerId: playerTwo._id, gameId })
        expect(playerTwoStat).toMatchObject({
            goals: 0,
            assists: 0,
            pointsPlayed: 1,
            touches: 1,
            catches: 1,
            hockeyAssists: 1,
            offensePoints: 1,
            holds: 1,
            defensePoints: 0,
            breaks: 0,
        })

        const playerThreeStat = await AtomicPlayer.findOne({ playerId: playerThree._id, gameId })
        expect(playerThreeStat).toMatchObject({
            goals: 1,
            assists: 0,
            pointsPlayed: 1,
            touches: 1,
            catches: 1,
            hockeyAssists: 0,
            offensePoints: 1,
            holds: 1,
            defensePoints: 0,
            breaks: 0,
        })

        const atomicConnectionOne = await AtomicConnection.findOne({
            gameId,
            throwerId: playerOne._id,
            receiverId: playerTwo._id,
        })
        expect(atomicConnectionOne).toMatchObject({
            catches: 1,
            drops: 0,
            scores: 0,
        })

        const atomicConnectionTwo = await AtomicConnection.findOne({
            gameId,
            throwerId: playerOne._id,
            receiverId: playerThree._id,
        })
        expect(atomicConnectionTwo).toMatchObject({
            catches: 1,
            drops: 0,
            scores: 1,
        })

        const atomicConnectionThree = await AtomicConnection.findOne({
            gameId,
            throwerId: playerTwo._id,
            receiverId: playerOne._id,
        })
        expect(atomicConnectionThree).toMatchObject({
            catches: 1,
            drops: 0,
            scores: 0,
        })

        const atomicTeamRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamRecord?.offensePoints).toBe(1)
        expect(atomicTeamRecord?.defensePoints).toBe(0)
        expect(atomicTeamRecord?.holds).toBe(1)
        expect(atomicTeamRecord?.turnoverFreeHolds).toBe(1)
        expect(atomicTeamRecord?.turnovers).toBe(0)
        expect(atomicTeamRecord?.goalsFor).toBe(1)
        expect(atomicTeamRecord?.goalsAgainst).toBe(0)
        expect(atomicTeamRecord?.wins).toBe(0)
        expect(atomicTeamRecord?.losses).toBe(0)

        const game = await Game.findById(gameId)
        expect(game?.points.length).toBe(1)
        expect(game?.points[0].players.length).toBe(3)
        expect(game?.points[0].players[0].assists).toBe(1)
        expect(game?.points[0].connections.length).toBe(6)
        expect(game?.momentumData.length).toBe(2)
        expect(game?.momentumData[0]).toMatchObject({ x: 0, y: 0 })
        expect(game?.momentumData[1]).toMatchObject({ x: 1, y: 10 })
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
                playerOne,
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

        const playerOneStat = await AtomicPlayer.findOne({ playerId: playerOne._id, gameId })
        expect(playerOneStat).toMatchObject({
            goals: 0,
            assists: 0,
            pointsPlayed: 1,
            touches: 0,
            catches: 0,
            pulls: 1,
            defensePoints: 1,
            breaks: 0,
            holds: 0,
            offensePoints: 0,
        })

        const atomicTeamRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamRecord?.defensePoints).toBe(1)
        expect(atomicTeamRecord?.offensePoints).toBe(0)
        expect(atomicTeamRecord?.holds).toBe(0)
        expect(atomicTeamRecord?.turnoverFreeHolds).toBe(0)
        expect(atomicTeamRecord?.turnovers).toBe(0)
        expect(atomicTeamRecord?.goalsFor).toBe(0)
        expect(atomicTeamRecord?.goalsAgainst).toBe(1)
        expect(atomicTeamRecord?.breaks).toBe(0)
        expect(atomicTeamRecord?.wins).toBe(0)
        expect(atomicTeamRecord?.losses).toBe(0)

        const game = await Game.findById(gameId)
        expect(game?.points.length).toBe(1)
        expect(game?.momentumData.length).toBe(2)
        expect(game?.momentumData[0]).toMatchObject({ x: 0, y: 0 })
        expect(game?.momentumData[1]).toMatchObject({ x: 1, y: -10 })
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
            hockeyAssists: 0,
            pointsPlayed: 1,
            touches: 0,
            catches: 0,
            pulls: 1,
            defensePoints: 1,
            breaks: 1,
            offensePoints: 0,
            holds: 0,
        }
        const playerOneStatQuery = await AtomicPlayer.find({ playerId: playerOne._id, gameId })
        const playerOneStat = playerOneStatQuery[0]
        expect(playerOneStat).toMatchObject(playerOneResult)

        const playerTwoResult = {
            goals: 1,
            assists: 0,
            callahans: 1,
            blocks: 1,
            pointsPlayed: 1,
            touches: 1,
            catches: 1,
            pulls: 0,
            hockeyAssists: 0,
            defensePoints: 1,
            breaks: 1,
            offensePoints: 0,
            holds: 0,
        }
        const playerTwoStatQuery = await AtomicPlayer.find({ playerId: playerTwo._id, gameId })
        const playerTwoStat = playerTwoStatQuery[0]
        expect(playerTwoStat).toMatchObject(playerTwoResult)

        const atomicTeamRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamRecord).toMatchObject({
            goalsFor: 1,
            goalsAgainst: 0,
            turnoversForced: 1,
            turnovers: 0,
            defensePoints: 1,
            offensePoints: 0,
        })

        const game = await Game.findById(gameId)
        expect(game?.points.length).toBe(1)
    })

    it('handles turnovers', async () => {
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

        const playerOneStat = await AtomicPlayer.findOne({ playerId: playerOne._id, gameId })
        expect(playerOneStat).toMatchObject({
            pulls: 1,
            touches: 1,
            throwaways: 1,
            pointsPlayed: 1,
            blocks: 0,
            hockeyAssists: 0,
            defensePoints: 1,
            breaks: 0,
            offensePoints: 0,
            holds: 0,
        })

        const playerTwoStat = await AtomicPlayer.findOne({ playerId: playerTwo._id, gameId })
        expect(playerTwoStat).toMatchObject({
            blocks: 1,
            pulls: 0,
            pointsPlayed: 1,
            throwaways: 0,
            touches: 1,
            hockeyAssists: 0,
            defensePoints: 1,
            breaks: 0,
            offensePoints: 0,
            holds: 0,
        })

        const playerThreeStat = await AtomicPlayer.findOne({ playerId: playerThree._id, gameId })
        expect(playerThreeStat).toMatchObject({
            blocks: 0,
            pulls: 0,
            pointsPlayed: 1,
            throwaways: 0,
            touches: 0,
            hockeyAssists: 0,
            defensePoints: 1,
            breaks: 0,
            offensePoints: 0,
            holds: 0,
        })

        const playerFourStat = await AtomicPlayer.findOne({ playerId: playerFour._id, gameId })
        expect(playerFourStat).toMatchObject({
            catches: 1,
            touches: 1,
            throwaways: 1,
            pointsPlayed: 1,
            goals: 0,
            assists: 0,
            hockeyAssists: 0,
            offensePoints: 1,
            holds: 1,
            defensePoints: 0,
            breaks: 0,
        })

        const playerFiveStat = await AtomicPlayer.findOne({ playerId: playerFive._id, gameId })
        expect(playerFiveStat).toMatchObject({
            touches: 1,
            assists: 1,
            pointsPlayed: 1,
            goals: 0,
            catches: 0,
            hockeyAssists: 0,
            offensePoints: 1,
            holds: 1,
            defensePoints: 0,
            breaks: 0,
        })

        const playerSixStat = await AtomicPlayer.findOne({ playerId: playerSix._id, gameId })
        expect(playerSixStat).toMatchObject({
            touches: 1,
            catches: 1,
            goals: 1,
            pointsPlayed: 1,
            assists: 0,
            throwaways: 0,
            hockeyAssists: 0,
            offensePoints: 1,
            holds: 1,
            defensePoints: 0,
            breaks: 0,
        })

        const connectionStatOne = await AtomicConnection.findOne({
            gameId,
            throwerId: playerTwo._id,
            receiverId: playerOne._id,
        })
        expect(connectionStatOne).toMatchObject({
            catches: 1,
            scores: 0,
            drops: 0,
        })

        const connectionStatTwo = await AtomicConnection.findOne({
            gameId,
            throwerId: playerFive._id,
            receiverId: playerSix._id,
        })
        expect(connectionStatTwo).toMatchObject({
            catches: 1,
            drops: 0,
            scores: 1,
        })

        const atomicTeamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId })
        expect(atomicTeamOneRecord).toMatchObject({
            goalsFor: 0,
            goalsAgainst: 1,
            turnovers: 1,
            turnoversForced: 1,
            holds: 0,
            breaks: 0,
            defensePoints: 1,
            offensePoints: 0,
        })

        const atomicTeamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwoId, gameId })
        expect(atomicTeamTwoRecord).toMatchObject({
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
        expect(game?.points.length).toBe(1)
        expect(game?.points[0].players.length).toBe(6)
        expect(game?.points[0].connections.length).toBe(12)
        expect(game?.momentumData.length).toBe(4)
        expect(game?.momentumData[0]).toMatchObject({ x: 0, y: 0 })
        expect(game?.momentumData[1]).toMatchObject({ x: 1, y: 5 })
        expect(game?.momentumData[2]).toMatchObject({ x: 2, y: 0 })
        expect(game?.momentumData[3]).toMatchObject({ x: 3, y: -10 })
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

    it('with previously existing point', async () => {
        const game = await Game.findOne()
        game?.points.push({ _id: pointId, players: [], connections: [], teamOne: {}, teamTwo: {} } as unknown as IPoint)
        await game?.save()

        await expect(
            ingestPoint({
                pointId,
                gameId: gameId,
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
        ).rejects.toThrow(Constants.POINT_ALREADY_EXISTS)
    })

    it('handles multiple points', async () => {
        const teamOneActions1: Action[] = [
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
            teamOneActions: teamOneActions1,
            teamTwoActions: [],
            pullingTeam: teamTwo,
            receivingTeam: teamOne,
            scoringTeam: teamOne,
            teamOnePlayers: [playerOne, playerTwo, playerThree],
            teamTwoPlayers: [],
            teamOneScore: 1,
            teamTwoScore: 0,
        })
        const teamOneActions2: Action[] = [
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
                actionNumber: 4,
                actionType: ActionType.CATCH,
                team: teamOne,
                playerOne: playerTwo,
                playerTwo: playerOne,
            },
            {
                actionNumber: 5,
                actionType: ActionType.TEAM_ONE_SCORE,
                team: teamOne,
                playerTwo,
                playerOne: playerThree,
            },
        ]

        const teamTwoActions2: Action[] = [
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
                actionType: ActionType.TEAM_ONE_SCORE,
                team: teamTwo,
            },
        ]

        await ingestPoint({
            pointId: new Types.ObjectId(),
            gameId,
            teamOneActions: teamOneActions2,
            teamTwoActions: teamTwoActions2,
            pullingTeam: teamOne,
            receivingTeam: fullTeamTwo,
            scoringTeam: fullTeamTwo,
            teamOnePlayers: [playerOne, playerTwo, playerThree],
            teamTwoPlayers: [playerFour, playerFive, playerSix],
            teamOneScore: 0,
            teamTwoScore: 1,
        })

        const teamOneActions3: Action[] = [
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
                actionNumber: 4,
                actionType: ActionType.CATCH,
                team: teamOne,
                playerOne: playerTwo,
                playerTwo: playerOne,
            },
            {
                actionNumber: 5,
                actionType: ActionType.TEAM_ONE_SCORE,
                team: teamOne,
                playerTwo,
                playerOne: playerThree,
            },
        ]
        const teamTwoActions3: Action[] = [
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
                actionType: ActionType.TEAM_ONE_SCORE,
                team: teamTwo,
            },
        ]

        await ingestPoint({
            pointId: new Types.ObjectId(),
            gameId,
            teamOneActions: teamOneActions3,
            teamTwoActions: teamTwoActions3,
            pullingTeam: teamOne,
            receivingTeam: fullTeamTwo,
            scoringTeam: fullTeamTwo,
            teamOnePlayers: [playerOne, playerTwo, playerThree],
            teamTwoPlayers: [playerFour, playerFive, playerSix],
            teamOneScore: 0,
            teamTwoScore: 1,
        })

        const game = await Game.findById(gameId)
        expect(game?.points.length).toBe(3)
        expect(game?.points[0].connections.length).toBe(6)
        expect(game?.points[1].connections.length).toBe(12)
        expect(game?.points[2].connections.length).toBe(12)
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
            momentumData: [
                { x: 0, y: 0 },
                { x: 1, y: 5, pointId },
                { x: 2, y: 0, pointId },
                { x: 3, y: 10, pointId: new Types.ObjectId() },
            ],
        })
        await AtomicTeam.create({ gameId: game._id, teamId: teamOne._id, ...teamOne, ...getInitialTeamData({}) })

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
            connections: [
                { ...getInitialConnectionData(playerOne._id, playerTwo._id), catches: 1, drops: 1, scores: 1 },
                { ...getInitialConnectionData(playerOne._id, playerThree._id), catches: 0, drops: 0, scores: 0 },
                { ...getInitialConnectionData(playerTwo._id, playerThree._id), catches: 4, drops: 0, scores: 1 },
                { ...getInitialConnectionData(playerThree._id, playerOne._id), catches: 2, drops: 0, scores: 0 },
                { ...getInitialConnectionData(playerThree._id, playerTwo._id), catches: 0, drops: 0, scores: 0 },
            ],
        }

        game.points.push(point)
        await game.save()
    })

    it('updates atomic player correctly', async () => {
        await AtomicPlayer.create({
            playerId: playerOne._id,
            teamId: teamOne._id,
            gameId: new Types.ObjectId(),
            ...playerOne,
            _id: new Types.ObjectId(),
            goals: 0,
            touches: 0,
            catches: 0,
        })
        await AtomicPlayer.create({
            playerId: playerTwo._id,
            teamId: teamOne._id,
            gameId: new Types.ObjectId(),
            ...playerTwo,
            _id: new Types.ObjectId(),
            assists: 0,
            touches: 0,
            goals: 0,
        })
        await AtomicPlayer.create({
            playerId: playerThree._id,
            teamId: teamTwoId,
            gameId: new Types.ObjectId(),
            ...playerThree,
            _id: new Types.ObjectId(),
            touches: 0,
            drops: 0,
            completedPasses: 0,
        })

        await AtomicPlayer.create({
            playerId: playerOne._id,
            teamId: teamOne._id,
            gameId: new Types.ObjectId(),
            ...playerOne,
            _id: new Types.ObjectId(),
            goals: 0,
            touches: 0,
            catches: 0,
        })
        await AtomicPlayer.create({
            playerId: playerTwo._id,
            teamId: teamOne._id,
            gameId: new Types.ObjectId(),
            ...playerTwo,
            _id: new Types.ObjectId(),
            assists: 0,
            touches: 0,
            goals: 0,
        })
        await AtomicPlayer.create({
            playerId: playerThree._id,
            teamId: teamTwoId,
            gameId: new Types.ObjectId(),
            ...playerThree,
            _id: new Types.ObjectId(),
            touches: 0,
            drops: 0,
            completedPasses: 0,
        })
        await AtomicPlayer.create({
            playerId: playerOne._id,
            teamId: teamOne._id,
            gameId,
            ...playerOne,
            _id: new Types.ObjectId(),
            goals: 1,
            touches: 5,
            catches: 4,
        })
        await AtomicPlayer.create({
            playerId: playerTwo._id,
            teamId: teamOne._id,
            gameId,
            ...playerTwo,
            _id: new Types.ObjectId(),
            assists: 2,
            touches: 2,
            goals: 1,
        })
        await AtomicPlayer.create({
            playerId: playerThree._id,
            teamId: teamTwoId,
            gameId,
            ...playerThree,
            _id: new Types.ObjectId(),
            touches: 1,
            drops: 1,
            completedPasses: 2,
        })

        await deletePoint(gameId.toHexString(), pointId.toHexString())

        const atomicPlayerOne = await AtomicPlayer.findOne({ playerId: playerOne._id })
        expect(atomicPlayerOne).toMatchObject({
            goals: 0,
            touches: 3,
            catches: 2,
        })

        const atomicPlayerTwo = await AtomicPlayer.findOne({ playerId: playerTwo._id })
        expect(atomicPlayerTwo).toMatchObject({
            assists: 1,
            touches: 1,
            goals: 1,
        })

        const atomicPlayerThree = await AtomicPlayer.findOne({ playerId: playerThree._id })
        expect(atomicPlayerThree).toMatchObject({
            touches: 1,
            drops: 0,
            completedPasses: 2,
        })
    })

    it('update team stats correctly', async () => {
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
            connections: [],
        }

        const game = await Game.findById(gameId)
        game!.points = [point]
        await game?.save()

        await deletePoint(gameId.toHexString(), pointId.toHexString())
    })

    it('update atomic team correctly', async () => {
        await AtomicTeam.create({
            gameId: gameId,
            teamId: teamTwoId,
            ...teamTwo,
            goalsFor: 2,
            goalsAgainst: 2,
            turnovers: 3,
            turnoversForced: 4,
            holds: 2,
        })

        const teamSetupRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId: gameId })
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
            connections: [],
        }

        const game = await Game.findById(gameId)
        game!.points = [point]
        await game?.save()

        await deletePoint(gameId.toHexString(), pointId.toHexString())

        const teamOneRecord = await AtomicTeam.findOne({ teamId: teamOne._id, gameId: gameId })
        expect(teamOneRecord).toMatchObject({ goalsAgainst: 1, turnovers: 3 })

        const teamTwoRecord = await AtomicTeam.findOne({ teamId: teamTwoId, gameId: gameId })
        expect(teamTwoRecord).toMatchObject({ goalsFor: 1, goalsAgainst: 1, turnoversForced: 2, holds: 1 })
    })

    it('updates game correctly', async () => {
        const game = await Game.findById(gameId)

        await game?.save()

        await deletePoint(gameId.toHexString(), pointId.toHexString())

        const gameRecord = await Game.findById(gameId)
        expect(gameRecord?.points.length).toBe(0)
        expect(gameRecord?.momentumData.length).toBe(2)
    })

    it('updates connections correctly', async () => {
        await AtomicConnection.create({
            ...getInitialConnectionData(playerOne._id, playerTwo._id),
            gameId,
            teamId: teamOne._id,
            catches: 4,
            drops: 1,
            scores: 1,
        })
        await AtomicConnection.create({
            ...getInitialConnectionData(playerOne._id, playerThree._id),
            gameId,
            teamId: teamOne._id,
            catches: 4,
            drops: 1,
            scores: 2,
        })
        await AtomicConnection.create({
            ...getInitialConnectionData(playerTwo._id, playerOne._id),
            gameId,
            teamId: teamOne._id,
            catches: 0,
            drops: 0,
            scores: 0,
        })
        await AtomicConnection.create({
            ...getInitialConnectionData(playerTwo._id, playerThree._id),
            gameId,
            teamId: teamOne._id,
            catches: 4,
            drops: 0,
            scores: 1,
        })
        await AtomicConnection.create({
            ...getInitialConnectionData(playerThree._id, playerOne._id),
            gameId,
            teamId: teamOne._id,
            catches: 7,
            drops: 0,
            scores: 0,
        })
        await AtomicConnection.create({
            ...getInitialConnectionData(playerThree._id, playerTwo._id),
            gameId,
            teamId: teamOne._id,
            catches: 0,
            drops: 0,
            scores: 0,
        })

        await deletePoint(gameId.toHexString(), pointId.toHexString())

        const atomicConnectionOne = await AtomicConnection.findOne({
            gameId,
            throwerId: playerOne._id,
            receiverId: playerTwo._id,
        })
        expect(atomicConnectionOne).toMatchObject({
            catches: 3,
            drops: 0,
            scores: 0,
        })

        const atomicConnectionTwo = await AtomicConnection.findOne({
            gameId,
            throwerId: playerOne._id,
            receiverId: playerThree._id,
        })
        expect(atomicConnectionTwo).toMatchObject({
            catches: 4,
            drops: 1,
            scores: 2,
        })

        const atomicConnectionThree = await AtomicConnection.findOne({
            gameId,
            throwerId: playerTwo._id,
            receiverId: playerOne._id,
        })
        expect(atomicConnectionThree).toMatchObject({
            catches: 0,
            drops: 0,
            scores: 0,
        })

        const atomicConnectionFour = await AtomicConnection.findOne({
            gameId,
            throwerId: playerTwo._id,
            receiverId: playerThree._id,
        })
        expect(atomicConnectionFour).toMatchObject({
            catches: 0,
            drops: 0,
            scores: 0,
        })

        const atomicConnectionFive = await AtomicConnection.findOne({
            gameId,
            throwerId: playerThree._id,
            receiverId: playerOne._id,
        })
        expect(atomicConnectionFive).toMatchObject({
            catches: 5,
            drops: 0,
            scores: 0,
        })

        const atomicConnectionSix = await AtomicConnection.findOne({
            gameId,
            throwerId: playerThree._id,
            receiverId: playerTwo._id,
        })
        expect(atomicConnectionSix).toMatchObject({
            catches: 0,
            drops: 0,
            scores: 0,
        })
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

describe('database utils', () => {
    describe('update added atomic team stats', () => {
        const gameId = new Types.ObjectId()
        const teamId = new Types.ObjectId()
        it('handles valid update', async () => {
            await AtomicTeam.create({ gameId, teamId, ...teamOne, ...getInitialTeamData({}) })

            const overrides = { goalsAgainst: 3, goalsFor: 1, turnovers: 2 }
            await updateAddedAtomicTeamStats(getInitialTeamData(overrides), gameId, teamId)

            const result = await AtomicTeam.findOne({ teamId, gameId })
            expect(result).toMatchObject(overrides)
        })

        it('does not update if team id missing', async () => {
            await AtomicTeam.create({ gameId, teamId, ...teamOne, ...getInitialTeamData({}) })

            const overrides = { goalsAgainst: 3, goalsFor: 1, turnovers: 2 }
            await updateAddedAtomicTeamStats(getInitialTeamData(overrides), gameId)

            const result = await AtomicTeam.findOne({ gameId, teamId })
            expect(result).not.toMatchObject(overrides)
        })
    })

    describe('update subtracted atomic team stats', () => {
        const teamId = new Types.ObjectId()
        const gameId = new Types.ObjectId()

        it('handles valid update', async () => {
            await AtomicTeam.create({
                teamId,
                gameId,
                ...teamOne,
                ...getInitialTeamData({ goalsFor: 2, goalsAgainst: 3, turnovers: 1, completionsToScore: [1, 2, 3] }),
            })

            await updateSubtractedAtomicTeamStats(gameId, {
                _id: teamId,
                ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 1, turnovers: 1, completionsToScore: [2] }),
            })

            const result = await AtomicTeam.findOne({ gameId, teamId })
            expect(result).toMatchObject({ goalsFor: 1, goalsAgainst: 2, turnovers: 0, completionsToScore: [1, 3] })
        })

        it('does not update if team missing id', async () => {
            await AtomicTeam.create({
                teamId,
                gameId,
                ...teamOne,
                ...getInitialTeamData({ goalsFor: 2, goalsAgainst: 3, turnovers: 1, completionsToScore: [1, 2, 3] }),
            })

            await updateSubtractedAtomicTeamStats(gameId, {
                ...getInitialTeamData({ goalsFor: 1, goalsAgainst: 1, turnovers: 1, completionsToScore: [2] }),
            })

            const result = await AtomicTeam.findOne({ gameId, teamId })
            expect(result).not.toMatchObject({ goalsFor: 1, goalsAgainst: 2, turnovers: 0, completionsToScore: [1, 3] })
        })
    })

    describe('save player data', () => {
        it('handles found player case', async () => {
            const gameId = new Types.ObjectId()
            const playerId = new Types.ObjectId()
            const teamId = new Types.ObjectId()
            await savePlayerData(
                [{ playerId, ...getInitialPlayerData({ pointsPlayed: 2 }) }],
                gameId,
                [{ _id: playerId, firstName: 'First 1', lastName: 'Last 1', username: 'firstlast1' }],
                teamId,
            )

            const result = await AtomicPlayer.findOne({})
            expect(result).toMatchObject({
                firstName: 'First 1',
                lastName: 'Last 1',
                username: 'firstlast1',
                playerId,
                pointsPlayed: 2,
            })
        })

        it('handles unfound player case', async () => {
            const gameId = new Types.ObjectId()
            const playerId = new Types.ObjectId()
            const teamId = new Types.ObjectId()
            await savePlayerData(
                [{ playerId, ...getInitialPlayerData({ pointsPlayed: 2 }) }],
                gameId,
                [{ _id: new Types.ObjectId(), firstName: 'First 1', lastName: 'Last 1', username: 'firstlast1' }],
                teamId,
            )

            const result = await AtomicPlayer.find()
            expect(result.length).toBe(0)
        })
    })
})
