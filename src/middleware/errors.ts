import * as Constants from '../utils/constants'
import { ErrorRequestHandler } from 'express'

export const errorResponse = (error: string): { message: string; code: number } => {
    if (error.includes(Constants.GAME_ALREADY_EXISTS)) {
        return { message: Constants.GAME_ALREADY_EXISTS, code: 400 }
    } else if (error.includes(Constants.GAME_NOT_FOUND)) {
        return { message: Constants.GAME_NOT_FOUND, code: 404 }
    } else if (error.includes(Constants.POINT_NOT_FOUND)) {
        return { message: Constants.POINT_NOT_FOUND, code: 404 }
    } else if (error.includes(Constants.PLAYER_NOT_FOUND)) {
        return { message: Constants.PLAYER_NOT_FOUND, code: 404 }
    } else if (error.includes(Constants.TEAM_NOT_FOUND)) {
        return { message: Constants.TEAM_NOT_FOUND, code: 404 }
    } else if (error.includes(Constants.CONNECTION_NOT_FOUND)) {
        return { message: Constants.CONNECTION_NOT_FOUND, code: 404 }
    } else if (error.includes(Constants.POINT_ALREADY_EXISTS)) {
        return { message: Constants.POINT_ALREADY_EXISTS, code: 400 }
    } else if (error.includes(Constants.ALL_POINTS_NOT_RECEIVED)) {
        return { message: Constants.ALL_POINTS_NOT_RECEIVED, code: 400 }
    }
    return { message: Constants.GENERIC_ERROR, code: 500 }
}

export const errorMiddleware: ErrorRequestHandler = (err, req, res, next) => {
    if (err) {
        const { message, code } = errorResponse(err.toString())
        res.status(code).json({ message })
    }
    next()
}
