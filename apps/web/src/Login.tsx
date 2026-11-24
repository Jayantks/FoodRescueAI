import { useState, type FormEvent, type PointerEvent } from 'react';
import { ArrowRight, ChevronDown, Eye, EyeOff, HeartHandshake, Leaf, LockKeyhole, Mail, ShieldCheck, Truck, Utensils } from 'lucide-react';
import { roleLabels, signIn, type Session } from './auth';

const demoAccounts = [
  { role: 'donor', icon: Utensils, email: 'donor@foodrescue.demo', password: 'DonorDemo!26' },
  { role: 'ngo', icon: HeartHandshake, email: 'ngo@foodrescue.demo', password: 'NgoDemo!26' },
  { role: 'volunteer', icon: Truck, email: 'volunteer@foodrescue.demo', password: 'VolunteerDemo!26' },
  { role: 'admin', icon: ShieldCheck, email: 'admin@foodrescue.demo', password: 'AdminDemo!26' },
] as const;

export function Brand() {
  return <><span className="brand-mark"><Leaf size={21} strokeWidth={2.2} aria-hidden="true" /></span>
    <span>FoodRescue <span className="brand-ai">AI</span></span></>;
}

function lightGlass(event: PointerEvent<HTMLDivElement>) {
  if (event.pointerType !== 'mouse' ||
      !window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) return;
  const card = event.currentTarget;
  const bounds = card.getBoundingClientRect();
  card.style.setProperty('--light-x', (event.clientX - bounds.left) + 'px');
  card.style.setProperty('--light-y', (event.clientY - bounds.top) + 'px');
  card.dataset.lit = 'true';
}

export function Login({ onSignIn, message }: { onSignIn: (session: Session) => void; message: string }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      onSignIn(await signIn(email, password));
    } catch (cause) {
      setError(cause instanceof Error && cause.message !== 'Failed to fetch'
        ? cause.message : 'The sign-in service is unavailable. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  return <main className="login-page">
    <section className="login-story" aria-label="About FoodRescue AI">
      <div className="login-brand"><Brand /></div>
      <div className="login-story-copy">
        <h2>Good food deserves<br /><em>a second chance.</em></h2>
        <p>Coordinate surplus donations, match them to nearby NGOs, and follow each pickup through handover.</p>
      </div>
      <img className="login-photo" src="/images/food-handoff.jpg"
        alt="Two people handing over a carton of packaged surplus food" width="1200" height="800" />
    </section>
    <section className="login-side" aria-labelledby="sign-in-heading">

      <div className="login-card" onPointerMove={lightGlass} onPointerLeave={event => { delete event.currentTarget.dataset.lit; }}>
        <h1 id="sign-in-heading">Sign in</h1>
        <p className="login-intro">Your account opens your FoodRescue AI workspace.</p>
        <form className="login-form" onSubmit={submit}>
          <label htmlFor="login-email">Email address</label>
          <div className="login-field">
            <Mail size={18} aria-hidden="true" />
            <input id="login-email" name="email" type="email" inputMode="email" autoComplete="username"
              autoCapitalize="none" spellCheck={false} value={email} placeholder="you@example.com"
              maxLength={254} required onChange={(event) => { setEmail(event.target.value); setError(''); }} />
          </div>
          <label htmlFor="login-password">Password</label>
          <div className="login-field login-password">
            <LockKeyhole size={18} aria-hidden="true" />
            <input id="login-password" name="password" type={visible ? 'text' : 'password'}
              autoComplete="current-password" value={password} placeholder="Enter your password" maxLength={72}
              required onChange={(event) => { setPassword(event.target.value); setError(''); }} />
            <button type="button" className="icon-button" aria-label={visible ? 'Hide password' : 'Show password'}
              aria-controls="login-password" onClick={() => setVisible(!visible)}>
              {visible ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {(error || message) && <p className="login-error" role="alert">{error || message}</p>}
          <button type="submit" className="button primary login-submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </form>
        <details className="login-demo">
          <summary>Demo accounts <ChevronDown size={17} aria-hidden="true" /></summary>
          <p>Choose an account to fill its demo credentials.</p>
          <div className="login-demo-grid">
            {demoAccounts.map(({ role, icon: Icon, email, password }) => <button key={role} type="button"
              disabled={busy} onClick={() => { setEmail(email); setPassword(password); setError(''); }}>
              <Icon size={18} aria-hidden="true" />{roleLabels[role]}
            </button>)}
          </div>
        </details>
      </div>
    </section>
  </main>;
}
