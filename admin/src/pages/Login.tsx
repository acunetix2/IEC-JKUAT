import { useEffect, useState, type FormEvent } from 'react';
import { FiArrowRight, FiLock } from 'react-icons/fi';
import { sileo } from 'sileo';
import { validateEmail } from '../../../web/src/lib/validation';
import { getSupabase } from '../lib/supabase';

const assetUrl = (path: string) => `${import.meta.env.DEV ? import.meta.env.BASE_URL : '/'}${path}`;
type LoginField = 'email' | 'password' | 'confirmPassword' | 'bootstrapSecret';
type LoginValues = Record<LoginField, string>;
type FieldErrors = Partial<Record<LoginField, string>>;

const FIELD_IDS: Record<LoginField, string> = {
  email: 'admin-email',
  password: 'admin-password',
  confirmPassword: 'admin-password-confirm',
  bootstrapSecret: 'admin-bootstrap-secret',
};

function validateField(field: LoginField, values: LoginValues, mode: 'signin' | 'bootstrap') {
  if (field === 'email') return validateEmail(values.email);
  if (field === 'password') {
    if (!values.password) return 'Password is required.';
    if (mode === 'bootstrap' && values.password.length < 12) return 'Use at least 12 characters.';
    if (values.password.length > 128) return 'Password must be 128 characters or fewer.';
  }
  if (field === 'confirmPassword' && mode === 'bootstrap') {
    if (!values.confirmPassword) return 'Confirm your password.';
    if (values.confirmPassword !== values.password) return 'The passwords do not match.';
  }
  if (field === 'bootstrapSecret' && mode === 'bootstrap') {
    if (!values.bootstrapSecret.trim()) return 'Enter the one-time setup code.';
    if (values.bootstrapSecret.length < 32) return 'The setup code must be at least 32 characters.';
  }
  return undefined;
}

function validateForm(values: LoginValues, mode: 'signin' | 'bootstrap'): FieldErrors {
  const fields: LoginField[] = mode === 'bootstrap'
    ? ['email', 'password', 'confirmPassword', 'bootstrapSecret']
    : ['email', 'password'];
  const errors: FieldErrors = {};
  for (const field of fields) {
    const message = validateField(field, values, mode);
    if (message) errors[field] = message;
  }
  return errors;
}

async function functionErrorMessage(
  error: { message?: string; context?: unknown },
  fallback: string,
): Promise<string> {
  if (error.context instanceof Response) {
    try {
      const body = await error.context.clone().json() as { error?: unknown };
      if (typeof body.error === 'string' && body.error.trim()) return body.error;
    } catch {
      // Use the SDK message when the function response is not JSON.
    }
  }
  return error.message || fallback;
}

