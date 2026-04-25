<?php
/**
 * Editorial Deals Shortcode — [th_editorial_deals]
 *
 * Hybrid Direction 1 + 2:
 *  - Countdown timer in section header (resets every Sunday 23:59)
 *  - Hero card: chips, title, editorial copy, rating, price, inline weight selector, Add to Cart
 *  - Grid cards: same pattern — inline weight selector, editorial snippet, ratings, scarcity, full CTA
 *  - Scarcity chip ("Only X left") when stock ≤ 5
 *  - Savings = crossed-out original price only — no SAVE badge
 *  - Fully tag-driven (homepage-hero + homepage-deal tags); shortcode atts allow overrides
 *
 * Class prefix: `.th-ed-` (editorial deals) — avoids collision with legacy `.hh-`.
 *
 * @package kadence-child
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/* ---------------------------------------------------------------------------
 *  Query helpers
 * ---------------------------------------------------------------------------*/

function th_ed_hero_tag() { return apply_filters( 'th_ed_hero_tag', 'homepage-hero' ); }
function th_ed_grid_tag() { return apply_filters( 'th_ed_grid_tag', 'homepage-deal' ); }

/**
 * Fetch in-stock, publicly visible product IDs matching a given product_tag slug.
 */
function th_ed_get_tagged_product_ids( $tag_slug, $limit, $exclude = [] ) {
	if ( empty( $tag_slug ) ) { return []; }
	$ids = wc_get_products( [
		'limit'        => $limit,
		'status'       => 'publish',
		'stock_status' => 'instock',
		'visibility'   => 'catalog',
		'return'       => 'ids',
		'exclude'      => $exclude,
		'tag'          => [ $tag_slug ],
		'orderby'      => 'menu_order date',
		'order'        => 'ASC',
	] );
	return is_array( $ids ) ? $ids : [];
}

/**
 * Generic fallback: featured+on-sale → featured → top-sales.
 */
function th_ed_get_fallback_product_ids( $limit, $exclude = [] ) {
	$args = [
		'limit'        => $limit,
		'status'       => 'publish',
		'stock_status' => 'instock',
		'visibility'   => 'catalog',
		'return'       => 'ids',
		'exclude'      => $exclude,
	];
	$ids = wc_get_products( array_merge( $args, [
		'featured' => true, 'on_sale' => true,
		'orderby'  => 'meta_value_num', 'meta_key' => 'total_sales', 'order' => 'DESC',
	] ) );
	if ( count( $ids ) >= $limit ) { return array_slice( $ids, 0, $limit ); }

	$more = wc_get_products( array_merge( $args, [
		'featured' => true, 'exclude' => array_merge( $exclude, $ids ),
		'orderby'  => 'meta_value_num', 'meta_key' => 'total_sales', 'order' => 'DESC',
	] ) );
	$ids = array_merge( $ids, $more );
	if ( count( $ids ) >= $limit ) { return array_slice( $ids, 0, $limit ); }

	$pad = wc_get_products( array_merge( $args, [
		'exclude' => array_merge( $exclude, $ids ),
		'orderby' => 'meta_value_num', 'meta_key' => 'total_sales', 'order' => 'DESC',
	] ) );
	return array_slice( array_merge( $ids, $pad ), 0, $limit );
}

/**
 * Read a product ID from the ACF "Storefront Control" hero field.
 */
function th_ed_get_acf_hero_id() {
	if ( ! function_exists( 'get_field' ) ) { return 0; }
	$val = get_field( 'hero_deal_selection', 'option' );
	if ( empty( $val ) ) { return 0; }
	$pid = (int) ( is_object( $val ) ? $val->ID : $val );
	if ( ! $pid ) { return 0; }
	$p = wc_get_product( $pid );
	return ( $p && $p->is_visible() ) ? $pid : 0;
}

/**
 * Read an ordered list of product IDs from the ACF "Storefront Control" grid field.
 */
function th_ed_get_acf_grid_ids( $exclude = [] ) {
	if ( ! function_exists( 'get_field' ) ) { return []; }
	$val = get_field( 'grid_deals_selection', 'option' );
	if ( empty( $val ) || ! is_array( $val ) ) { return []; }
	$out = [];
	foreach ( $val as $item ) {
		$pid = (int) ( is_object( $item ) ? $item->ID : $item );
		if ( ! $pid || in_array( $pid, $exclude, true ) || in_array( $pid, $out, true ) ) { continue; }
		$p = wc_get_product( $pid );
		if ( $p && $p->is_visible() ) { $out[] = $pid; }
	}
	return $out;
}

