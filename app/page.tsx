import Link from "next/link";

const modules = [
  ["01", "Discharge intelligence", "Trace abnormal water-quality signals across the industrial network and inspect source attribution with appropriate uncertainty.", "/monitoring", "Open live monitoring", "factory-image", "S→U"],
  ["02", "Groundwater outlook", "Review CGWB baseline assessments and test how extraction scenarios affect each Tiruppur FIRKA.", "/groundwater", "Explore FIRKAs", "groundwater-image", "H₂O"],
  ["03", "Evidence ledger", "Record proportionate regulator actions against flagged events in a transparent, time-stamped evidence trail.", "/evidence", "Review evidence", "ledger-image", "✓"],
];

export default function HomePage() {
  return <div className="landing-page home-page">
    <section className="hero" aria-labelledby="hero-title"><div className="hero-copy">
      <p className="eyebrow"><span className="pulse" /> NoyyalSense · environmental intelligence</p><p className="hero-kicker">TIRUPPUR, TAMIL NADU</p>
      <h1 id="hero-title">Tiruppur<span className="type-cursor">|</span></h1><p className="hero-tagline">Industry that can<br /><em>account for its water.</em></p>
      <p className="hero-description">A single civic intelligence layer for discharge evidence, groundwater stewardship and accountable regulatory decisions.</p>
      <div className="hero-actions"><Link className="btn hero-primary" href="/monitoring">Open operations centre <span>→</span></Link><Link className="text-link" href="/verify">Verify a product passport <span>↗</span></Link></div>
    </div><div className="hero-art" aria-label="Abstract textile weave visual"><div className="hero-orbit orbit-one" /><div className="hero-orbit orbit-two" /><div className="weave-card weave-card-back" /><div className="weave-card weave-card-main"><span className="weave-label">TRUST, TRACEABILITY, TOMORROW</span><div className="weave-mark">TN</div><span className="weave-location">TIRUPPUR · 11.1085° N</span></div></div></section>
    <section className="platform-intro" aria-labelledby="platform-title"><div><p className="eyebrow">ONE PLATFORM / THREE LENSES</p><h2 id="platform-title">Water accountability,<br />from signal to action.</h2></div><p>Each workspace has a distinct job. Together, they give regulators a clear view of industrial water risk without turning different evidence types into unsupported claims.</p></section>
    <section className="module-grid" aria-label="Platform workspaces">{modules.map(([index, title, description, href, action, style, mark]) => <Link className="module-card" href={href} key={href}><div className={`module-art ${style}`}><span>{mark}</span></div><p className="card-index">[ {index} ]</p><h3>{title}</h3><p>{description}</p><span className="module-link">{action} <b>→</b></span></Link>)}</section>
  </div>;
}
