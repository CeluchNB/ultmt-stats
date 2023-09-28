import { Types } from 'mongoose'
import { Action, ActionType } from '../../../src/types/point'
import {
    initializePlayerMap,
    incrementMapValue,
    getInitialPlayerData,
    populatePlayerMap,
    updateAtomicPlayer,
    flattenPlayerMap,
    calculatePlayerData,
} from '../../../src/utils/player-stats'
import { teamOne, getPlayer } from '../../fixtures/data'

const playerOne = getPlayer(1)
const playerTwo = getPlayer(2)

describe('initializePlayerMap', () => {
    it('returns initial map', () => {
        const map = new Map()
        initializePlayerMap(map, [playerOne, playerTwo])

        expect(map.size).toBe(2)
        expect(map.get(playerOne._id)).toMatchObject({
            pointsPlayed: 1,
            goals: 0,
            assists: 0,
            drops: 0,
            throwaways: 0,
        })
        expect(map.get(playerTwo._id)).toMatchObject({
            pointsPlayed: 1,
            goals: 0,
            assists: 0,
            drops: 0,
            throwaways: 0,
        })
    })
})

describe('incrementMapValue', () => {
    const map = new Map()
    beforeEach(() => {
        map.clear()
    })

    it('makes no changes with no values', () => {
        incrementMapValue(map, new Types.ObjectId(), [])
        expect(map.size).toBe(0)
    })

    it('makes no change with unfound player', () => {
        incrementMapValue(map, new Types.ObjectId(), ['pulls'])
        expect(map.size).toBe(0)
    })

    it('updates found player', () => {
        map.set(playerOne._id, getInitialPlayerData({ goals: 4 }))
        incrementMapValue(map, playerOne._id, ['pulls', 'goals', 'assists', 'throwaways'])

        const result = map.get(playerOne._id)
        expect(result).toMatchObject({
            pulls: 1,
            goals: 5,
            assists: 1,
            throwaways: 1,
            drops: 0,
            pointsPlayed: 0,
        })
    })
})

describe('updateAtomicPlayers', () => {
    const map = new Map()
    const action: Action = {
        actionNumber: 1,
        actionType: ActionType.CATCH,
        team: teamOne,
    }
    beforeEach(() => {
        map.set(playerOne._id, getInitialPlayerData({}))
        map.set(playerTwo._id, getInitialPlayerData({}))

        action.actionNumber = 1
        action.actionType = ActionType.PULL
        action.team = teamOne
        action.playerOne = undefined
        action.playerTwo = undefined
    })

    it('with no player one', () => {
        updateAtomicPlayer(map, 'one', action, undefined)

        expect(map.get(playerOne._id)).toMatchObject(getInitialPlayerData({}))
        expect(map.get(playerTwo._id)).toMatchObject(getInitialPlayerData({}))
    })

    it('for pull', () => {
        action.actionType = ActionType.PULL
        action.playerOne = playerOne
        updateAtomicPlayer(map, 'one', action, undefined)

        expect(map.get(playerOne._id)).toMatchObject(getInitialPlayerData({ pulls: 1 }))
        expect(map.get(playerTwo._id)).toMatchObject(getInitialPlayerData({}))
    })

    it('for block', () => {
        action.actionType = ActionType.BLOCK
        action.playerOne = playerOne
        updateAtomicPlayer(map, 'one', action, undefined)

        expect(map.get(playerOne._id)).toMatchObject(getInitialPlayerData({ blocks: 1 }))
        expect(map.get(playerTwo._id)).toMatchObject(getInitialPlayerData({}))
    })

    it('for pickup', () => {
        action.actionType = ActionType.PICKUP
        action.playerOne = playerOne
        updateAtomicPlayer(map, 'one', action, undefined)

        expect(map.get(playerOne._id)).toMatchObject(getInitialPlayerData({ touches: 1 }))
        expect(map.get(playerTwo._id)).toMatchObject(getInitialPlayerData({}))
    })

    it('for throwaway', () => {
        action.actionType = ActionType.THROWAWAY
        action.playerOne = playerOne
        updateAtomicPlayer(map, 'one', action, undefined)

        expect(map.get(playerOne._id)).toMatchObject(getInitialPlayerData({ throwaways: 1 }))
        expect(map.get(playerTwo._id)).toMatchObject(getInitialPlayerData({}))
    })

    it('for catch', () => {
        action.actionType = ActionType.CATCH
        action.playerOne = playerOne
        action.playerTwo = playerTwo

        updateAtomicPlayer(map, 'one', action, undefined)
        expect(map.get(playerOne._id)).toMatchObject(getInitialPlayerData({ catches: 1, touches: 1 }))
        expect(map.get(playerTwo._id)).toMatchObject(getInitialPlayerData({ completedPasses: 1 }))
    })

    it('for drop', () => {
        action.actionType = ActionType.DROP
        action.playerOne = playerOne
        action.playerTwo = playerTwo

        updateAtomicPlayer(map, 'one', action, undefined)
        expect(map.get(playerOne._id)).toMatchObject(getInitialPlayerData({ drops: 1 }))
        expect(map.get(playerTwo._id)).toMatchObject(getInitialPlayerData({ droppedPasses: 1 }))
    })

    it('for team one score', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        action.playerOne = playerOne
        action.playerTwo = playerTwo

        updateAtomicPlayer(map, 'one', action, undefined)
        expect(map.get(playerOne._id)).toMatchObject(getInitialPlayerData({ goals: 1, touches: 1, catches: 1 }))
        expect(map.get(playerTwo._id)).toMatchObject(getInitialPlayerData({ assists: 1, completedPasses: 1 }))
    })

    it('for team two score', () => {
        action.actionType = ActionType.TEAM_TWO_SCORE
        action.playerOne = playerOne
        action.playerTwo = playerTwo

        updateAtomicPlayer(map, 'two', action, undefined)
        expect(map.get(playerOne._id)).toMatchObject(getInitialPlayerData({ goals: 1, touches: 1, catches: 1 }))
        expect(map.get(playerTwo._id)).toMatchObject(getInitialPlayerData({ assists: 1, completedPasses: 1 }))
    })

    it('for callahan', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        action.playerOne = playerOne

        const prevAction: Action = {
            actionNumber: 1,
            actionType: ActionType.PULL,
            team: teamOne,
            playerOne,
        }

        updateAtomicPlayer(map, 'one', action, prevAction)
        expect(map.get(playerOne._id)).toMatchObject(
            getInitialPlayerData({ goals: 1, touches: 1, catches: 1, callahans: 1, blocks: 1 }),
        )
    })

    it('for hockey assist', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        action.playerOne = playerOne
        action.playerTwo = playerTwo

        const prevAction: Action = {
            actionNumber: 1,
            actionType: ActionType.CATCH,
            team: teamOne,
            playerOne: playerTwo,
            playerTwo: playerOne,
        }

        updateAtomicPlayer(map, 'one', action, prevAction)
        expect(map.get(playerOne._id)).toMatchObject(
            getInitialPlayerData({ goals: 1, touches: 1, catches: 1, hockeyAssists: 1 }),
        )
        expect(map.get(playerTwo._id)).toMatchObject(getInitialPlayerData({ assists: 1, completedPasses: 1 }))
    })

    it('substitution does not add points played', () => {
        action.actionType = ActionType.SUBSTITUTION
        action.playerOne = playerOne
        action.playerTwo = playerTwo

        updateAtomicPlayer(map, 'one', action, undefined)
        expect(map.get(playerOne._id)).toMatchObject(getInitialPlayerData({}))
        expect(map.get(playerTwo._id)).toMatchObject(getInitialPlayerData({}))
    })
})

