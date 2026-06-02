import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import Layout from './components/Layout';
import ThemeToggle from './components/ThemeToggle';
import ScrollToTop from './components/ScrollToTop';
import Dashboard from './pages/Dashboard';
import Inventario from './pages/Inventario';
import Proyectos from './pages/Proyectos';
import Brigadas from './pages/Brigadas';
import Notas from './pages/Notas';
import Fabricacion from './pages/Fabricacion';
import Manual from './pages/Manual';

function App() {
  return (
    <ToastProvider>
      <ThemeToggle />
      <ScrollToTop />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="inventario" element={<Inventario />} />
            <Route path="proyectos" element={<Proyectos />} />
            <Route path="brigadas" element={<Brigadas />} />
            <Route path="notas" element={<Notas />} />
            <Route path="fabricacion" element={<Fabricacion />} />
            <Route path="manual" element={<Manual />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}

export default App;

