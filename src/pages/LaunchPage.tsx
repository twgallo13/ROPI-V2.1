import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMockLaunchProducts } from '../mockData';

const LaunchPage: React.FC = () => {
  const { user, login } = useAuth();
  const features = useMockLaunchProducts();
  const [view, setView] = useState<'upcoming' | 'past'>('upcoming');

  const now = new Date();
  const filteredFeatures = features.filter(feature => {
    const launchDate = new Date(feature.launchAt);
    if (view === 'upcoming') {
      return launchDate > now;
    }
    return launchDate <= now;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-12">
          <h1 className="text-4xl font-bold mb-4 sm:mb-0">ROPI v2 Launch Hub</h1>
          <div className="flex items-center space-x-4">
            {user ? (
              <Link
                to="/intake"
                className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105"
              >
                Go to Dashboard
              </Link>
            ) : (
              <button
                onClick={login}
                className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105 flex items-center gap-2"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Sign in with Google
              </button>
            )}
          </div>
        </header>

        <main>
          <div className="flex space-x-4 mb-8">
            <button
              onClick={() => setView('upcoming')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 ${
                view === 'upcoming'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Upcoming Launches
            </button>
            <button
              onClick={() => setView('past')}
              className={`px-6 py-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-opacity-75 ${
                view === 'past'
                  ? 'bg-cyan-500 text-white shadow-lg'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Past Launches
            </button>
          </div>

          <h2 className="text-3xl font-semibold mb-6 border-b-2 border-gray-700 pb-2">
            {view === 'upcoming' ? 'Featured Upcoming Launches' : 'Featured Past Launches'}
          </h2>
          
          {filteredFeatures.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {filteredFeatures.map((feature) => (
                <div
                  key={feature.id}
                  className="bg-gray-800 rounded-lg overflow-hidden shadow-lg hover:shadow-cyan-500/50 transition-shadow duration-300"
                >
                  <img
                    src={feature.heroImageUrl}
                    alt={feature.name}
                    className="w-full h-64 object-cover"
                  />
                  <div className="p-4">
                    <h3 className="text-xl font-bold mb-2">{feature.name}</h3>
                    <p className="text-gray-400">{`Launches: ${new Date(
                      feature.launchAt
                    ).toLocaleDateString()}`}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
             <div className="text-center py-16 bg-gray-800 rounded-lg shadow-inner">
              <h3 className="text-xl font-semibold text-gray-300">No {view} launches to display.</h3>
              <p className="mt-2 text-gray-500">Check back soon for upcoming events or browse our past collections.</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default LaunchPage;
