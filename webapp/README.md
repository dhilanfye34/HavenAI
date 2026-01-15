# HavenAI Web Application

Next.js application serving:
- Marketing website (landing page, features, pricing)
- User authentication (login, register)
- Web dashboard (view alerts from any device)

## Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your settings

# Run development server
npm run dev
```

Visit http://localhost:3000

## Pages

- `/` - Landing page
- `/features` - Features overview
- `/download` - Download page
- `/login` - Login
- `/register` - Registration
- `/dashboard` - Main dashboard (protected)
- `/dashboard/alerts` - Alert list
- `/dashboard/devices` - Device list
- `/dashboard/settings` - User settings

## Deployment

```bash
# Build for production
npm run build

# Start production server
npm start
```

Or deploy to Railway:
1. Connect GitHub repo
2. Railway auto-detects Next.js
3. Set environment variables in Railway dashboard
