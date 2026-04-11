import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import AIChatbot from '../components/AIChatbot';
import DonationModal from '../components/DonationModal';

export default function PublicLayout() {
  const [donationOpen, setDonationOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-bg">
      <Navbar onDonate={() => setDonationOpen(true)} />
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>
      <Footer onDonate={() => setDonationOpen(true)} />
      <AIChatbot />
      <DonationModal isOpen={donationOpen} onClose={() => setDonationOpen(false)} />
    </div>
  );
}