import { Routes, Route } from 'react-router-dom';
import Navbar from './components/layout/Navbar';
import Footer from './components/layout/Footer';
import Home from './pages/Home';
import ExploreNetwork from './pages/ExploreNetwork';
import LocationAnalysis from './pages/LocationAnalysis';
import About from './pages/About';

function App() {
  return (
    <>
      <Navbar />
      {/* Global Background Animation Shell */}
      <div className="fixed inset-0 z-[-1] opacity-60 pointer-events-none"></div>
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<ExploreNetwork />} />
        <Route path="/analysis" element={<LocationAnalysis />} />
        <Route path="/about" element={<About />} />
      </Routes>
      <Footer />
    </>
  );
}

export default App;