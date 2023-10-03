import { Action, ActionType } from '../../../src/types/point'
import { teamOne, getPlayer } from '../../fixtures/data'
import {
    getConnectionMapKey,
    initializeConnectionMap,
    updateAtomicConnections,
} from '../../../src/utils/connection-stats'
import { IConnection } from '../../../src/types/connection'

describe('initializeConnectionMap', () => {
    it('correctly initializes map', () => {
        const player1 = getPlayer(1)
        const player2 = getPlayer(2)
        const player3 = getPlayer(3)
        const player4 = getPlayer(4)
        const player5 = getPlayer(5)
        const player6 = getPlayer(6)
        const player7 = getPlayer(7)
        const map = new Map<string, IConnection>()

        const players = [player1, player2, player3, player4, player5, player6, player7]
        initializeConnectionMap(map, players)

        expect(map.size).toBe(42)
        for (const thrower of players) {
            for (const receiver of players) {
                if (receiver._id.equals(thrower._id)) continue

                const key = `${thrower._id}${receiver._id}`
                expect(map.has(key)).toBe(true)
            }
        }
    })
})

describe('updateAtomicConnections', () => {
    const map = new Map<string, IConnection>()
    const player1 = getPlayer(1)
    const player2 = getPlayer(2)
    const player3 = getPlayer(3)

    const action: Action = {
        actionNumber: 1,
        playerOne: player1,
        playerTwo: player2,
        actionType: ActionType.CATCH,
        team: teamOne,
    }

    const testOtherKeys = () => {
        const key1 = `${player1._id}${player3._id}`
        const key2 = `${player1._id}${player2._id}`
        const key3 = `${player2._id}${player3._id}`
        const key4 = `${player3._id}${player1._id}`
        const key5 = `${player3._id}${player2._id}`

        for (const key of [key1, key2, key3, key4, key5]) {
            const value = map.get(key)
            expect(value).toMatchObject({
                catches: 0,
                drops: 0,
                scores: 0,
            })
        }
    }

    beforeEach(() => {
        initializeConnectionMap(map, [player1, player2, player3])
    })

    it('missing player one makes no updates', () => {
        action.playerOne = undefined
        action.playerTwo = player2
        updateAtomicConnections(map, action)

        const key = getConnectionMapKey(player2._id, player1._id)
        const value = map.get(key)
        expect(value).toMatchObject({
            catches: 0,
            drops: 0,
            scores: 0,
        })
        testOtherKeys()
    })

    it('missing player two makes no updates', () => {
        action.playerOne = player1
        action.playerTwo = undefined
        updateAtomicConnections(map, action)

        const key = getConnectionMapKey(player2._id, player1._id)
        const value = map.get(key)
        expect(value).toMatchObject({
            catches: 0,
            drops: 0,
            scores: 0,
        })
        testOtherKeys()
    })

    it('missing key in map makes no updates', () => {
        action.playerOne = player1
        action.playerTwo = getPlayer(4)
        updateAtomicConnections(map, action)

        const key = getConnectionMapKey(player2._id, player1._id)
        const value = map.get(key)
        expect(value).toMatchObject({
            catches: 0,
            drops: 0,
            scores: 0,
        })
        testOtherKeys()
    })

    it('catch updates map', () => {
        action.actionType = ActionType.CATCH
        action.playerOne = player1
        action.playerTwo = player2
        updateAtomicConnections(map, action)

        const key = getConnectionMapKey(player2._id, player1._id)
        const value = map.get(key)
        expect(value).toMatchObject({
            catches: 1,
            drops: 0,
            scores: 0,
        })
        testOtherKeys()
    })

    it('drop updates map', () => {
        action.actionType = ActionType.DROP
        action.playerOne = player1
        action.playerTwo = player2
        updateAtomicConnections(map, action)

        const key = getConnectionMapKey(player2._id, player1._id)
        const value = map.get(key)
        expect(value).toMatchObject({
            catches: 0,
            drops: 1,
            scores: 0,
        })
        testOtherKeys()
    })

    it('team one score updates map', () => {
        action.actionType = ActionType.TEAM_ONE_SCORE
        action.playerOne = player1
        action.playerTwo = player2
        updateAtomicConnections(map, action)

        const key = getConnectionMapKey(player2._id, player1._id)
        const value = map.get(key)
        expect(value).toMatchObject({
            catches: 1,
            drops: 0,
            scores: 1,
        })
        testOtherKeys()
    })

    it('team two score updates map', () => {
        action.actionType = ActionType.TEAM_TWO_SCORE
        action.playerOne = player1
        action.playerTwo = player2
        updateAtomicConnections(map, action)

        const key = getConnectionMapKey(player2._id, player1._id)
        const value = map.get(key)
        expect(value).toMatchObject({
            catches: 1,
            drops: 0,
            scores: 1,
        })
        testOtherKeys()
    })
})
