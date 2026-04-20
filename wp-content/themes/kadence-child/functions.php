<?php
/**
 * Kadence Child — functions.php
 */

// ── Stylesheet enqueue ───────────────────────────────────────────────────────
add_action( 'wp_enqueue_scripts', function () {
	wp_enqueue_style(
		'kadence-child-style',
		get_stylesheet_uri(),
		[ 'kadence-global' ],
		wp_get_theme()->get( 'Version' )
	);

	// ── Google Fonts: Fraunces (editorial serif) + DM Sans (UI) ──
	wp_enqueue_style(
		'th-google-fonts',
		'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap',
		[],
		null
	);
}, 20 );

// ── ACF Storefront Control (options page + field group) ─────────────────────
require_once get_stylesheet_directory() . '/inc/acf-storefront-control.php';

// ── Storefront shortcodes ([th_field], [th_announcement]) ───────────────────
require_once get_stylesheet_directory() . '/inc/storefront-shortcodes.php';

/**
 * Storefront Control diagnostic notice.
 * Surfaces an admin notice when ACF is missing OR the custom menu hook didn't
 * register, so a missing menu never fails silently.
 */
add_action( 'admin_notices', function () {
	if ( ! current_user_can( 'edit_posts' ) ) { return; }

	$problems = [];
	if ( ! function_exists( 'acf_form' ) ) {
		$problems[] = 'ACF acf_form() is missing — plugin inactive or too old.';
	}
	if ( ! function_exists( 'acf_add_local_field_group' ) ) {
		$problems[] = 'ACF acf_add_local_field_group() is missing.';
	}

	// Verify the menu was registered under the expected slug.
	global $menu;
	$menu_ok = false;
	if ( is_array( $menu ) ) {
		foreach ( $menu as $item ) {
			if ( isset( $item[2] ) && $item[2] === 'storefront-control' ) { $menu_ok = true; break; }
		}
	}
	if ( ! $menu_ok && ! empty( $menu ) ) {
		$problems[] = 'Storefront Control menu was not registered (slug "storefront-control" not in $menu).';
	}

	if ( empty( $problems ) ) { return; }

	echo '<div class="notice notice-warning"><p><strong>Storefront Control:</strong></p><ul style="list-style:disc;padding-left:20px;">';
	foreach ( $problems as $p ) {
		echo '<li>' . esc_html( $p ) . '</li>';
	}
	echo '</ul></div>';
} );

// ── Editorial deals section shortcode ───────────────────────────────────────
require_once get_stylesheet_directory() . '/inc/editorial-deals.php';

// ── Sitewide footer: Trust Map ───────────────────────────────────────────────
require_once get_stylesheet_directory() . '/inc/footer-trust-map.php';

// ── Checkout focus mode: strip nav on cart + checkout ────────────────────────
add_filter( 'body_class', function ( $classes ) {
	if ( function_exists( 'is_cart' ) && is_cart() ) {
		$classes[] = 'th-checkout-mode';
	}
	if ( function_exists( 'is_checkout' ) && is_checkout() ) {
		$classes[] = 'th-checkout-mode';
	}
	return $classes;
} );

// ── Secure Checkout badge injected into nav on cart/checkout ─────────────────
add_filter( 'wp_nav_menu_items', function ( $items, $args ) {
	if ( ! isset( $args->theme_location ) || $args->theme_location !== 'primary' ) {
		return $items;
	}
	if ( ! function_exists( 'is_cart' ) ) return $items;
	if ( is_cart() || is_checkout() ) {
		return '<li class="menu-item th-secure-badge" role="none">'
			. '<span class="th-secure-text">'
			. '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>'
			. ' Secure Checkout'
			. '</span>'
			. '</li>';
	}
	return $items;
}, 9, 2 ); // priority 9 — before our search/account injection at 10

// ── WooCommerce star ratings on shop loop ────────────────────────────────────
add_action( 'woocommerce_after_shop_loop_item_title', 'woocommerce_template_loop_rating', 5 );

// ── Header utilities: search bar + My Account link in primary nav ────────────
require_once get_stylesheet_directory() . '/inc/header-utilities.php';

// ── Scroll header + sticky mobile + announce offset: JS on wp_footer ────────
add_action( 'wp_footer', function () {
	?>
	<script>
	(function(){
		var bar = document.querySelector('.hh-announce');
		var hdr = document.querySelector('#masthead');
		if (!hdr) return;

		// ── Set masthead top = announcement bar height ────────────────────────
		function setHeaderOffset() {
			var h = bar ? bar.offsetHeight : 0;
			document.documentElement.style.setProperty('--announce-h', h + 'px');
		}
		setHeaderOffset();
		window.addEventListener('resize', setHeaderOffset, { passive: true });

		// ── Scroll → solid bg on homepage (others are solid via CSS) ─────────
		function onScroll() {
			if (window.scrollY > 40) hdr.classList.add('is-scrolled');
			else hdr.classList.remove('is-scrolled');
		}
		window.addEventListener('scroll', onScroll, { passive: true });
		onScroll();

		// ── Mobile search toggle ──────────────────────────────────────────────
		var toggle = document.querySelector('.th-search-toggle');
		var searchBar = document.querySelector('.th-header-search');
		if (toggle && searchBar) {
			toggle.addEventListener('click', function(e) {
				e.preventDefault();
				searchBar.classList.toggle('th-search-open');
				if (searchBar.classList.contains('th-search-open')) {
					var inp = searchBar.querySelector('input');
					if (inp) inp.focus();
				}
			});
		}
	})();
	</script>
	<?php
} );
