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
                {t(`forecast.stations.${currentStation.station?.id}`)}
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
              {t('forecast.viewOnWunderground')}
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
        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('home.howItWorks')}</h2>

        <div className="grid md:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="w-12 h-12 bg-hurricane-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Thermometer className="w-6 h-6 text-hurricane-600" />
            </div>
            <h3 className="font-semibold mb-2">{t('home.step1Title')}</h3>
            <p className="text-sm text-gray-500">
              {t('home.step1Desc')}
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-hurricane-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Clock className="w-6 h-6 text-hurricane-600" />
            </div>
            <h3 className="font-semibold mb-2">{t('home.step2Title')}</h3>
            <p className="text-sm text-gray-500">
              {t('home.step2Desc')}
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-hurricane-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Cloud className="w-6 h-6 text-hurricane-600" />
            </div>
            <h3 className="font-semibold mb-2">{t('home.step3Title')}</h3>
            <p className="text-sm text-gray-500">
              {t('home.step3Desc')}
            </p>
          </div>

          <div className="text-center">
            <div className="w-12 h-12 bg-hurricane-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-6 h-6 text-hurricane-600" />
            </div>
            <h3 className="font-semibold mb-2">{t('home.step4Title')}</h3>
            <p className="text-sm text-gray-500">
              {t('home.step4Desc')}
            </p>
          </div>
        </div>
      </div>

      {/* Scoring Info */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{t('home.scoringSystem')}</h2>

        <div className="grid md:grid-cols-3 gap-6">
          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <Thermometer className="w-5 h-5 mr-2 text-red-500" />
              {t('home.temperature')}
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-1">{t('home.exact')} (0°F)</td><td className="text-right font-medium">5 pts</td></tr>
                <tr className="border-b"><td className="py-1">±1°F</td><td className="text-right">4 pts</td></tr>
                <tr className="border-b"><td className="py-1">±2°F</td><td className="text-right">3 pts</td></tr>
                <tr className="border-b"><td className="py-1">±3°F</td><td className="text-right">2 pts</td></tr>
                <tr className="border-b"><td className="py-1">±4°F</td><td className="text-right">1 pt</td></tr>
                <tr><td className="py-1">±5°F {t('home.orMore')}</td><td className="text-right">0 pts</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <Wind className="w-5 h-5 mr-2 text-blue-500" />
              {t('home.windGust')}
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-1">{t('home.exact')} (0 mph)</td><td className="text-right font-medium">5 pts</td></tr>
                <tr className="border-b"><td className="py-1">±1-2 mph</td><td className="text-right">4 pts</td></tr>
                <tr className="border-b"><td className="py-1">±3-5 mph</td><td className="text-right">3 pts</td></tr>
                <tr className="border-b"><td className="py-1">±6-9 mph</td><td className="text-right">2 pts</td></tr>
                <tr className="border-b"><td className="py-1">±10-14 mph</td><td className="text-right">1 pt</td></tr>
                <tr><td className="py-1">±15 mph {t('home.orMore')}</td><td className="text-right">0 pts</td></tr>
              </tbody>
            </table>
          </div>

          <div>
            <h3 className="font-semibold mb-3 flex items-center">
              <Droplets className="w-5 h-5 mr-2 text-blue-400" />
              {t('home.precipitation')}
            </h3>
            <table className="w-full text-sm">
              <tbody>
                <tr className="border-b"><td className="py-1">0 {t('home.rangesDiff')}</td><td className="text-right font-medium">5 pts</td></tr>
                <tr className="border-b"><td className="py-1">1 {t('home.rangeDiff')}</td><td className="text-right">4 pts</td></tr>
                <tr className="border-b"><td className="py-1">2 {t('home.rangesDiff')}</td><td className="text-right">3 pts</td></tr>
                <tr className="border-b"><td className="py-1">3 {t('home.rangesDiff')}</td><td className="text-right">2 pts</td></tr>
                <tr className="border-b"><td className="py-1">4 {t('home.rangesDiff')}</td><td className="text-right">1 pt</td></tr>
                <tr><td className="py-1">5+ {t('home.rangesDiff')}</td><td className="text-right">0 pts</td></tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Precipitation Ranges Info */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-semibold text-blue-900 mb-3 flex items-center">
            <Droplets className="w-5 h-5 mr-2 text-blue-600" />
            {t('home.precipRangesTitle')}
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-blue-800">
            <div><span className="font-medium">{t('home.range')} 1:</span> {t('forecast.precipRanges.1')}</div>
            <div><span className="font-medium">{t('home.range')} 2:</span> {t('forecast.precipRanges.2')}</div>
            <div><span className="font-medium">{t('home.range')} 3:</span> {t('forecast.precipRanges.3')}</div>
            <div><span className="font-medium">{t('home.range')} 4:</span> {t('forecast.precipRanges.4')}</div>
            <div><span className="font-medium">{t('home.range')} 5:</span> {t('forecast.precipRanges.5')}</div>
            <div><span className="font-medium">{t('home.range')} 6:</span> {t('forecast.precipRanges.6')}</div>
            <div className="md:col-span-2"><span className="font-medium">{t('home.range')} 7:</span> {t('forecast.precipRanges.7')}</div>
          </div>
        </div>

        <div className="mt-6 p-4 bg-purple-50 rounded-lg">
          <div className="flex items-center">
            <Star className="w-6 h-6 text-purple-500 mr-2" />
            <span className="font-semibold text-purple-700">
              {t('home.perfectBonusTitle')}
            </span>
          </div>
          <p className="text-sm text-purple-600 mt-1">
            {t('home.perfectBonusDesc')}
          </p>
        </div>
      </div>
    </div>
  );
}

export default Home;
