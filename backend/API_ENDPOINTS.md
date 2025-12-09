# API Endpoints Documentation

Base URL: `http://localhost:3001/api` (development) or your Railway URL (production)

## Health Check

### GET /api/health
Check if the API is running.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-12-09T10:30:00.000Z"
}
```

---

## Stations

### GET /api/stations
Get all weather stations.

**Response:**
```json
{
  "stations": [
    {
      "id": "IAGUAD73",
      "name": "Aguadilla",
      "locationDesc": "Northwest coast",
      "latitude": "18.498611",
      "longitude": "-67.154167",
      "wundergroundUrl": "https://www.wunderground.com/dashboard/pws/IAGUAD73"
    }
  ]
}
```

### GET /api/stations/current
Get the current active station for this week.

**Response:**
```json
{
  "station": {
    "id": "IAGUAD73",
    "name": "Aguadilla"
  },
  "weekStart": "2024-12-09",
  "announcedAt": "2024-12-09T00:00:00.000Z"
}
```

### GET /api/stations/:id
Get a specific station by ID.

**Response:**
```json
{
  "station": {
    "id": "IAGUAD73",
    "name": "Aguadilla",
    "locationDesc": "Northwest coast"
  }
}
```

### GET /api/stations/schedule/upcoming
Get upcoming weekly schedules (next 4 weeks).

**Response:**
```json
{
  "schedules": [
    {
      "id": 1,
      "stationId": "IAGUAD73",
      "weekStart": "2024-12-09T00:00:00.000Z",
      "station": {
        "id": "IAGUAD73",
        "name": "Aguadilla"
      }
    }
  ]
}
```

---

## Authentication

### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "weatherpro",
  "password": "securepassword123",
  "preferredLang": "es"
}
```

**Response:**
```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "weatherpro",
    "preferredLang": "es",
    "totalPoints": 0,
    "createdAt": "2024-12-09T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### POST /api/auth/login
Login user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "weatherpro",
    "preferredLang": "es",
    "totalPoints": 0
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### GET /api/auth/me
Get current user info (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "weatherpro",
    "preferredLang": "es",
    "totalPoints": 0,
    "createdAt": "2024-12-09T10:30:00.000Z"
  }
}
```

### PATCH /api/auth/preferences
Update user preferences (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "preferredLang": "en"
}
```

**Response:**
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "weatherpro",
    "preferredLang": "en",
    "totalPoints": 0
  }
}
```

---

## Forecasts

### GET /api/forecasts/status
Get current submission window status (no authentication required).

**Response:**
```json
{
  "isOpen": true,
  "forecastDate": "2024-12-10",
  "opensAt": "2024-12-09T14:00:00.000-04:00",
  "closesAt": "2024-12-09T23:59:59.999-04:00",
  "precipRanges": [
    { "value": 1, "label": "No rain (0.00\")", "min": 0, "max": 0 },
    { "value": 2, "label": "Trace - 0.09\"", "min": 0.01, "max": 0.09 }
  ],
  "currentTime": "2024-12-09T15:30:00.000-04:00"
}
```

### POST /api/forecasts
Submit a forecast (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "maxTemp": 85,
  "minTemp": 72,
  "windGust": 15,
  "precipRange": 3
}
```

**Response:**
```json
{
  "message": "Forecast submitted successfully",
  "forecast": {
    "id": 1,
    "forecastDate": "2024-12-10T00:00:00.000Z",
    "station": "Aguadilla",
    "maxTemp": 85,
    "minTemp": 72,
    "windGust": 15,
    "precipRange": 3,
    "precipRangeDesc": "0.10\" - 0.24\"",
    "submittedAt": "2024-12-09T15:30:00.000Z"
  }
}
```

### GET /api/forecasts/my-history
Get user's forecast history (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit`: Number of results (default: 30)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "forecasts": [
    {
      "id": 1,
      "forecastDate": "2024-12-10T00:00:00.000Z",
      "station": {
        "id": "IAGUAD73",
        "name": "Aguadilla"
      },
      "prediction": {
        "maxTemp": 85,
        "minTemp": 72,
        "windGust": 15,
        "precipRange": 3,
        "precipRangeDesc": "0.10\" - 0.24\""
      },
      "score": {
        "maxTempScore": 5,
        "minTempScore": 4,
        "windGustScore": 5,
        "precipScore": 5,
        "perfectBonus": 0,
        "totalScore": 19
      },
      "submittedAt": "2024-12-09T15:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 30,
    "offset": 0,
    "hasMore": false
  }
}
```

### GET /api/forecasts/today
Get user's forecast for today (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Response:**
```json
{
  "forecast": {
    "id": 1,
    "forecastDate": "2024-12-10T00:00:00.000Z",
    "station": "Aguadilla",
    "maxTemp": 85,
    "minTemp": 72,
    "windGust": 15,
    "precipRange": 3,
    "precipRangeDesc": "0.10\" - 0.24\"",
    "submittedAt": "2024-12-09T15:30:00.000Z"
  },
  "window": {
    "isOpen": true,
    "forecastDate": "2024-12-10",
    "opensAt": "2024-12-09T14:00:00.000-04:00",
    "closesAt": "2024-12-09T23:59:59.999-04:00"
  }
}
```

---

## Leaderboard

### GET /api/leaderboard
Get leaderboard rankings (optional authentication to see your rank).

**Query Parameters:**
- `type`: 'all-time' | 'weekly' | 'monthly' (default: 'all-time')
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "type": "all-time",
  "rankings": [
    {
      "rank": 1,
      "id": 1,
      "username": "weatherpro",
      "totalPoints": 250
    }
  ],
  "userRank": {
    "rank": 1,
    "username": "weatherpro"
  },
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0,
    "hasMore": false
  }
}
```

