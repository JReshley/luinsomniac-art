const EMAIL = 'luinsomniac@gmail.com'

export default function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="site-footer__inner">
        <div className="footer-cta">
          <div className="footer-cta__copy">
            <h2 className="footer-cta__heading">Have an idea in mind? Let&rsquo;s talk!</h2>
            <p className="footer-cta__body">
              Commisions open for 3D props, background, and short-form animation.
            </p>
          </div>

          <div className="footer-cta__actions">
            <a className="btn btn--outline" href={`mailto:${EMAIL}`}>
              {EMAIL}
            </a>
            <a className="btn btn--primary" href={`mailto:${EMAIL}`}>
              Let&rsquo;s collaborate
            </a>
          </div>
        </div>

        <div className="footer-legal">
          <span>All artwork &copy; Luinsomniac. Do not reproduce without permission.</span>
          <span>WEBSITE BUILT BY <a href="https://github.com/JReshley" target="_blank" rel="noopener noreferrer">JRESHLEY</a></span>
        </div>
      </div>
    </footer>
  )
}
