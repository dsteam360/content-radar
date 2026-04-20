<?php
/**
 * Storefront shortcodes — ACF Storefront Control field rendering.
 *
 * Shortcodes:
 *  [th_field name="hero_headline" default="..." esc="html|url|attr|raw"]
 *  [th_announcement]       — announcement bar
 *  [th_category_strip]     — horizontal category quicknav below hero
 *  [th_faq]                — ACF repeater accordion for the FAQ page
 *  [th_reviews]            — latest WooCommerce product reviews
 *  [th_about_hero]         — about page hero + mission statement block
 *
 * Site-wide announcement bar is also injected via wp_body_open on every page
 * EXCEPT the homepage (which renders it via [th_announcement] in its content).
 *
 * @package kadence-child
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/* ---------------------------------------------------------------------------
 *  Helper: read an ACF option with scalar-only enforcement + fallback
 * ---------------------------------------------------------------------------*/

function th_sc_get_option( $name, $default = '' ) {
	if ( ! function_exists( 'get_field' ) ) { return $default; }
	$val = get_field( $name, 'option' );
	if ( is_array( $val ) || is_object( $val ) ) { return $default; }
	if ( $val === '' || $val === null || $val === false ) { return $default; }
	return $val;
}

/**
 * Build the announcement bar HTML (used by shortcode + global hook).
 * Returns empty string when the toggle is explicitly off.
 */
function th_build_announcement_bar() {
	$toggle = function_exists( 'get_field' ) ? get_field( 'announcement_toggle', 'option' ) : null;
	if ( $toggle === false ) { return ''; }

	$text = trim( (string) th_sc_get_option( 'announcement_text', '' ) );
	$link = trim( (string) th_sc_get_option( 'announcement_link', '' ) );

	if ( $text !== '' ) {
		$inner = wp_kses( $text, [ 'em' => [], 'strong' => [], 'span' => [ 'class' => true ] ] );
		$wrapped = '<span class="accent">' . $inner . '</span>';
		if ( $link !== '' ) {
			return '<div class="hh-announce"><a href="' . esc_url( $link ) . '" style="color:inherit;text-decoration:none;">' . $wrapped . '</a></div>';
		}
		return '<div class="hh-announce">' . $wrapped . '</div>';
	}

	return '<div class="hh-announce">'
		. 'Free shipping on orders <span class="accent">$150+</span>'
		. ' <span class="div">·</span> '
		. '<span class="accent">$25 off</span> your first order — sign up below'
		. ' <span class="div">·</span> '
		. 'Order before <span class="accent">11 AM PST</span> for same-day dispatch'
		. ' <span class="div">·</span> '
		. 'Weekly deals updated every Monday'
		. ' <span class="div">·</span> '
		. 'Support replies in <span class="accent">~1hr</span>'
		. '</div>';
}

/* ---------------------------------------------------------------------------
 *  Global announcement bar — fires on EVERY page via kadence_before_header
 *  so it appears above #masthead in the DOM (proper stacking order).
 *  The [th_announcement] shortcode in post-4212 has been removed; this is
 *  now the single source of truth for all pages.
 * ---------------------------------------------------------------------------*/

add_action( 'kadence_before_header', function () {
	echo th_build_announcement_bar(); // phpcs:ignore
}, 5 );

/* ---------------------------------------------------------------------------
 *  Shortcodes
 * ---------------------------------------------------------------------------*/

/**
 * [th_announcement] — renders announcement bar in post content.
 */
add_shortcode( 'th_announcement', function () {
	return th_build_announcement_bar();
} );

/**
 * [th_field name="..." default="..." esc="html|url|attr|raw"]
 * Generic option reader.
 */
add_shortcode( 'th_field', function ( $atts ) {
	$atts = shortcode_atts( [
		'name'    => '',
		'default' => '',
		'esc'     => 'html',
	], $atts, 'th_field' );

	if ( $atts['name'] === '' ) { return ''; }
	$val = th_sc_get_option( $atts['name'], $atts['default'] );

	switch ( $atts['esc'] ) {
		case 'url':  return esc_url( $val );
		case 'attr': return esc_attr( $val );
		case 'raw':  return $val;
		default:
			return wp_kses( $val, [
				'em'     => [],
				'strong' => [],
				'span'   => [ 'class' => true ],
				'br'     => [],
			] );
	}
} );

/**
 * [th_faq]
 * Renders the ACF repeater `faq_items` (question + answer) as an accordion.
 * Falls back to hard-coded essentials when the repeater is empty.
 */
