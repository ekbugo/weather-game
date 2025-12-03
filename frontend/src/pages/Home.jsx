import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { stationAPI, leaderboardAPI, forecastAPI } from '../utils/api';
import {
  Cloud,
  MapPin,
  Trophy,
  Clock,
  ArrowRight,
  Thermometer,
  Wind,
  Droplets,
  Star
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

function Home() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [currentStation, setCurrentStation] = useState(null);
  const [stats, setStats] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [stationRes, statsRes, statusRes] = await Promise.all([
          stationAPI.getCurrent().catch(() => null),
          leaderboardAPI.getStats().catch(() => null),
          forecastAPI.getStatus().catch(() => null)
        ]);

        setCurrentStation(stationRes?.data);
        setStats(statsRes?.data?.stats);
        setSubmissionStatus(statusRes?.data);
      } catch (err) {
        console.error('Error fetching home data:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <LoadingSpinner message={t('common.loading')} />;
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-hurricane-600 to-hurricane-800 rounded-2xl p-8 text-white">
        <div className="max-w-2xl">
          <h1 className="text-3xl sm:text-4xl font-bold mb-4">
            {t('app.title')}
          </h1>
          <p className="text-hurricane-100 text-lg mb-6">
            {t('app.tagline')}
          </p>

          {!isAuthenticated ? (
            <div className="flex flex-wrap gap-4">
              <Link
                to="/register"
                className="px-6 py-3 bg-white text-hurricane-700 font-semibold rounded-lg hover:bg-hurricane-50 transition-colors"
              >
                {t('nav.register')}
              </Link>
              <Link
                to="/leaderboard"
                className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
              >
                {t('nav.leaderboard')}
              </Link>
            </div>
          ) : (
            <Link
              to="/forecast"
              className="inline-flex items-center px-6 py-3 bg-white text-hurricane-700 font-semibold rounded-lg hover:bg-hurricane-50 transition-colors"
            >
              {t('nav.forecast')}
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          )}
        </div>
      </div>

      {/* Current Station Card */}
      {currentStation && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="flex items-center space-x-2 mb-4">
            <MapPin className="w-5 h-5 text-hurricane-500" />
            <h2 className="text-lg font-semibold text-gray-900">
              {t('forecast.currentStation')}
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-2xl font-bold text-hurricane-700">
                {currentStation.station?.name}
              </h3>
              <p className="text-gray-500 mt-1">
                {currentStation.station?.locationDesc}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                ID: {currentStation.station?.id}
              </p>
            </div>

            {submissionStatus?.isOpen && (
              <div className="mt-4 sm:mt-0 flex items-center space-x-2 text-green-600">
                <Clock className="w-5 h-5" />
                <span className="font-medium">
                  {t('forecast.closesAt')} 5:00 PM AST
                </span>
              </div>
            )}
          </div>

          {currentStation.station?.wundergroundUrl && (
            <a
              href={currentStation.station.wundergroundUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center mt-4 text-hurricane-600 hover:text-hurricane-700"
            >
              Ver estación en Weather Underground
              <ArrowRight className="ml-1 w-4 h-4" />
            </a>
          )}
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('stats.totalPoints')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalPoints?.toLocaleString()}</p>
              </div>
              <Trophy className="w-10 h-10 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('stats.forecastsMade')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalForecasts?.toLocaleString()}</p>
              </div>
              <Cloud className="w-10 h-10 text-hurricane-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('stats.avgScore')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageScore}</p>
              </div>
              <Thermometer className="w-10 h-10 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('stats.perfectForecasts')}</p>
                <p className="text-2xl font-bold text-gray-900">{stats.perfectForecasts}</p>
              </div>
              <Star className="w-10 h-10 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* How it Works */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">¿Cómo funciona?</h2>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-hurricane-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Thermometer className="w-6 h-6 text-hurricane-600" />
            </div>
            <h3 className="font-semibold mb-2">1. Pronostica</h3>
            <p className="text-sm text-gray-500">
              Predice temperatura máxima y mínima, ráfagas de viento y precipitación
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-hurricane-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-hurricane-600" />
            </div>
            <h3 className="font-semibold mb-2">2. Envía antes de las 5 PM</h3>
            <p className="text-sm text-gray-500">
              La ventana de envío cierra a las 5:00 PM AST del día anterior
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-hurricane-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Cloud className="w-6 h-6 text-hurricane-600" />
            </div>
            <h3 className="font-semibold mb-2">3. Compara</h3>
            <p className="text-sm text-gray-500">
              Tu pronóstico se compara con los datos reales de la estación
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-hurricane-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-6 h-6 text-hurricane-600" />
            </div>
            <h3 className="font-semibold mb-2">4. Gana puntos</h3>
            <p className="text-sm text-gray-500">
              Hasta 20 puntos por día + 5 puntos bonus por pronóstico perfecto
            </p>
          </div>
        </div>
      </div>

      {/* Scoring Info */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">Sistema de Puntuación</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <Thermometer className="w-5 h-5 mr-2 text-red-500" />
              Temperatura (Máx/Mín)
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-1">Exacto (0°F)</td><td className="text-right font-medium">5 pts</td></tr>
                <tr className="border-b"><td className="py-1">±1°F</td><td className="text-right">4 pts</td></tr>
                <tr className="border-b"><td className="py-1">±2°F</td><td className="text-right">3 pts</td></tr>
                <tr className="border-b"><td className="py-1">±3°F</td><td className="text-right">2 pts</td></tr>
                <tr className="border-b"><td className="py-1">±4°F</td><td className="text-right">1 pt</td></tr>
                <tr><td className="py-1">±5°F o más</td><td className="text-right">0 pts</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <Wind className="w-5 h-5 mr-2 text-blue-500" />
              Ráfaga de Viento
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-1">Exacto (0 mph)</td><td className="text-right font-medium">5 pts</td></tr>
                <tr className="border-b"><td className="py-1">±1-2 mph</td><td className="text-right">4 pts</td></tr>
                <tr className="border-b"><td className="py-1">±3-5 mph</td><td className="text-right">3 pts</td></tr>
                <tr className="border-b"><td className="py-1">±6-9 mph</td><td className="text-right">2 pts</td></tr>
                <tr className="border-b"><td className="py-1">±10-14 mph</td><td className="text-right">1 pt</td></tr>
                <tr><td className="py-1">±15 mph o más</td><td className="text-right">0 pts</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center">
            <Star className="w-6 h-6 text-purple-500 mr-2" />
            <span className="font-semibold text-purple-700">
              ¡Bono de Pronóstico Perfecto: +5 puntos!
            </span>
          </div>
          <p className="text-sm text-purple-600 mt-1">
            Si aciertas todos los parámetros perfectamente, recibes 5 puntos adicionales.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
