import { Types } from 'mongoose'
import IGame, { GameData, IdentifiedPlayerData } from '../../../src/types/game'
import { EmbeddedTeam } from '../../../src/types/team'
import {
    calculatePlayerPlusMinus,
    calculatePlayerTurnovers,
    calculateWinner,
    getGamePlayerData,
    updateGameData,
} from '../../../src/utils/game-stats'
import { getInitialPlayerData } from '../../../src/utils/player-stats'
import { getInitialTeamData } from '../../../src/utils/team-stats'
import { getPlayer } from '../../fixtures/data'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../fixtures/setup-db'
import { PlayerData } from '../../../src/types/player'

beforeAll(async () => {
    await setUpDatabase()
})

afterEach(async () => {
    await resetDatabase()
})

afterAll(async () => {
    await tearDownDatabase()
})

describe('calculatePlayerPlusMinus', () => {
    it('with goal', () => {
        const result = calculatePlayerPlusMinus(getInitialPlayerData({ goals: 1 }))
        expect(result).toBe(1)
    })

    it('with assist', () => {
        const result = calculatePlayerPlusMinus(getInitialPlayerData({ assists: 1 }))
        expect(result).toBe(1)
    })

    it('with block', () => {
        const result = calculatePlayerPlusMinus(getInitialPlayerData({ blocks: 1 }))
        expect(result).toBe(1)
    })

    it('with throwaway', () => {
        const result = calculatePlayerPlusMinus(getInitialPlayerData({ throwaways: 1 }))
        expect(result).toBe(-1)
    })

    it('with drop', () => {
        const result = calculatePlayerPlusMinus(getInitialPlayerData({ drops: 1 }))
        expect(result).toBe(-1)
    })
})

describe('calculatePlayerTurnovers', () => {
    it('with normal data', () => {
        const result = calculatePlayerTurnovers(getInitialPlayerData({ throwaways: 1, drops: 1, stalls: 1 }))
        expect(result).toBe(3)
    })
})

describe('getGamePlayerData', () => {
    const teamOne: EmbeddedTeam = {
        _id: new Types.ObjectId(),
        place: 'Pittsburgh',
        name: 'Temper',
        teamname: 'pghtemper',
        seasonStart: new Date(),
        seasonEnd: new Date(),
    }

    const teamTwo: EmbeddedTeam = {
        place: 'Pittsburgh',
        name: 'Hazard',
    }
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)

    const playerDataOne: IdentifiedPlayerData = {
        _id: playerOne._id,
        ...getInitialPlayerData({ goals: 1, pulls: 1, drops: 1, catches: 1, touches: 1 }),
    }
    const playerDataTwo: IdentifiedPlayerData = {
        _id: playerTwo._id,
        ...getInitialPlayerData({ assists: 1, touches: 3, catches: 2 }),
    }
    const game: IGame = {
        _id: new Types.ObjectId(),
        teamOneId: new Types.ObjectId(),
        teamTwoId: new Types.ObjectId(),
        startTime: new Date(),
        points: [
            {
                _id: new Types.ObjectId(),
                players: [playerDataOne, playerDataTwo],
                teamOne: {
                    _id: teamOne._id,
                    ...getInitialTeamData({}),
                },
                teamTwo: {
                    _id: teamTwo._id,
                    ...getInitialTeamData({}),
                },
                connections: [],
            },
            {
                _id: new Types.ObjectId(),
                players: [playerDataOne, playerDataTwo],
                teamOne: {
                    _id: teamOne._id,
                    ...getInitialTeamData({}),
                },
                teamTwo: {
                    _id: teamTwo._id,
                    ...getInitialTeamData({}),
                },
                connections: [],
            },
        ],
        momentumData: [{ x: 0, y: 0 }],
    }
    it('with data', () => {
        const result = getGamePlayerData(game)

        expect(result.size).toBe(2)

        const playerOneResult = result.get(playerOne._id.toString())
        expect(playerOneResult).toMatchObject({
            ...getInitialPlayerData({ goals: 2, pulls: 2, drops: 2, catches: 2, touches: 2 }),
        })

        const playerTwoResult = result.get(playerTwo._id.toString())
        expect(playerTwoResult).toMatchObject({
            ...getInitialPlayerData({ assists: 2, touches: 6, catches: 4 }),
        })
    })
})

describe('updateGameData', () => {
    it('makes no update with missing player', () => {
        const gameData = { goalsLeader: { total: 0 } }
        expect(updateGameData(gameData as GameData, { goals: 1 } as PlayerData, undefined))
        expect(gameData.goalsLeader.total).toBe(0)
    })

    it('updates goal data', () => {
        const gameData: GameData = {
            goalsLeader: { total: 0 },
            assistsLeader: { total: 0 },
            blocksLeader: { total: 0 },
            turnoversLeader: { total: 0 },
            plusMinusLeader: { total: 0 },
            pointsPlayedLeader: { total: 0 },
        }
        expect(
            updateGameData(gameData, { goals: 1 } as PlayerData, {
                _id: new Types.ObjectId(),
                firstName: 'First',
                lastName: 'Last',
                username: 'user',
            }),
        )
        expect(gameData.goalsLeader.total).toBe(1)
    })
})

describe('calculateWinner', () => {
    it('with team one winning', () => {
        const result = calculateWinner({
            points: [
                { teamOne: { goalsFor: 1 }, teamTwo: { goalsAgainst: 0 } },
                { teamOne: { goalsAgainst: 1 }, teamTwo: { goalsFor: 0 } },
                { teamOne: { goalsFor: 1 }, teamTwo: { goalsAgainst: 0 } },
            ],
        } as unknown as IGame)
        expect(result).toBe('one')
    })

    it('with team two winnning', () => {
        const result = calculateWinner({
            points: [
                { teamOne: { goalsAgainst: 1 }, teamTwo: { goalsFor: 0 } },
                { teamOne: { goalsAgainst: 1 }, teamTwo: { goalsFor: 0 } },
                { teamOne: { goalsFor: 1 }, teamTwo: { goalsAgainst: 0 } },
            ],
        } as unknown as IGame)
        expect(result).toBe('two')
    })
})
