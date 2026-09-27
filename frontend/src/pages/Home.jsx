import React from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, Globe, ShieldCheck, Heart } from 'lucide-react';

const Home = () => {
  const { user } = useAuth();

  if (user) {
    return <Navigate to={`/${user.role}`} />;
  }

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="container mt-8" style={{ padding: '4rem 1rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', color: 'var(--primary-dark)' }}>
          Zero Waste. <span style={{ color: 'var(--primary-color)' }}>Maximum Impact.</span>
        </h1>
        <p style={{ fontSize: '1.25rem', maxWidth: '800px', margin: '0 auto 2rem auto' }}>
          Connect surplus food from restaurants directly to NGOs in real-time. 
          Help us build a sustainable future by ensuring good food feeds people, not landfills.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/register" className="btn btn-primary" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Join the Movement <ArrowRight size={20} />
          </Link>
          <Link to="/login" className="btn btn-outline" style={{ padding: '1rem 2rem', fontSize: '1.1rem' }}>
            Login
          </Link>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mt-8 mb-8">
        <h2 className="text-center mb-8" style={{ fontSize: '2.5rem' }}>How It Works</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          <div className="card text-center">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--primary-color)' }}>
              <Globe size={48} />
            </div>
            <h3>1. Real-Time Matching</h3>
            <p>Restaurants post surplus food in under 30 seconds. Nearby NGOs are instantly notified based on proximity.</p>
          </div>

          <div className="card text-center">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--secondary-color)' }}>
              <ShieldCheck size={48} />
            </div>
            <h3>2. Secure & Transparent</h3>
            <p>Verified NGOs claim the food. Live status tracking ensures food goes exactly where it's supposed to.</p>
          </div>

          <div className="card text-center">
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1rem', color: 'var(--success-color)' }}>
              <Heart size={48} />
            </div>
            <h3>3. Measure Impact</h3>
            <p>Track meals saved, CO2 reduced, and build a reputation for sustainability in your community.</p>
          </div>

        </div>
      </section>
    </div>
  );
};

export default Home;
