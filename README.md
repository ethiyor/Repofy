🚀 Repofy – Your Personal Mini GitHub

Repofy is a simplified GitHub-style platform that lets users create, upload, and manage code repositories with ease. Built with modern tools like **React**, **Express**, and **Supabase**, it’s ideal for showcasing full-stack skills and experimenting with authentication, file storage, and REST APIs.

---

## 🔧 Features

- 🔐 **Authentication** via Supabase (Sign Up / Login / Email Confirmation)
- 📦 **Upload Repositories** with title, description, and code
- 📁 **View Repository Files** (toggleable)
- 🧠 **Session-based Authorization** using bearer tokens
- 🌐 Deployed with Render + Supabase backend

---

## 🖥️ Tech Stack

| Frontend      | Backend        | Auth & Storage   | Deployment       |
|---------------|----------------|------------------|------------------|
| React         | Node.js + Express | Supabase         | Render / GitHub  |

---

## 🚀 Live Demo

**🔗 App:** [https://repofy.dev](https://repofy.dev)  
**💻 Code:** [GitHub Repo](https://github.com/ethiyor/Repofy)

---

## 📸 Screenshots

| Upload Page | Public Repos |
|-------------|--------------|
| ![upload](./screenshots/upload.png) | ![repos](./screenshots/repos.png) |

> 📌 Make sure to create a `/screenshots` folder and place your images as `upload.png` and `repos.png`.

---

## 🛠️ Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/ethiyor/Repofy.git
cd Repofy
2. Install client & server dependencies
bash
Copy
Edit
cd client
npm install
npm start
bash
Copy
Edit
cd ../server
npm install
node index.js
⚠️ Make sure to create a .env file in /server with your Supabase credentials:

ini
Copy
Edit
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-or-service-role-key
📁 Project Structure
bash
Copy
Edit
Repofy/
│
├── client/         # React Frontend
│   └── src/
│       ├── AuthForm.js
│       ├── RepoList.js
│       ├── ConfirmPage.js
│       └── App.js
│
├── server/         # Express Backend
│   └── index.js
│
├── supabase.js     # Shared Supabase config
├── README.md
├── .env            # Server environment variables
└── screenshots/    # Images for README
🌱 Known Issues / Future Improvements
 Add syntax highlighting for uploaded code

 Enable repository editing and deletion

 Improve error handling and form validation

 Add support for private repositories

 Add user profile pages and avatars

🙋* About the Developer*
👋 Hi! I’m Yordanos Tiruneh Kassa – an aspiring software engineer and astrophysics student at Columbia University. This project was built during Summer 2025 as a showcase of full-stack development.

🔗 GitHub • LinkedIn • repofy.dev

📜 License
This project is open-source.
