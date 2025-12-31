# 🏙️ InfraTrack - Civic Infrastructure Issue Reporting Platform

## 📋 Project Overview

**InfraTrack** is a comprehensive civic engagement platform that empowers citizens to report, track, and resolve infrastructure issues in their communities. By bridging the gap between citizens and local government, InfraTrack promotes transparency, accountability, and collaborative problem-solving for building better cities.

---

## 🔗 Github URL

**Website GitHub Link:** [https://github.com/st-shourov12/infraTrack](https://github.com/st-shourov12/infraTrack)

**Server Github Link:** [https://github.com/st-shourov12/infraTrack-Server](https://github.com/st-shourov12/infraTrack-Server)
---
---

## 🔗 Live Site URL

**Website Live Link:** [https://infra-track.vercel.app](https://infra-track.vercel.app)

**Server Live Link:** [https://infratrack-server.vercel.app](https://infratrack-server.vercel.app/) 
---

## 🔐 Admin Credentials

For testing admin features, use the following credentials:

```
Admin Email: admin@infratrack.com
Admin Password: Admin@123456
```

**Note:** Please do not modify or delete critical data when testing.

---

## ✨ Key Features

### 🎯 Core Functionality

1. **Real-Time Issue Reporting**
   - Users can report civic issues with photo evidence, detailed descriptions, and automatic GPS location detection
   - Support for 10 issue categories: Potholes, Broken Streetlights, Water Leakage, Garbage Overflow, Damaged Footpaths, Drainage Blockage, Illegal Parking, Broken Park Bench, Faulty Traffic Signal, and Other
   - Instant issue submission with cloud-based image storage

2. **Smart Prioritization System**
   - AI-powered automatic priority assignment based on issue severity and community votes
   - Issues sorted by priority (High → Medium → Low) and status (Pending → In Progress → Resolved → Closed)
   - Boost feature allowing users to upgrade issue priority through payment (৳100)

3. **Interactive Issue Tracking**
   - Real-time status updates with detailed timeline showing every action taken
   - Live progress tracking from report submission to resolution
   - Push notifications for status changes (Pending, Assigned, In Progress, Resolved)
   - Before and after photo comparisons for completed issues

4. **Community Voting System**
   - Upvote/downvote mechanism to democratically prioritize issues
   - Community-driven decision making on urgent problems
   - Vote count displayed publicly to show community support
   - One vote per user per issue to prevent manipulation

5. **Advanced Search & Filtering**
   - Powerful search functionality across categories, locations, districts, and descriptions
   - Multi-parameter filters: Status, Category, Priority, Region, District, Upzila
   - Smart pagination with 9 issues per page (3x3 grid)
   - Sort options: Newest, Oldest, Most Voted, Highest Priority

6. **Staff Assignment & Management**
   - Automatic staff assignment based on department and location
   - Staff availability tracking (Available/Assigned/Busy)
   - Department-wise issue distribution (Roads, Electrical, Water, Sanitation, etc.)
   - Real-time work status updates from assigned staff members

7. **Premium Membership System**
   - Free users limited to 3 issue reports
   - Premium membership (৳1000) for unlimited issue reporting
   - Integrated Stripe payment gateway for secure transactions
   - Automated invoice generation with PDF download
   - Unique tracking IDs for every transaction

8. **Interactive Maps & Visualization**
   - Google Maps integration showing all issues with location pins
   - Cluster markers for densely reported areas
   - Heat map overlay to visualize problem hotspots
   - Location-based filtering by district/upzila
   - GPS-based auto-location detection for mobile users

9. **Comprehensive Admin Dashboard**
   - Complete user management (Block/Unblock, Role Assignment, Premium Status)
   - Staff application approval system with verification
   - Issue status management and manual priority adjustment
   - Payment history tracking with detailed transaction logs
   - System-wide analytics and statistics (Total Users, Active Issues, Resolution Rate, etc.)
   - Export reports in CSV/PDF format

10. **Mobile-First Responsive Design**
    - Fully responsive layout optimized for mobile, tablet, and desktop
    - Progressive Web App (PWA) capabilities for app-like experience
    - Offline mode support for saving reports without internet
    - Touch-optimized UI with swipe gestures
    - Fast loading times with lazy loading and code splitting

### 🔒 Security & Authentication

11. **Firebase Authentication**
    - Email/password authentication with email verification
    - Google OAuth social login integration
    - Secure JWT token-based authorization
    - Role-based access control (User, Staff, Admin)
    - Password reset functionality via email

12. **Data Security & Privacy**
    - HTTPS encryption for all data transmission
    - Secure API endpoints with authentication middleware
    - User data privacy protection compliant with GDPR
    - Sensitive information masking in public views
    - Regular security audits and updates

### 📊 Analytics & Reporting

13. **Performance Metrics Dashboard**
    - Real-time statistics: Total Issues, Resolved Count, Active Users, Average Response Time
    - Department-wise performance tracking
    - Monthly/yearly trend analysis with charts
    - Success rate calculation (Resolved/Total Issues)
    - Community engagement metrics (Votes, Reports, Active Users)

14. **Government Transparency Portal**
    - Public-facing issue resolution statistics
    - Department accountability scores
    - Average resolution time by category
    - Monthly progress reports with visualizations
    - Success stories showcase with before/after photos

### 🎨 User Experience Features

15. **Beautiful UI/UX Design**
    - Modern gradient color scheme (Civic Blue #2563EB + Orange #F97316)
    - Smooth animations and micro-interactions using Framer Motion
    - Glassmorphism and card-based layouts
    - Dark mode support for comfortable viewing
    - Accessible design following WCAG 2.1 guidelines

16. **Gamification & Engagement**
    - Badge system for active contributors (Reporter, Voter, Premium Citizen, Top Contributor)
    - Points earned for reporting and voting on issues
    - Leaderboard showcasing top community contributors
    - Achievement milestones with rewards
    - Social sharing of resolved issues on Facebook/Twitter

17. **Notification System**
    - In-app notifications for all issue updates
    - Email notifications for critical status changes
    - SMS alerts for high-priority issues (optional)
    - Customizable notification preferences
    - Push notifications for mobile app users

### 📱 Additional Features

18. **Multi-Language Support**
    - Bilingual interface (English & Bengali)
    - Language toggle in navbar
    - Localized date/time formats
    - Right-to-left (RTL) support ready

19. **API Documentation**
    - RESTful API with comprehensive documentation
    - Swagger/OpenAPI integration for API testing
    - Rate limiting to prevent abuse
    - API key authentication for third-party integrations
    - Webhooks for real-time updates

20. **Success Stories & Testimonials**
    - Before/after image comparison sliders
    - Community testimonials from satisfied users
    - Featured resolved issues showcase
    - Video testimonials from citizens and officials
    - Social proof to build trust and encourage participation

---

## 🛠️ Technologies Used

### Frontend
- **React.js** - UI library
- **React Router** - Client-side routing
- **TanStack Query** - Server state management
- **Tailwind CSS** - Utility-first styling
- **DaisyUI** - Component library
- **Swiper.js** - Touch slider
- **React Icons** - Icon library
- **Framer Motion** - Animation library
- **Axios** - HTTP client

### Backend
- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Firebase Admin SDK** - Authentication

### Payment & Services
- **Stripe** - Payment processing
- **Firebase** - Authentication & Hosting
- **Google Maps API** - Location services
- **Cloudinary/ImgBB** - Image hosting
- **PDF-Kit** - Invoice generation

### Development Tools
- **Vite** - Build tool
- **ESLint** - Code linting
- **Prettier** - Code formatting
- **Git & GitHub** - Version control

---

## 📦 Installation & Setup

### Prerequisites
```bash
Node.js (v18 or higher)
MongoDB (v6 or higher)
Firebase Account
Stripe Account
```

### Clone Repository
```bash
git clone https://github.com/st-shourov12/infratrack.git
cd infratrack
```

### Install Dependencies

**Frontend:**
```bash
cd client
npm install
```

**Backend:**
```bash
cd server
npm install
```

### Environment Variables

**Frontend (.env):**
```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_API_URL=http://localhost:5000
VITE_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

**Backend (.env):**
```env
PORT=5000
DB_URI=your_mongodb_connection_string
FIREBASE_SERVICE_ACCOUNT=./firebase-service-account.json
STRIPE_SECRET=your_stripe_secret_key
SITE_DOMAIN=http://localhost:5173
```

### Run Development Servers

**Frontend:**
```bash
npm run dev
# Runs on http://localhost:5173
```

**Backend:**
```bash
npm run dev
# Runs on http://localhost:5000
```

---

## 🚀 Deployment

### Frontend (Vercel/Netlify Hosting)
```bash
npm run build

```

### Backend (Vercel/Railway)
```bash
# Connect your GitHub repository
# Set environment variables in dashboard
# Deploy automatically on push
```

---

## 👥 User Roles

### 1. **Citizen (Free User)**
- Report up to 3 issues
- Vote on community issues
- Track personal issue status
- View all public issues

### 2. **Premium Citizen**
- Unlimited issue reporting
- Priority support
- Boost issue priority
- Access to analytics dashboard

### 3. **Staff Member**
- View assigned issues
- Update issue status with photos
- Add timeline comments
- Mark issues as resolved

### 4. **Admin**
- Full system access
- User management
- Staff approval
- Issue management
- Payment monitoring
- System settings

---

## 📊 Database Schema

### Collections:
- **users** - User profiles and authentication
- **issues** - Reported civic issues
- **staffs** - Staff applications and assignments
- **payments** - Transaction records
- **notifications** - User notifications

---

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 📞 Contact & Support

- **Email:** [Email](https://shourovsc38@gmail.com)
- **Website:** [https://infra-track.vercel.app](https://infra-track.vercel.app)
- **GitHub:** [Github](https://github.com/st-shourov12)
- **Facebook:** [Facebook](https://www.facebook.com/mirazulislam.shourov)
- **LinkedinIn:** [LinkedIN](https://www.linkedin.com/in/miraz-shourov/)

---

## 🙏 Acknowledgments

- Thanks to all contributors and beta testers
- Government departments for collaboration
- Open source community for amazing tools
- Citizens who believe in making cities better

---

## 📈 Future Roadmap

- [ ] AI-powered issue detection from images
- [ ] Mobile app for iOS and Android (React Native)
- [ ] Integration with government databases
- [ ] Chatbot for instant support
- [ ] Voice-based issue reporting
- [ ] AR visualization for resolved issues
- [ ] Blockchain for transparent tracking
- [ ] Integration with smart city sensors

---

**Made with ❤️ for Better Cities**

© 2025 InfraTrack. All Rights Reserved.