/**
 * Resolve the hero product ID.
 * Priority: explicit $hero_id arg → ACF Storefront Control → hero product tag → fallback.
 */
function th_ed_resolve_hero_id( $hero_id = 0, $hero_tag = '' ) {
	if ( $hero_id ) {
		$p = wc_get_product( $hero_id );
		if ( $p && $p->is_visible() ) { return (int) $hero_id; }
	}
	$acf_id = th_ed_get_acf_hero_id();
	if ( $acf_id ) { return $acf_id; }
	$tag = $hero_tag !== '' ? $hero_tag : th_ed_hero_tag();
	$ids = th_ed_get_tagged_product_ids( $tag, 1 );
	if ( ! empty( $ids ) ) { return (int) $ids[0]; }
	$fb = th_ed_get_fallback_product_ids( 1 );
	return ! empty( $fb ) ? (int) $fb[0] : 0;
}

/**
 * Resolve the grid product IDs.
 * Priority: explicit ids → ACF Storefront Control → grid product tag → fallback top sellers.
 */
function th_ed_resolve_grid_ids( $count, $exclude, $explicit_ids = [], $grid_tag = '' ) {
	$ids = [];

	if ( ! empty( $explicit_ids ) ) {
		foreach ( $explicit_ids as $pid ) {
			if ( count( $ids ) >= $count ) { break; }
			$pid = (int) $pid;
			if ( in_array( $pid, $exclude, true ) || in_array( $pid, $ids, true ) ) { continue; }
			$p = wc_get_product( $pid );
			if ( $p && $p->is_visible() ) { $ids[] = $pid; }
		}
	}

	if ( count( $ids ) < $count ) {
		$acf = th_ed_get_acf_grid_ids( array_merge( $exclude, $ids ) );
		foreach ( $acf as $pid ) {
			if ( count( $ids ) >= $count ) { break; }
			$ids[] = (int) $pid;
		}
	}

	if ( count( $ids ) < $count ) {
		$tag    = $grid_tag !== '' ? $grid_tag : th_ed_grid_tag();
		$tagged = th_ed_get_tagged_product_ids( $tag, $count, array_merge( $exclude, $ids ) );
		foreach ( $tagged as $pid ) {
			if ( count( $ids ) >= $count ) { break; }
			$ids[] = (int) $pid;
		}
	}

	if ( count( $ids ) < $count ) {
		$needed = $count - count( $ids );
		$fb     = th_ed_get_fallback_product_ids( $needed, array_merge( $exclude, $ids ) );
		$ids    = array_merge( $ids, array_map( 'intval', $fb ) );
	}

	return array_slice( $ids, 0, $count );
}

/**
 * Pull the chip data (grade, strain, THC) for a given product.
 */
function th_ed_get_chips( $product_id ) {
	$out = [ 'grade' => null, 'strain' => null, 'thc' => null ];

	$cats = wp_get_post_terms( $product_id, 'product_cat', [ 'fields' => 'names' ] );
	if ( ! is_wp_error( $cats ) ) {
		foreach ( $cats as $c ) {
			$u = strtoupper( $c );
			if ( 'AAAA' === $u || 'AAA' === $u ) { $out['grade'] = $u; break; }
		}
	}

	$strain_terms = wp_get_post_terms( $product_id, 'pa_flower-type', [ 'fields' => 'names' ] );
	if ( ! is_wp_error( $strain_terms ) && ! empty( $strain_terms ) ) {
		$out['strain'] = $strain_terms[0];
	}

	$thc_terms = wp_get_post_terms( $product_id, 'pa_thc', [ 'fields' => 'names' ] );
	if ( ! is_wp_error( $thc_terms ) && ! empty( $thc_terms ) ) {
		$out['thc'] = $thc_terms[0];
	}

	return $out;
}

/**
 * Build variation data for the frontend JS weight selector.
 */
