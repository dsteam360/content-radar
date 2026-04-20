<?php
/**
 * Sitewide Trust Map Footer
 *
 * Hides the default Kadence .site-footer on all pages and injects
 * the 5-column Trust Map footer on non-front-page requests.
 * The homepage (post 4212) already contains the footer in its post content.
 */

/**
 * Inject the Trust Map footer HTML on every page except the front page
 * (which has the footer embedded directly in post content).
 */
add_action( 'wp_footer', function () {
	// Front page already has the hh-footer in post content — skip.
	if ( is_front_page() ) return;
	?>
<footer class="hh-footer hh-footer--global">
  <div class="hh-footer-inner">

    <!-- Brand column -->
    <div class="hh-footer-brand">
      <a class="hh-footer-logo" href="<?php echo esc_url( home_url( '/' ) ); ?>">Toke Haus</a>
      <p class="hh-footer-tagline">Canada's trusted source for premium cannabis — delivered discreetly to your door since 2009.</p>
      <div class="hh-footer-badges">
        <span class="hh-footer-badge">✓ Lab Tested</span>
        <span class="hh-footer-badge">🔒 Discreet Shipping</span>
        <span class="hh-footer-badge">⭐ 4.9 Rating</span>
      </div>
    </div>

    <!-- Shop column -->
    <div class="hh-footer-col">
      <p class="hh-footer-col-title">Shop</p>
      <ul>
        <li><a href="<?php echo esc_url( home_url( '/product-category/flowers/' ) ); ?>">Flowers</a></li>
        <li><a href="<?php echo esc_url( home_url( '/product-category/edibles/' ) ); ?>">Edibles</a></li>
        <li><a href="<?php echo esc_url( home_url( '/product-category/concentrates/' ) ); ?>">Concentrates</a></li>
        <li><a href="<?php echo esc_url( home_url( '/product-category/vapes/' ) ); ?>">Vapes</a></li>
        <li><a href="<?php echo esc_url( home_url( '/shop/?on_sale=1' ) ); ?>">This Week's Deals</a></li>
      </ul>
    </div>

    <!-- Customer Care column -->
    <div class="hh-footer-col">
      <p class="hh-footer-col-title">Customer Care</p>
      <ul>
        <li><a href="<?php echo esc_url( home_url( '/faq/' ) ); ?>">FAQ</a></li>
        <li><a href="<?php echo esc_url( home_url( '/shipping/' ) ); ?>">Shipping Info</a></li>
        <li><a href="<?php echo esc_url( home_url( '/payment/' ) ); ?>">Payment Methods</a></li>
        <li><a href="<?php echo esc_url( home_url( '/reviews/' ) ); ?>">Reviews</a></li>
        <li><a href="<?php echo esc_url( home_url( '/my-account/' ) ); ?>">My Account</a></li>
      </ul>
    </div>

    <!-- About column -->
    <div class="hh-footer-col">
      <p class="hh-footer-col-title">About</p>
      <ul>
        <li><a href="<?php echo esc_url( home_url( '/about/' ) ); ?>">Our Story</a></li>
        <li><a href="<?php echo esc_url( home_url( '/blog/' ) ); ?>">Blog</a></li>
        <li><a href="<?php echo esc_url( home_url( '/rewards/' ) ); ?>">Rewards</a></li>
        <li><a href="<?php echo esc_url( home_url( '/affiliate/' ) ); ?>">Affiliate Program</a></li>
      </ul>
    </div>

    <!-- Contact column -->
    <div class="hh-footer-col">
      <p class="hh-footer-col-title">Contact</p>
      <ul>
        <li><a href="mailto:support@tokehaus.com">support@tokehaus.com</a></li>
        <li><a href="<?php echo esc_url( home_url( '/contact/' ) ); ?>">Send a Message</a></li>
      </ul>
      <div class="hh-footer-social" style="margin-top:20px;">
        <a href="https://instagram.com/tokehaus" aria-label="Instagram" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none"/></svg>
        </a>
        <a href="https://twitter.com/tokehaus" aria-label="Twitter / X" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.747l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>
        <a href="https://t.me/tokehaus" aria-label="Telegram" target="_blank" rel="noopener">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21.5 2.5 2.5 9.5l6.5 2.5 2 7 3-3.5 5 4 2.5-17z"/></svg>
        </a>
      </div>
    </div>

  </div>

  <div class="hh-footer-bottom">
    <p class="hh-footer-copy">© <?php echo esc_html( date( 'Y' ) ); ?> Toke Haus. All rights reserved. For adults 19+ only.</p>
    <nav class="hh-footer-legal">
      <a href="<?php echo esc_url( home_url( '/privacy-policy/' ) ); ?>">Privacy Policy</a>
      <a href="<?php echo esc_url( home_url( '/terms/' ) ); ?>">Terms of Service</a>
      <a href="<?php echo esc_url( home_url( '/disclaimer/' ) ); ?>">Disclaimer</a>
    </nav>
  </div>
</footer>
	<?php
}, 20 );
