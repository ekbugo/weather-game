import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import {
  User,
  Trophy,
  TrendingUp,
  Star,
  ChevronDown,
  ChevronUp,
  Thermometer,
  Wind,
  Droplets,
  ArrowLeft
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

function UserProfile() {
  const { username } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    // If viewing own profile, redirect to My History
    if (user && user.username === username) {
      navigate('/history');
      return;
    }

    fetchUserProfile();
  }, [username, user, navigate]);

  const fetchUserProfile = async (offset = 0) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/scores/user/${username}?limit=10&offset=${offset}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );

      if (!response.ok) {
        if (response.status === 404) {
          setError('User not found');
        } else if (response.status === 401) {
          setError('Please log in to view user profiles');
        } else {
          setError('Failed to load user profile');
        }
        setLoading(false);
        return;
      }

      const data = await response.json();

      if (offset === 0) {
        setProfileData(data);
      } else {
        // Append to existing scores when loading more
        setProfileData(prev => ({
          ...data,
          scores: [...prev.scores, ...data.scores]
        }));
      }
      setLoading(false);
      setLoadingMore(false);
    } catch (err) {
      console.error('Fetch user profile error:', err);
      setError('Failed to load user profile');
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    setLoadingMore(true);
    fetchUserProfile(profileData.scores.length);
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getScoreColor = (score, max = 5) => {
    const percentage = score / max;
    if (percentage === 1) return 'text-green-600 bg-green-100';
    if (percentage >= 0.8) return 'text-blue-600 bg-blue-100';
    if (percentage >= 0.6) return 'text-yellow-600 bg-yellow-100';
    if (percentage >= 0.4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return <LoadingSpinner message={t('common.loading')} />;
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link to="/leaderboard" className="text-hurricane-600 hover:text-hurricane-700">
            ← Back to Leaderboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <Link
        to="/leaderboard"
        className="inline-flex items-center text-hurricane-600 hover:text-hurricane-700 mb-4"
      >
        <ArrowLeft className="w-4 h-4 mr-1" />
        Back to Leaderboard
      </Link>

      {/* Profile Header */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <div className="flex items-center mb-6">
          <div className="w-16 h-16 bg-hurricane-500 rounded-full flex items-center justify-center mr-4">
            <User className="w-10 h-10 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profileData.user.username}</h1>
            <p className="text-gray-500">Last 7 Days</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Trophy className="w-5 h-5 text-yellow-500 mr-2" />
              <p className="text-sm text-gray-500">Rank</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">#{profileData.user.rank}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Trophy className="w-5 h-5 text-hurricane-500 mr-2" />
              <p className="text-sm text-gray-500">{t('stats.totalPoints')}</p>
            </div>
            <p className="text-2xl font-bold text-hurricane-600">{profileData.summary.totalPoints}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <TrendingUp className="w-5 h-5 text-gray-500 mr-2" />
              <p className="text-sm text-gray-500">{t('stats.avgScore')}</p>
            </div>
            <p className="text-2xl font-bold text-gray-900">{profileData.summary.averageScore}</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Star className="w-5 h-5 text-purple-500 mr-2" />
              <p className="text-sm text-gray-500">{t('stats.perfectForecasts')}</p>
            </div>
            <p className="text-2xl font-bold text-purple-600 flex items-center">
              {profileData.summary.perfectForecasts}
              <Star className="w-4 h-4 ml-1" />
            </p>
          </div>
        </div>
      </div>

      {/* Score History */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Score History</h2>

        {profileData.scores.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            No forecasts yet
          </div>
        ) : (
          <div className="space-y-4">
            {profileData.scores.map((score) => (
              <div key={score.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Main row - clickable */}
                <div
                  onClick={() => toggleExpand(score.id)}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {(() => {
                            try {
                              const dateStr = String(score.date).split('T')[0];
                              const [year, month, day] = dateStr.split('-');
                              const parsedDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
                              return parsedDate.toLocaleDateString('es-PR', {
                                weekday: 'short',
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric'
                              });
                            } catch (e) {
                              return score.date;
                            }
                          })()}
                        </p>
                        <p className="text-sm text-gray-500">{score.station.name}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      {/* Score badges */}
                      <div className="hidden sm:flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(score.scores.maxTemp.score)}`}>
                          {score.scores.maxTemp.score}/5
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(score.scores.minTemp.score)}`}>
                          {score.scores.minTemp.score}/5
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(score.scores.windGust.score)}`}>
                          {score.scores.windGust.score}/5
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${getScoreColor(score.scores.precip.score)}`}>
                          {score.scores.precip.score}/5
                        </span>
                      </div>

                      {/* Perfect bonus */}
                      {score.scores.perfectBonus > 0 && (
                        <Star className="w-5 h-5 text-purple-500" />
                      )}

                      {/* Total */}
                      <div className="text-right min-w-[60px]">
                        <p className="text-xl font-bold text-hurricane-600">
                          {score.scores.total}
                        </p>
                        <p className="text-xs text-gray-500">{t('common.points')}</p>
                      </div>

                      {/* Expand icon */}
                      {expandedId === score.id ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded details */}
                {expandedId === score.id && (
                  <div className="border-t bg-gray-50 p-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Forecast vs Actual comparison */}
                      <div>
                        <h4 className="font-semibold mb-3 text-gray-700">Comparación</h4>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-gray-500">
                              <th className="text-left py-1">Parámetro</th>
                              <th className="text-center py-1">Pronóstico</th>
                              <th className="text-center py-1">Actual</th>
                              <th className="text-center py-1">Pts</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr className="border-t">
                              <td className="py-2 flex items-center">
                                <Thermometer className="w-4 h-4 text-red-500 mr-1" />
                                Temp. Máx.
                              </td>
                              <td className="text-center">{score.forecast.maxTemp}°F</td>
                              <td className="text-center">{score.actual.maxTemp}°F</td>
                              <td className="text-center">
                                <span className={`px-2 py-0.5 rounded ${getScoreColor(score.scores.maxTemp.score)}`}>
                                  {score.scores.maxTemp.score}
                                </span>
                              </td>
                            </tr>
                            <tr className="border-t">
                              <td className="py-2 flex items-center">
                                <Thermometer className="w-4 h-4 text-blue-500 mr-1" />
                                Temp. Mín.
                              </td>
                              <td className="text-center">{score.forecast.minTemp}°F</td>
                              <td className="text-center">{score.actual.minTemp}°F</td>
                              <td className="text-center">
                                <span className={`px-2 py-0.5 rounded ${getScoreColor(score.scores.minTemp.score)}`}>
                                  {score.scores.minTemp.score}
                                </span>
                              </td>
                            </tr>
                            <tr className="border-t">
                              <td className="py-2 flex items-center">
                                <Wind className="w-4 h-4 text-gray-500 mr-1" />
                                Ráfaga
                              </td>
                              <td className="text-center">{score.forecast.windGust} mph</td>
                              <td className="text-center">{score.actual.windGust} mph</td>
                              <td className="text-center">
                                <span className={`px-2 py-0.5 rounded ${getScoreColor(score.scores.windGust.score)}`}>
                                  {score.scores.windGust.score}
                                </span>
                              </td>
                            </tr>
                            <tr className="border-t">
                              <td className="py-2 flex items-center">
                                <Droplets className="w-4 h-4 text-blue-400 mr-1" />
                                Precip.
                              </td>
                              <td className="text-center">{score.forecast.precipRangeDesc}</td>
                              <td className="text-center">{score.actual.precipTotal}"</td>
                              <td className="text-center">
                                <span className={`px-2 py-0.5 rounded ${getScoreColor(score.scores.precip.score)}`}>
                                  {score.scores.precip.score}
                                </span>
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Score breakdown */}
                      <div>
                        <h4 className="font-semibold mb-3 text-gray-700">Desglose de Puntuación</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Temperatura Máxima</span>
                            <span className="font-medium">{score.scores.maxTemp.score} pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Temperatura Mínima</span>
                            <span className="font-medium">{score.scores.minTemp.score} pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Ráfaga de Viento</span>
                            <span className="font-medium">{score.scores.windGust.score} pts</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Precipitación</span>
                            <span className="font-medium">{score.scores.precip.score} pts</span>
                          </div>
                          {score.scores.perfectBonus > 0 && (
                            <div className="flex justify-between text-purple-600 font-medium pt-2 border-t">
                              <span className="flex items-center">
                                <Star className="w-4 h-4 mr-1" />
                                {t('scores.perfectBonus')}
                              </span>
                              <span>+{score.scores.perfectBonus} pts</span>
                            </div>
                          )}
                          <div className="flex justify-between pt-2 border-t font-bold text-lg">
                            <span>{t('scores.total')}</span>
                            <span className="text-hurricane-600">{score.scores.total} pts</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Load More button */}
            {profileData.pagination.hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingMore ? t('common.loading') : 'Load More'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserProfile;
