import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  Cloud,
  Trophy,
  History,
  LogOut,
  Menu,
  X,
  Globe,
  User
} from 'lucide-react';
import { useState } from 'react';

function Layout() {
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'es' ? 'en' : 'es';
    i18n.changeLanguage(newLang);
  };

  const navItems = [
    { path: '/', label: t('nav.home'), icon: Cloud },
    { path: '/forecast', label: t('nav.forecast'), icon: Cloud, protected: true },
    { path: '/leaderboard', label: t('nav.leaderboard'), icon: Trophy },
    { path: '/history', label: t('nav.history'), icon: History, protected: true },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <div className="min-h-screen bg-gradient-to-br from-hurricane-50 to-blue-100">
      {/* Header */}
      <header className="bg-white shadow-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-10 h-10 bg-hurricane-500 rounded-full flex items-center justify-center">
                <Cloud className="w-6 h-6 text-white" />
              </div>
              <span className="font-bold text-xl text-hurricane-900 hidden sm:block">
                Huracán Info
              </span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-4">
              {navItems.map((item) => {
                if (item.protected && !isAuthenticated) return null;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                      isActive(item.path)
                        ? 'bg-hurricane-100 text-hurricane-700'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Right side */}
            <div className="flex items-center space-x-2">
              {/* Language toggle */}
              <button
                onClick={toggleLanguage}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                title={i18n.language === 'es' ? 'Switch to English' : 'Cambiar a Español'}
              >
                <Globe className="w-5 h-5" />
                <span className="sr-only">
                  {i18n.language === 'es' ? 'EN' : 'ES'}
                </span>
              </button>

              {/* Auth buttons / User menu */}
              {isAuthenticated ? (
                <div className="flex items-center space-x-2">
                  <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-hurricane-50 rounded-lg">
                    <User className="w-4 h-4 text-hurricane-600" />
                    <span className="text-sm font-medium text-hurricane-700">
                      {user?.username}
                    </span>
                    <span className="text-xs bg-hurricane-200 text-hurricane-800 px-2 py-0.5 rounded-full">
                      {user?.totalPoints || 0} pts
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="p-2 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                    title={t('nav.logout')}
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <div className="hidden sm:flex items-center space-x-2">
                  <Link
                    to="/login"
                    className="px-4 py-2 text-hurricane-600 hover:bg-hurricane-50 rounded-lg transition-colors"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    className="px-4 py-2 bg-hurricane-500 text-white rounded-lg hover:bg-hurricane-600 transition-colors"
                  >
                    {t('nav.register')}
                  </Link>
                </div>
              )}

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-white">
            <nav className="px-4 py-2 space-y-1">
              {navItems.map((item) => {
                if (item.protected && !isAuthenticated) return null;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                      isActive(item.path)
                        ? 'bg-hurricane-100 text-hurricane-700'
                        : 'text-gray-600'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}

              {!isAuthenticated && (
                <div className="pt-2 border-t space-y-1">
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 text-hurricane-600"
                  >
                    {t('nav.login')}
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block px-3 py-2 bg-hurricane-500 text-white rounded-lg text-center"
                  >
                    {t('nav.register')}
                  </Link>
                </div>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center text-sm text-gray-500">
            <p>© 2024 Huracán Info & Puerto Rico Meteorological Society</p>
            <p className="mt-2 sm:mt-0">
              {t('app.tagline')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Layout;
