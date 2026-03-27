import './App.css'
import { Routes, Route } from 'react-router-dom'
import Dashboard from './Pages/Dashboard'
import Login from './Pages/Login'



function App() {

  return (
    <>
      <Routes>
        <Route path='/' element={<Login />} />
        <Route path="/Dashboard" element={< Dashboard />} />
      </Routes>
    </>
  )
}

export default App