function th_ed_get_variation_data( $product ) {
	if ( ! $product->is_type( 'variable' ) ) { return null; }

	$variations = $product->get_available_variations();
	if ( empty( $variations ) ) { return null; }

	$attr_counts = [];
	foreach ( $variations as $v ) {
		foreach ( $v['attributes'] as $k => $val ) {
			if ( empty( $val ) ) { continue; }
			$attr_counts[ $k ] = ( $attr_counts[ $k ] ?? 0 ) + 1;
		}
	}
	if ( empty( $attr_counts ) ) { return null; }
	arsort( $attr_counts );
	$attr_key   = array_key_first( $attr_counts );
	$attr_short = str_replace( 'attribute_', '', $attr_key );

	$options = [];
	foreach ( $variations as $v ) {
		$label = $v['attributes'][ $attr_key ] ?? '';
		if ( '' === $label ) { continue; }
		$vid   = (int) $v['variation_id'];
		$vprod = wc_get_product( $vid );
		if ( ! $vprod ) { continue; }
		$options[] = [
			'id'            => $vid,
			'label'         => $label,
			'price'         => (float) $vprod->get_price(),
			'regular_price' => (float) $vprod->get_regular_price(),
			'sale_price'    => $vprod->get_sale_price() !== '' ? (float) $vprod->get_sale_price() : null,
			'in_stock'      => $vprod->is_in_stock(),
		];
	}
	if ( empty( $options ) ) { return null; }

	if ( 'weight' === $attr_short ) {
		usort( $options, function ( $a, $b ) {
			preg_match( '/([\d.]+)/', $a['label'], $ma );
			preg_match( '/([\d.]+)/', $b['label'], $mb );
			return ( (float) ( $ma[1] ?? 0 ) ) <=> ( (float) ( $mb[1] ?? 0 ) );
		} );
	}

	return [
		'attribute_key'  => $attr_key,
		'attribute_name' => $attr_short,
		'options'        => $options,
	];
}

/* ---------------------------------------------------------------------------
 *  New helpers — countdown, scarcity, editorial copy
 * ---------------------------------------------------------------------------*/

/**
 * Next Sunday 23:59:59 in WP timezone as a Unix timestamp.
 * If today IS Sunday and we haven't hit midnight, target = tonight.
 */
function th_ed_get_countdown_target() {
	try {
		$tz = function_exists( 'wp_timezone' ) ? wp_timezone() : new DateTimeZone( get_option( 'timezone_string' ) ?: 'UTC' );
	} catch ( Exception $e ) {
		$tz = new DateTimeZone( 'UTC' );
	}
	$now       = new DateTime( 'now', $tz );
	$dow       = (int) $now->format( 'w' ); // 0 = Sunday
	$days_left = 0 === $dow ? 0 : 7 - $dow;
	$target    = clone $now;
	if ( $days_left > 0 ) {
		$target->modify( "+{$days_left} days" );
	}
	$target->setTime( 23, 59, 59 );
	// Edge case: already past Sunday midnight.
	if ( $target->getTimestamp() <= $now->getTimestamp() ) {
		$target->modify( '+7 days' );
	}
	return $target->getTimestamp();
}

/**
 * Return "Only X left" when stock ≤ 5 and stock management is on, else ''.
 */
function th_ed_get_scarcity_label( $product ) {
	if ( ! $product->managing_stock() ) { return ''; }
	$qty = $product->get_stock_quantity();
	if ( is_null( $qty ) || $qty <= 0 || $qty > 5 ) { return ''; }
	return 'Only ' . (int) $qty . ' left';
}

/* ---------------------------------------------------------------------------
 *  Shared render helpers
 * ---------------------------------------------------------------------------*/

function th_ed_render_chip( $type, $label ) {
	$extra = '';
	if ( 'grade' === $type ) {
		$extra = ' th-ed-chip-grade-' . strtolower( esc_attr( $label ) );
	}
	return sprintf( '<span class="th-ed-chip th-ed-chip-%s%s">%s</span>', esc_attr( $type ), $extra, esc_html( $label ) );
}

/**
 * Price block: old (strikethrough) + current price. No SAVE badge.
 */
function th_ed_render_price_block( $product, $class = '' ) {
	$regular = (float) $product->get_regular_price();
	$sale    = $product->get_sale_price() !== '' ? (float) $product->get_sale_price() : null;

	if ( $product->is_type( 'variable' ) ) {
		$prices  = $product->get_variation_prices( true );
		$min     = $prices['price'] ? min( $prices['price'] ) : 0;
		$min_r   = $prices['regular_price'] ? min( $prices['regular_price'] ) : 0;
		$on_sale = $product->is_on_sale();
		ob_start(); ?>
		<div class="th-ed-price <?php echo esc_attr( $class ); ?>" data-price-display>
			<?php if ( $on_sale && $min_r > $min ) : ?>
				<span class="th-ed-price-old">$<?php echo esc_html( number_format( $min_r, 0 ) ); ?></span>
				<span class="th-ed-price-now">$<?php echo esc_html( number_format( $min, 0 ) ); ?></span>
			<?php else : ?>
				<span class="th-ed-price-now">From $<?php echo esc_html( number_format( $min, 0 ) ); ?></span>
			<?php endif; ?>
		</div>
		<?php
		return ob_get_clean();
	}

	ob_start(); ?>
	<div class="th-ed-price <?php echo esc_attr( $class ); ?>" data-price-display>
		<?php if ( $sale && $regular > $sale ) : ?>
			<span class="th-ed-price-old">$<?php echo esc_html( number_format( $regular, 0 ) ); ?></span>
			<span class="th-ed-price-now">$<?php echo esc_html( number_format( $sale, 0 ) ); ?></span>
		<?php else : ?>
			<span class="th-ed-price-now">$<?php echo esc_html( number_format( (float) $product->get_price(), 0 ) ); ?></span>
		<?php endif; ?>
	</div>
	<?php
	return ob_get_clean();
}

