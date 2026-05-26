# **Folders Management App**

A full-stack web application for managing folders and documents, built with **Node.js/Express** for the backend and **Angular** for the frontend.

---

# **Technologies Used**

## **Backend**
- **Node.js**
- **Express.js**
- **MongoDB / Mongoose**
- **JWT Authentication**
- **Multer**
- **Helmet**
- **CORS**
- **Cookie Parser**
- **Argon2 / BcryptJS**

## **Frontend**
- **Angular**
- **TypeScript**
- **HTML / CSS**

---

# **Project Structure**

```bash
Folders_Managenent_app/
├── backendjs/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── uploads/
│   ├── server.js
│   └── package.json
│
└── frontend/
    └── load-document-angular/
        ├── src/
        ├── public/
        ├── angular.json
        └── package.json
```

---

# **Main Features**

- **User authentication**
- **Folder management**
- **Document management**
- **File upload system**
- **JWT security**
- **REST API with Express**
- **Angular frontend interface**

---

# **Installation**

## **1. Clone the repository**

```bash
git clone https://github.com/Noris69/Folders_Managenent_app.git
cd Folders_Managenent_app
```

---

# **Run the Backend**

```bash
cd backendjs
npm install
npm run dev
```

The backend runs by default on:

```bash
http://localhost:4001
```

---

# **Backend Environment Variables**

Create a `.env` file inside `backendjs`:

```env
PORT=4001
MONGO_URI=mongodb://localhost:27017/folders_management
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_refresh_secret
```

---

# **Run the Frontend**

```bash
cd frontend/load-document-angular
npm install
ng serve
```

The Angular application will be available on:

```bash
http://localhost:4200
```

---

# **Useful Commands**

## **Backend**

```bash
npm run dev
npm start
```

## **Frontend**

```bash
ng serve
ng build
```

---

# **Main API Endpoints**

| Method | Endpoint | Description |
|---|---|---|
| **POST** | `/api/auth` | Authentication |
| **GET / PUT** | `/api/user` | User management |
| **GET / POST** | `/api/docs` | Document management |
| **GET / POST** | `/api/folders` | Folder management |
| **GET** | `/uploads` | Access uploaded files |

---

# **Git Ignore Recommendations**

Do not push the following files/folders to GitHub:

```gitignore
node_modules/
dist/
.angular/
uploads/
.env
.DS_Store
```

---

# **Author**

Developed by **Noris69**.
