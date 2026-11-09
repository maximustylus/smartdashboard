'use strict';
/**
 * What an admin script may print about a person. The NEXUS Admin workflow runs in
 * GitHub Actions and this repository is PUBLIC, so every log line is public. An
 * address shows as its first letter and domain, a name as initials: enough for the
 * owner to recognise the right person, nothing a stranger could use.
 */
const maskEmail = (email) => {
    const text = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const at = text.indexOf('@');
    return at > 0 ? `${text[0]}•••${text.slice(at)}` : '(no address)';
};

const initials = (name) => {
    const words = typeof name === 'string' ? name.trim().split(/\s+/).filter(Boolean) : [];
    return words.length > 0 ? words.map((w) => `${w[0].toUpperCase()}.`).join('') : '(no name)';
};

module.exports = { maskEmail, initials };