/**
 * Inline star rating row. Returns '' if no reviews.
 * $prefix controls CSS class names so the same function works for hero + card.
 */
function th_ed_render_rating( $product, $prefix = 'th-ed' ) {
	$rating  = (float) $product->get_average_rating();
	$reviews = (int) $product->get_review_count();
	if ( $reviews <= 0 ) { return ''; }
	$full  = floor( $rating );
	$stars = '';
	for ( $i = 1; $i <= 5; $i++ ) {
		$stars .= $i <= $full ? '★' : '☆';
	}
	return sprintf(
		'<div class="%1$s-rating"><span class="%1$s-stars" aria-label="%2$s out of 5">%3$s</span><span class="%1$s-rating-count">%4$s · %5$s</span></div>',
		esc_attr( $prefix ),
		esc_attr( number_format( $rating, 1 ) ),
		$stars,
		esc_html( number_format( $rating, 1 ) ),
		esc_html( $reviews . ' review' . ( 1 === $reviews ? '' : 's' ) )
	);
}

/**
 * Inline weight selector pill group. Shared between hero and grid cards.
 * Pass $extra_class = 'th-ed-weights-sm' on grid cards for compact sizing.
 */
function th_ed_render_weights( $var, $extra_class = '' ) {
	if ( ! $var ) { return ''; }
	ob_start(); ?>
	<div class="th-ed-weights <?php echo esc_attr( $extra_class ); ?>"
		role="radiogroup"
		aria-label="<?php echo esc_attr( ucfirst( $var['attribute_name'] ) ); ?>">
		<?php foreach ( $var['options'] as $i => $opt ) : ?>
			<button type="button"
				class="th-ed-weight<?php echo 0 === $i ? ' is-selected' : ''; ?><?php echo ! $opt['in_stock'] ? ' is-oos' : ''; ?>"
				role="radio"
				aria-checked="<?php echo 0 === $i ? 'true' : 'false'; ?>"
				data-variation-id="<?php echo esc_attr( $opt['id'] ); ?>"
				data-price="<?php echo esc_attr( $opt['price'] ); ?>"
				data-regular="<?php echo esc_attr( $opt['regular_price'] ); ?>"
				data-sale="<?php echo esc_attr( $opt['sale_price'] ?? '' ); ?>"
				<?php echo ! $opt['in_stock'] ? 'disabled' : ''; ?>>
				<?php echo esc_html( $opt['label'] ); ?>
			</button>
		<?php endforeach; ?>
	</div>
	<?php
	return ob_get_clean();
}

/* ---------------------------------------------------------------------------
 *  Card renderers
 * ---------------------------------------------------------------------------*/

