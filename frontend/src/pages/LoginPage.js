import React, { useState } from 'react';
import { loginUser, registerUser } from '../api/authApi';
import '../styles/LoginPage.css';

function LoginPage({ onLoginSuccess }) {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    fullName: '', email: '', password: '', confirmPassword: '',
    department: '', phone: ''
  });

  const clearMessages = () => { setErrorMsg(''); setSuccessMsg(''); setFieldErrors({}); };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      const res = await loginUser(loginForm.email, loginForm.password);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(user);
    } catch (err) {
      const data = err.response?.data;
      setErrorMsg(data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    if (registerForm.password !== registerForm.confirmPassword) {
      setFieldErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = registerForm;
      await registerUser(payload);
      setSuccessMsg('Account created! Please log in.');
      setTab('login');
      setLoginForm({ email: registerForm.email, password: '' });
      setRegisterForm({ fullName: '', email: '', password: '', confirmPassword: '', department: '', phone: '' });
    } catch (err) {
      const data = err.response?.data;
      if (data && typeof data === 'object' && !data.error) {
        setFieldErrors(data);
      } else {
        setErrorMsg(data?.error || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card-header">
          <div className="brand">🏫 Smart Campus Operations Hub</div>
          <p>SLIIT Faculty of Computing</p>
        </div>

        <div className="login-tabs">
          <button className={`login-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); clearMessages(); }}>
            Login
          </button>
          <button className={`login-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); clearMessages(); }}>
            Register
          </button>
        </div>

        <div className="login-form-wrapper">
          {successMsg && <div className="success-message">{successMsg}</div>}
          {errorMsg && <div className="error-banner">{errorMsg}</div>}

          {tab === 'login' && (
            <form onSubmit={handleLoginSubmit}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="your@email.com" required
                  value={loginForm.email}
                  onChange={e => setLoginForm({ ...loginForm, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" placeholder="••••••••" required
                  value={loginForm.password}
                  onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
              </div>
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login'}
              </button>
              <div className="login-footer">
                Don't have an account?{' '}
                <a onClick={() => { setTab('register'); clearMessages(); }}>Register here</a>
              </div>
            </form>
          )}

          {tab === 'register' && (
            <form onSubmit={handleRegisterSubmit}>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" placeholder="John Doe" required
                  className={fieldErrors.fullName ? 'error-input' : ''}
                  value={registerForm.fullName}
                  onChange={e => setRegisterForm({ ...registerForm, fullName: e.target.value })} />
                {fieldErrors.fullName && <div className="field-error">{fieldErrors.fullName}</div>}
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" placeholder="your@email.com" required
                  className={fieldErrors.email ? 'error-input' : ''}
                  value={registerForm.email}
                  onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })} />
                {fieldErrors.email && <div className="field-error">{fieldErrors.email}</div>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Password</label>
                  <input type="password" placeholder="••••••••" required
                    className={fieldErrors.password ? 'error-input' : ''}
                    value={registerForm.password}
                    onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} />
                  {fieldErrors.password && <div className="field-error">{fieldErrors.password}</div>}
                </div>
                <div className="form-group">
                  <label>Confirm Password</label>
                  <input type="password" placeholder="••••••••" required
                    className={fieldErrors.confirmPassword ? 'error-input' : ''}
                    value={registerForm.confirmPassword}
                    onChange={e => setRegisterForm({ ...registerForm, confirmPassword: e.target.value })} />
                  {fieldErrors.confirmPassword && <div className="field-error">{fieldErrors.confirmPassword}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Department <span style={{color:'#aaa'}}>(optional)</span></label>
                  <input type="text" placeholder="e.g. Computing"
                    value={registerForm.department}
                    onChange={e => setRegisterForm({ ...registerForm, department: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Phone <span style={{color:'#aaa'}}>(optional)</span></label>
                  <input type="text" placeholder="07XXXXXXXX"
                    value={registerForm.phone}
                    onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} />
                </div>
              </div>
              <button className="btn-submit" type="submit" disabled={loading}>
                {loading ? 'Creating account...' : 'Create Account'}
              </button>
              <div className="login-footer">
                Already have an account?{' '}
                <a onClick={() => { setTab('login'); clearMessages(); }}>Login here</a>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
