# EcoTrack - Waste Collection & Recycling Tracking System

A complete, production-ready frontend codebase for a **Waste Collection and Recycling Tracking** system built with **HTML5**, **CSS3**, and **Vanilla JavaScript** powered by **Supabase**.

---

## 🌟 Architecture & Core Files

The application consists of 4 main files in the workspace:

1. **`index.html`**:
   - Modern, professional login and registration interface.
   - Signup captures **Full Name**, **Email**, **Contact / Phone**, **Password**, and an interactive **Role Selector** (`Citizen`, `Collector`, `Admin`).
   - Imports Supabase v2 JS client via CDN: `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2`.
   - Links to `style.css` and `app.js`.

2. **`dashboard.html`**:
   - Main role-driven application view.
   - Contains three distinct container divs toggled by user role:
     - **`id="citizen-view"`**: Schedule a new waste request (`waste_type`: `Plastic`, `Electronic`, `Organic`, plus weight, address, date, and notes) and inspect a past requests table.
     - **`id="collector-view"`**: Browse all `'Pending'` waste requests, click "Select for Pickup" to auto-populate the form, and submit a new collection (entering `request_id` and `weight_kg`), updating the request status to `'Collected'`.
     - **`id="admin-view"`**: Municipal analytics dashboard displaying a table of all completed collections and a table of recycling logs joined with processing facilities.
   - Interactive role switcher buttons for quick testing across all three user perspectives.

3. **`style.css`**:
   - Eco-friendly design system featuring a forest green, soft white, and light gray palette.
   - **CSS Flexbox** for centering the login and registration modal.
   - **CSS Grid** for responsive dashboard metric cards and data table layouts.
   - Soft box-shadows, rounded corners (`border-radius: 8px` to `16px`), and responsive `@media` queries for mobile, tablet, and desktop viewing.

4. **`app.js`**:
   - Configured with Supabase client initialization at the top.
   - Implements all required asynchronous functions with comprehensive `.catch()` and `try/catch` error handling and `console.log` debugging:
     - `signUpUser()`: Registers user via Supabase Auth and inserts `id`, `role`, `name`, and `contact` into the `profiles` table.
     - `loginUser()`: Authenticates user credentials and redirects to `dashboard.html`.
     - `checkUserRole()`: Runs on `dashboard.html` load, fetches the user's role from the `profiles` table, and toggles the corresponding view container.
     - `submitWasteRequest()`: Inserts a new row into `waste_requests`.
     - `fetchPendingRequests()`: Queries `waste_requests` for Collectors (status = `'Pending'`).
     - `logCollection()`: Inserts into `collections` and updates `waste_requests` status to `'Collected'`.
     - `fetchAdminData()`: Queries `collections` and `recycling_logs` joined with `facilities`.

---

## 🗄️ Database Setup (`supabase-schema.sql`)

To initialize your Supabase PostgreSQL database:

1. Open your project on [Supabase](https://supabase.com).
2. Go to the **SQL Editor** tab.
3. Open `supabase-schema.sql` from this workspace, copy the code, paste it into the SQL Editor, and click **Run**.
4. The script creates the following tables and RLS security policies:
   - `profiles`: `id`, `email`, `name`, `full_name`, `contact`, `role` (`Citizen`, `Collector`, `Admin`), `created_at`
   - `facilities`: `id`, `name`, `location`, `type`, `capacity_kg`
   - `waste_requests`: `id`, `user_id`, `citizen_name`, `waste_type`, `category`, `weight_kg`, `address`, `preferred_date`, `notes`, `status` (`Pending`, `Collected`)
   - `collections`: `id`, `request_id`, `collector_id`, `collector_name`, `weight_kg`, `actual_weight_kg`, `facility`, `collected_at`
   - `recycling_logs`: `id`, `facility_id`, `category`, `weight_kg`, `carbon_offset_kg`, `logged_at`

---

## 🚀 How to Run the Application

You can open `index.html` directly in any web browser or start a local HTTP server:

```powershell
# Using Python:
python -m http.server 8080

# Or using Node.js:
npx serve .
```

Open `http://localhost:8080` or double-click `index.html`.
