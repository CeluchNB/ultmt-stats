import axios from 'axios'

export const getGame = async (gameId: string) => {
    return await axios.get(`${process.env.API_URL}/api/v1/game/${gameId}`, {
        headers: {
            'X-API-Key': process.env.API_KEY,
        },
    })
}

export const getUser = async (userId: string) => {
    return await axios.get(`${process.env.API_URL}/api/v1/user/${userId}`, {
        headers: {
            'X-API-Key': process.env.API_KEY,
        },
    })
}
