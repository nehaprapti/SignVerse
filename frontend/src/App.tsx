import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import './App.css'
import HeroSection from './sections/HeroSection'
import SignToTextPage from "./sections/SignToTextPage";
import TextToSignPage from "./sections/TextToSignPage";

function App() {
  
  return (
   <Router>
      <Routes>
        <Route path="/" element={<HeroSection />} />
        <Route path="/sign-to-text" element={<SignToTextPage />} />
        <Route path="/text-to-sign" element={<TextToSignPage />} />
      </Routes>
    </Router> 
  )
}

export default App
