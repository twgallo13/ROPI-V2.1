import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useMockLaunchProducts } from '../mockData';

const LaunchPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const features = useMockLaunchProducts();

  const handleLogin = (role: 'admin' | 'specialist') => {
    login(role);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <header className="flex flex-col sm:flex-row justify-between items-center mb-12">
          <h1 className="text-4xl font-bold mb-4 sm:mb-0">ROPI v2 Launch Hub</h1>
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <Link
                to="/intake"
                className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition duration-300 ease-in-out transform hover:scale-105"
              >
                Go to Dashboard
              </Link>
            ) : (
              <>
                <button
                  onClick={() => handleLogin('specialist')}
                  className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300"
                  aria-label="Sign in as Specialist"
                >
                  Sign in as Specialist
                </button>
                <button
                  onClick={() => handleLogin('admin')}
                  className="bg-gray-700 text-white font-bold py-2 px-4 rounded-lg hover:bg-gray-800 transition duration-300"
                  aria-label="Sign in as Admin"
                >
                  Sign in as Admin
                </button>
              </>
            )}
          </div>
        </header>

        <main>
          <h2 className="text-3xl font-semibold mb-6 border-b-2 border-gray-700 pb-2">
            Featured Launches
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature) => (
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
        </main>
      </div>
    </div>
  );
};

export default LaunchPage;
