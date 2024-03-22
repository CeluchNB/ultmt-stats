import { Types } from 'mongoose'
import { IConnection } from '../types/connection'
import { EmbeddedPlayer } from '../types/player'
import { Action } from '../types/point'
import { idEquals } from './utils'

export const initializeConnectionMap = (map: Map<string, IConnection>, players: EmbeddedPlayer[]) => {
    for (const thrower of players) {
        for (const receiver of players) {
            if (!receiver?._id || !thrower?._id || idEquals(receiver?._id, thrower?._id)) continue

            const key = getConnectionMapKey(thrower._id, receiver._id)
            map.set(key, getInitialConnectionData(thrower._id, receiver._id))
        }
    }
}

export const updateAtomicConnections = (map: Map<string, IConnection>, action: Action) => {
    const receiverId = action.playerOne?._id
    const throwerId = action.playerTwo?._id
    if (!receiverId || !throwerId) return

    const key = getConnectionMapKey(throwerId, receiverId)

    const connection = map.get(key)
    if (!connection) return

    switch (action.actionType) {
        case 'Catch':
            connection.catches += 1
            break
        case 'Drop':
            connection.drops += 1
            break
        case 'TeamOneScore':
        case 'TeamTwoScore':
            connection.scores += 1
            connection.catches += 1
            break
    }

    map.set(key, connection)
}

export const getInitialConnectionData = (
    throwerId: Types.ObjectId,
    receiverId: Types.ObjectId,
    overrides?: Partial<IConnection>,
): IConnection => {
    return {
        throwerId,
        receiverId,
        catches: 0,
        scores: 0,
        drops: 0,
        ...overrides,
    }
}

export const getConnectionMapKey = (throwerId: Types.ObjectId, receiverId: Types.ObjectId): string => {
    return `${throwerId}${receiverId}`
}

export const connectionHasValue = (connection: IConnection): boolean => {
    return connection.catches + connection.drops + connection.scores > 0
}

export const getDecConnectionValues = (data: IConnection) => {
    return {
        catches: -data.catches,
        drops: -data.drops,
        scores: -data.scores,
    }
}

export const addConnectionData = (
    connection1: IConnection,
    connection2: IConnection,
): Pick<IConnection, 'catches' | 'drops' | 'scores'> => {
    return {
        catches: connection1.catches + connection2.catches,
        drops: connection1.drops + connection2.drops,
        scores: connection1.scores + connection2.scores,
    }
}
