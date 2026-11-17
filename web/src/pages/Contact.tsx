import { useState, type FormEvent } from 'react';
import { FaWhatsapp } from 'react-icons/fa6';
import { FiArrowUpRight, FiCheck, FiClock, FiMail, FiMapPin, FiPhone, FiSend } from 'react-icons/fi';
import { supabase } from '../lib/supabase';
import { useToast } from '../context/ToastContext';
import { validateEmail, validatePersonName, validateRequiredText } from '../lib/validation';
import { CLUB_SOCIAL_LINKS } from '../components/SocialIcons';

const JKUAT_CAMPUS_COORDINATES = '-1.0920284,37.0129461';
const GOOGLE_MAPS_URL = `https://www.google.com/maps?q=${JKUAT_CAMPUS_COORDINATES}`;
const GOOGLE_MAPS_EMBED_URL = `https://www.google.com/maps?q=${JKUAT_CAMPUS_COORDINATES}&z=17&output=embed`;

export default function Contact() {
  const { toast } = useToast();
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});

  const update = (key: keyof typeof form) => (event: { target: { value: string } }) => {
    setForm((current) => ({ ...current, [key]: event.target.value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fieldErrors = {
      name: validatePersonName(form.name),
      email: validateEmail(form.email),
      subject: validateRequiredText(form.subject, 'Subject', 3, 200),
      message: validateRequiredText(form.message, 'Message', 10, 2000),
    };
    setErrors(fieldErrors);
    if (Object.values(fieldErrors).some(Boolean)) return;

    setSubmitting(true);
    try {
      const { error } = await supabase.from('contact_messages').insert([{
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
      }]);
      if (error) throw error;
      setSent(true);
    } catch {
      toast('Failed to send message. Please try again.', 'error');
      setSubmitting(false);
    }
  }

  return (
    <main className="contact-page">
      <section className="contact-hero">
        <p className="contact-eyebrow">Contact IEC JKUAT</p>
        <h1>Let’s start a <span>conversation.</span></h1>
        <p>Questions, a project idea, or interested in working together? Send us a message and the IEC team will be in touch.</p>
        <div className="contact-hero-meta">
          <span><FiMapPin aria-hidden="true" /> JKUAT Main Campus</span>
          <a href="mailto:info@iecjkuat.com"><FiMail aria-hidden="true" /> info@iecjkuat.com</a>
        </div>
      </section>

      <section className="contact-layout" aria-label="Contact details and message form">
        <aside className="contact-information">
          <section className="contact-details-card">
            <p className="contact-card-kicker">We’re here to help</p>
            <h2>Reach the IEC team</h2>
            <p className="contact-card-intro">The quickest way to reach us is by email. You can also find us at the JKUAT Main Campus.</p>

            <div className="contact-detail-list">
              <div className="contact-detail">
                <span className="contact-detail-icon"><FiMapPin aria-hidden="true" /></span>
                <div><h3>Visit us</h3><p>Student Center, Room 201<br />JKUAT Main Campus, Kiambu, Kenya</p></div>
              </div>
              <div className="contact-detail">
                <span className="contact-detail-icon"><FiMail aria-hidden="true" /></span>
                <div><h3>Email</h3><a href="mailto:info@iecjkuat.com">info@iecjkuat.com</a></div>
              </div>
              <div className="contact-detail">
                <span className="contact-detail-icon"><FiPhone aria-hidden="true" /></span>
                <div><h3>Phone</h3><a href="tel:+254712345678">+254 712 345 678</a></div>
              </div>
              <div className="contact-detail">
                <span className="contact-detail-icon"><FiClock aria-hidden="true" /></span>
                <div><h3>Office hours</h3><p>Mon–Fri, 9:00 AM–5:00 PM<br />Sat, 9:00 AM–1:00 PM (EAT)</p></div>
              </div>
            </div>

            <div className="contact-social">
              <h3>Follow the club</h3>
              <div className="contact-social-links">
                {CLUB_SOCIAL_LINKS.map(({ label, href, Icon }) => (
                  <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label}>
                    <Icon aria-hidden="true" focusable="false" />
                  </a>
                ))}
                <a href="https://wa.me/254768281797" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp" title="WhatsApp">
                  <FaWhatsapp aria-hidden="true" focusable="false" />
                </a>
              </div>
            </div>
          </section>
        </aside>

        <section className="contact-form-card" aria-labelledby="contact-form-title">
          {!sent ? (
            <>
              <div className="contact-form-heading">
                <p className="contact-card-kicker">Send us a note</p>
                <h2 id="contact-form-title">How can we help?</h2>
                <p>Fill in the details below. We typically respond within 24 hours.</p>
              </div>
              <form noValidate onSubmit={handleSubmit} aria-label="Contact form">
                <fieldset className="contact-form-section">
                  <legend><span>01</span> Your details</legend>
                  <div className="contact-field-grid">
                    <div className="contact-field">
                      <label htmlFor="contact-name">Full name <span aria-hidden="true">*</span></label>
                      <input
                        id="contact-name"
                        autoComplete="name"
                        placeholder="e.g. Jane Mwangi"
                        required
                        maxLength={120}
                        aria-invalid={Boolean(errors.name)}
                        aria-describedby={errors.name ? 'contact-name-error' : undefined}
                        value={form.name}
                        onChange={update('name')}
                      />
                      <FieldError id="contact-name-error" message={errors.name} />
                    </div>
                    <div className="contact-field">
                      <label htmlFor="contact-email">Email address <span aria-hidden="true">*</span></label>
                      <input
                        id="contact-email"
                        type="email"
                        autoComplete="email"
                        placeholder="you@example.com"
                        required
                        maxLength={254}
                        aria-invalid={Boolean(errors.email)}
                        aria-describedby={errors.email ? 'contact-email-error' : undefined}
                        value={form.email}
                        onChange={update('email')}
                      />
                      <FieldError id="contact-email-error" message={errors.email} />
                    </div>
                  </div>
                </fieldset>

                <fieldset className="contact-form-section">
                  <legend><span>02</span> Your message</legend>
                  <div className="contact-field">
                    <label htmlFor="contact-subject">Subject <span aria-hidden="true">*</span></label>
                    <input
                      id="contact-subject"
                      placeholder="What would you like to discuss?"
                      required
                      maxLength={200}
                      aria-invalid={Boolean(errors.subject)}
                      aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                      value={form.subject}
                      onChange={update('subject')}
                    />
                    <FieldError id="contact-subject-error" message={errors.subject} />
                  </div>
                  <div className="contact-field">
                    <label htmlFor="contact-message">Message <span aria-hidden="true">*</span></label>
                    <textarea
                      id="contact-message"
                      rows={6}
                      placeholder="Share a few details so we can point you in the right direction."
                      required
                      maxLength={2000}
                      aria-invalid={Boolean(errors.message)}
                      aria-describedby={errors.message ? 'contact-message-error' : undefined}
                      value={form.message}
                      onChange={update('message')}
                    />
                    <FieldError id="contact-message-error" message={errors.message} />
                  </div>
                </fieldset>

                <button type="submit" className="contact-submit" disabled={submitting}>
                  {submitting ? 'Sending message…' : 'Send message'}
                  {submitting ? null : <FiSend aria-hidden="true" />}
                </button>
                <p className="contact-form-note"><span aria-hidden="true">*</span> Required fields</p>
              </form>
            </>
          ) : (
            <div className="contact-success" role="status" aria-live="polite">
              <span className="contact-success-icon"><FiCheck aria-hidden="true" /></span>
              <p className="contact-card-kicker">Message received</p>
              <h2 id="contact-form-title">Thanks for reaching out.</h2>
              <p>Your note has been sent to the IEC team. We’ll get back to you within 24 hours.</p>
            </div>
          )}
        </section>
      </section>

      <section className="contact-map-section" aria-labelledby="contact-map-title">
        <div className="contact-map-heading">
          <div>
            <p className="contact-card-kicker">Come say hello</p>
            <h2 id="contact-map-title">Find us at JKUAT</h2>
            <p>Jomo Kenyatta University of Agriculture and Technology, Juja, Kiambu County.</p>
          </div>
          <a href={GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer">
            Open directions <FiArrowUpRight aria-hidden="true" />
          </a>
        </div>
        <div className="contact-map-frame">
          <iframe
            src={GOOGLE_MAPS_EMBED_URL}
            title="Google Maps location for JKUAT Main Campus"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </section>
    </main>
  );
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} className="contact-field-error" role="alert">{message}</p>;
}
