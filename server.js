
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import conversationRoutes from './routes/conversationRoutes.js';
import aiRoutes from './routes/aiRoutes.js';

// Tải biến môi trường từ file .env
dotenv.config();

// Kiểm tra các biến môi trường cần thiết
if (!process.env.JWT_SECRET) {
    console.error('❌ LỖI: Biến môi trường JWT_SECRET chưa được thiết lập.');
    console.error('➡️  Vui lòng tạo file ".env" trong thư mục "backend" và thêm dòng sau:');
    console.error('JWT_SECRET="your_super_secret_jwt_key"');
    process.exit(1);
}

if (!process.env.API_KEY) {
    console.error('❌ LỖI: Biến môi trường API_KEY cho dịch vụ AI chưa được thiết lập.');
    console.error('➡️  Vui lòng thêm dòng sau vào file ".env" của bạn:');
    console.error('API_KEY="your_google_ai_api_key"');
    process.exit(1);
}

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error('❌ LỖI: Biến môi trường EMAIL_USER hoặc EMAIL_PASS chưa được thiết lập.');
    console.error('➡️  Vui lòng thêm thông tin đăng nhập email của bạn vào file ".env":');
    console.error('EMAIL_USER="your_email@gmail.com"');
    console.error('EMAIL_PASS="your_gmail_app_password"');
    process.exit(1);
}

if (!process.env.FRONTEND_URL) {
    console.warn('⚠️  CẢNH BÁO: Biến môi trường FRONTEND_URL chưa được thiết lập.');
    console.warn('➡️  Link đặt lại mật khẩu sẽ mặc định là "http://localhost:5173".');
    console.warn('➡️  Để hoạt động trên production, hãy thêm dòng sau vào file ".env":');
    console.warn('FRONTEND_URL="https://your-frontend-domain.com"');
}


// Kết nối đến cơ sở dữ liệu
connectDB();

const app = express();

// Middleware
// Cấu hình CORS để cho phép các origin cụ thể
const allowedOrigins = [
  'https://ai-englishfrontend.vercel.app', // Frontend đã deploy
  'http://localhost:5173',                 // Frontend local dev
  'http://127.0.0.1:5173',                  // Frontend local dev
];

const corsOptions = {
  origin: (origin, callback) => {
    // Cho phép các request không có origin (ví dụ: mobile apps, curl)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true, // Cho phép gửi cookie và header authorization
};

app.use(cors(corsOptions));
app.use(express.json()); // Cho phép server nhận dữ liệu JSON

// Routes
app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use('/api', authRoutes); // Sử dụng một file route chung cho cả /users và /auth
app.use('/api/conversations', conversationRoutes);
app.use('/api/ai', aiRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`🚀 Server chạy tại cổng ${PORT}`));
