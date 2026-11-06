import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { ROUTES } from '../../app/routes';
import { ArrowRight } from 'lucide-react';

export function RegisterPage() {
  const { register } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Enter a valid email address';
    }
    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setServerError(null);
    setIsLoading(true);

    try {
      await register({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
      });
    } catch (err) {
      setServerError(err.message || 'Registration failed. Please check your information.');
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
          Create your Account
        </h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--space-1)' }}>
          Get started with OrgIntel Document Intelligence
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
          label="Full Name"
          type="text"
          name="fullName"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="Jane Doe"
          error={errors.fullName}
          required
          autoFocus
        />

        <Input
          label="Work Email"
          type="email"
          name="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="jane@company.com"
          error={errors.email}
          required
          autoComplete="email"
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Minimum 8 characters"
          error={errors.password}
          hint="Must be between 8 and 100 characters"
          required
          autoComplete="new-password"
        />

        <Button
          type="submit"
          variant="primary"
          isLoading={isLoading}
          style={{ width: '100%', marginTop: 'var(--space-3)' }}
          icon={ArrowRight}
        >
          Register & Continue
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
        Already have an account?{' '}
        <Link to={ROUTES.LOGIN} style={{ fontWeight: 600 }}>
          Sign in
        </Link>
      </div>
    </div>
  );
}
