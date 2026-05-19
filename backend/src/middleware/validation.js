// Lightweight validators used by auth/user routes. No external dep —
// keeps the install small and rules explicit/auditable.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MOBILE_RE = /^\+?[0-9\s\-()]{10,20}$/;

function validateRegistration(body) {
  const errors = {};
  const {
    first_name, last_name, mobile, department, email, password, confirm_password,
  } = body || {};

  if (!first_name || !first_name.trim()) errors.first_name = 'First name is required';
  if (!last_name  || !last_name.trim())  errors.last_name  = 'Last name is required';
  if (!department || !department.trim()) errors.department = 'Department is required';

  if (!mobile || !MOBILE_RE.test(String(mobile).trim())) {
    errors.mobile = 'Enter a valid mobile number (10–15 digits, optional country code)';
  }

  if (!email || !EMAIL_RE.test(String(email).trim().toLowerCase())) {
    errors.email = 'Enter a valid email address';
  } else {
    const allowed = (process.env.ALLOWED_EMAIL_DOMAIN || 'successive.tech').toLowerCase();
    const domain = email.trim().toLowerCase().split('@')[1];
    if (domain !== allowed) {
      errors.email = `Only @${allowed} work emails are allowed`;
    }
  }

  if (!password || password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  } else if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    errors.password = 'Password must include at least one letter and one number';
  }

  if (password !== confirm_password) {
    errors.confirm_password = 'Passwords do not match';
  }

  return { ok: Object.keys(errors).length === 0, errors };
}

function validateLogin(body) {
  const errors = {};
  const { email, password } = body || {};
  if (!email || !EMAIL_RE.test(String(email).trim().toLowerCase())) {
    errors.email = 'Enter a valid email address';
  }
  if (!password) errors.password = 'Password is required';
  return { ok: Object.keys(errors).length === 0, errors };
}

module.exports = { validateRegistration, validateLogin };
