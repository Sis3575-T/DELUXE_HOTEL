//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import RoomContextProvider from './context/RoomContext.jsx'
// Favicons removed per user request




createRoot(document.getElementById('root')).render(
 <RoomContextProvider>
   <BrowserRouter>
    <App />
    </BrowserRouter>
 </RoomContextProvider>
  
)
