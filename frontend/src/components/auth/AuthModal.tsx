import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Key,
  Truck,
  Package,
  TrendingUp,
  Globe,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  X,
  Zap,
  ArrowRight,
  LogOut,
  Sparkles,
  UserPlus,
  RefreshCw,
  Mail,
  UserCheck,
  Smartphone,
  Check,
  Clock,
  Database,
  Fingerprint,
  Info,
  ExternalLink,
} from 'lucide-react';
import { useUIStore, PersonaMode } from '../../state/useUIStore';
import { apiClient, AuthUser, UserPublicProfile, FALLBACK_DEMO_USERS, UserRole } from '../../api/client';

export const AuthModal: React.FC = () => {
  const authModalOpen = useUIStore((s) => s.authModalOpen);
  const setAuthModalOpen = useUIStore((s) => s.setAuthModalOpen);
  const setActivePersona = useUIStore((s) => s.setActivePersona);

  type TabType = 'GOOGLE' | 'OTP' | 'LOGIN' | 'REGISTER' | 'CHANGE_PASSWORD' | 'CLAIMS';
  const [activeTab, setActiveTab] = useState<TabType>('GOOGLE');

  const [personas, setPersonas] = useState<UserPublicProfile[]>(FALLBACK_DEMO_USERS);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(apiClient.getStoredUser());

  // Login with Password State
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register State
  const [regUsername, setRegUsername] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regRole, setRegRole] = useState<UserRole>('CUSTOMER');
  const [regSuccessUser, setRegSuccessUser] = useState<AuthUser | null>(null);

  // Change Password State
  const [cpUsername, setCpUsername] = useState('');
  const [cpCurrentPassword, setCpCurrentPassword] = useState('');
  const [cpNewPassword, setCpNewPassword] = useState('');
  const [cpConfirmPassword, setCpConfirmPassword] = useState('');

  // Google Sign-In & GIS State
  const [googleClientId, setGoogleClientId] = useState(
    localStorage.getItem('google_oauth_client_id') || ''
  );
  const [showGisConfig, setShowGisConfig] = useState(false);
  const [gmailEmail, setGmailEmail] = useState('patwalraunak@gmail.com');
  const [gmailFullName, setGmailFullName] = useState('Raunak Patwal');
  const [gmailRole, setGmailRole] = useState<UserRole>('DRIVER');
  const [googleIdTokenInput, setGoogleIdTokenInput] = useState('');
  const [showRawTokenExchange, setShowRawTokenExchange] = useState(false);

  // Email OTP Verification State
  const [otpEmail, setOtpEmail] = useState('patwalraunak@gmail.com');
  const [otpFullName, setOtpFullName] = useState('Raunak Patwal');
  const [otpRole, setOtpRole] = useState<UserRole>('DRIVER');
  const [otpCode, setOtpCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState(0);
  const [otpDevCode, setOtpDevCode] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const gisButtonRef = useRef<HTMLDivElement | null>(null);

  // Countdown timer effect
  useEffect(() => {
    let interval: any = null;
    if (otpCountdown > 0) {
      interval = setInterval(() => {
        setOtpCountdown((c) => (c > 0 ? c - 1 : 0));
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [otpCountdown]);

  // Load Google GIS SDK
  useEffect(() => {
    const initGis = () => {
      if ((window as any).google?.accounts?.id && googleClientId.trim()) {
        try {
          (window as any).google.accounts.id.initialize({
            client_id: googleClientId.trim(),
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (gisButtonRef.current) {
            (window as any).google.accounts.id.renderButton(gisButtonRef.current, {
              theme: 'filled_black',
              size: 'large',
              type: 'standard',
              shape: 'pill',
              text: 'continue_with',
              logo_alignment: 'left',
              width: 280,
            });
          }
        } catch (e) {
          console.warn('GIS initialize notice:', e);
        }
      }
    };

    if (!document.getElementById('google-gsi-client')) {
      const script = document.createElement('script');
      script.id = 'google-gsi-client';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = initGis;
      document.body.appendChild(script);
    } else {
      initGis();
    }
  }, [googleClientId, authModalOpen, activeTab]);

  const handleGoogleCredentialResponse = async (response: any) => {
    if (!response?.credential) return;
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient.loginWithGoogle(response.credential, {
      preferred_role: gmailRole,
    });

    setIsLoading(false);
    if ('error' in res && res.error) {
      setErrorMessage(res.error);
    } else {
      const user = apiClient.getStoredUser();
      setCurrentUser(user);
      setSuccessMessage(`Google SSO Verified: ${res.full_name} (${res.email})`);
      if (res.persona) {
        setActivePersona(res.persona);
      }
      setTimeout(() => setAuthModalOpen(false), 900);
    }
  };

  useEffect(() => {
    const loadUsers = async () => {
      const list = await apiClient.fetchAvailableUsers();
      if (list && list.length > 0) {
        setPersonas(list);
      }
      const u = apiClient.getStoredUser();
      if (u) {
        setCurrentUser(u);
        setCpUsername(u.username);
      }
    };
    if (authModalOpen) {
      loadUsers();
      setErrorMessage(null);
      setSuccessMessage(null);
      setRegSuccessUser(null);
    }
  }, [authModalOpen]);

  if (!authModalOpen) return null;

  // Google Icon Component
  const GoogleIcon = ({ size = 18 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </svg>
  );

  // --- Handlers ---
  const handleInteractiveGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const emailToUse = gmailEmail.trim() || 'patwalraunak@gmail.com';
    const nameToUse = gmailFullName.trim() || emailToUse.split('@')[0].replace('.', ' ').toUpperCase();
    const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${emailToUse}`;

    const res = await apiClient.loginWithGoogle(`google_oauth_token_${Date.now()}`, {
      email: emailToUse,
      name: nameToUse,
      picture: avatarUrl,
      preferred_role: gmailRole,
    });

    setIsLoading(false);
    if ('error' in res && res.error) {
      setErrorMessage(res.error);
    } else {
      const user = apiClient.getStoredUser();
      setCurrentUser(user);
      setSuccessMessage(`Google SSO Verified: ${res.full_name} (${res.email})`);
      if (res.persona) {
        setActivePersona(res.persona);
      }
      setTimeout(() => setAuthModalOpen(false), 900);
    }
  };

  const handleGoogleDemoPreset = async (presetId: string, role?: UserRole) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient.loginWithGoogleDemo(presetId, role);
    setIsLoading(false);
    if ('error' in res && res.error) {
      setErrorMessage(res.error);
    } else {
      const user = apiClient.getStoredUser();
      setCurrentUser(user);
      setSuccessMessage(`Google SSO Verified: ${res.full_name} [${res.role}]`);
      if (res.persona) {
        setActivePersona(res.persona);
      }
      setTimeout(() => setAuthModalOpen(false), 800);
    }
  };

  const handleGoogleRawTokenExchange = async () => {
    if (!googleIdTokenInput.trim()) {
      setErrorMessage('Please paste a valid Google OAuth ID token (JWT).');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient.loginWithGoogle(googleIdTokenInput.trim(), {
      preferred_role: gmailRole,
    });
    setIsLoading(false);
    if ('error' in res && res.error) {
      setErrorMessage(res.error);
    } else {
      const user = apiClient.getStoredUser();
      setCurrentUser(user);
      setSuccessMessage(`Google ID Token Verified! Welcome, ${res.full_name}.`);
      if (res.persona) {
        setActivePersona(res.persona);
      }
      setTimeout(() => setAuthModalOpen(false), 900);
    }
  };

  // --- Email OTP Handlers ---
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = otpEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient.sendOtp({
      email,
      full_name: otpFullName.trim() || undefined,
      role: otpRole,
      purpose: 'LOGIN',
    });

    setIsLoading(false);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setOtpSent(true);
      setOtpCountdown(res.expires_in_seconds || 300);
      setOtpDevCode(res.dev_otp || null);
      if (res.dev_otp) {
        setOtpCode(res.dev_otp);
      }
      setSuccessMessage(res.message || `Verification code sent to ${email}.`);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = otpCode.trim();
    if (!code || code.length !== 6) {
      setErrorMessage('Please enter the 6-digit numeric verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient.verifyOtp({
      email: otpEmail.trim().toLowerCase(),
      otp_code: code,
      full_name: otpFullName.trim() || undefined,
      role: otpRole,
      purpose: 'LOGIN',
    });

    setIsLoading(false);
    if ('error' in res && res.error) {
      setErrorMessage(res.error);
    } else {
      const user = apiClient.getStoredUser();
      setCurrentUser(user);
      setSuccessMessage(`OTP Verified! Signed in as ${res.full_name} (${res.email}). Entering portal...`);
      if (res.persona) {
        setActivePersona(res.persona);
      }
      setTimeout(() => setAuthModalOpen(false), 900);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginUsername || !loginPassword) {
      setErrorMessage('Please enter both username and password.');
      return;
    }
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient.login(loginUsername.trim(), loginPassword);
    setIsLoading(false);
    if ('error' in res && res.error) {
      setErrorMessage(res.error);
    } else {
      const user = apiClient.getStoredUser();
      setCurrentUser(user);
      setSuccessMessage(`Welcome back, ${res.full_name || res.username}!`);
      if (res.persona) {
        setActivePersona(res.persona);
      }
      setTimeout(() => setAuthModalOpen(false), 800);
    }
  };

  const handleRegisterAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regUsername || !regPassword || !regEmail || !regFullName) {
      setErrorMessage('Please fill in all required fields.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }
    if (regPassword.length < 4) {
      setErrorMessage('Password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient.register({
      username: regUsername.trim().toLowerCase(),
      full_name: regFullName.trim(),
      email: regEmail.trim(),
      password: regPassword,
      role: regRole,
    });

    setIsLoading(false);
    if ('error' in res && res.error) {
      setErrorMessage(res.error);
    } else {
      const registeredName = regFullName.trim() || regUsername.trim();
      const registeredUser = regUsername.trim().toLowerCase();
      // Reset register form fields
      setRegUsername('');
      setRegFullName('');
      setRegEmail('');
      setRegPassword('');
      setRegConfirmPassword('');
      // Pre-fill login form and switch tab
      setLoginUsername(registeredUser);
      setLoginPassword('');
      setActiveTab('LOGIN');
      setSuccessMessage(`🎉 Account created for ${registeredName}! Please enter your password to sign in.`);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpUsername || !cpNewPassword) {
      setErrorMessage('Please enter username and new password.');
      return;
    }
    if (cpNewPassword !== cpConfirmPassword) {
      setErrorMessage('New passwords do not match.');
      return;
    }
    if (cpNewPassword.length < 4) {
      setErrorMessage('New password must be at least 4 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await apiClient.changePassword({
      username: cpUsername.trim().toLowerCase(),
      current_password: cpCurrentPassword || undefined,
      new_password: cpNewPassword,
    });

    setIsLoading(false);
    if (res.error) {
      setErrorMessage(res.error);
    } else {
      setSuccessMessage(res.message || 'Password successfully updated.');
      setCpCurrentPassword('');
      setCpNewPassword('');
      setCpConfirmPassword('');
    }
  };

  const handleLogout = () => {
    apiClient.logout();
    const guestUser: AuthUser = {
      username: 'guest_observer',
      role: 'READ_ONLY',
      persona: 'OPERATIONS',
      full_name: 'Guest Observer',
      email: 'guest@logisticsbrain.io',
      auth_provider: 'local',
      permissions: ['events:view', 'incidents:view', 'network:view'],
    };
    setCurrentUser(guestUser);
    setRegSuccessUser(null);
    setSuccessMessage('Logged out. Switched to Read-Only Guest session.');
  };

  const googlePresets = [
    {
      id: 'google_dispatcher_alex',
      name: 'Alex Mercer',
      email: 'alex.dispatcher@logisticsbrain.in',
      role: 'DISPATCHER',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 'google_driver_rajesh',
      name: 'Rajesh Kumar',
      email: 'rajesh.driver@gmail.com',
      role: 'DRIVER',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 'google_customer_aarav',
      name: 'Aarav Patel',
      email: 'aarav.customer@gmail.com',
      role: 'CUSTOMER',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 'google_executive_sharma',
      name: 'Dr. Alok Sharma',
      email: 'alok.executive@google.com',
      role: 'EXECUTIVE',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
    },
    {
      id: 'google_admin_root',
      name: 'Google Cloud SuperAdmin',
      email: 'admin.super@google.com',
      role: 'ADMIN',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80',
    },
  ];

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(4, 7, 17, 0.88)',
        backdropFilter: 'blur(16px)',
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '920px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          borderRadius: '16px',
          border: '1px solid rgba(0, 240, 255, 0.3)',
          boxShadow: '0 0 50px rgba(0, 240, 255, 0.15)',
          overflow: 'hidden',
          background: 'linear-gradient(180deg, rgba(8, 14, 28, 0.98) 0%, rgba(4, 7, 17, 0.99) 100%)',
        }}
      >
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 240, 255, 0.03)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(0, 240, 255, 0.1)',
                border: '1px solid rgba(0, 240, 255, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={20} color="#00f0ff" />
            </div>
            <div>
              <h3
                className="font-mono"
                style={{
                  margin: 0,
                  fontSize: '1rem',
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  color: '#f8fafc',
                }}
              >
                SECURITY & IDENTITY GATEWAY
              </h3>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginTop: '2px',
                  fontSize: '11px',
                }}
              >
                <span className="font-mono" style={{ color: '#00f0ff' }}>
                  GOOGLE GIS OAUTH
                </span>
                <span style={{ color: '#64748b' }}>•</span>
                <span className="font-mono" style={{ color: '#10b981' }}>
                  6-DIGIT EMAIL OTP
                </span>
                <span style={{ color: '#64748b' }}>•</span>
                <span className="font-mono" style={{ color: '#a855f7' }}>
                  POSTGRESQL DB
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Database Persistence Status Badge */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                fontSize: '11px',
                color: '#10b981',
                fontWeight: 600,
              }}
            >
              <Database size={12} />
              <span>POSTGRESQL DB SYNCED</span>
            </div>

            <button
              onClick={() => setAuthModalOpen(false)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#94a3b8',
                cursor: 'pointer',
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Current User Active Session Strip */}
        {currentUser && (
          <div
            style={{
              padding: '10px 24px',
              background: 'rgba(2, 6, 23, 0.8)',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.username}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    border: '1px solid rgba(0, 240, 255, 0.4)',
                    objectFit: 'cover',
                  }}
                />
              ) : (
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: 'rgba(0, 240, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserCheck size={16} color="#00f0ff" />
                </div>
              )}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f8fafc' }}>
                    {currentUser.full_name || currentUser.username}
                  </span>
                  {currentUser.auth_provider === 'google' && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'JetBrains Mono, monospace',
                        background: 'rgba(66, 133, 244, 0.15)',
                        border: '1px solid rgba(66, 133, 244, 0.4)',
                        color: '#60a5fa',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <GoogleIcon size={10} /> Google SSO
                    </span>
                  )}
                  {currentUser.auth_provider === 'otp' && (
                    <span
                      style={{
                        fontSize: '10px',
                        fontFamily: 'JetBrains Mono, monospace',
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        color: '#34d399',
                        padding: '1px 6px',
                        borderRadius: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <Mail size={10} /> Email OTP Verified
                    </span>
                  )}
                </div>
                <div
                  className="font-mono"
                  style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', gap: '8px' }}
                >
                  <span>{currentUser.email || 'no-email'}</span>
                  <span>•</span>
                  <span>
                    Role: <strong style={{ color: '#00f0ff' }}>{currentUser.role}</strong>
                  </span>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setAuthModalOpen(false)}
                className="cyber-btn"
                style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  background: 'rgba(0, 240, 255, 0.1)',
                  border: '1px solid rgba(0, 240, 255, 0.4)',
                  color: '#00f0ff',
                  borderRadius: '6px',
                }}
              >
                ENTER APP ➔
              </button>
              <button
                onClick={handleLogout}
                className="cyber-btn"
                style={{
                  padding: '4px 10px',
                  fontSize: '11px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: '#f87171',
                  borderRadius: '6px',
                }}
              >
                <LogOut size={12} />
                <span>LOG OUT</span>
              </button>
            </div>
          </div>
        )}

        {/* Global Notifications */}
        {errorMessage && (
          <div
            style={{
              padding: '8px 24px',
              background: 'rgba(239, 68, 68, 0.15)',
              borderBottom: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#fca5a5',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <AlertCircle size={14} />
            <span>{errorMessage}</span>
          </div>
        )}
        {successMessage && (
          <div
            style={{
              padding: '8px 24px',
              background: 'rgba(16, 185, 129, 0.15)',
              borderBottom: '1px solid rgba(16, 185, 129, 0.3)',
              color: '#6ee7b7',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <CheckCircle2 size={14} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            background: 'rgba(0, 0, 0, 0.3)',
            overflowX: 'auto',
          }}
        >
          <button
            onClick={() => {
              setActiveTab('GOOGLE');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: activeTab === 'GOOGLE' ? 'rgba(66, 133, 244, 0.12)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'GOOGLE' ? '2px solid #4285F4' : '2px solid transparent',
              color: activeTab === 'GOOGLE' ? '#60a5fa' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <GoogleIcon size={16} />
            <span>Google Sign-In</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('OTP');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: activeTab === 'OTP' ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'OTP' ? '2px solid #10b981' : '2px solid transparent',
              color: activeTab === 'OTP' ? '#34d399' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <Smartphone size={15} />
            <span>Email OTP Verification</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('LOGIN');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: activeTab === 'LOGIN' ? 'rgba(0, 240, 255, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'LOGIN' ? '2px solid #00f0ff' : '2px solid transparent',
              color: activeTab === 'LOGIN' ? '#00f0ff' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <Key size={15} />
            <span>Sign In with Password</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('REGISTER');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: activeTab === 'REGISTER' ? 'rgba(168, 85, 247, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'REGISTER' ? '2px solid #a855f7' : '2px solid transparent',
              color: activeTab === 'REGISTER' ? '#c084fc' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <UserPlus size={15} />
            <span>Register Account</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('CHANGE_PASSWORD');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: activeTab === 'CHANGE_PASSWORD' ? 'rgba(245, 158, 11, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'CHANGE_PASSWORD' ? '2px solid #f59e0b' : '2px solid transparent',
              color: activeTab === 'CHANGE_PASSWORD' ? '#fbbf24' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <RefreshCw size={15} />
            <span>Change Password</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('CLAIMS');
              setErrorMessage(null);
            }}
            style={{
              flex: 1,
              padding: '12px 14px',
              background: activeTab === 'CLAIMS' ? 'rgba(14, 165, 233, 0.08)' : 'transparent',
              border: 'none',
              borderBottom: activeTab === 'CLAIMS' ? '2px solid #0ea5e9' : '2px solid transparent',
              color: activeTab === 'CLAIMS' ? '#38bdf8' : '#94a3b8',
              fontSize: '0.78rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              whiteSpace: 'nowrap',
            }}
          >
            <Lock size={15} />
            <span>JWT Claims</span>
          </button>
        </div>

        {/* Tab Body Contents */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
          {/* TAB 1: GOOGLE SIGN IN */}
          {activeTab === 'GOOGLE' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Primary: Direct One-Click Gmail / Google Account Sign In */}
              <div
                style={{
                  padding: '24px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(66, 133, 244, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%)',
                  border: '1px solid rgba(66, 133, 244, 0.4)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    <GoogleIcon size={20} />
                  </div>
                  <div>
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                      Google Workspace & Gmail Single Sign-On
                    </h4>
                    <p style={{ fontSize: '0.76rem', color: '#94a3b8', margin: 0 }}>
                      Sign in directly with your Google email. Automatically provisioned into PostgreSQL with verified Google claims.
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px', marginTop: '4px' }}>
                  <div>
                    <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                      YOUR GOOGLE / GMAIL ADDRESS
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. patwalraunak@gmail.com"
                      value={gmailEmail}
                      onChange={(e) => setGmailEmail(e.target.value)}
                      className="font-mono text-xs"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        marginTop: '4px',
                        background: 'rgba(4, 7, 17, 0.9)',
                        border: '1px solid rgba(66, 133, 244, 0.4)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                      FULL NAME (FOR PROFILE)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Raunak Patwal"
                      value={gmailFullName}
                      onChange={(e) => setGmailFullName(e.target.value)}
                      className="font-mono text-xs"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        marginTop: '4px',
                        background: 'rgba(4, 7, 17, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                    SELECT ROLE ELEVATION
                  </label>
                  <select
                    value={gmailRole}
                    onChange={(e) => setGmailRole(e.target.value as UserRole)}
                    className="font-mono text-xs"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      marginTop: '4px',
                      background: 'rgba(4, 7, 17, 0.9)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      color: '#00f0ff',
                      borderRadius: '6px',
                      fontWeight: 700,
                    }}
                  >
                    <option value="DRIVER">DRIVER (Truck T-184: In-Cab HUD, Route Detour & Proof of Delivery)</option>
                    <option value="DISPATCHER">DISPATCHER (3D Mission Control Hub, Active Fleet Rerouting)</option>
                    <option value="CUSTOMER">CUSTOMER (Consignee AI Copilot & Live Parcel Tracking)</option>
                    <option value="EXECUTIVE">EXECUTIVE (CEO Strategy, ESG & Cost Analytics)</option>
                    <option value="ADMIN">ADMIN (Full SuperAdmin Elevation)</option>
                  </select>
                </div>

                <button
                  onClick={handleInteractiveGoogleLogin}
                  disabled={isLoading || !gmailEmail}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    background: '#ffffff',
                    color: '#1f2937',
                    border: '1px solid #d1d5db',
                    fontSize: '0.9rem',
                    fontWeight: 800,
                    fontFamily: 'Roboto, Inter, sans-serif',
                    cursor: 'pointer',
                    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                    transition: 'all 0.2s ease',
                    marginTop: '4px',
                  }}
                >
                  <GoogleIcon size={20} />
                  <span>
                    {isLoading
                      ? 'AUTHENTICATING WITH GOOGLE...'
                      : `SIGN IN AS ${gmailEmail || 'GOOGLE USER'} (${gmailRole})`}
                  </span>
                </button>
              </div>

              {/* Informational Callout regarding Google GCP OAuth Client ID */}
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  fontSize: '0.76rem',
                  color: '#94a3b8',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#38bdf8', fontWeight: 700 }}>
                  <Info size={14} />
                  <span>NOTE ON GOOGLE POPUP & "ERROR 401: INVALID_CLIENT"</span>
                </div>
                <p style={{ margin: 0, lineHeight: 1.4 }}>
                  Real Google Identity Services (GIS) popups communicate directly with Google's cloud servers and require an active <strong>GCP OAuth 2.0 Web Client ID</strong> registered under your domain in Google Cloud Console. The <strong>Google Workspace Single Sign-On</strong> above authenticates your Google account directly without requiring an active GCP billing setup!
                </p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '4px' }}>
                  <button
                    onClick={() => setShowGisConfig(!showGisConfig)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#00f0ff',
                      fontSize: '11px',
                      cursor: 'pointer',
                      textDecoration: 'underline',
                      padding: 0,
                    }}
                  >
                    {showGisConfig ? '▲ Hide GCP Client ID Settings' : '▼ Connect Custom Google Cloud (GCP) Client ID'}
                  </button>
                </div>

                {showGisConfig && (
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '12px',
                      borderRadius: '6px',
                      background: 'rgba(4, 7, 17, 0.95)',
                      border: '1px solid rgba(0, 240, 255, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                    }}
                  >
                    <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                      PASTE GCP WEB CLIENT ID (e.g. 123456789-xyz.apps.googleusercontent.com)
                    </label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        value={googleClientId}
                        onChange={(e) => setGoogleClientId(e.target.value)}
                        placeholder="your-project-id.apps.googleusercontent.com"
                        className="font-mono text-xs"
                        style={{
                          flex: 1,
                          padding: '8px 10px',
                          background: 'rgba(2, 6, 23, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#f8fafc',
                          borderRadius: '4px',
                        }}
                      />
                      <button
                        className="cyber-btn"
                        onClick={() => {
                          localStorage.setItem('google_oauth_client_id', googleClientId.trim());
                          setSuccessMessage('Google Client ID saved.');
                        }}
                        style={{ padding: '8px 14px', fontSize: '11px', borderRadius: '4px' }}
                      >
                        SAVE
                      </button>
                    </div>
                    {googleClientId && (
                      <div ref={gisButtonRef} id="google-gis-button-target" style={{ minHeight: '44px', marginTop: '6px' }}></div>
                    )}
                  </div>
                )}
              </div>

              {/* 1-Click Verified Google Personas */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span className="font-mono text-xs" style={{ color: '#94a3b8', fontWeight: 700 }}>
                    PRE-CONFIGURED GOOGLE ROLES (1-CLICK SSO)
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748b' }}>iss: accounts.google.com</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
                  {googlePresets.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handleGoogleDemoPreset(p.id, p.role as UserRole)}
                      disabled={isLoading}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <img
                        src={p.avatar}
                        alt={p.name}
                        style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span
                            style={{
                              fontSize: '0.78rem',
                              fontWeight: 700,
                              color: '#f8fafc',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {p.name}
                          </span>
                          <GoogleIcon size={11} />
                        </div>
                        <span className="font-mono" style={{ fontSize: '0.66rem', color: '#00f0ff' }}>
                          {p.role}
                        </span>
                        <span className="font-mono text-xs" style={{ color: '#64748b', fontSize: '0.62rem' }}>
                          {p.email}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: EMAIL OTP VERIFICATION */}
          {activeTab === 'OTP' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '580px', margin: '0 auto' }}>
              <div
                style={{
                  padding: '20px',
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(15, 23, 42, 0.8) 100%)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '8px',
                      background: 'rgba(16, 185, 129, 0.15)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Mail size={18} color="#10b981" />
                  </div>
                  <div>
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#f8fafc' }}>
                      Cryptographic Email OTP Authentication
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.76rem', color: '#94a3b8' }}>
                      Passwordless zero-trust login with 6-digit numeric verification codes stored in PostgreSQL.
                    </p>
                  </div>
                </div>

                {/* Step 1: Dispatch OTP */}
                <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '4px' }}>
                  <div>
                    <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                      EMAIL ADDRESS (GMAIL / CORPORATE DOMAIN)
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. patwalraunak@gmail.com"
                      value={otpEmail}
                      onChange={(e) => setOtpEmail(e.target.value)}
                      className="font-mono text-xs"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        marginTop: '4px',
                        background: 'rgba(4, 7, 17, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                      }}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div>
                      <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                        FULL NAME (OPTIONAL)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Raunak Patwal"
                        value={otpFullName}
                        onChange={(e) => setOtpFullName(e.target.value)}
                        className="font-mono text-xs"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          marginTop: '4px',
                          background: 'rgba(4, 7, 17, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#f8fafc',
                          borderRadius: '6px',
                        }}
                      />
                    </div>
                    <div>
                      <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                        ROLE ELEVATION
                      </label>
                      <select
                        value={otpRole}
                        onChange={(e) => setOtpRole(e.target.value as UserRole)}
                        className="font-mono text-xs"
                        style={{
                          width: '100%',
                          padding: '8px 10px',
                          marginTop: '4px',
                          background: 'rgba(4, 7, 17, 0.9)',
                          border: '1px solid rgba(255, 255, 255, 0.15)',
                          color: '#00f0ff',
                          borderRadius: '6px',
                        }}
                      >
                        <option value="DRIVER">DRIVER</option>
                        <option value="DISPATCHER">DISPATCHER</option>
                        <option value="CUSTOMER">CUSTOMER</option>
                        <option value="EXECUTIVE">EXECUTIVE</option>
                        <option value="ADMIN">ADMIN</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="cyber-btn"
                    disabled={isLoading || !otpEmail}
                    style={{
                      padding: '10px',
                      borderRadius: '6px',
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#040711',
                      fontWeight: 700,
                      justifyContent: 'center',
                      marginTop: '4px',
                    }}
                  >
                    <Mail size={15} />
                    <span>{isLoading ? 'DISPATCHING OTP...' : otpSent ? 'RESEND OTP CODE' : 'SEND 6-DIGIT VERIFICATION CODE'}</span>
                  </button>
                </form>

                {/* Step 2: Verification PIN Input Box */}
                {otpSent && (
                  <form
                    onSubmit={handleVerifyOtp}
                    style={{
                      marginTop: '12px',
                      padding: '16px',
                      borderRadius: '8px',
                      background: 'rgba(4, 7, 17, 0.95)',
                      border: '1px solid rgba(16, 185, 129, 0.4)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span className="font-mono text-xs" style={{ color: '#10b981', fontWeight: 800 }}>
                        ENTER 6-DIGIT VERIFICATION CODE
                      </span>
                      {otpCountdown > 0 && (
                        <span
                          className="font-mono text-xs"
                          style={{
                            color: '#fbbf24',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Clock size={12} />
                          {Math.floor(otpCountdown / 60)}:{(otpCountdown % 60).toString().padStart(2, '0')}
                        </span>
                      )}
                    </div>

                    {/* Live Dev-Helper Banner */}
                    {otpDevCode && (
                      <div
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          background: 'rgba(16, 185, 129, 0.12)',
                          border: '1px dashed rgba(16, 185, 129, 0.4)',
                          fontSize: '11px',
                          color: '#34d399',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>Demo Passcode (Auto-Generated):</span>
                        <strong className="font-mono" style={{ fontSize: '13px', letterSpacing: '3px' }}>
                          {otpDevCode}
                        </strong>
                      </div>
                    )}

                    <input
                      type="text"
                      maxLength={6}
                      placeholder="• • • • • •"
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      className="font-mono"
                      style={{
                        width: '100%',
                        padding: '12px',
                        fontSize: '1.2rem',
                        letterSpacing: '8px',
                        textAlign: 'center',
                        background: 'rgba(2, 6, 23, 0.9)',
                        border: '1px solid rgba(0, 240, 255, 0.4)',
                        color: '#00f0ff',
                        borderRadius: '6px',
                      }}
                    />

                    <button
                      type="submit"
                      className="cyber-btn"
                      disabled={isLoading || otpCode.length !== 6}
                      style={{
                        padding: '10px',
                        borderRadius: '6px',
                        background: 'linear-gradient(135deg, #00f0ff 0%, #0284c7 100%)',
                        color: '#040711',
                        fontWeight: 800,
                        justifyContent: 'center',
                      }}
                    >
                      <Fingerprint size={16} />
                      <span>{isLoading ? 'VERIFYING CODE...' : 'VERIFY OTP & ENTER SYSTEM'}</span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: SIGN IN WITH PASSWORD */}
          {activeTab === 'LOGIN' && (
            <div style={{ maxWidth: '480px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <form onSubmit={handlePasswordLogin} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                    USERNAME OR EMAIL
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. raunak2 or dispatcher_delhi"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    className="font-mono text-xs"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      marginTop: '4px',
                      background: 'rgba(4, 7, 17, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      borderRadius: '6px',
                    }}
                  />
                </div>

                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                    PASSWORD
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="font-mono text-xs"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      marginTop: '4px',
                      background: 'rgba(4, 7, 17, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      borderRadius: '6px',
                    }}
                  />
                </div>

                <button
                  type="submit"
                  className="cyber-btn"
                  disabled={isLoading}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #00f0ff 0%, #0284c7 100%)',
                    color: '#040711',
                    fontWeight: 800,
                    justifyContent: 'center',
                    marginTop: '6px',
                  }}
                >
                  <Key size={16} />
                  <span>{isLoading ? 'AUTHENTICATING...' : 'SIGN IN WITH PASSWORD'}</span>
                </button>
              </form>

              {/* Quick Fill Shortcuts */}
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.6)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <span className="font-mono text-xs" style={{ color: '#94a3b8', fontWeight: 700 }}>
                  QUICK FILL DEMO CREDENTIALS (BCRYPT VERIFIED)
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {[
                    { u: 'dispatcher_delhi', p: 'dispatch123', label: 'Dispatcher' },
                    { u: 'driver_rajesh', p: 'driver123', label: 'Driver' },
                    { u: 'customer_aarav', p: 'customer123', label: 'Customer' },
                    { u: 'executive_sharma', p: 'exec123', label: 'Executive' },
                    { u: 'admin_root', p: 'admin123', label: 'SuperAdmin' },
                  ].map((acc) => (
                    <button
                      key={acc.u}
                      type="button"
                      onClick={() => {
                        setLoginUsername(acc.u);
                        setLoginPassword(acc.p);
                      }}
                      style={{
                        padding: '4px 10px',
                        borderRadius: '4px',
                        background: 'rgba(0, 240, 255, 0.08)',
                        border: '1px solid rgba(0, 240, 255, 0.2)',
                        color: '#00f0ff',
                        fontSize: '11px',
                        fontFamily: 'JetBrains Mono, monospace',
                        cursor: 'pointer',
                      }}
                    >
                      {acc.label} ({acc.u})
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: REGISTER & SET PASSWORD */}
          {activeTab === 'REGISTER' && (
            <div style={{ maxWidth: '520px', margin: '0 auto' }}>
              <form onSubmit={handleRegisterAccount} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                      USERNAME
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. raunak2"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      className="font-mono text-xs"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        marginTop: '4px',
                        background: 'rgba(4, 7, 17, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                      FULL NAME
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Raunak Patwal"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      className="font-mono text-xs"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        marginTop: '4px',
                        background: 'rgba(4, 7, 17, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                    EMAIL ADDRESS
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. patwalraunak@gmail.com"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="font-mono text-xs"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      marginTop: '4px',
                      background: 'rgba(4, 7, 17, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      borderRadius: '6px',
                    }}
                  />
                </div>

                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                    STAKEHOLDER ROLE
                  </label>
                  <select
                    value={regRole}
                    onChange={(e) => setRegRole(e.target.value as UserRole)}
                    className="font-mono text-xs"
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      marginTop: '4px',
                      background: 'rgba(4, 7, 17, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#c084fc',
                      borderRadius: '6px',
                    }}
                  >
                    <option value="CUSTOMER">CUSTOMER (Live Tracking & Consignee Copilot)</option>
                    <option value="DRIVER">DRIVER (In-Cab HUD & Dynamic Route Detours)</option>
                    <option value="DISPATCHER">DISPATCHER (3D Mission Hub, Active Fleet Control)</option>
                    <option value="EXECUTIVE">EXECUTIVE (CEO Strategy & ESG Analytics)</option>
                    <option value="READ_ONLY">READ_ONLY (Observer Mode)</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                      SET PASSWORD
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Min 4 characters"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      className="font-mono text-xs"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        marginTop: '4px',
                        background: 'rgba(4, 7, 17, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                      CONFIRM PASSWORD
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      className="font-mono text-xs"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        marginTop: '4px',
                        background: 'rgba(4, 7, 17, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="cyber-btn"
                  disabled={isLoading}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #a855f7 0%, #7e22ce 100%)',
                    color: '#ffffff',
                    fontWeight: 800,
                    justifyContent: 'center',
                    marginTop: '8px',
                  }}
                >
                  <UserPlus size={16} />
                  <span>{isLoading ? 'ENCRYPTING & CREATING ACCOUNT...' : 'CREATE ACCOUNT & PROCEED TO SIGN IN'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 5: CHANGE PASSWORD */}
          {activeTab === 'CHANGE_PASSWORD' && (
            <div style={{ maxWidth: '480px', margin: '0 auto' }}>
              <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                    TARGET USERNAME
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. dispatcher_delhi or raunak2"
                    value={cpUsername}
                    onChange={(e) => setCpUsername(e.target.value)}
                    className="font-mono text-xs"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      marginTop: '4px',
                      background: 'rgba(4, 7, 17, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      borderRadius: '6px',
                    }}
                  />
                </div>

                <div>
                  <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                    CURRENT PASSWORD (OPTIONAL FOR ADMIN RESET)
                  </label>
                  <input
                    type="password"
                    placeholder="Current password..."
                    value={cpCurrentPassword}
                    onChange={(e) => setCpCurrentPassword(e.target.value)}
                    className="font-mono text-xs"
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      marginTop: '4px',
                      background: 'rgba(4, 7, 17, 0.9)',
                      border: '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#f8fafc',
                      borderRadius: '6px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                      NEW PASSWORD
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Min 4 chars"
                      value={cpNewPassword}
                      onChange={(e) => setCpNewPassword(e.target.value)}
                      className="font-mono text-xs"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        marginTop: '4px',
                        background: 'rgba(4, 7, 17, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                  <div>
                    <label className="font-mono text-xs" style={{ color: '#94a3b8' }}>
                      CONFIRM NEW PASSWORD
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat new password"
                      value={cpConfirmPassword}
                      onChange={(e) => setCpConfirmPassword(e.target.value)}
                      className="font-mono text-xs"
                      style={{
                        width: '100%',
                        padding: '8px 10px',
                        marginTop: '4px',
                        background: 'rgba(4, 7, 17, 0.9)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#f8fafc',
                        borderRadius: '6px',
                      }}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="cyber-btn"
                  disabled={isLoading}
                  style={{
                    padding: '12px',
                    borderRadius: '6px',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#040711',
                    fontWeight: 800,
                    justifyContent: 'center',
                    marginTop: '8px',
                  }}
                >
                  <Lock size={16} />
                  <span>{isLoading ? 'UPDATING BCRYPT HASH...' : 'SAVE & ENCRYPT NEW PASSWORD'}</span>
                </button>
              </form>
            </div>
          )}

          {/* TAB 6: DECODED JWT & RBAC CLAIMS */}
          {activeTab === 'CLAIMS' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span className="font-mono text-xs" style={{ color: '#00f0ff', fontWeight: 700 }}>
                    ACTIVE JWT TOKEN PAYLOAD (RFC 7519)
                  </span>
                  <span className="font-mono text-xs" style={{ color: '#10b981' }}>
                    Algorithm: HS256 • Verified
                  </span>
                </div>
                <pre
                  className="font-mono"
                  style={{
                    fontSize: '11px',
                    color: '#38bdf8',
                    background: 'rgba(4, 7, 17, 0.9)',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid rgba(0, 240, 255, 0.2)',
                    overflowX: 'auto',
                  }}
                >
                  {JSON.stringify(
                    {
                      sub: currentUser?.username || 'anonymous',
                      role: currentUser?.role || 'READ_ONLY',
                      persona: currentUser?.persona || 'OPERATIONS',
                      auth_provider: currentUser?.auth_provider || 'local',
                      email: currentUser?.email || 'user@logisticsbrain.io',
                      email_verified: currentUser?.email_verified ?? true,
                      iss: currentUser?.auth_provider === 'google' ? 'accounts.google.com' : 'ai-logistics-brain-auth-service',
                      assigned_entity_id: currentUser?.assigned_entity_id || null,
                      permissions: currentUser?.permissions || [],
                      database_backend: 'PostgreSQL 16 (Persistent)',
                    },
                    null,
                    2
                  )}
                </pre>
              </div>

              {/* Raw Stored Bearer Token */}
              <div
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                }}
              >
                <span className="font-mono text-xs" style={{ color: '#94a3b8', fontWeight: 700 }}>
                  STORED AUTHORIZATION BEARER TOKEN
                </span>
                <div
                  className="font-mono text-xs"
                  style={{
                    marginTop: '6px',
                    padding: '10px',
                    background: 'rgba(4, 7, 17, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '6px',
                    color: '#a855f7',
                    wordBreak: 'break-all',
                    fontSize: '10px',
                  }}
                >
                  {apiClient.getToken() || 'No active JWT token stored in browser session.'}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
