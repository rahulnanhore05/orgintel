import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ROUTES } from '../../app/routes';
import { ArrowRight } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(trimmedEmail)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setServerError(null);
    setIsLoading(true);

    try {
      await login({ email: trimmedEmail, password });
    } catch (err) {
      setServerError(err.message || 'Authentication failed. Please verify your credentials.');
      if (err.validationErrors) {
        setErrors(err.validationErrors);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 'var(--space-8)' }}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Sign in to OrgIntel
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
          Enterprise Document Intelligence & Grounded Search
        </p>
      </div>

      {serverError && (
        <div
          style={{
            padding: 'var(--space-3)',
            backgroundColor: 'var(--status-danger-bg)',
            border: '1px solid var(--status-danger-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--status-danger-text)',
            fontSize: 'var(--text-xs)',
            marginBottom: 'var(--space-4)',
          }}
          role="alert"
        >
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <Input
          label="Email Address"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="name@company.com"
          error={errors.email}
          required
          autoComplete="email"
          autoFocus
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          error={errors.password}
          required
          autoComplete="current-password"
        />

        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          style={{ width: '100%', marginTop: 'var(--space-3)' }}
          icon={ArrowRight}
        >
          Sign In
        </Button>
      </form>

      <div
        style={{
          marginTop: 'var(--space-6)',
          paddingTop: 'var(--space-4)',
          borderTop: '1px solid var(--border-light)',
          textAlign: 'center',
          fontSize: 'var(--text-xs)',
          color: 'var(--text-muted)',
        }}
      >
        Don&apos;t have an account?{' '}
        <Link to={ROUTES.REGISTER} style={{ fontWeight: 600 }}>
          Create account
        </Link>
      </div>
    </div>
  );
}
