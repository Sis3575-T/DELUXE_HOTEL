import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BrowserRouter } from 'react-router-dom'
// Favicons removed per user request

createRoot(document.getElementById('root')).render(
 // <StrictMode>
 <BrowserRouter>
      <App />
  </BrowserRouter>
   
  //</StrictMode>,
)
