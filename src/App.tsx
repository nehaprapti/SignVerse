import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css'
import HeroSection from './sections/HeroSection'
import SignToTextPage from "./sections/SignToTextPage";

function App() {
  
  return (
   <Router>
      <Routes>
        <Route path="/" element={<HeroSection />} />
        <Route path="/sign-to-text" element={<SignToTextPage />} />
      </Routes>
    </Router> 
  )
}

export default App
