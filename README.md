# Waste Collection and Recycling Tracking System

A full-stack Database Management System (DBMS) project designed to track municipal waste collection, manage recycling facilities, and provide role-based access for citizens, waste collectors, and administrators. 

This project utilizes an automated development pipeline, leveraging **Antigravity** for local file generation in **VS Code**, **Supabase** for the PostgreSQL database backend, and **Vercel** for continuous deployment.

## 🚀 Tech Stack & Workflow Pipeline

- **Frontend Builder & IDE:** Antigravity AI integrated with VS Code (HTML5, CSS3, Vanilla JavaScript)
- **Backend & Database:** Supabase (PostgreSQL, RESTful APIs)
- **Version Control:** Git & GitHub
- **Hosting & Deployment:** Vercel

**The Pipeline Tunnel:**
`Antigravity (Code Generation)` ➡️ `VS Code (Local Editing)` ➡️ `GitHub (Version Control)` ➡️ `Vercel (Live Deployment)`

## 🗄️ Database Architecture (Schema)

The database follows a normalized relational structure to ensure data integrity across users, requests, and facilities.

### Tables
1. **`profiles`**: Stores user identities and role types (citizen, collector, admin).
2. **`waste_requests`**: Logs pickup requests initiated by citizens.
3. **`facilities`**: Registry of active recycling and processing centers.
4. **`collections`**: Records completed pickups by collectors, including weight metrics.
5. **`recycling_logs`**: Tracks the final processing of collected waste at specific facilities.

### Entity-Relationship Diagram

```mermaid
erDiagram
    PROFILES ||--o{ WASTE_REQUESTS : submits
    PROFILES ||--o{ COLLECTIONS : performs
    WASTE_REQUESTS ||--o| COLLECTIONS : becomes
    COLLECTIONS ||--o{ RECYCLING_LOGS : processed_in
    FACILITIES ||--o{ RECYCLING_LOGS : handles

    PROFILES {
        uuid id PK
        string role
        string name
        string contact
    }
    WASTE_REQUESTS {
        int id PK
        uuid user_id FK
        string waste_type
        string status
        date pickup_date
    }
    COLLECTIONS {
        int id PK
        int request_id FK
        uuid collector_id FK
        float weight_kg
        date collection_date
    }
    RECYCLING_LOGS {
        int id PK
        int collection_id FK
        int facility_id FK
        date processed_date
    }
    FACILITIES {
        int id PK
        string name
        string location
    }
