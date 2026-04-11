import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AIChatbot from '../components/AIChatbot'; 

/**
 * PublicLayout — used by Home, Map, Report, About.
 * The <Outlet /> renders the current matched child route.
 */
export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Navbar />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer />
      <AIChatbot />
    </div>
  );
}
