import react, { createContext, useState, useEffect } from "react";
import axios from 'axios'
import { roomData } from '../assets/asset'

export const RoomContext = createContext()
const RoomContextProvider = ({children})=>{
        const [rooms, setRooms] = useState(roomData)
        const apiBase = import.meta.env.VITE_API_URL || 'https://deluxe-hotel.onrender.com'

        useEffect(() => {
            const fetchRooms = async () => {
                try {
                    const res = await axios.get(`${apiBase}/api/hotel/list`)
                    if (res && res.data) setRooms(res.data)
                } catch (err) {
                    console.error('Failed to fetch rooms from API, using local data', err)
                }
            }
            fetchRooms()
        }, [apiBase])

        return(
                <RoomContext.Provider value={{ rooms}}>
                        {children}
                </RoomContext.Provider>
        )
}
export default RoomContextProvider
