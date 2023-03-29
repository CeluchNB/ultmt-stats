import * as Constants from '../utils/constants'
import { ErrorRequestHandler } from 'express'

export const errorResponse = (error: string): { message: string; code: number } => {
    if (error.includes(Constants.GAME_ALREADY_EXISTS)) {
        return { message: Constants.GAME_ALREADY_EXISTS, code: 400 }
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
