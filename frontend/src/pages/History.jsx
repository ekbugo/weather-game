import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { scoreAPI } from '../utils/api';
import {
  History as HistoryIcon,
  Thermometer,
  Wind,
  Droplets,
  Star,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

function History() {
  const { t } = useTranslation();

  const [scores, setScores] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function fetchScores() {
      try {
        const response = await scoreAPI.getMyScores({ limit: 50 });
        setScores(response.data.scores);
        setSummary(response.data.summary);
      } catch (err) {
        console.error('Error fetching scores:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchScores();
  }, []);

  const getScoreColor = (score, max = 5) => {
    const percentage = score / max;
    if (percentage === 1) return 'text-green-600 bg-green-100';
    if (percentage >= 0.8) return 'text-blue-600 bg-blue-100';
    if (percentage >= 0.6) return 'text-yellow-600 bg-yellow-100';
    if (percentage >= 0.4) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (loading) {
    return <LoadingSpinner message={t('common.loading')} />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-6">
        <HistoryIcon className="w-7 h-7 mr-2 text-hurricane-500" />
        {t('scores.title')}
      </h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">{t('stats.totalPoints')}</p>
            <p className="text-2xl font-bold text-hurricane-600">{summary.totalPoints}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">{t('stats.forecastsMade')}</p>
            <p className="text-2xl font-bold text-gray-900">{summary.totalScores}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">{t('stats.avgScore')}</p>
            <p className="text-2xl font-bold text-gray-900">{summary.averageScore}</p>
          </div>
          <div className="bg-white rounded-xl shadow-md p-4">
            <p className="text-sm text-gray-500">{t('stats.perfectForecasts')}</p>
            <p className="text-2xl font-bold text-purple-600 flex items-center">
              {summary.perfectForecasts}
              <Star className="w-5 h-5 ml-1 text-purple-500" />
            </p>
          </div>
        </div>
      )}

      {/* Scores List */}
      {scores.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-xl">
          {t('scores.noScores')}
        </div>
      ) : (
        <div className="space-y-4">
          {scores.map((score) => (
            <div key={score.id} className="bg-white rounded-xl shadow-md overflow-hidden">
              {/* Main row - clickable */}
              <div
                onClick={() => toggleExpand(score.id)}
                className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {new Date(score.date + 'T12:00:00').toLocaleDateString('es-PR', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
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
        </div>
      )}
    </div>
  );
}

export default History;
