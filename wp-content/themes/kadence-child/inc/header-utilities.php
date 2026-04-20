<?php
/**
 * Header Utilities
 *
 * Injects into the Kadence primary navigation:
 *  1. A compact WooCommerce search bar (desktop) + toggle icon (mobile)
 *  2. A "My Account" icon link
 *
 * Also boldens the "Shop" nav link via a body class approach so
 * CSS can target it without knowing the menu item ID.
 */

/**
 * Append search bar + My Account to primary nav items.
 *
 * @param string   $items HTML list items.
 * @param stdClass $args  wp_nav_menu arguments.
 * @return string
 */
add_filter( 'wp_nav_menu_items', function ( $items, $args ) {
	if ( ! isset( $args->theme_location ) || $args->theme_location !== 'primary' ) {
		return $items;
	}

	// ── Search bar ────────────────────────────────────────────────────────────
	$search = '<li class="menu-item th-nav-search" role="none">'
		. '<div class="th-header-search">'
		. '<button class="th-search-toggle" aria-label="Search" aria-expanded="false">'
		. '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>'
		. '</button>'
		. '<form role="search" method="get" action="' . esc_url( home_url( '/' ) ) . '" class="th-search-form">'
		. '<input type="search" name="s" placeholder="Search strains, edibles, or effects…" autocomplete="off" aria-label="Search" />'
		. '<input type="hidden" name="post_type" value="product" />'
		. '<button type="submit" aria-label="Submit search">'
		. '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>'
		. '</button>'
		. '</form>'
		. '</div>'
		. '</li>';

	// ── My Account ───────────────────────────────────────────────────────────
	$account_url = function_exists( 'wc_get_page_permalink' )
		? wc_get_page_permalink( 'myaccount' )
		: home_url( '/my-account/' );

	$account = '<li class="menu-item th-nav-account" role="none">'
		. '<a href="' . esc_url( $account_url ) . '" class="th-header-account" aria-label="My Account">'
		. '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'
		. '<span>My Account</span>'
		. '</a>'
		. '</li>';

	return $items . $search . $account;
}, 10, 2 );