function th_ed_render_hero_card( $product_id ) {
	$product  = wc_get_product( $product_id );
	if ( ! $product ) { return ''; }

	$chips    = th_ed_get_chips( $product_id );
	$var      = th_ed_get_variation_data( $product );
	$img_id   = $product->get_image_id();
	// Use 510×510 for hero — natural size must be ≥ rendered size to avoid upscaling blur.
	$img_src  = $img_id ? ( wp_get_attachment_image_url( $img_id, [ 510, 510 ] ) ?: wp_get_attachment_image_url( $img_id, 'woocommerce_single' ) ) : wc_placeholder_img_src();
	$url      = get_permalink( $product_id );
	$scarcity = th_ed_get_scarcity_label( $product );
	$short    = wp_strip_all_tags( $product->get_short_description() );
	$short    = $short ? wp_trim_words( $short, 28, '…' ) : '';

	ob_start(); ?>
	<article class="th-ed-hero" data-product-id="<?php echo esc_attr( $product_id ); ?>"
		<?php if ( $var ) : ?>data-variation-attr="<?php echo esc_attr( $var['attribute_name'] ); ?>"<?php endif; ?>>

		<a class="th-ed-hero-media" href="<?php echo esc_url( $url ); ?>">
			<img src="<?php echo esc_url( $img_src ); ?>"
				alt="<?php echo esc_attr( $product->get_name() ); ?>"
				loading="lazy">
		</a>

		<div class="th-ed-hero-body">
			<div class="th-ed-chips">
				<?php if ( $chips['grade'] )  { echo th_ed_render_chip( 'grade', $chips['grade'] ); } ?>
				<?php if ( $chips['strain'] ) { echo th_ed_render_chip( 'strain', $chips['strain'] ); } ?>
				<?php if ( $chips['thc'] )    { echo th_ed_render_chip( 'thc', $chips['thc'] . ( false === strpos( $chips['thc'], '%' ) ? '% THC' : ' THC' ) ); } ?>
			</div>

			<h3 class="th-ed-hero-title">
				<a href="<?php echo esc_url( $url ); ?>"><?php echo esc_html( $product->get_name() ); ?></a>
			</h3>

			<?php if ( $short ) : ?>
				<p class="th-ed-editorial"><?php echo esc_html( $short ); ?></p>
			<?php endif; ?>

			<?php echo th_ed_render_rating( $product, 'th-ed' ); ?>

			<?php echo th_ed_render_price_block( $product, 'th-ed-price-hero' ); ?>

			<?php if ( $scarcity ) : ?>
				<p class="th-ed-scarcity"><?php echo esc_html( $scarcity ); ?></p>
			<?php endif; ?>

			<?php echo th_ed_render_weights( $var ); ?>

			<?php if ( $var ) : ?>
				<button type="button" class="th-ed-cta th-ed-cta-hero" data-add-variation
					data-variation-id="<?php echo esc_attr( $var['options'][0]['id'] ); ?>">
					Add to Cart
				</button>
			<?php else : ?>
				<button type="button" class="th-ed-cta th-ed-cta-hero" data-add-simple
					data-product-id="<?php echo esc_attr( $product_id ); ?>">
					Add to Cart
				</button>
			<?php endif; ?>
		</div>
	</article>
	<?php
	return ob_get_clean();
}

function th_ed_render_grid_card( $product_id ) {
	$product  = wc_get_product( $product_id );
	if ( ! $product ) { return ''; }

	$chips    = th_ed_get_chips( $product_id );
	$var      = th_ed_get_variation_data( $product );
	$img_id   = $product->get_image_id();
	// Use 510×510 — natural size must be ≥ rendered size to avoid upscaling blur.
	$img_src  = $img_id ? ( wp_get_attachment_image_url( $img_id, [ 510, 510 ] ) ?: wp_get_attachment_image_url( $img_id, [ 400, 400 ] ) ) : wc_placeholder_img_src();
	$url      = get_permalink( $product_id );
	$scarcity = th_ed_get_scarcity_label( $product );
	$short    = wp_strip_all_tags( $product->get_short_description() );
	$short    = $short ? wp_trim_words( $short, 16, '…' ) : '';

	ob_start(); ?>
	<article class="th-ed-card" data-product-id="<?php echo esc_attr( $product_id ); ?>">

		<a class="th-ed-card-media" href="<?php echo esc_url( $url ); ?>">
			<img src="<?php echo esc_url( $img_src ); ?>"
				alt="<?php echo esc_attr( $product->get_name() ); ?>"
				loading="lazy">
			<?php if ( $chips['grade'] ) : ?>
				<span class="th-ed-card-grade th-ed-card-grade-<?php echo esc_attr( strtolower( $chips['grade'] ) ); ?>"><?php echo esc_html( $chips['grade'] ); ?></span>
			<?php endif; ?>
		</a>

		<div class="th-ed-card-body">
			<div class="th-ed-card-chips">
				<?php if ( $chips['strain'] ) { echo th_ed_render_chip( 'strain', $chips['strain'] ); } ?>
				<?php if ( $chips['thc'] )    { echo th_ed_render_chip( 'thc', $chips['thc'] . ( false === strpos( $chips['thc'], '%' ) ? '%' : '' ) ); } ?>
			</div>

			<h4 class="th-ed-card-title">
				<a href="<?php echo esc_url( $url ); ?>"><?php echo esc_html( $product->get_name() ); ?></a>
			</h4>

			<?php if ( $short ) : ?>
				<p class="th-ed-card-editorial"><?php echo esc_html( $short ); ?></p>
			<?php endif; ?>

			<?php echo th_ed_render_rating( $product, 'th-ed-card' ); ?>

			<?php echo th_ed_render_price_block( $product ); ?>

			<?php if ( $scarcity ) : ?>
				<p class="th-ed-scarcity th-ed-scarcity-sm"><?php echo esc_html( $scarcity ); ?></p>
			<?php endif; ?>

			<?php echo th_ed_render_weights( $var, 'th-ed-weights-sm' ); ?>

			<?php if ( $var ) : ?>
				<button type="button" class="th-ed-cta th-ed-cta-card" data-add-variation
					data-variation-id="<?php echo esc_attr( $var['options'][0]['id'] ); ?>">
					Add to Cart
				</button>
			<?php else : ?>
				<button type="button" class="th-ed-cta th-ed-cta-card" data-add-simple
					data-product-id="<?php echo esc_attr( $product_id ); ?>">
					Add to Cart
				</button>
			<?php endif; ?>
		</div>
	</article>
	<?php
	return ob_get_clean();
}

