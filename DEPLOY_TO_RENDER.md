# Deploying to Render (Frontend + Backend)

The project is already deployed:

- **Frontend:** https://abay-grand-hotel-w.vercel.app
- **Admin:** https://abay-grand-hotel-admin.vercel.app/admin/login
- **Backend API:** https://abay-grand-hotel-nmn9.onrender.com

## Required Environment Variables on Render

Make sure the **backend service** on Render has these environment variables set (in Render Dashboard → Environment):

| Variable | Value |
|----------|-------|
| `MONGODB_URI` | `mongodb+srv://sisay3575:Sis3575@cluster0.c1k01.mongodb.net/DELUXE_HOTEL?retryWrites=true&w=majority` |
| `BACKEND_URL` | `https://abay-grand-hotel-nmn9.onrender.com` |
| `FRONTEND_URL` | `https://abay-grand-hotel-w.vercel.app` |
| `ADMIN_URL` | `https://abay-grand-hotel-admin.vercel.app` |
| `CLOUDINARY_NAME` | `dto10sv4y` |
| `CLOUDINARY_API_KEY` | `989866536131774` |
| `CLOUDINARY_SECRET_KEY` | `6oY0T0pmScWk5qHE6XPAJBz1-NQ` |
| `ADMIN_EMAIL` | `sisay3575@gmail.com` |
| `ADMIN_PASSWORD` | `Sis3575@` |
| `JWT_SECRET` | `demo` |
| `CHAPA_SECRET_KEY` | `CHASECK_TEST-rEaRFW3Nzc7lQCXM3xwmYmqKLijltRUb` |
| `CHAPA_PUBLIC_KEY` | `CHAPUBK_TEST-SvTl96p9pX9V46wF7CDalK4lQ3K9p1fS` |
| `CHAPA_WEBHOOK_SECRET` | `CHASECK_TEST_6D0FA9C1A51AFB40AAB8D8C8C3601A6B` |
| `CHAPA_ENCRYPTION_KEY` | `iPf32TXeZEvwVb16fILsQHiA` |
| `CHAPA_RETURN_URL` | `https://abay-grand-hotel-nmn9.onrender.com/api/payment/chapa-return` |

For the **frontend** (Vercel), set:
| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://abay-grand-hotel-nmn9.onrender.com` |

For the **admin** (Vercel), set:
| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://abay-grand-hotel-nmn9.onrender.com` |

Notes:
- The backend expects `process.env.PORT` (Render sets this automatically).
- The `.env` files in `frontend/` and `admin/` already have `VITE_API_URL` set correctly.
- The `backend/.env` file now contains production defaults so local testing matches production.
