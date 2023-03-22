import request from 'supertest'
import app from '../src/app'

describe('app', () => {
    it('should get base message', async () => {
        const response = await request(app).get('/ultmt-stats')
        expect(response.body.message).toBe('The statistics microservice of The Ultmt App')
    })
})
