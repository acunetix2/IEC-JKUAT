// IEC JKUAT — Contact page. Ported from site/contact.html.
// The contact form inserts directly into contact_messages (anon INSERT-only
// policy); on success the form is replaced by the success card. Uses the
// shared SiteLayout chrome (Nav/Footer) so no page-local nav is rendered.

import { useState, type FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';

export default function Contact() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const update = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from('contact_messages').insert([
        {
          name: form.name.trim(),
          email: form.email.trim(),
          subject: form.subject.trim(),
          message: form.message.trim(),
        },
      ]);
      if (error) throw error;
      setSent(true);
    } catch {
      toast('Failed to send message. Please try again.', 'error');
      setSubmitting(false);
    }
  }

  return (
    <main style={{ paddingTop: '72px' }} className="px-6 md:px-16 max-w-screen-xl mx-auto pb-20">
      {/* Page header */}
      <section className="pt-10 pb-10 md:pt-14 md:pb-14">
        <p className="section-label mb-4">Get in touch</p>
        <h1
          className="font-display font-extrabold text-white mb-4"
          style={{ fontSize: 'clamp(2rem, 4vw, 3.5rem)', lineHeight: 1.05, letterSpacing: '-0.03em' }}
        >
          We'd love to <span className="text-iec-blue">hear</span>
          <br />
          from you.
        </h1>
        <p className="text-white/50 text-base max-w-lg leading-relaxed">
          Have a question, idea, or want to partner with us? Reach out to the IEC JKUAT team.
        </p>
      </section>

      {/* Contact grid */}
      <section className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-20">
        {/* Left: info */}
        <div className="md:col-span-2 space-y-6 order-2 md:order-1">
          <div className="info-card">
            <h2 className="font-display font-bold text-white text-lg mb-6">Find us</h2>
            <div className="space-y-5">
              <InfoRow icon="location_on" accent="blue" title="JKUAT Main Campus">
                Student Center, Room 201
                <br />
                Kiambu, Kenya
              </InfoRow>
              <div className="flex items-start gap-4">
                <IconBox icon="mail" accent="blue" />
                <div>
                  <p className="info-item-title text-white text-sm font-semibold mb-0.5">Email</p>
                  <a href="mailto:info@iecjkuat.com" className="info-item-email text-iec-blue text-sm hover:underline">
                    info@iecjkuat.com
                  </a>
                </div>
              </div>
              <InfoRow icon="phone" accent="gold" title="Phone">
                +254 712 345 678
              </InfoRow>
              <InfoRow icon="schedule" accent="blue" title="Office Hours">
                Mon–Fri: 9:00 AM – 5:00 PM
                <br />
                Sat: 9:00 AM – 1:00 PM (EAT)
              </InfoRow>
            </div>
          </div>

          <div className="info-card">
            <h2 className="font-display font-bold text-white text-lg mb-5">Follow Us</h2>
            <div className="flex flex-wrap gap-3">
              <SocialLink href="https://x.com/iecjkuat" label="X (Twitter)">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </SocialLink>
              <SocialLink href="https://linkedin.com/company/iecjkuat" label="LinkedIn">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </SocialLink>
              <SocialLink href="https://instagram.com/iecjkuat" label="Instagram">
                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
              </SocialLink>
              <SocialLink href="https://github.com/iecjkuat" label="GitHub">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </SocialLink>
              <SocialLink href="https://wa.me/254768281797" label="WhatsApp" style={{ color: 'rgba(37,211,102,0.6)' }}>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </SocialLink>
            </div>
          </div>
        </div>

        {/* Right: form */}
        <div className="md:col-span-3 info-card order-1 md:order-2">
          {!sent ? (
            <>
              <h2 className="font-display font-bold text-white text-lg mb-2">Send a message</h2>
              <p className="text-white/40 text-sm mb-6">We typically respond within 24 hours.</p>
              <form className="space-y-5" onSubmit={handleSubmit} aria-label="Contact form">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="form-label" htmlFor="contact-name">
                      Name <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="contact-name"
                      className="form-input"
                      placeholder="Your name"
                      required
                      maxLength={120}
                      value={form.name}
                      onChange={update('name')}
                    />
                  </div>
                  <div>
                    <label className="form-label" htmlFor="contact-email">
                      Email <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      className="form-input"
                      placeholder="you@example.com"
                      required
                      maxLength={254}
                      value={form.email}
                      onChange={update('email')}
                    />
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="contact-subject">
                    Subject <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    id="contact-subject"
                    className="form-input"
                    placeholder="What's this about?"
                    required
                    maxLength={200}
                    value={form.subject}
                    onChange={update('subject')}
                  />
                </div>
                <div>
                  <label className="form-label" htmlFor="contact-message">
                    Message <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    id="contact-message"
                    className="form-input resize-none"
                    rows={5}
                    placeholder="Tell us more..."
                    required
                    maxLength={2000}
                    value={form.message}
                    onChange={update('message')}
                  />
                </div>
                <button type="submit" className="btn-primary w-full justify-center" disabled={submitting}>
                  {submitting ? (
                    <>
                      <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> Sending...
                    </>
                  ) : (
                    <>
                      Send Message <span className="material-symbols-outlined text-[18px]">send</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div
              className="mt-5 p-6 text-center"
              style={{
                background: 'rgba(0,174,239,0.07)',
                border: '1px solid rgba(0,174,239,0.18)',
                borderRadius: '10px',
              }}
            >
              <span
                className="material-symbols-outlined text-4xl text-iec-blue block mb-2"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                check_circle
              </span>
              <p className="font-display font-bold text-white mb-1">Message Sent!</p>
              <p className="text-white/50 text-sm">We'll get back to you within 24 hours.</p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function IconBox({ icon, accent }: { icon: string; accent: 'blue' | 'gold' }) {
  const style =
    accent === 'gold'
      ? { background: 'rgba(251,176,59,0.1)', color: '#FBB03B' }
      : { background: 'rgba(0,174,239,0.1)', color: '#18C8FF' };
  return (
    <div className="w-10 h-10 shrink-0 rounded-lg flex items-center justify-center" style={style}>
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </div>
  );
}

function InfoRow({
  icon,
  accent,
  title,
  children,
}: {
  icon: string;
  accent: 'blue' | 'gold';
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-4">
      <IconBox icon={icon} accent={accent} />
      <div>
        <p className="info-item-title text-white text-sm font-semibold mb-0.5">{title}</p>
        <p className="info-item-desc text-white/50 text-sm">{children}</p>
      </div>
    </div>
  );
}

function SocialLink({
  href,
  label,
  style,
  children,
}: {
  href: string;
  label: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener" className="social-link" aria-label={label} style={style}>
      <svg className="w-[18px] h-[18px]" fill="currentColor" viewBox="0 0 24 24">
        {children}
      </svg>
    </a>
  );
}
