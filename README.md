# Welcome to your Lovable project

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Open your project in the [Lovable editor](https://lovable.dev) and keep building.

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: connect the project to GitHub and every change made in Lovable is committed straight to your repository.
- **Full ownership**: this code is yours. Push to your repository and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Built with

- TanStack Start
- TypeScript
- React
- Tailwind CSS

## TouchGrass demo

The current workspace contains a Vite + React dashboard with sample community
activity. Sample scores are illustrative only; activities created in the browser
are local drafts and do not earn XP.

Run the dashboard:

```sh
npm install
npm run dev
```

### Verification API

The independent FastAPI service checks route distance against submitted GPS
points, compares photo GPS metadata to the route, and can call an Ollama
vision-capable open-weight model. It stores route and verification data in
PostgreSQL with PostGIS when `DATABASE_URL` is configured. It does not persist
uploaded photo bytes. Configure `JWT_SECRET` and provide an HS256 bearer token
whose `sub` claim is the activity owner's ID before posting activities.

```sh
python3 -m venv .venv
. .venv/bin/activate
pip install -r backend/requirements.txt
export DATABASE_URL='postgresql+psycopg://user:password@localhost:5432/touchgrass'
export JWT_SECRET='replace-with-a-long-random-secret'
uvicorn backend.main:app --reload --port 8000
```

The database must have the PostGIS extension installed. To enable model
analysis, run Ollama with a vision model and set `AI_MODEL` (default:
`llava:7b`) and `AI_BASE_URL` (default: `http://localhost:11434`). When that
service is unavailable, the API labels its result as a heuristic fallback.
The API deliberately returns zero Grass XP; awarding points requires a trusted
verification and moderation policy.
