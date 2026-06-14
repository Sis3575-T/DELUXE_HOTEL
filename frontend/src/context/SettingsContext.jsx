import React, { createContext, useState, useEffect, useContext } from "react";
import axios from 'axios'
import { backendUrl } from "../App";

const SettingsContext = createContext()

export const useSettings = () => useContext(SettingsContext)

const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${backendUrl}/api/settings/public`)
        if (res.data?.success && res.data?.settings) {
          setSettings(res.data.settings)
        }
      } catch (err) {
        console.log('Failed to fetch settings, using defaults', err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [])

  return (
    <SettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export default SettingsProvider
