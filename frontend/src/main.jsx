//import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
import RoomContextProvider from './context/RoomContext.jsx'
import abayIconUrl from './assets/abay-ag-monogram.svg?url'

const setFaviconFromSvgUrl = async (url) => {
  try {
    const res = await fetch(url)
    if (!res.ok) throw new Error('Failed to fetch favicon')
    const svg = await res.text()
    const dataUrl = 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)

    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      link.type = 'image/svg+xml'
      document.head.appendChild(link)
    }
    link.href = dataUrl

    // Some browsers also check for shortcut icon
    let shortcut = document.querySelector("link[rel='shortcut icon']")
    if (!shortcut) {
      shortcut = document.createElement('link')
      shortcut.rel = 'shortcut icon'
      shortcut.type = 'image/svg+xml'
      document.head.appendChild(shortcut)
    }
    shortcut.href = dataUrl
  } catch (e) {
    // fallback to using the URL directly
    let link = document.querySelector("link[rel~='icon']")
    if (!link) {
      link = document.createElement('link')
      link.rel = 'icon'
      document.head.appendChild(link)
    }
    link.href = url
  }
}

setFaviconFromSvgUrl(abayIconUrl)




createRoot(document.getElementById('root')).render(
 <RoomContextProvider>
   <BrowserRouter>
    <App />
    </BrowserRouter>
 </RoomContextProvider>
  
)
