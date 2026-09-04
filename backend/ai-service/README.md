# CoalGuard AI Service

This service performs automated risk analysis on mining operations using data from Supabase.

## Setup

1. Make sure you have Python installed.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Configure your `.env` file in this directory with your Supabase credentials:
   ```
   SUPABASE_URL=your_url
   SUPABASE_KEY=your_key
   ```

## Running Locally

Run the FastAPI server using Uvicorn:
```bash
uvicorn main:app --reload
```

The service will start on `http://127.0.0.1:8000`.

## Endpoints

- `GET /health` : Health check
- `POST /analyze/mine/{mine_id}` : Analyze a single mine and update its risk score
- `POST /analyze/all` : Analyze all mines and update their risk scores

You can explore and test the API directly using the interactive Swagger UI at:
`http://127.0.0.1:8000/docs`
