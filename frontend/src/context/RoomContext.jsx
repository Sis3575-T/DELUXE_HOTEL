import react, { createContext, useState, useEffect } from "react";
import axios from 'axios'
import { roomData } from '../assets/asset'
import { backendUrl } from "../App";

export const RoomContext = createContext()
const RoomContextProvider = ({children})=>{
        const [rooms, setRooms] = useState([])
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState(null)
        const fetchRooms = async () => {
            setLoading(true)
            setError(null)
            try {
                const res = await axios.get(`${backendUrl}/api/hotel/list`)
                if (res && res.data.success) {
                    setRooms(res.data.hotels)
                } else {
                    setError('Failed to load rooms from server')
                    setRooms(roomData)
                }
            } catch (err) {
                console.log('Failed to fetch rooms from API, using local data', err)
                setRooms(roomData)
            } finally {
                setLoading(false)
            }
        }
        useEffect(() => {
            fetchRooms()
        }, [])

        return(
                <RoomContext.Provider value={{ rooms, loading, error }}>
                        {children}
                </RoomContext.Provider>
        )
}
export default RoomContextProvider
