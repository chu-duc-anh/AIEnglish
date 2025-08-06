
import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ LỖI: Biến môi trường MONGO_URI chưa được thiết lập.');
    console.error('➡️  Vui lòng tạo file ".env" trong thư mục "backend" và thêm dòng sau:');
    console.error('MONGO_URI="your_mongodb_connection_string"');
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log('✅ Đã kết nối MongoDB');
  } catch (err) {
    console.error('❌ Lỗi kết nối MongoDB:', err.message);
    process.exit(1); // Dừng chương trình nếu không kết nối được
  }
};

export default connectDB;