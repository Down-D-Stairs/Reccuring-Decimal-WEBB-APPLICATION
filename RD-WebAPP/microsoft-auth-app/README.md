# Microsoft Auth App - Recurring Decimal Web Application

A full-stack web application with Microsoft authentication, built with React frontend and Node.js/Express backend.

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB database
- Microsoft Azure App Registration (for authentication)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Down-D-Stairs/Reccuring-Decimal-WEBB-APPLICATION.git
   cd microsoft-auth-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env` file in the `server` directory with the following variables:
   ```env
   JWT_SECRET=your_jwt_secret
   MONGODB_URI=your_mongodb_connection_string
   MONGODB_URI_TIMETABLE=your_timetable_mongodb_connection_string
   EMAIL_USER=your_email_user
   EMAIL_PASSWORD=your_email_password
   REACT_APP_API_URL=your_api_base_url
   PORT=5000
   ```

4. **Build and start the application**
   ```bash
   npm run build
   npm start
   ```

## 🌐 Hosting Options

### Option 1: Vercel (Recommended for Full-Stack)

1. **Install Vercel CLI**
   ```bash
   npm i -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Set environment variables** in Vercel dashboard under your project settings

4. **Configure build settings**:
   - Build Command: `npm run build`
   - Output Directory: `client/build`
   - Install Command: `npm install`

### Option 2: Netlify (Frontend) + Railway/Render (Backend)

#### Frontend on Netlify:
1. Connect your GitHub repository to Netlify
2. Set build command: `cd client && npm run build`
3. Set publish directory: `client/build`
4. Add environment variables in Netlify dashboard

#### Backend on Railway:
1. Connect your GitHub repository to Railway
2. Set start command: `cd server && npm start`
3. Add environment variables in Railway dashboard
4. Update frontend API calls to use Railway backend URL

### Option 3: Heroku

1. **Install Heroku CLI** and login
   ```bash
   heroku login
   ```

2. **Create Heroku app**
   ```bash
   heroku create your-app-name
   ```

3. **Set environment variables**
   ```bash
   heroku config:set MONGODB_URI=your_mongodb_uri
   heroku config:set JWT_SECRET=your_jwt_secret
   # Add other environment variables
   ```

4. **Deploy**
   ```bash
   git push heroku main
   ```

### Option 4: DigitalOcean App Platform

1. Connect your GitHub repository
2. Configure build command: `npm run build`
3. Configure run command: `npm start`
4. Set environment variables in the dashboard
5. Deploy

### Option 5: Self-Hosted VPS (Ubuntu/CentOS)

1. **Set up server dependencies**
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install MongoDB
   sudo apt-get install -y mongodb
   
   # Install PM2 for process management
   sudo npm install -g pm2
   ```

2. **Clone and setup application**
   ```bash
   git clone https://github.com/Down-D-Stairs/Reccuring-Decimal-WEBB-APPLICATION.git
   cd microsoft-auth-app
   npm install
   npm run build
   ```

3. **Configure environment variables**
   ```bash
   # Create .env file in server directory
   nano server/.env
   ```

4. **Start with PM2**
   ```bash
   cd server
   pm2 start server.js --name "microsoft-auth-app"
   pm2 startup
   pm2 save
   ```

5. **Set up reverse proxy with Nginx**
   ```bash
   sudo apt install nginx
   sudo nano /etc/nginx/sites-available/your-domain
   ```
   
   Nginx configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       location / {
           proxy_pass http://localhost:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

## 🔧 Configuration

### Email Service Setup
1. Configure your email service (Gmail, Outlook, etc.)
2. Enable 2-factor authentication if using Gmail
3. Generate an app-specific password
4. Add credentials to EMAIL_USER and EMAIL_PASSWORD variables

### MongoDB Setup
- Use MongoDB Atlas for cloud hosting
- Or set up local MongoDB instance
- Update connection string in environment variables

## 🏗️ Project Structure

```
microsoft-auth-app/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   ├── build/             # Built frontend files
│   └── package.json
├── server/                # Node.js backend
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── services/
│   ├── server.js
│   └── package.json
├── package.json           # Root package.json
└── README.md
```

## 📝 Environment Variables

### Required Environment Variables:
- `JWT_SECRET` - Secret key for JWT tokens
- `MONGODB_URI` - Main MongoDB connection string
- `MONGODB_URI_TIMETABLE` - Timetable MongoDB connection string
- `EMAIL_USER` - Email service username
- `EMAIL_PASSWORD` - Email service password
- `REACT_APP_API_URL` - API base URL for frontend
- `PORT` - Server port (default: 5000)

## 🚨 Important Notes

- Ensure all environment variables are properly set before deployment
- The application serves the React build files from the Express server
- Make sure MongoDB is accessible from your hosting platform
- Configure CORS settings for your domain
- Set up proper error logging for production

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

---

For more detailed deployment guides, check the documentation of your chosen hosting platform.
