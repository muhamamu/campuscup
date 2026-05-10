# Multi-User Setup Guide

## Current Limitation
Right now, the app uses **localStorage** which stores data per-browser. This means:
- Each user has their own separate data
- Data isn't shared between users
- Data is lost if you clear browser storage

## How to Make It a True Multi-User Website

### Option 1: Use Firebase (Easiest - No Backend Code!)

Firebase provides a free backend-as-a-service perfect for this!

#### Step 1: Create a Firebase Project
1. Go to [firebase.google.com](https://firebase.google.com)
2. Click "Get Started" → "Add project"
3. Follow the setup wizard

#### Step 2: Enable Firebase Auth
1. In Firebase Console → Authentication → Get started
2. Enable "Email/Password" sign-in method

#### Step 3: Enable Firestore Database
1. In Firebase Console → Firestore Database → Create database
2. Start in test mode (you can secure it later)
3. Choose a location

#### Step 4: Add Firebase to Your Web App
1. In Firebase Console → Project Settings → General
2. Click "Add app" → Web app
3. Copy the config code (looks like this):
```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

#### Step 5: Update Your HTML Files
Add this to your `index.html`, `admin.html`, `login.html`, `signup.html`, etc.:
```html
<!-- Add Firebase SDKs -->
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore-compat.js"></script>
```

### Option 2: Build a Simple Backend with Node.js & Express

#### Project Structure:
```
trying/
├── public/              # All your HTML/JS files
├── server.js            # Backend server
└── package.json
```

#### server.js Example:
```javascript
const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory storage (use a real database like MongoDB for production)
let users = [];
let standings = [];
let liveMatch = null;

// Auth endpoints
app.post('/api/signup', (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  const isAdmin = users.length === 0;
  const user = { id: Date.now(), firstName, lastName, email, password, isAdmin };
  users.push(user);
  res.json({ success: true, user: { ...user, password: undefined } });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (user) {
    res.json({ success: true, user: { ...user, password: undefined } });
  } else {
    res.json({ success: false, error: 'Invalid credentials' });
  }
});

// Standings endpoints
app.get('/api/standings', (req, res) => res.json(standings));
app.put('/api/standings', (req, res) => {
  standings = req.body;
  res.json({ success: true, standings });
});

// Match endpoints
app.get('/api/match', (req, res) => res.json(liveMatch));
app.put('/api/match', (req, res) => {
  liveMatch = req.body;
  res.json({ success: true, match: liveMatch });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
```

#### package.json:
```json
{
  "name": "campus-cup",
  "version": "1.0.0",
  "dependencies": {
    "express": "^4.18.0",
    "cors": "^2.8.5"
  },
  "scripts": {
    "start": "node server.js"
  }
}
```

## Deploying Your Multi-User App

### Deploy Option 1: Firebase Hosting + Firestore
Perfect for this app! It's free for small projects and requires no backend code.

### Deploy Option 2: Vercel + Backend on Render/Heroku
- Deploy frontend to Vercel (as before)
- Deploy backend to Render (free) or Heroku
- Update frontend API calls to point to your backend URL

### Deploy Option 3: Full Stack on Vercel
You can also add API routes to a Vercel project!

## Quick Firebase Conversion Guide

If you want the fastest way to go multi-user, choose Firebase! You can have it set up in about 15-20 minutes.

The main changes needed are:
1. Replace localStorage calls with Firebase Firestore
2. Replace login/signup with Firebase Auth
3. Use real-time listeners so all users see updates instantly!