/* ---------------------------------------------------------------------------
 *  Section shortcode
 * ---------------------------------------------------------------------------*/

function th_ed_render_section( $atts = [] ) {
	$atts = shortcode_atts( [
		'hero_id'   => 0,
		'hero_tag'  => '',
		'grid_ids'  => '',
		'grid_tag'  => '',
		'title'     => "This Week's Deals",
		'eyebrow'   => 'Curated by Toke Haus',
	], is_array( $atts ) ? $atts : [], 'editorial_deals' );

	$hero_id = th_ed_resolve_hero_id( (int) $atts['hero_id'], (string) $atts['hero_tag'] );
	if ( ! $hero_id ) { return ''; }

	$explicit_grid  = array_filter( array_map( 'trim', explode( ',', (string) $atts['grid_ids'] ) ) );
	$supporting_ids = th_ed_resolve_grid_ids( 4, [ $hero_id ], $explicit_grid, (string) $atts['grid_tag'] );
	$countdown_ts   = th_ed_get_countdown_target();

	ob_start(); ?>
	<section class="th-ed-deals">
		<div class="th-ed-container">
			<header class="th-ed-header">
				<div class="th-ed-header-left">
					<span class="th-ed-eyebrow"><?php echo esc_html( $atts['eyebrow'] ); ?></span>
					<h2 class="th-ed-title"><?php echo esc_html( $atts['title'] ); ?></h2>
				</div>
				<div class="th-ed-header-right">
					<div class="th-ed-countdown" data-countdown="<?php echo esc_attr( $countdown_ts ); ?>">
						<span class="th-ed-countdown-label">Deals reset in</span>
						<span class="th-ed-countdown-time">
							<span class="th-ed-countdown-unit"><b data-cd-d>0</b><em>d</em></span>
							<span class="th-ed-countdown-sep">:</span>
							<span class="th-ed-countdown-unit"><b data-cd-h>00</b><em>h</em></span>
							<span class="th-ed-countdown-sep">:</span>
							<span class="th-ed-countdown-unit"><b data-cd-m>00</b><em>m</em></span>
							<span class="th-ed-countdown-sep">:</span>
							<span class="th-ed-countdown-unit"><b data-cd-s>00</b><em>s</em></span>
						</span>
					</div>
					<a class="th-ed-view-all" href="<?php echo esc_url( wc_get_page_permalink( 'shop' ) ); ?>?on_sale=1">View all deals →</a>
				</div>
			</header>

			<div class="th-ed-layout">
				<div class="th-ed-hero-wrap">
					<?php echo th_ed_render_hero_card( $hero_id ); ?>
				</div>
				<div class="th-ed-grid" data-swipe-row>
					<?php foreach ( $supporting_ids as $sid ) { echo th_ed_render_grid_card( $sid ); } ?>
				</div>
			</div>
		</div>

		<div class="th-ed-toast" data-toast hidden role="status" aria-live="polite"></div>
	</section>

	<script>
	(function () {
		if ( window.__thEdInit ) { return; }
		window.__thEdInit = true;

		const ajaxUrl = <?php echo wp_json_encode( admin_url( 'admin-ajax.php' ) ); ?>;
		const nonce   = <?php echo wp_json_encode( wp_create_nonce( 'th_ed_nonce' ) ); ?>;

		// ── Countdown timer ────────────────────────────────────────────────────
		(function () {
			const el = document.querySelector( '.th-ed-countdown[data-countdown]' );
			if ( ! el ) { return; }
			const target = parseInt( el.dataset.countdown, 10 ) * 1000;
			const dEl = el.querySelector( '[data-cd-d]' );
			const hEl = el.querySelector( '[data-cd-h]' );
			const mEl = el.querySelector( '[data-cd-m]' );
			const sEl = el.querySelector( '[data-cd-s]' );

			function tick() {
				const diff = target - Date.now();
				if ( diff <= 0 ) {
					dEl.textContent = '0'; hEl.textContent = '00';
					mEl.textContent = '00'; sEl.textContent = '00';
					return;
				}
				const d = Math.floor( diff / 86400000 );
				const h = Math.floor( ( diff % 86400000 ) / 3600000 );
				const m = Math.floor( ( diff % 3600000 ) / 60000 );
				const s = Math.floor( ( diff % 60000 ) / 1000 );
				dEl.textContent = d;
				hEl.textContent = String( h ).padStart( 2, '0' );
				mEl.textContent = String( m ).padStart( 2, '0' );
				sEl.textContent = String( s ).padStart( 2, '0' );
			}
			tick();
			setInterval( tick, 1000 );
		})();

		// ── Toast ──────────────────────────────────────────────────────────────
		function showToast( msg, isError ) {
			const toast = document.querySelector( '.th-ed-toast' );
			if ( ! toast ) { return; }
			toast.textContent = msg;
			toast.hidden = false;
			toast.classList.toggle( 'is-error', !! isError );
			clearTimeout( toast.__t );
			toast.__t = setTimeout( () => { toast.hidden = true; }, 3000 );
		}

		function updateCartFragments( fragments ) {
			if ( ! fragments ) { return; }
			for ( const sel in fragments ) {
				document.querySelectorAll( sel ).forEach( el => {
					const tpl = document.createElement( 'div' );
					tpl.innerHTML = fragments[ sel ];
					if ( tpl.firstElementChild ) { el.replaceWith( tpl.firstElementChild ); }
				} );
			}
		}

		function addToCart( payload, btn ) {
			if ( btn ) { btn.disabled = true; btn.classList.add( 'is-loading' ); }
			const fd = new FormData();
			fd.append( 'action', 'th_ed_add' );
			fd.append( '_nonce', nonce );
			for ( const k in payload ) { fd.append( k, payload[ k ] ); }
			return fetch( ajaxUrl, { method: 'POST', credentials: 'same-origin', body: fd } )
				.then( r => r.json() )
				.then( res => {
					if ( btn ) { btn.disabled = false; btn.classList.remove( 'is-loading' ); }
					if ( res && res.success ) {
						showToast( res.data.message || 'Added to cart ✓' );
						updateCartFragments( res.data.fragments );
						document.body.dispatchEvent( new CustomEvent( 'wc_fragments_refreshed' ) );
						// ✓ Added success flash on the button
						if ( btn ) {
							const orig = btn.textContent;
							btn.classList.add( 'is-added' );
							btn.textContent = '✓ Added';
							setTimeout( () => {
								btn.classList.remove( 'is-added' );
								btn.textContent = orig;
							}, 2000 );
						}
					} else {
						showToast( ( res && res.data && res.data.message ) || 'Could not add to cart', true );
					}
				} )
				.catch( () => {
					if ( btn ) { btn.disabled = false; btn.classList.remove( 'is-loading' ); }
					showToast( 'Network error', true );
				} );
		}

		// ── Unified card initialiser (hero + grid cards share the same logic) ──
		function initCard( card ) {
			const weights  = card.querySelectorAll( '.th-ed-weight' );
			const cta      = card.querySelector( '[data-add-variation]' );
			const priceEl  = card.querySelector( '[data-price-display]' );

			// Weight pill selection
			weights.forEach( w => {
				w.addEventListener( 'click', () => {
					if ( w.disabled ) { return; }
					weights.forEach( x => {
						x.classList.remove( 'is-selected' );
						x.setAttribute( 'aria-checked', 'false' );
					} );
					w.classList.add( 'is-selected' );
					w.setAttribute( 'aria-checked', 'true' );

					// Live price update
					if ( priceEl ) {
						const price = parseFloat( w.dataset.price );
						const reg   = parseFloat( w.dataset.regular );
						const sale  = w.dataset.sale !== '' ? parseFloat( w.dataset.sale ) : null;
						let html;
						if ( sale && reg > sale ) {
							html = '<span class="th-ed-price-old">$' + reg.toFixed( 0 ) + '</span>' +
								'<span class="th-ed-price-now">$' + sale.toFixed( 0 ) + '</span>';
						} else {
							html = '<span class="th-ed-price-now">$' + price.toFixed( 0 ) + '</span>';
						}
						priceEl.innerHTML = html;
					}

					// Hero CTA: update variation id + weight label
					if ( cta ) {
						cta.dataset.variationId = w.dataset.variationId;
						const wl = cta.querySelector( '.th-ed-cta-weight' );
						if ( wl ) { wl.textContent = '— ' + w.textContent.trim(); }
					}
				} );
			} );

			// Variation add-to-cart
			if ( cta ) {
				cta.addEventListener( 'click', () => {
					const vid = cta.dataset.variationId;
					if ( ! vid ) { return; }
					addToCart( { variation_id: vid }, cta );
				} );
			}

			// Simple (no-variation) add-to-cart
			const simpleBtn = card.querySelector( '[data-add-simple]' );
			if ( simpleBtn ) {
				simpleBtn.addEventListener( 'click', () => {
					const pid = simpleBtn.dataset.productId;
					if ( ! pid ) { return; }
					addToCart( { product_id: pid }, simpleBtn );
				} );
			}
		}

		document.querySelectorAll( '.th-ed-hero, .th-ed-card' ).forEach( initCard );

	})();
	</script>
	<?php
	return ob_get_clean();
}
add_shortcode( 'editorial_deals', 'th_ed_render_section' );
add_shortcode( 'th_editorial_deals', 'th_ed_render_section' ); // back-compat alias