### GET /api/leaderboard/stats
Get overall competition statistics.

**Response:**
```json
{
  "stats": {
    "totalUsers": 10,
    "totalForecasts": 50,
    "totalPoints": 1000,
    "averageScore": 20.0,
    "perfectForecasts": 3,
    "topScorer": {
      "username": "weatherpro",
      "totalPoints": 250
    }
  }
}
```

---

## Scores

### GET /api/scores/my-scores
Get user's score history with detailed breakdowns (requires authentication).

**Headers:**
```
Authorization: Bearer <token>
```

**Query Parameters:**
- `limit`: Number of results (default: 30)
- `offset`: Pagination offset (default: 0)

**Response:**
```json
{
  "scores": [
    {
      "id": 1,
      "date": "2024-12-10T00:00:00.000Z",
      "station": {
        "id": "IAGUAD73",
        "name": "Aguadilla"
      },
      "forecast": {
        "maxTemp": 85,
        "minTemp": 72,
        "windGust": 15,
        "precipRange": 3,
        "precipRangeDesc": "0.10\" - 0.24\""
      },
      "actual": {
        "maxTemp": 86,
        "minTemp": 71,
        "windGust": 16,
        "precipTotal": 0.15,
        "precipRange": 3,
        "precipRangeDesc": "0.10\" - 0.24\""
      },
      "scores": {
        "maxTemp": { "score": 4, "diff": 1 },
        "minTemp": { "score": 4, "diff": 1 },
        "windGust": { "score": 4, "diff": 1 },
        "precip": { "score": 5, "rangeDiff": 0 },
        "perfectBonus": 0,
        "total": 17
      }
    }
  ],
  "summary": {
    "totalScores": 1,
    "totalPoints": 17,
    "averageScore": 17.0,
    "perfectForecasts": 0
  },
  "pagination": {
    "total": 1,
    "limit": 30,
    "offset": 0,
    "hasMore": false
  }
}
```

### GET /api/scores/date/:date
Get all scores for a specific date (public endpoint).

**URL Parameters:**
- `date`: Date in YYYY-MM-DD format

**Response:**
```json
{
  "date": "2024-12-10",
  "station": {
    "id": "IAGUAD73",
    "name": "Aguadilla"
  },
  "actualConditions": {
    "maxTemp": 86,
    "maxTempRaw": 86.2,
    "minTemp": 71,
    "minTempRaw": 71.3,
    "windGust": 16,
    "windGustRaw": 15.8,
    "precipTotal": 0.15,
    "precipRange": 3,
    "precipRangeDesc": "0.10\" - 0.24\""
  },
  "results": [
    {
      "rank": 1,
      "user": "weatherpro",
      "forecast": {
        "maxTemp": 85,
        "minTemp": 72,
        "windGust": 15,
        "precipRange": 3
      },
      "scores": {
        "maxTemp": 4,
        "minTemp": 4,
        "windGust": 4,
        "precip": 5,
        "perfectBonus": 0,
        "total": 17
      }
    }
  ],
  "totalParticipants": 1
}
```

---

## Error Responses

All endpoints may return error responses in this format:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `400`: Bad Request (validation errors, invalid input)
- `401`: Unauthorized (missing or invalid token)
- `404`: Not Found (resource doesn't exist)
- `500`: Internal Server Error
