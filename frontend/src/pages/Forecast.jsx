import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { stationAPI, forecastAPI } from '../utils/api';
import {
  Thermometer,
  Wind,
  Droplets,
  Clock,
  CheckCircle,
  AlertCircle,
  MapPin,
  Send
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

function Forecast() {
  const { t } = useTranslation();

  const [currentStation, setCurrentStation] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [existingForecast, setExistingForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    maxTemp: 85,
    minTemp: 72,
    windGust: 15,
    precipRange: 1
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const [stationRes, statusRes, todayRes] = await Promise.all([
          stationAPI.getCurrent(),
          forecastAPI.getStatus(),
          forecastAPI.getToday()
        ]);

        setCurrentStation(stationRes.data);
        setSubmissionStatus(statusRes.data);
        setExistingForecast(todayRes.data.forecast);
      } catch (err) {
        console.error('Error fetching forecast data:', err);
        setError(t('errors.server'));
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    // Validate
    if (formData.minTemp >= formData.maxTemp) {
      setError('La temperatura mínima debe ser menor que la máxima');
      setSubmitting(false);
      return;
    }

    try {
      const response = await forecastAPI.submit(formData);
      setSuccess(true);
      setExistingForecast(response.data.forecast);
    } catch (err) {
      setError(err.response?.data?.error || t('errors.server'));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message={t('common.loading')} />;
  }

  // If user already submitted
  if (existingForecast) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('forecast.submitted')}
          </h1>
          <p className="text-gray-500 mb-6">
            {t('forecast.alreadySubmitted')}
          </p>

          <div className="bg-gray-50 rounded-lg p-6 text-left">
            <h3 className="font-semibold mb-4">Tu pronóstico para {existingForecast.forecastDate?.split('T')[0]}</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <Thermometer className="w-5 h-5 text-red-500 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">{t('forecast.maxTemp')}</p>
                  <p className="font-semibold">{existingForecast.maxTemp}°F</p>
                </div>
              </div>

              <div className="flex items-center">
                <Thermometer className="w-5 h-5 text-blue-500 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">{t('forecast.minTemp')}</p>
                  <p className="font-semibold">{existingForecast.minTemp}°F</p>
                </div>
              </div>

              <div className="flex items-center">
                <Wind className="w-5 h-5 text-gray-500 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">{t('forecast.windGust')}</p>
                  <p className="font-semibold">{existingForecast.windGust} mph</p>
                </div>
              </div>

              <div className="flex items-center">
                <Droplets className="w-5 h-5 text-blue-400 mr-2" />
                <div>
                  <p className="text-sm text-gray-500">{t('forecast.precipitation')}</p>
                  <p className="font-semibold">{existingForecast.precipRangeDesc}</p>
                </div>
              </div>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Enviado: {new Date(existingForecast.submittedAt).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If submission window is closed
  if (!submissionStatus?.isOpen) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-xl shadow-md p-8 text-center">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {t('forecast.closed')}
          </h1>
          <p className="text-gray-500 mb-4">
            {t('forecast.opensAt')} 12:00 AM AST
          </p>

          {submissionStatus?.nextForecastDate && (
            <div className="bg-hurricane-50 rounded-lg p-4">
              <p className="text-hurricane-700">
                Próximo pronóstico: <strong>{submissionStatus.nextForecastDate}</strong>
              </p>
              <p className="text-sm text-hurricane-600 mt-1">
                La ventana abre en {submissionStatus.minutesUntilOpen} minutos
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-hurricane-600 text-white p-6">
          <h1 className="text-2xl font-bold">{t('forecast.title')}</h1>

          {currentStation && (
            <div className="flex items-center mt-2 text-hurricane-100">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{currentStation.station?.name}</span>
            </div>
          )}

          <div className="flex items-center mt-2">
            <Clock className="w-4 h-4 mr-1" />
            <span>
              {t('forecast.forDate')}: {submissionStatus?.forecastDate}
            </span>
          </div>

          <div className="mt-3 text-sm bg-hurricane-500 rounded px-3 py-1 inline-block">
            {t('forecast.remaining')}: {submissionStatus?.remainingMinutes} {t('forecast.minutes')}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center text-red-700">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Max Temperature */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Thermometer className="w-5 h-5 mr-2 text-red-500" />
              {t('forecast.maxTemp')} (°F)
            </label>
            <input
              type="number"
              name="maxTemp"
              value={formData.maxTemp}
              onChange={handleChange}
              min={50}
              max={120}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hurricane-500 focus:border-transparent text-lg"
            />
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>50°F</span>
              <span>120°F</span>
            </div>
          </div>

          {/* Min Temperature */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Thermometer className="w-5 h-5 mr-2 text-blue-500" />
              {t('forecast.minTemp')} (°F)
            </label>
            <input
              type="number"
              name="minTemp"
              value={formData.minTemp}
              onChange={handleChange}
              min={40}
              max={100}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hurricane-500 focus:border-transparent text-lg"
            />
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>40°F</span>
              <span>100°F</span>
            </div>
          </div>

          {/* Wind Gust */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Wind className="w-5 h-5 mr-2 text-gray-500" />
              {t('forecast.windGust')} (mph)
            </label>
            <input
              type="number"
              name="windGust"
              value={formData.windGust}
              onChange={handleChange}
              min={0}
              max={200}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hurricane-500 focus:border-transparent text-lg"
            />
            <div className="mt-2 flex justify-between text-xs text-gray-500">
              <span>0 mph</span>
              <span>200 mph</span>
            </div>
          </div>

          {/* Precipitation Range */}
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-2">
              <Droplets className="w-5 h-5 mr-2 text-blue-400" />
              {t('forecast.precipitation')}
            </label>
            <select
              name="precipRange"
              value={formData.precipRange}
              onChange={handleChange}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-hurricane-500 focus:border-transparent text-lg"
            >
              {submissionStatus?.precipRanges?.map((range) => (
                <option key={range.value} value={range.value}>
                  Rango {range.value}: {range.label}
                </option>
              ))}
            </select>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-hurricane-500 text-white font-semibold rounded-lg hover:bg-hurricane-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {submitting ? (
              t('common.loading')
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                {t('forecast.submit')}
              </>
            )}
          </button>

          <p className="text-xs text-gray-500 text-center">
            Solo puedes enviar un pronóstico por día. No se permiten cambios después del envío.
          </p>
        </form>
      </div>
    </div>
  );
}

export default Forecast;
