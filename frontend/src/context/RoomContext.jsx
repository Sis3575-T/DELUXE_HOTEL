import react, { createContext, useState } from "react";
import { roomData } from '../assets/asset'
export const RoomContext = createContext()
const RoomContextProvider = ({children})=>{
    const [rooms, setRooms] = useState(roomData)
    return(
        <RoomContext.Provider value={{ rooms}}>
            {children}
        </RoomContext.Provider>
    )
}
export default RoomContextProvider
