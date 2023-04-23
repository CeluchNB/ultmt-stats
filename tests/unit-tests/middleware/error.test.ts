import * as Constants from '../../../src/utils/constants'
import { errorResponse } from '../../../src/middleware/errors'

describe('error response for middleware', () => {
    it('with generic error', () => {
        const result = errorResponse('random error')
        expect(result.message).toBe(Constants.GENERIC_ERROR)
        expect(result.code).toBe(500)
    })

    it('with game error', () => {
        const result = errorResponse(Constants.GAME_ALREADY_EXISTS)
        expect(result.message).toBe(Constants.GAME_ALREADY_EXISTS)
        expect(result.code).toBe(400)
    })

    it('with game not found error', () => {
        const result = errorResponse(Constants.GAME_NOT_FOUND)
        expect(result.message).toBe(Constants.GAME_NOT_FOUND)
        expect(result.code).toBe(404)
    })

    it('with point not found error', () => {
        const result = errorResponse(Constants.POINT_NOT_FOUND)
        expect(result.message).toBe(Constants.POINT_NOT_FOUND)
        expect(result.code).toBe(404)
    })

    it('with player not found error', () => {
        const result = errorResponse(Constants.PLAYER_NOT_FOUND)
        expect(result.message).toBe(Constants.PLAYER_NOT_FOUND)
        expect(result.code).toBe(404)
    })

    it('with team not found error', () => {
        const result = errorResponse(Constants.TEAM_NOT_FOUND)
        expect(result.message).toBe(Constants.TEAM_NOT_FOUND)
        expect(result.code).toBe(404)
    })
})
