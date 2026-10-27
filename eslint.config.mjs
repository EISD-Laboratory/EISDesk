import nextCoreWebVitals from 'eslint-config-next/core-web-vitals'

const config = [
  { ignores: ['.next/**', 'node_modules/**', 'WEB-EISD/**', 'supabase/**', 'lib/database.types.ts'] },
  ...nextCoreWebVitals,
]

export default config
