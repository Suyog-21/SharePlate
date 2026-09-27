import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './styles/index.css'
import { AuthProvider } from './context/AuthContext.jsx'
import { DBProvider } from './context/DBContext.jsx'
import { BrowserRouter } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <DBProvider>
          <App />
        </DBProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
