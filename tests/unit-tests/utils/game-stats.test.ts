import { Types } from 'mongoose'
import Player from '../../../src/models/player'
import IGame, { IdentifiedPlayerData } from '../../../src/types/game'
import { EmbeddedTeam } from '../../../src/types/team'
import {
    calculatePlayerPlusMinus,
    calculatePlayerTurnovers,
    getGamePlayerData,
    updateGameLeaders,
} from '../../../src/utils/game-stats'
import { getInitialPlayerData } from '../../../src/utils/player-stats'
import { getInitialTeamData } from '../../../src/utils/team-stats'
import { getPlayer } from '../../fixtures/data'
import { resetDatabase, setUpDatabase, tearDownDatabase } from '../../fixtures/setup-db'

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

describe('updateGameLeaders', () => {
    let game: IGame = {
        _id: new Types.ObjectId(),
        teamOneId: new Types.ObjectId(),
        teamTwoId: new Types.ObjectId(),
        startTime: new Date(),
        points: [],
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
    }
    const playerOne = getPlayer(1)
    const playerTwo = getPlayer(2)
    const pointPlayers = [playerOne, playerTwo]
    const map = new Map()

    beforeEach(() => {
        game = {
            _id: new Types.ObjectId(),
            teamOneId: new Types.ObjectId(),
            teamTwoId: new Types.ObjectId(),
            startTime: new Date(),
            points: [],
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
        }
        map.clear()
    })

    it('with new goals leader', () => {
        map.set(playerOne._id, getInitialPlayerData({ goals: 1 }))

        updateGameLeaders(game, map, pointPlayers)

        expect(game.goalsLeader.player).toMatchObject(playerOne)
        expect(game.goalsLeader.total).toBe(1)
    })

    it('with multiple goal leader changes', () => {
        map.set(playerOne._id, getInitialPlayerData({ goals: 1 }))
        map.set(playerTwo._id, getInitialPlayerData({ goals: 3 }))

        updateGameLeaders(game, map, pointPlayers)

        expect(game.goalsLeader.player).toMatchObject(playerTwo)
        expect(game.goalsLeader.total).toBe(3)
    })

    it('with new assists leader', () => {
        map.set(playerOne._id, getInitialPlayerData({ assists: 1 }))

        updateGameLeaders(game, map, pointPlayers)

        expect(game.assistsLeader.player).toMatchObject(playerOne)
        expect(game.assistsLeader.total).toBe(1)
    })

    it('with new points leader', () => {
        map.set(playerOne._id, getInitialPlayerData({ pointsPlayed: 1 }))

        updateGameLeaders(game, map, pointPlayers)

        expect(game.pointsPlayedLeader.player).toMatchObject(playerOne)
        expect(game.pointsPlayedLeader.total).toBe(1)
    })

    it('with new blocks leader', () => {
        map.set(playerOne._id, getInitialPlayerData({ blocks: 1 }))

        updateGameLeaders(game, map, pointPlayers)

        expect(game.blocksLeader.player).toMatchObject(playerOne)
        expect(game.blocksLeader.total).toBe(1)
    })

    it('with new turnovers leader', () => {
        map.set(playerOne._id, getInitialPlayerData({ throwaways: 1, drops: 1 }))

        updateGameLeaders(game, map, pointPlayers)

        expect(game.turnoversLeader.player).toMatchObject(playerOne)
        expect(game.turnoversLeader.total).toBe(2)
    })

    it('with new plus minus leader', () => {
        map.set(playerOne._id, getInitialPlayerData({ goals: 1, blocks: 1, drops: 1 }))

        updateGameLeaders(game, map, pointPlayers)

        expect(game.plusMinusLeader.player).toMatchObject(playerOne)
        expect(game.plusMinusLeader.total).toBe(1)
    })

    it('with no player in memory', async () => {
        await Player.create({ ...playerTwo })
        map.set(playerTwo._id, getInitialPlayerData({ goals: 2 }))
        await updateGameLeaders(game, map, [])

        expect(game.goalsLeader.player).toMatchObject(playerTwo)
        expect(game.goalsLeader.total).toBe(2)
    })

    it('with non-found player', async () => {
        map.set(playerTwo._id, getInitialPlayerData({ goals: 2 }))
        await updateGameLeaders(game, map, [])

        expect(game.goalsLeader.player).toBe(undefined)
        expect(game.goalsLeader.total).toBe(0)
    })

    it('with empty map', async () => {
        game.goalsLeader.player = playerOne
        game.goalsLeader.total = 5
        game.plusMinusLeader.player = playerTwo
        game.plusMinusLeader.total = 4
        await updateGameLeaders(game, map, [])

        expect(game.goalsLeader.player).toBeUndefined()
        expect(game.goalsLeader.total).toBe(0)
        expect(game.plusMinusLeader.player).toBeUndefined()
        expect(game.plusMinusLeader.total).toBe(0)
        expect(game.assistsLeader.player).toBeUndefined()
        expect(game.assistsLeader.total).toBe(0)
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
            },
        ],
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
