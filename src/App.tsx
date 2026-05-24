import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import View from './pages/View'
import NotFound from './pages/NotFound'
import Header from './components/layout/Header'

function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/view/:id" element={<View />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}

export default App
