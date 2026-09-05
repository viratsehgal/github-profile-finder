/** Stand-in data so `npm run studio` opens without hitting the API. */
export const SAMPLE_DATA = {
  user: {
    login: 'octocat',
    name: 'The Octocat',
    avatar: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0naHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmcnIHdpZHRoPSczMjAnIGhlaWdodD0nMzIwJz48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9J2cnIHgxPScwJyB5MT0nMCcgeDI9JzEnIHkyPScxJz48c3RvcCBvZmZzZXQ9JzAnIHN0b3AtY29sb3I9JyM0YzhiZjUnLz48c3RvcCBvZmZzZXQ9JzEnIHN0b3AtY29sb3I9JyM5ZTY4ZjUnLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0nMzIwJyBoZWlnaHQ9JzMyMCcgZmlsbD0ndXJsKCNnKScvPjx0ZXh0IHg9JzE2MCcgeT0nMjEwJyBmb250LXNpemU9JzE1MCcgdGV4dC1hbmNob3I9J21pZGRsZSc+T0M8L3RleHQ+PC9zdmc+',
    followers: 18400,
    publicRepos: 8,
    totalStars: 12750,
    createdAt: '2011-01-25T18:44:36Z',
  },
  repos: [
    { name: 'Spoon-Knife', stars: 12600, language: 'HTML' },
    { name: 'Hello-World', stars: 2900, language: 'JavaScript' },
    { name: 'octocat.github.io', stars: 780, language: 'CSS' },
    { name: 'git-consortium', stars: 210, language: 'Python' },
    { name: 'test-repo1', stars: 42, language: 'Rust' },
  ],
  languages: [
    { name: 'TypeScript', percent: 41.2 },
    { name: 'Python', percent: 24.8 },
    { name: 'Rust', percent: 15.6 },
    { name: 'Go', percent: 11.9 },
    { name: 'CSS', percent: 6.5 },
  ],
  windowLabel: 'last 90 days',
};
