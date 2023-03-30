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
})
