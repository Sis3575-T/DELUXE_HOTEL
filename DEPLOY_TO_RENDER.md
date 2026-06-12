# Deploying to Render (Frontend + Backend)

Follow these steps to deploy the project to Render using the provided `render.yaml` manifest.

1. Push your repository to GitHub (if not already).

2. In Render dashboard, click "New +" → "Import from GitHub" and select this repository.

3. Render will detect services from `render.yaml`. For each service:
   - `deluxe-hotel-backend` (type: web)
     - Build Command: `cd backend && npm install`
     - Start Command: `cd backend && npm start`
     - Set the following Environment Variables (in Render dashboard → Environment):
       - `MONGODB_URI` — your MongoDB connection string
       - `CLOUDINARY_URL` or the vars used in `backend/config/cloudinary.js`
       - Any other keys used in `backend/.env` (e.g., `JWT_SECRET`)

   - `deluxe-hotel-frontend` (type: static)
     - Build Command: `cd frontend && npm install && npm run build`
     - Publish Path: `frontend/dist`

4. After services are created, Render will build and deploy. Check service logs if anything fails.

Notes:
- The backend expects `process.env.PORT` (Render sets this automatically).
- If you prefer a single Docker deployment or need custom domains, use Render's advanced settings.