export default function Login({ error, onError }: { error: string; onError: (message: string) => void }) {
  const [mode, setMode] = useState<'signin' | 'bootstrap'>('signin');
  const [values, setValues] = useState<LoginValues>({
    email: '',
    password: '',
    confirmPassword: '',
    bootstrapSecret: '',
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Partial<Record<LoginField, boolean>>>({});
  const [setupAvailable, setSetupAvailable] = useState(false);
  const [setupCheckError, setSetupCheckError] = useState('');
  const [busy, setBusy] = useState(false);
  const showSetupToggle = import.meta.env.DEV && setupAvailable;

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const { data, error: statusError } = await getSupabase().functions.invoke<{
          data?: { available?: boolean };
        }>('bootstrap-admin', { body: { action: 'status' } });
        if (statusError) {
          throw new Error(await functionErrorMessage(statusError, 'Could not check first-admin setup.'));
        }
        const available = data?.data?.available;
        if (typeof available !== 'boolean') {
          throw new Error('Could not determine first-admin setup status.');
        }
        if (!cancelled) {
          setSetupAvailable(Boolean(import.meta.env.DEV || available));
          if (!import.meta.env.DEV && !available) {
            setSetupCheckError('The limit of three bootstrap administrators has been reached.');
          }
        }
      } catch (statusLoadError) {
        if (!cancelled) {
          setSetupAvailable(import.meta.env.DEV);
          setSetupCheckError(import.meta.env.DEV
            ? 'Local dev mode: the bootstrap check was unavailable, but first-admin setup is still enabled.'
            : (statusLoadError instanceof Error ? statusLoadError.message : 'First-admin setup status could not be checked.'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  function updateField(field: LoginField, value: string) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);

    const fieldsToValidate: LoginField[] = [];
    if (touched[field]) fieldsToValidate.push(field);
    if (field === 'password' && mode === 'bootstrap' && touched.confirmPassword) {
      fieldsToValidate.push('confirmPassword');
    }
    if (fieldsToValidate.length) {
      setFieldErrors((current) => {
        const nextErrors = { ...current };
        for (const fieldToValidate of fieldsToValidate) {
          const message = validateField(fieldToValidate, nextValues, mode);
          if (message) nextErrors[fieldToValidate] = message;
          else delete nextErrors[fieldToValidate];
        }
        return nextErrors;
      });
    }
  }

  function blurField(field: LoginField) {
    setTouched((current) => ({ ...current, [field]: true }));
    const message = validateField(field, values, mode);
    setFieldErrors((current) => {
      const nextErrors = { ...current };
      if (message) nextErrors[field] = message;
      else delete nextErrors[field];
      return nextErrors;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateForm(values, mode);
    setFieldErrors(errors);
    setTouched({
      email: true,
      password: true,
      confirmPassword: mode === 'bootstrap',
      bootstrapSecret: mode === 'bootstrap',
    });
    const firstInvalid = (mode === 'bootstrap'
      ? ['email', 'password', 'confirmPassword', 'bootstrapSecret'] as const
      : ['email', 'password'] as const
    ).find((field) => errors[field]);
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }

    onError('');
    setBusy(true);
    try {
      const client = getSupabase();
      if (mode === 'bootstrap') {
        const { error: bootstrapError } = await client.functions.invoke('bootstrap-admin', {
          body: {
            action: 'bootstrap',
            email: values.email.trim(),
            password: values.password,
            bootstrapSecret: values.bootstrapSecret,
          },
        });
        if (bootstrapError) {
          throw new Error(await functionErrorMessage(bootstrapError, 'First-admin setup failed.'));
        }

        setSetupAvailable(false);
        const { error: signInError } = await client.auth.signInWithPassword({
          email: values.email.trim(),
          password: values.password,
        });
        if (signInError) {
          setMode('signin');
          throw new Error('Super Admin account created, but automatic sign-in failed. Sign in with the new account.');
        }
        sileo.success({
          title: 'Super Admin ready',
          description: 'The Super Admin account has been activated.',
          duration: 3200,
        });
      } else {
        const { error: signInError } = await client.auth.signInWithPassword({
          email: values.email.trim(),
          password: values.password,
        });
        if (signInError) {
          sileo.error({
            title: 'Sign-in failed',
            description: 'Email or password is incorrect.',
          });
          throw new Error('Email or password is incorrect.');
        }
        sileo.success({
          title: 'Welcome back',
          description: 'You are now signed in to the IEC admin portal.',
          duration: 2600,
        });
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Sign-in failed.';
      onError(message);
      sileo.error({
        title: mode === 'bootstrap' ? 'Setup failed' : 'Sign-in failed',
        description: message,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-screen">
      <section className="login-panel">
        <a href="/" className="login-brand">
          <img src={assetUrl('uploads/iec-mark.png')} alt="" />
          <span><strong>IEC JKUAT</strong><small>Administration</small></span>
        </a>
        <div className="login-panel-content">
          <header className="login-heading">
            <h1>{mode === 'bootstrap' ? 'Set up admin.' : 'Welcome back.'}</h1>
            <p>{mode === 'bootstrap' ? 'Create a Super Admin account. Bootstrap setup allows up to three accounts.' : 'Sign in to pick up where you left off.'}</p>
          </header>
          <form className="login-card" noValidate onSubmit={submit} aria-busy={busy}>
            {error && <div className="login-error" role="alert">{error}</div>}
            <label htmlFor="admin-email">Email address</label>
            <input
              id="admin-email"
              autoComplete="username"
              type="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={(event) => updateField('email', event.target.value)}
              onBlur={() => blurField('email')}
              aria-invalid={Boolean(fieldErrors.email)}
              aria-describedby={fieldErrors.email ? 'admin-email-error' : undefined}
              maxLength={254}
              required
            />
            {fieldErrors.email && <span className="login-field-error" id="admin-email-error">{fieldErrors.email}</span>}
            <label htmlFor="admin-password">{mode === 'bootstrap' ? 'Create password' : 'Password'}</label>
            <div className={`login-password-field${fieldErrors.password ? ' has-error' : ''}`}>
              <FiLock aria-hidden="true" />
              <input
                id="admin-password"
                autoComplete={mode === 'bootstrap' ? 'new-password' : 'current-password'}
                type="password"
                placeholder={mode === 'bootstrap' ? 'At least 12 characters' : 'Your password'}
                value={values.password}
                onChange={(event) => updateField('password', event.target.value)}
                onBlur={() => blurField('password')}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'admin-password-error' : undefined}
                minLength={mode === 'bootstrap' ? 12 : undefined}
                maxLength={128}
                required
              />
            </div>
            {fieldErrors.password && <span className="login-field-error" id="admin-password-error">{fieldErrors.password}</span>}
            {mode === 'bootstrap' && <>
              <label htmlFor="admin-password-confirm">Confirm password</label>
              <input
                id="admin-password-confirm"
                autoComplete="new-password"
                type="password"
                placeholder="Enter the password again"
                value={values.confirmPassword}
                onChange={(event) => updateField('confirmPassword', event.target.value)}
                onBlur={() => blurField('confirmPassword')}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? 'admin-password-confirm-error' : undefined}
                minLength={12}
                maxLength={128}
                required
              />
              {fieldErrors.confirmPassword && <span className="login-field-error" id="admin-password-confirm-error">{fieldErrors.confirmPassword}</span>}
              <label htmlFor="admin-bootstrap-secret">One-time setup code</label>
              <input
                id="admin-bootstrap-secret"
                autoComplete="off"
                type="password"
                placeholder="Enter the private setup code"
                value={values.bootstrapSecret}
                onChange={(event) => updateField('bootstrapSecret', event.target.value)}
                onBlur={() => blurField('bootstrapSecret')}
                aria-invalid={Boolean(fieldErrors.bootstrapSecret)}
                aria-describedby={fieldErrors.bootstrapSecret ? 'admin-bootstrap-secret-error' : undefined}
                maxLength={256}
                required
              />
              {fieldErrors.bootstrapSecret && <span className="login-field-error" id="admin-bootstrap-secret-error">{fieldErrors.bootstrapSecret}</span>}
              <p className="login-setup-note">Bootstrap setup closes after three administrator accounts are created.</p>
            </>}
            <button type="submit" className="button-primary login-submit" disabled={busy} aria-busy={busy}>
              {busy && <span className="login-spinner" aria-hidden="true" />}
              <span>{busy ? (mode === 'bootstrap' ? 'Creating account…' : 'Signing in…') : (mode === 'bootstrap' ? 'Create Super Admin' : 'Sign in')}</span>
              {!busy && <FiArrowRight aria-hidden="true" />}
            </button>
            {mode === 'signin' && showSetupToggle && <button
              type="button"
              className="login-mode-switch"
              onClick={() => {
                onError('');
                setFieldErrors({});
                setTouched({});
                setMode('bootstrap');
              }}
            >Set up an administrator</button>}
            {mode === 'signin' && setupCheckError && <p className="login-setup-status" role="status">{setupCheckError}</p>}
            {mode === 'bootstrap' && <button
              type="button"
              className="login-mode-switch"
              onClick={() => {
                onError('');
                setFieldErrors({});
                setTouched({});
                setMode('signin');
              }}
            >Back to sign in</button>}
            <a className="login-public-link" href="/">Back to the IEC website</a>
          </form>
          <p className="login-session-note">
            <FiLock aria-hidden="true" />
            {mode === 'bootstrap'
              ? 'The setup code is required. Never share it; the server will reject setup after three Super Admin accounts are added.'
              : 'Use your IEC administrator account and sign out when you’re finished.'}
          </p>
        </div>
      </section>
      <aside className="login-side" aria-label="IEC administration">
        <img className="login-side-image" src={assetUrl('uploads/iec-08.jpg')} alt="IEC members collaborating on a project" />
        <div className="login-side-shade" />
        <div className="login-message">
          <p className="eyebrow">IEC JKUAT / Administration</p>
          <h2>Ideas are everywhere.<br /><span>Let’s build them.</span></h2>
          <p>One place to keep club projects, people and events moving forward.</p>
        </div>
        <div className="login-side-foot">
          <div><strong>Just for your team</strong><span>Sign in with your IEC administrator account to get started.</span></div>
        </div>
      </aside>
    </main>
  );
}
