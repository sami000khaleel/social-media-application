// The made-up people that `npm run seed` creates, with their made-up passwords (also in server/SEED-ACCOUNTS.md
// and in the README). With demo mode off, the sign-in page always shows these four as one-click sign-ins.
// The server adds their pictures when it has them; without the seed, a click says to run it first.
// With demo mode on, one click signs in without a password instead, as a private copy (see pages/Auth.jsx).
export const SEED_ACCOUNTS = [
  { firstName: 'Lena', lastName: 'Hoffmann', story: 'Was into sport, now into tech', email: 'lena.hoffmann@example.com', password: 'Copper-Orchard-96' },
  { firstName: 'Tobias', lastName: 'Krause', story: 'Reads mostly tech', email: 'tobias.krause@example.com', password: 'Ember-Otter-80' },
  { firstName: 'Sophie', lastName: 'Wagner', story: 'Likes films, music and business', email: 'sophie.wagner@example.com', password: 'Cobalt-Thunder-14' },
  { firstName: 'Jonas', lastName: 'Weber', story: 'Loves sport, dislikes politics', email: 'jonas.weber@example.com', password: 'Copper-Orchard-24' },
]
