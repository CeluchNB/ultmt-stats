import * as Constants from '../../utils/constants'
import AtomicConnection from '../../models/atomic-connection'
import { IConnection } from '../../types/connection'
import { ApiError } from '../../types/error'
import { FilterQuery } from 'mongoose'
import { IAtomicConnection } from '../../types/atomic-stat'

export const getConnection = async (throwerId: string, receiverId: string): Promise<IConnection> => {
    const connections = await AtomicConnection.find({ throwerId, receiverId })
    if (connections.length === 0) {
        throw new ApiError(Constants.CONNECTION_NOT_FOUND, 404)
    }

    return connections.reduce(
        (prev, curr) => {
            return {
                ...prev,
                scores: prev.scores + curr.scores,
                catches: prev.catches + curr.catches,
                drops: prev.drops + curr.drops,
            }
        },
        {
            throwerId: connections[0].throwerId,
            receiverId: connections[0].receiverId,
            scores: 0,
            catches: 0,
            drops: 0,
        },
    )
}

export const filterConnectionStats = async (
    throwerId: string,
    receiverId: string,
    gameIds: string[],
    teamIds: string[],
): Promise<IAtomicConnection[]> => {
    const filter: { $and: FilterQuery<IAtomicConnection>[] } = {
        $and: [{ throwerId }, { receiverId }],
    }
    if (gameIds.length > 0) {
        filter.$and.push({ gameId: { $in: gameIds } })
    }
    if (teamIds.length > 0) {
        filter.$and.push({ teamId: { $in: teamIds } })
    }

    const connections = await AtomicConnection.find(filter)
    if (connections.length === 0) {
        throw new ApiError(Constants.CONNECTION_NOT_FOUND, 404)
    }

    return connections
}
