import { Link } from 'react-router-dom';

function Section({ id, label, title, children }) {
  return (
    <section aria-labelledby={id} className="py-10 border-b border-border last:border-0">
      <p className="font-mono text-xs text-text-dim uppercase tracking-widest mb-2">{label}</p>
      <h2 id={id} className="font-display text-display-md text-text mb-4">{title}</h2>
      {children}
    </section>
  );
}

function Step({ number, title, description }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-teal text-white flex items-center justify-center font-mono text-xs font-medium">
        {number}
      </div>
      <div>
        <p className="font-body font-semibold text-sm text-text mb-0.5">{title}</p>
        <p className="font-body text-sm text-text-mid leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export default function About() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      {/* Page header */}
      <div className="mb-10">
        <p className="font-mono text-xs text-text-dim uppercase tracking-widest mb-2">About the System</p>
        <h1 className="font-display text-display-lg text-text mb-3">NairobiAlert</h1>
        <p className="font-body text-text-mid text-base leading-relaxed">
          A real-time flood crisis response and coordination platform built for Nairobi, Kenya.
          NairobiAlert connects citizens, emergency responders, and administrators to minimise
          the impact of flooding events across the city.
        </p>
      </div>

      <Section id="how-it-works" label="The Process" title="How It Works">
        <div className="space-y-5">
          <Step
            number="1"
            title="Incident Reported"
            description="Citizens report flooding via this web app, SMS, or USSD code (*384#). Reports include location, severity, and description."
          />
          <Step
            number="2"
            title="Admin Review"
            description="Our coordination team reviews each submission. Verified incidents are approved and published to the public map in real time."
          />
          <Step
            number="3"
            title="Teams Dispatched"
            description="Response teams are assigned and deployed based on severity and location. Team status is tracked live on the map."
          />
          <Step
            number="4"
            title="Shelters Activated"
            description="Evacuation shelters are opened as needed. Capacity and occupancy are updated in real time so residents can find space."
          />
          <Step
            number="5"
            title="Incident Resolved"
            description="Once the situation is managed, the incident is marked resolved and removed from the active map display."
          />
        </div>
      </Section>

      <Section id="reach" label="Access" title="Multiple Reporting Channels">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { icon: '🌐', title: 'Web App', desc: 'Full-featured report form at nairobialert.co.ke — works on any smartphone browser.' },
            { icon: '📱', title: 'USSD (*384#)', desc: 'Dial from any mobile phone, no internet needed. Works on 2G networks across Nairobi.' },
            { icon: '💬', title: 'SMS (22384)', desc: 'Text FLOOD [Location] [Details] to submit a report via basic SMS.' },
            { icon: '🚨', title: 'Emergency Services', desc: 'For life-threatening emergencies always call 999 (Police) or 1199 (Kenya Red Cross) first.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="bg-white border border-border rounded-radius p-4 shadow-sm">
              <p className="text-2xl mb-2" role="img" aria-label={title}>{icon}</p>
              <p className="font-body font-semibold text-sm text-text mb-1">{title}</p>
              <p className="font-body text-xs text-text-mid leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section id="technology" label="Under the Hood" title="Technology">
        <p className="font-body text-text-mid text-sm leading-relaxed mb-4">
          NairobiAlert is a modern,
          real-time stack designed for reliability during crisis events.
        </p>
        <div className="bg-white border border-border rounded-radius p-4 shadow-sm">
          <ul className="space-y-2">
            {[
              ['Frontend',   'React 18 + Vite 5 + Tailwind CSS v3'],
              ['Database',   'Google Firebase Firestore (real-time sync)'],
              ['Auth',       'Firebase Authentication'],
              ['Map',        'Leaflet.js + CartoDB tile layer'],
              ['Deployment', 'Vercel (CDN edge, global)'],
              ['SMS/USSD',   'Africa\'s Talking API (planned — architecture placeholder)'],
            ].map(([key, val]) => (
              <li key={key} className="flex gap-3 font-mono text-xs">
                <span className="w-24 flex-shrink-0 text-text-dim">{key}</span>
                <span className="text-text">{val}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section id="data" label="Privacy" title="Data &amp; Privacy">
        <p className="font-body text-text-mid text-sm leading-relaxed">
          Phone numbers in reports are optional and only visible to system administrators.
          Public-facing incident data shows only the type, zone, severity, and description.
          No personal data is displayed on the map.
        </p>
      </Section>

      {/* CTA */}
      <div className="mt-8 bg-teal rounded-radius-lg p-6 text-center">
        <h3 className="font-display text-xl text-white mb-2">See a flood situation?</h3>
        <p className="font-body text-sm text-teal-mid mb-4">
          Report it now — anonymous reports are welcome.
        </p>
        <Link
          to="/report"
          className="inline-block font-body font-semibold text-sm bg-white text-teal px-6 py-2.5 rounded-radius hover:bg-teal-light transition-colors duration-150 shadow-sm"
        >
          Submit a Report
        </Link>
      </div>
    </div>
  );
}