add_shortcode( 'th_faq', function () {
	$items = function_exists( 'get_field' ) ? get_field( 'faq_items', 'option' ) : [];

	if ( empty( $items ) ) {
		$items = [
			[ 'question' => 'How long does shipping take?',               'answer' => 'Orders placed before 11 AM PST typically ship same day via Canada Post Xpresspost. Delivery is 1–3 business days for most provinces.' ],
			[ 'question' => 'Is my order discreetly packaged?',           'answer' => 'Yes. All orders are shipped in plain, unmarked packaging with no indication of the contents.' ],
			[ 'question' => 'What payment methods do you accept?',        'answer' => 'We accept Interac e-Transfer. Instructions are emailed after you place your order.' ],
			[ 'question' => 'What is your minimum order?',                'answer' => 'Our minimum order is $100. Orders over $150 qualify for free shipping.' ],
			[ 'question' => 'Do you offer a rewards programme?',          'answer' => 'Yes! You earn points on every purchase that can be redeemed for discounts on future orders.' ],
			[ 'question' => 'Can I track my order?',                      'answer' => 'Absolutely. A Canada Post tracking number is emailed to you as soon as your order ships.' ],
		];
	}

	ob_start();
	?>
	<div class="th-faq-wrap">
		<?php foreach ( $items as $i => $item ) :
			$q = wp_kses_post( $item['question'] ?? '' );
			$a = wp_kses_post( nl2br( $item['answer'] ?? '' ) );
			if ( ! $q ) { continue; }
			$uid = 'th-faq-' . $i;
		?>
		<div class="th-faq-item">
			<button class="th-faq-q" aria-expanded="false" aria-controls="<?php echo esc_attr( $uid ); ?>">
				<span><?php echo $q; ?></span>
				<svg class="th-faq-icon" aria-hidden="true" width="18" height="18" viewBox="0 0 18 18" fill="none"><path d="M3 6l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
			</button>
			<div class="th-faq-a" id="<?php echo esc_attr( $uid ); ?>" hidden>
				<div class="th-faq-a-inner"><?php echo $a; ?></div>
			</div>
		</div>
		<?php endforeach; ?>
	</div>

	<script>
	(function(){
		document.querySelectorAll('.th-faq-q').forEach(function(btn){
			btn.addEventListener('click', function(){
				var panel = document.getElementById(btn.getAttribute('aria-controls'));
				var open  = btn.getAttribute('aria-expanded') === 'true';
				// Close all others
				document.querySelectorAll('.th-faq-q').forEach(function(b){
					b.setAttribute('aria-expanded','false');
					b.closest('.th-faq-item').classList.remove('is-open');
					var p = document.getElementById(b.getAttribute('aria-controls'));
					if(p){ p.hidden=true; }
				});
				if(!open){
					btn.setAttribute('aria-expanded','true');
					btn.closest('.th-faq-item').classList.add('is-open');
					panel.hidden = false;
				}
			});
		});
	})();
	</script>
	<?php
	return ob_get_clean();
} );

/**
 * [th_reviews]
 * Renders the latest approved WooCommerce product reviews.
 */
