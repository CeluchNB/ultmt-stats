import { getGame, getUser } from '../../../src/utils/services'
import axios, { AxiosResponse } from 'axios'

describe('External Services', () => {
    describe('getGame', () => {
        it('calls correct method', async () => {
            const response = { data: 1 }
            const spy = jest.spyOn(axios, 'get').mockResolvedValueOnce(response as AxiosResponse)

            const result = await getGame('game')
            expect(result).toMatchObject(response)
            expect(spy).toHaveBeenCalled()
        })
    })

    describe('getUser', () => {
        it('calls correct method', async () => {
            const response = { data: 1 }
            const spy = jest.spyOn(axios, 'get').mockResolvedValueOnce(response as AxiosResponse)

            const result = await getUser('game')
            expect(result).toMatchObject(response)
            expect(spy).toHaveBeenCalled()
        })
    })
})
