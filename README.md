<div align="center">
  <img src="frontend/public/logo.png" alt="VitalSync Logo" width="120" height="auto" />
  <h1>VitalSync — A Family Link for Healthcare 🏥✨</h1>
  <p><i>A premium, AI-powered healthcare ecosystem bridging the gap between patients and caregivers.</i></p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-15-black?logo=next.js" alt="Next.js" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React" />
    <img src="https://img.shields.io/badge/Spring_Boot-3.4-6DB33F?logo=spring-boot&logoColor=white" alt="Spring Boot" />
    <img src="https://img.shields.io/badge/PostgreSQL-Supabase-336791?logo=postgresql" alt="PostgreSQL" />
    <img src="https://img.shields.io/badge/AI-Google_Gemini-4285F4?logo=google-gemini&logoColor=white" alt="Gemini" />
  </p>
</div>

---

VitalSync leverages state-of-the-art **Generative AI (Google Gemini)** and **Machine Learning (Hugging Face)** to provide real-time health insights, automated monitoring, and seamless communication. It's designed to make healthcare management intuitive, proactive, and deeply connected.

---

## 🚀 Core Features

### 🎙️ AI Voice Assistant (Vitya)
*   **Conversational Health AI**: A multilingual, warm, and friendly voice assistant that answers health queries using real patient data.

*   **Voice Navigation**: Control the app entirely by voice—"Take me to my reports" or "Show me my medicines."

### 📷 Smart Scanners (AI-OCR)
*   **Vitals Scanner**: Instantly extract blood pressure, heart rate, and sugar levels from photos of medical device displays.
*   **Report Synthesis**: Upload complex medical reports (PDF/JPG) and receive a simplified, jargon-free summary using Gemini & Hugging Face.
*   **Food & Diet Analysis**: Take a photo of your meal to get instant calorie estimates and health alerts tailored to your medical conditions.

### 💓 Automated SOS & Monitoring
*   **Critical Alerts**: Automatically detects dangerous vital signs (e.g., extremely high BP) and triggers SOS alerts to caregivers.
*   **Emergency Mode**: Instant access to emergency contacts and automated location sharing.

### 📅 Care Management
*   **Family Pairing**: Securely link Patient and Caregiver accounts using a unique pair-code system.
*   **Medication Tracker**: AI-assisted prescription scanning to automate dosing schedules and reminders.
*   **Habit Builder**: Personalized, AI-generated daily habits based on the patient's age and medical history.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | Next.js 15, React 19, Lucide Icons, Recharts, i18next (Multi-lang) |
| **Backend** | Spring Boot 3.4, Spring Security (JWT), Maven |
| **Database** | PostgreSQL (hosted on Supabase) |
| **AI / ML** | Google Gemini (Pro/Flash), Hugging Face (Mistral-7B), GCP Text-to-Speech |
| **Storage** | Supabase Storage (Native File Uploads) |

---

## 🗄️ Database Architecture (Postgres)

### Core Tables & Schema

#### `users`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique identifier |
| `email` | String (Unique) | User login email |
| `password_hash` | String | Encrypted password |
| `role` | Enum | `PATIENT` or `CAREGIVER` |
| `paircode` | String | Unique 32-char code for linking accounts |
| `language` | String | Preferred locale (en, hi, ta, etc.) |

#### `profile`
| Column | Type | Description |
| :--- | :--- | :--- |
| `full_name` | String | Legal name |
| `blood_type` | String | A+, B-, etc. |
| `medical_conditions`| Text | Patient history used for AI context |
| `emergency_contacts`| Text | JSON/Text of contact info |

#### `vital_readings`
| Column | Type | Description |
| :--- | :--- | :--- |
| `type` | Enum | BP, Sugar, Heart Rate, etc. |
| `value` | Double | Primary reading |
| `secondary_value` | Double | Diastolic (for BP) |
| `critical_flag` | Boolean | True if AI/Threshold detects danger |

#### `health_reports`
| Column | Type | Description |
| :--- | :--- | :--- |
| `file_url` | String | URL to Supabase storage |
| `gemini_summary` | Text | AI-generated simplified summary |
| `hf_analysis` | Text | Technical analysis from Mistral |
| `critical_flagged` | Boolean | Flagged if values are out of range |

#### `medications`
| Column | Type | Description |
| :--- | :--- | :--- |
| `name` | String | Medication title |
| `dosage` | String | Weight/Volume (e.g. 500mg) |
| `frequency` | String | Comma-separated (morning, night) |
| `status` | Enum | `ACTIVE` or `COMPLETED` |

#### `habits`
| Column | Type | Description |
| :--- | :--- | :--- |
| `title` | String | Activity name |
| `time_of_day` | String | Scheduled time (e.g. 08:00 AM) |
| `completed` | Boolean | Daily tracking status |
| `ai_generated` | Boolean | True if suggested by Gemini |

#### `sos_alerts`
| Column | Type | Description |
| :--- | :--- | :--- |
| `trigger_type` | Enum | `VITAL_THRESHOLD`, `MANUAL`, `REPORT_FLAGGED` |
| `reason` | Text | Context for the emergency help |
| `latitude` / `longitude` | Double | Geolocation at time of trigger |

---

## 🛠️ Development Setup

### Backend (Spring Boot)
1. Navigate to `/backend/vitalsync`
2. Configure `.env` with your DB credentials and API keys:
   ```env
   APP_GEMINI_API_KEY_PRIMARY=...
   APP_GEMINI_API_KEY_SECONDARY=...
   APP_HUGGINGFACE_API_KEY=...
   ```
3. Run: `./mvnw spring-boot:run`

### Frontend (Next.js)
1. Navigate to `/frontend`
2. Install dependencies: `npm install`
3. Run: `npm run dev`

---

## 🎨 Design Philosophy
VitalSync features a **Premium Modern UI** with:
- **Glassmorphism**: Sleek, transparent cards and backgrounds.
- **Dynamic Theming**: Smooth transitions between Dark and Light modes.
- **Responsive Layouts**: Optimized for both Desktop dashboards and Mobile scanning.
- **Micro-animations**: Enhanced feedback loops for AI processing and navigation.

---
*Created by CodeCrew — VitalSync Team*