add_shortcode( 'th_reviews', function ( $atts ) {
	$atts = shortcode_atts( [
		'count' => 24,
		'cols'  => 3,
	], $atts, 'th_reviews' );

	$comments = get_comments( [
		'status'   => 'approve',
		'type'     => 'review',
		'number'   => (int) $atts['count'],
		'orderby'  => 'comment_date',
		'order'    => 'DESC',
	] );

	if ( empty( $comments ) ) {
		return '<p class="th-reviews-empty">No reviews yet — be the first!</p>';
	}

	ob_start();
	?>
	<div class="th-reviews-grid" data-cols="<?php echo esc_attr( $atts['cols'] ); ?>">
		<?php foreach ( $comments as $review ) :
			$rating   = (int) get_comment_meta( $review->comment_ID, 'rating', true );
			$product  = get_post( $review->comment_post_ID );
			$img_id   = get_post_thumbnail_id( $review->comment_post_ID );
			$img_src  = $img_id ? wp_get_attachment_image_url( $img_id, [ 60, 60 ] ) : '';
			$stars    = str_repeat( '★', max( 0, min( 5, $rating ) ) ) . str_repeat( '☆', max( 0, 5 - $rating ) );
			$date     = date_i18n( 'M j, Y', strtotime( $review->comment_date ) );
			$verified = wc_review_is_from_verified_owner( $review->comment_ID );
		?>
		<div class="th-review-card">
			<div class="th-review-header">
				<div class="th-review-meta">
					<span class="th-review-author"><?php echo esc_html( $review->comment_author ); ?></span>
					<?php if ( $verified ) : ?>
						<span class="th-review-verified">✓ Verified</span>
					<?php endif; ?>
					<span class="th-review-date"><?php echo esc_html( $date ); ?></span>
				</div>
				<?php if ( $rating ) : ?>
					<span class="th-review-stars" aria-label="<?php echo esc_attr( $rating ); ?> out of 5"><?php echo esc_html( $stars ); ?></span>
				<?php endif; ?>
			</div>
			<?php if ( $review->comment_content ) : ?>
				<p class="th-review-body"><?php echo wp_kses_post( nl2br( $review->comment_content ) ); ?></p>
			<?php endif; ?>
			<?php if ( $product ) : ?>
				<a class="th-review-product" href="<?php echo esc_url( get_permalink( $product ) ); ?>">
					<?php if ( $img_src ) : ?>
						<img src="<?php echo esc_url( $img_src ); ?>" alt="" width="40" height="40" loading="lazy">
					<?php endif; ?>
					<span><?php echo esc_html( get_the_title( $product ) ); ?></span>
				</a>
			<?php endif; ?>
		</div>
		<?php endforeach; ?>
	</div>
	<?php
	return ob_get_clean();
} );

/**
 * [th_about_hero]
 * Renders the ACF-driven about page hero + mission statement section.
 */
add_shortcode( 'th_about_hero', function () {
	$hero_img  = th_sc_get_option( 'about_hero_image', '' );
	$mission   = th_sc_get_option( 'about_mission_statement',
		"Toke Haus was founded in 2010 with a simple mission: bring BC's finest cannabis directly to Canadians who deserve the best. Every batch we carry is hand-selected, third-party tested, and shipped with the discreet care you'd expect from a trusted dispensary."
	);
	$tagline   = th_sc_get_option( 'about_tagline', "BC's Most Trusted Online Dispensary" );
	$founded   = th_sc_get_option( 'about_founded_year', '2010' );

	ob_start();
	?>
	<div class="th-about-wrap">
		<?php if ( $hero_img ) : ?>
			<div class="th-about-hero-img">
				<img src="<?php echo esc_url( $hero_img ); ?>" alt="Toke Haus storefront" loading="eager">
			</div>
		<?php endif; ?>

		<div class="th-about-body">
			<div class="th-about-eyebrow">Est. <?php echo esc_html( $founded ); ?></div>
			<h2 class="th-about-tagline"><?php echo esc_html( $tagline ); ?></h2>
			<div class="th-about-mission"><?php echo wp_kses_post( nl2br( $mission ) ); ?></div>

			<div class="th-about-stats">
				<div class="th-about-stat"><span class="th-about-stat-num">15+</span><span class="th-about-stat-label">Years in business</span></div>
				<div class="th-about-stat"><span class="th-about-stat-num">50+</span><span class="th-about-stat-label">Premium strains</span></div>
				<div class="th-about-stat"><span class="th-about-stat-num">4.9★</span><span class="th-about-stat-label">Customer rating</span></div>
				<div class="th-about-stat"><span class="th-about-stat-num">100%</span><span class="th-about-stat-label">Discreet shipping</span></div>
			</div>
		</div>
	</div>
	<?php
	return ob_get_clean();
} );

/**
 * [th_category_strip]
 * Horizontal quicknav of 6 category tiles with thin SVG icons.
 * Full-bleed, dark-green text, mobile swipe-row.
 */
