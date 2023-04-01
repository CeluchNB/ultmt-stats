import { Types } from 'mongoose'
import AtomicStat from '../../../../src/models/atomic-stat'
import Game from '../../../../src/models/game'
import Player from '../../../../src/models/player'
import Team from '../../../../src/models/team'
import { ingestPoint } from '../../../../src/services/v1/point'
import { EmbeddedPlayer } from '../../../../src/types/player'
import { Action, ActionType } from '../../../../src/types/point'
import { EmbeddedTeam } from '../../../../src/types/team'
import { setUpDatabase, tearDownDatabase, resetDatabase } from '../../../fixtures/setup-db'

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
    const teamOneId = new Types.ObjectId()
    const teamTwoId = new Types.ObjectId()
    const pointId = new Types.ObjectId()
    const startTime = new Date()

    const teamOne: EmbeddedTeam = {
        _id: teamOneId,
        place: 'Pittsburgh',
        name: 'Temper',
        teamName: 'pghtemper',
        seasonStart: new Date(),
        seasonEnd: new Date(),
    }

    const teamTwo: EmbeddedTeam = {
        place: 'Pittsburgh',
        name: 'Hazard',
    }

    const playerOne: EmbeddedPlayer = {
        _id: new Types.ObjectId(),
        firstName: 'First 1',
        lastName: 'Last 1',
        username: 'firstlast1',
    }
    const playerTwo: EmbeddedPlayer = {
        _id: new Types.ObjectId(),
        firstName: 'First 2',
        lastName: 'Last 2',
        username: 'firstlast2',
    }
    const playerThree: EmbeddedPlayer = {
        _id: new Types.ObjectId(),
        firstName: 'First 3',
        lastName: 'Last 3',
        username: 'firstlast3',
    }

    const playerFour: EmbeddedPlayer = {
        _id: new Types.ObjectId(),
        firstName: 'First 4',
        lastName: 'Last 4',
        username: 'firstlast4',
    }
    const playerFive: EmbeddedPlayer = {
        _id: new Types.ObjectId(),
        firstName: 'First 5',
        lastName: 'Last 5',
        username: 'firstlast5',
    }
    const playerSix: EmbeddedPlayer = {
        _id: new Types.ObjectId(),
        firstName: 'First 6',
        lastName: 'Last 6',
        username: 'firstlast6',
    }

    beforeEach(async () => {
        await Game.create({ _id: gameId, teamOneId, teamTwoId, startTime })
        await Team.create(teamOne)
        await Player.create(playerOne)
        await Player.create(playerTwo)
        await Player.create(playerThree)
        // await AtomicStat.create({ gameId, playerId: playerOne._id, teamId: teamOneId })
        // await AtomicStat.create({ gameId, playerId: playerTwo._id, teamId: teamOneId })
        // await AtomicStat.create({ gameId, playerId: playerThree._id, teamId: teamOneId })
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

        const teamRecord = await Team.findById(teamOneId)
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
        expect(game?.goalsLeader.player._id.toString()).toBe(playerThree._id.toString())
        expect(game?.goalsLeader.total).toBe(1)
        expect(game?.assistsLeader.player._id.toString()).toBe(playerOne._id.toString())
        expect(game?.assistsLeader.total).toBe(1)
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

        const teamRecord = await Team.findById(teamOneId)
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
        expect(game?.goalsLeader).toBeUndefined()
        expect(game?.assistsLeader).toBeUndefined()
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

        const playerTwoStatQuery = await AtomicStat.find({ playerId: playerTwo._id, gameId })
        const playerTwoStat = playerTwoStatQuery[0]
        expect(playerTwoStat?.goals).toBe(1)
        expect(playerTwoStat?.assists).toBe(0)
        expect(playerTwoStat?.callahans).toBe(1)
        expect(playerTwoStat?.blocks).toBe(1)
        expect(playerTwoStat?.pointsPlayed).toBe(1)
        expect(playerTwoStat?.touches).toBe(1)
        expect(playerTwoStat?.catches).toBe(1)
        expect(playerTwoStat?.pulls).toBe(0)

        const playerTwoRecord = await Player.findById(playerTwo._id)
        expect(playerTwoRecord?.goals).toBe(1)
        expect(playerTwoRecord?.assists).toBe(0)
        expect(playerTwoRecord?.callahans).toBe(1)
        expect(playerTwoRecord?.blocks).toBe(1)
        expect(playerTwoRecord?.pointsPlayed).toBe(1)
        expect(playerTwoRecord?.touches).toBe(1)
        expect(playerTwoRecord?.catches).toBe(1)
        expect(playerTwoRecord?.pulls).toBe(0)

        const game = await Game.findById(gameId)
        expect(game?.goalsLeader).toBeUndefined()
        expect(game?.assistsLeader).toBeUndefined()
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
            receivingTeam: teamTwo,
            scoringTeam: teamTwo,
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

        const game = await Game.findById(gameId)
        expect(game?.goalsLeader.player._id.toString()).toBe(playerSix._id.toString())
        expect(game?.goalsLeader.total).toBe(1)
        expect(game?.assistsLeader.player._id.toString()).toBe(playerFive._id.toString())
        expect(game?.assistsLeader.total).toBe(1)
        expect(game?.points.length).toBe(1)
        expect(game?.points[0].players.length).toBe(6)
    })
})