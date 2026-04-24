import React, { useState, useEffect, useCallback } from 'react';
import { loginUser, registerUser, googleLogin } from '../api/authApi';
import '../styles/LoginPage.css';

const MANAGER_USERNAME = 'ticket_manager';
const MANAGER_PASSWORD = 'TicketManager@123';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID_HERE';

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

  const handleGoogleResponse = useCallback(async (response) => {
    clearMessages();
    setLoading(true);
    try {
      const res = await googleLogin(response.credential);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(user);
    } catch (err) {
      const data = err.response?.data;
      setErrorMsg(data?.error || 'Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [onLoginSuccess]);

  useEffect(() => {
    // Load Google Sign-In script
    if (GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID_HERE') return;
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-signin-btn'),
          { theme: 'outline', size: 'large', width: '100%', text: 'signin_with' }
        );
      }
    };
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, [handleGoogleResponse]);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    clearMessages();
    setLoading(true);
    try {
      // Temporary manager-only local auth until backend role auth is wired.
      const normalizedLoginId = (loginForm.email || '').trim().toLowerCase();
      const managerAliases = ['ticket_manager', 'ticket manager'];
      if (managerAliases.includes(normalizedLoginId) && loginForm.password === MANAGER_PASSWORD) {
        const managerUser = {
          id: 'manager-local',
          fullName: 'Ticket Manager',
          email: MANAGER_USERNAME,
          role: 'MANAGER'
        };
        localStorage.setItem('token', 'manager-local-token');
        localStorage.setItem('user', JSON.stringify(managerUser));
        onLoginSuccess(managerUser);
        return;
      }

      const res = await loginUser(loginForm.email, loginForm.password);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLoginSuccess(user);
    } catch (err) {
      const data = err.response?.data;
      if (!err.response) {
        setErrorMsg('Backend server is not reachable. Please start backend on port 8081.');
      } else {
        setErrorMsg(data?.error || 'Login failed. Please try again.');
      }
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
                <label>Email / Username</label>
                <input type="text" placeholder="your@email.com or username" required
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

              {/* Google Sign-In */}
              <div className="oauth-divider">
                <span>or continue with</span>
              </div>
              <div id="google-signin-btn" className="google-btn-wrapper"></div>

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

              {/* Google Sign-In for register too */}
              <div className="oauth-divider">
                <span>or sign up with</span>
              </div>
              <div id="google-signin-btn" className="google-btn-wrapper"></div>

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
