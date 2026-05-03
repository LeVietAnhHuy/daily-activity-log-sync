import { useState } from 'react';
import { supabase } from './supabase';
import './Auth.css';

export default function Auth({ onAuthSuccess }) {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        alert('Đã gửi email xác nhận. Hãy kiểm tra hộp thư của bạn!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        onAuthSuccess();
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container animate-slide-in">
      <div className="auth-card">
        <h2>{isSignUp ? 'Đăng ký tài khoản' : 'Đăng nhập'}</h2>
        <p className="auth-subtitle">Đồng bộ dữ liệu PC & Mobile</p>
        
        <form onSubmit={handleAuth} className="auth-form">
          <div className="auth-field">
            <label>Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="example@gmail.com"
              required 
            />
          </div>
          <div className="auth-field">
            <label>Mật khẩu</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
            />
          </div>
          
          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Đang xử lý...' : (isSignUp ? 'Tạo tài khoản' : 'Đăng nhập ngay')}
          </button>
        </form>
        
        <div className="auth-toggle">
          {isSignUp ? 'Đã có tài khoản?' : 'Chưa có tài khoản?'}
          <button onClick={() => setIsSignUp(!isSignUp)}>
            {isSignUp ? 'Đăng nhập' : 'Đăng ký'}
          </button>
        </div>
      </div>
    </div>
  );
}
