import { Link } from 'react-router-dom';

/** The reference is a single page; unknown paths get an on-brand 404 instead of a blank screen. */
export default function NotFound() {
  return (
    <main className="nf">
      <div>
        <span className="eyebrow">
          <i />
          404 · LOST AT SEA
        </span>
        <h1 style={{ marginTop: 22 }}>
          Nothing in <em>these waters.</em>
        </h1>
        <p>This page drifted off. The whales are still swimming on the home page.</p>
        <Link className="btn m" to="/">
          Back to the whales
        </Link>
      </div>
    </main>
  );
}