describe('flattenPlayerMap', () => {
    it('with values', () => {
        const map = new Map()
        map.set(playerOne._id, getInitialPlayerData({}))
        const result = flattenPlayerMap(map)
        expect(result[0]).toMatchObject({
            playerId: playerOne._id,
            ...getInitialPlayerData({}),
        })
    })
})

describe('populatePlayerMap', () => {
    it('with normal list of actions', () => {
        const map = new Map()
        map.set(playerOne._id, getInitialPlayerData({}))
        map.set(playerTwo._id, getInitialPlayerData({}))

        const actions: Action[] = [
            { actionNumber: 1, actionType: ActionType.PULL, team: teamOne, playerOne },
            { actionNumber: 2, actionType: ActionType.BLOCK, team: teamOne, playerOne: playerTwo },
            { actionNumber: 3, actionType: ActionType.TEAM_ONE_SCORE, team: teamOne, playerOne, playerTwo },
        ]

        populatePlayerMap(map, actions, 'one')
        expect(map.get(playerOne._id)).toMatchObject(
            getInitialPlayerData({ pulls: 1, goals: 1, catches: 1, touches: 1, hockeyAssists: 0 }),
        )
        expect(map.get(playerTwo._id)).toMatchObject(
            getInitialPlayerData({ blocks: 1, assists: 1, completedPasses: 1, hockeyAssists: 0 }),
        )
    })
})

describe('calculatePlayerData', () => {
    it('with normal data', () => {
        const actions: Action[] = [
            { actionNumber: 1, actionType: ActionType.PULL, team: teamOne, playerOne },
            { actionNumber: 2, actionType: ActionType.BLOCK, team: teamOne, playerOne: playerTwo },
            { actionNumber: 3, actionType: ActionType.TEAM_ONE_SCORE, team: teamOne, playerOne, playerTwo },
        ]

        const result = calculatePlayerData([playerOne, playerTwo], actions, 'one')

        expect(result.length).toBe(2)
        expect(result[0]).toMatchObject({
            playerId: playerOne._id,
            ...getInitialPlayerData({ pulls: 1, goals: 1, catches: 1, touches: 1, pointsPlayed: 1, hockeyAssists: 0 }),
        })
        expect(result[1]).toMatchObject({
            playerId: playerTwo._id,
            ...getInitialPlayerData({ blocks: 1, assists: 1, completedPasses: 1, pointsPlayed: 1, hockeyAssists: 0 }),
        })
    })
})