add_shortcode( 'th_category_strip', function () {
	$cats = [
		[
			'label' => 'Flowers',
			'url'   => '/product-category/flowers/',
			// Cannabis leaf: 5 filled leaflets radiating from a central stem
			'svg'   => '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="16" y1="28" x2="16" y2="18" stroke="#1A4A1A" stroke-width="2" stroke-linecap="round"/><path d="M16 18C15 15 12 12 8 11C9 15 12 18 16 18Z" fill="#1A4A1A"/><path d="M16 18C17 15 20 12 24 11C23 15 20 18 16 18Z" fill="#1A4A1A"/><path d="M16 15C14 12 11 10 7 10C8 13 11 16 16 15Z" fill="#1A4A1A"/><path d="M16 15C18 12 21 10 25 10C24 13 21 16 16 15Z" fill="#1A4A1A"/><path d="M16 12C15.5 9 15.5 6 16 4C16.5 6 16.5 9 16 12Z" fill="#1A4A1A"/></svg>',
		],
		[
			'label' => 'Edibles',
			'url'   => '/product-category/edibles/',
			// Cookie: circle with three chocolate chips
			'svg'   => '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="16" cy="17" r="10" stroke="#1A4A1A" stroke-width="2" fill="#1A4A1A" fill-opacity="0.08"/><circle cx="13" cy="14" r="2.5" fill="#1A4A1A"/><circle cx="20" cy="15" r="2.5" fill="#1A4A1A"/><circle cx="15" cy="21" r="2.5" fill="#1A4A1A"/></svg>',
		],
		[
			'label' => 'Concentrates',
			'url'   => '/product-category/concentrates/',
			// Glass jar with lid — clear container shape
			'svg'   => '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="14" width="14" height="12" rx="3" stroke="#1A4A1A" stroke-width="2" fill="#1A4A1A" fill-opacity="0.08"/><rect x="8" y="10" width="16" height="5" rx="2" stroke="#1A4A1A" stroke-width="2" fill="#1A4A1A" fill-opacity="0.15"/><path d="M11 20C11 20 13.5 18 16 20C18.5 22 21 20 21 20" stroke="#1A4A1A" stroke-width="1.75" stroke-linecap="round"/></svg>',
		],
		[
			'label' => 'Vapes',
			'url'   => '/product-category/vapes/',
			// Vape pen: slim rounded rectangle body + mouthpiece cap + button dot + vapor wisps
			'svg'   => '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="13" y="9" width="6" height="17" rx="3" stroke="#1A4A1A" stroke-width="2" fill="#1A4A1A" fill-opacity="0.08"/><rect x="14" y="6" width="4" height="4" rx="1.5" stroke="#1A4A1A" stroke-width="1.75" fill="#1A4A1A" fill-opacity="0.2"/><circle cx="16" cy="22" r="1.5" fill="#1A4A1A"/><path d="M10 5C10 3.5 12 3.5 12 2" stroke="#1A4A1A" stroke-width="1.5" stroke-linecap="round" opacity="0.5"/><path d="M7 6C7 4 9.5 4 9.5 2" stroke="#1A4A1A" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/></svg>',
		],
		[
			'label' => 'CBD',
			'url'   => '/product-category/cbd/',
			// Oil drop with a plus cross inside — universally read as CBD oil
			'svg'   => '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16 5C16 5 8 14 8 20C8 24.4 11.6 28 16 28C20.4 28 24 24.4 24 20C24 14 16 5 16 5Z" stroke="#1A4A1A" stroke-width="2" fill="#1A4A1A" fill-opacity="0.1"/><line x1="16" y1="15" x2="16" y2="24" stroke="#1A4A1A" stroke-width="2" stroke-linecap="round"/><line x1="11.5" y1="19.5" x2="20.5" y2="19.5" stroke="#1A4A1A" stroke-width="2" stroke-linecap="round"/></svg>',
		],
		[
			'label' => 'Deals',
			'url'   => '/shop/?on_sale=1',
			// Price tag with a % sign — bold, unmistakable
			'svg'   => '<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 5H15L27 17L19 25L7 13V5Z" stroke="#1A4A1A" stroke-width="2" stroke-linejoin="round" fill="#1A4A1A" fill-opacity="0.1"/><circle cx="11" cy="11" r="2" fill="#1A4A1A"/><circle cx="16.5" cy="16.5" r="1.75" stroke="#1A4A1A" stroke-width="1.75"/><circle cx="22" cy="22" r="1.75" stroke="#1A4A1A" stroke-width="1.75"/><line x1="14.5" y1="24" x2="24" y2="14.5" stroke="#1A4A1A" stroke-width="1.75" stroke-linecap="round"/></svg>',
		],
	];

	ob_start();
	?>
	<div class="th-cat-strip">
		<div class="th-cat-strip-inner">
			<?php foreach ( $cats as $cat ) : ?>
			<a class="th-cat-tile" href="<?php echo esc_url( $cat['url'] ); ?>">
				<span class="th-cat-icon"><?php echo $cat['svg']; // phpcs:ignore ?></span>
				<span class="th-cat-label"><?php echo esc_html( $cat['label'] ); ?></span>
			</a>
			<?php endforeach; ?>
		</div>
	</div>
	<?php
	return ob_get_clean();
} );