/* ---------------------------------------------------------------------------
 *  AJAX add-to-cart endpoint
 * ---------------------------------------------------------------------------*/

function th_ed_ajax_add() {
	check_ajax_referer( 'th_ed_nonce', '_nonce' );

	$variation_id = isset( $_POST['variation_id'] ) ? absint( $_POST['variation_id'] ) : 0;
	$product_id   = isset( $_POST['product_id'] )   ? absint( $_POST['product_id'] )   : 0;
	$qty          = 1;

	if ( ! $variation_id && ! $product_id ) {
		wp_send_json_error( [ 'message' => 'No product specified' ] );
	}

	if ( $variation_id ) {
		$variation = wc_get_product( $variation_id );
		if ( ! $variation || ! $variation->is_type( 'variation' ) ) {
			wp_send_json_error( [ 'message' => 'Invalid variation' ] );
		}
		$parent_id  = $variation->get_parent_id();
		$attributes = $variation->get_variation_attributes();
		$added      = WC()->cart->add_to_cart( $parent_id, $qty, $variation_id, $attributes );
	} else {
		$added = WC()->cart->add_to_cart( $product_id, $qty );
	}

	if ( ! $added ) {
		wp_send_json_error( [ 'message' => 'Could not add to cart. Out of stock?' ] );
	}

	ob_start();
	woocommerce_mini_cart();
	$mini_cart = ob_get_clean();

	$fragments = apply_filters( 'woocommerce_add_to_cart_fragments', [
		'div.widget_shopping_cart_content' => '<div class="widget_shopping_cart_content">' . $mini_cart . '</div>',
	] );

	wp_send_json_success( [
		'message'    => 'Added to cart',
		'cart_count' => WC()->cart->get_cart_contents_count(),
		'cart_total' => wp_strip_all_tags( WC()->cart->get_cart_total() ),
		'fragments'  => $fragments,
	] );
}
add_action( 'wp_ajax_th_ed_add', 'th_ed_ajax_add' );
add_action( 'wp_ajax_nopriv_th_ed_add', 'th_ed_ajax_add' );

/* ---------------------------------------------------------------------------
 *  Editor integration — Gutenberg block pattern
 *
 *  Registers a block pattern so editors can insert the section in one click:
 *  Inserter → Patterns → Toke Haus → Editorial Deals
 * ---------------------------------------------------------------------------*/

add_action( 'init', function () {
	if ( ! function_exists( 'register_block_pattern' ) ) { return; }

	if ( function_exists( 'register_block_pattern_category' ) ) {
		register_block_pattern_category( 'tokehaus', [
			'label' => __( 'Toke Haus', 'kadence-child' ),
		] );
	}

	register_block_pattern( 'tokehaus/editorial-deals', [
		'title'       => __( 'Editorial Deals — Homepage', 'kadence-child' ),
		'description' => __( 'Countdown header + hero product + 4-card grid with inline weight selectors. Products pulled from "homepage-hero" and "homepage-deal" tags.', 'kadence-child' ),
		'categories'  => [ 'tokehaus' ],
		'keywords'    => [ 'deals', 'homepage', 'products', 'tokehaus' ],
		'content'     => "<!-- wp:shortcode -->\n[editorial_deals]\n<!-- /wp:shortcode -->",
	] );
} );
