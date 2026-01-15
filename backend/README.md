# HavenAI Backend API

FastAPI backend that handles:
- User authentication
- Device management
- Alert storage and syncing
- Email/SMS notifications

## Setup

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your settings

# Run database migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Key Endpoints

- `POST /auth/register` - Create account
- `POST /auth/login` - Login
- `POST /devices` - Register device
- `POST /alerts` - Create alert (from desktop app)
- `GET /alerts` - List alerts

## Deployment

```bash
# Build Docker image
docker build -t havenai-api .

# Run container
docker run -p 8000:8000 havenai-api
```

Or deploy to Railway:
1. Connect GitHub repo
2. Railway auto-detects Dockerfile
3. Set environment variables in Railway dashboard
