import { Link } from 'react-router-dom'
import FlexBot from '../components/FlexBot'

const GITHUB_URL = 'https://github.com/Nafisatibrahim/flex-care'

const TEAM = [
  {
    name: 'Nafisat Ibrahim',
    pronouns: 'she/her',
    initials: 'NI',
    color: 'from-indigo-500 to-violet-600',
    portfolio: { label: 'nafisatibrahim.com', href: 'https://nafisatibrahim.com/' },
    github:   { label: 'Nafisatibrahim', href: 'https://github.com/Nafisatibrahim' },
    linkedin: { label: 'nafisatibrahim', href: 'https://www.linkedin.com/in/nafisatibrahim/' },
  },
  {
    name: 'Haniyeh Jalayeri',
    pronouns: 'she/her',
    initials: 'HJ',
    color: 'from-violet-500 to-pink-500',
    portfolio: null,
    github:   { label: 'HaniJal', href: 'https://github.com/HaniJal' },
    linkedin: { label: 'haniyeh-jalayeri', href: 'https://www.linkedin.com/in/haniyeh-jalayeri/' },
  },
]

function GithubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
    </svg>
  )
}

function LinkedInIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
    </svg>
  )
}

function GlobeIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253"/>
    </svg>
  )
}

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between h-16">
          <Link to="/" className="flex items-center">
            <img src="/flexcare-logo-transparent.png" alt="FlexCare" className="h-24 w-auto" />
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/"
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600
                         transition-colors rounded-lg hover:bg-indigo-50">
              ← Back to app
            </Link>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer"
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-indigo-600
                         transition-colors rounded-lg hover:bg-indigo-50 flex items-center gap-1">
              <GithubIcon />
              GitHub
            </a>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 text-white py-20 px-6">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-indigo-200 text-sm font-medium uppercase tracking-widest mb-3">Meet the team</p>
          <h1 className="text-4xl sm:text-5xl font-extrabold mb-4 tracking-tight">Built with care</h1>
          <p className="text-indigo-100 text-lg max-w-xl mx-auto">
            FlexCare was created at GenAI Genesis 2026 to help people recover smarter with AI-guided musculoskeletal support.
          </p>
        </div>
      </section>

      {/* Team cards */}
      <section className="flex-1 max-w-5xl mx-auto w-full px-6 py-16">
        <div className="grid sm:grid-cols-2 gap-8">
          {TEAM.map(person => (
            <div key={person.name}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 flex flex-col gap-5">

              {/* Avatar */}
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${person.color}
                              flex items-center justify-center text-white text-2xl font-bold shadow-md`}>
                {person.initials}
              </div>

              {/* Name + pronouns */}
              <div>
                <h2 className="text-xl font-bold text-gray-900">{person.name}</h2>
                <p className="text-sm text-gray-400 mt-0.5">{person.pronouns}</p>
              </div>

              {/* Links */}
              <div className="flex flex-col gap-2.5 mt-auto">
                {person.portfolio && (
                  <a href={person.portfolio.href} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-indigo-600
                               transition-colors group">
                    <span className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-50
                                     flex items-center justify-center transition-colors text-gray-500 group-hover:text-indigo-600">
                      <GlobeIcon />
                    </span>
                    {person.portfolio.label}
                  </a>
                )}
                <a href={person.github.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-indigo-600
                             transition-colors group">
                  <span className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-50
                                   flex items-center justify-center transition-colors text-gray-500 group-hover:text-indigo-600">
                    <GithubIcon />
                  </span>
                  github.com/{person.github.label}
                </a>
                <a href={person.linkedin.href} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-2.5 text-sm text-gray-700 hover:text-indigo-600
                             transition-colors group">
                  <span className="w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-indigo-50
                                   flex items-center justify-center transition-colors text-gray-500 group-hover:text-indigo-600">
                    <LinkedInIcon />
                  </span>
                  linkedin.com/in/{person.linkedin.label}
                </a>
              </div>
            </div>
          ))}
        </div>

        {/* Get in touch */}
        <div className="mt-12 bg-white rounded-2xl border border-gray-100 shadow-sm p-8 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">Get in touch</h2>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Have a question, found a bug, or want to contribute? Open an issue on GitHub. We would love to hear from you.
          </p>
          <a href={`${GITHUB_URL}/issues/new`} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500
                       text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shadow-sm">
            <GithubIcon />
            Open an issue
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} FlexCare · Not a substitute for professional medical advice.
      </footer>
      <FlexBot/>
    </div>
  )
}
