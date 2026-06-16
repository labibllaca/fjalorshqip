import { Routes, Route } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Home from './pages/Home';
import WordPage from './pages/WordPage';
import Favorites from './pages/Favorites';
import About from './pages/About';
import WordOfTheDay from './pages/WordOfTheDay';
import WordGame from './pages/WordGame';

const App = () => {
  return (
    <Routes>
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/f/:slug" element={<WordPage />} />
        <Route path="/sot" element={<WordOfTheDay />} />
        <Route path="/fav" element={<Favorites />} />
        <Route path="/rreth" element={<About />} />
        <Route path="/spiel" element={<WordGame />} />
      </Route>
    </Routes>
  );
};

export default App;
