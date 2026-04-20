<?php
/**
 * ACF — Storefront Control
 *
 * Registers a dashboard page ("Storefront Control") with a field group
 * containing the hero + grid product selectors that drive the editorial
 * deals section on the homepage.
 *
 * Note: ACF FREE does NOT include acf_add_options_page() (that is a Pro-only
 * feature). To stay on free ACF we register a plain WP admin menu page and
 * render the fields with acf_form(), storing values against post_id='options'
 * so reads via get_field('...', 'option') in editorial-deals.php work
 * unchanged.
 *
 * @package kadence-child
 */

if ( ! defined( 'ABSPATH' ) ) { exit; }

/* ---------------------------------------------------------------------------
 *  1. Admin menu entry (replacement for ACF Pro's options page)
 * ---------------------------------------------------------------------------*/

add_action( 'admin_menu', function () {
	$hook = add_menu_page(
		__( 'Storefront Control', 'kadence-child' ),
		__( 'Storefront Control', 'kadence-child' ),
		'edit_posts',
		'storefront-control',
		'th_render_storefront_control_page',
		'dashicons-store',
		3
	);

	// acf_form_head() must run before the admin header outputs.
	add_action( 'load-' . $hook, function () {
		if ( function_exists( 'acf_form_head' ) ) {
			acf_form_head();
		}
	} );
} );

function th_render_storefront_control_page() {
	?>
	<div class="wrap">
		<h1><?php echo esc_html__( 'Storefront Control', 'kadence-child' ); ?></h1>
		<p style="max-width:640px;color:#50575e;">
			<?php echo esc_html__( 'Select the products that appear in "This Week\'s Deals" on the homepage. Leave a field empty to fall back to automated sale/top-seller picks.', 'kadence-child' ); ?>
		</p>
		<?php
		if ( ! function_exists( 'acf_form' ) ) {
			echo '<div class="notice notice-error"><p>' . esc_html__( 'Advanced Custom Fields is not active. Activate it to use this panel.', 'kadence-child' ) . '</p></div>';
			return;
		}

		acf_form( [
			'post_id'      => 'options',
			'field_groups' => [ 'group_th_storefront_control' ],
			'submit_value' => __( 'Update', 'kadence-child' ),
			'return'       => add_query_arg( 'updated', 'true', admin_url( 'admin.php?page=storefront-control' ) ),
		] );
		?>
	</div>
	<?php
}

/* ---------------------------------------------------------------------------
 *  2. Field group registration (hero + grid selectors)
 * ---------------------------------------------------------------------------*/

add_action( 'acf/init', function () {
	if ( ! function_exists( 'acf_add_local_field_group' ) ) { return; }

	acf_add_local_field_group( [
		'key'    => 'group_th_storefront_control',
		'title'  => 'Homepage',
		'fields' => [
			/* ── Tab: Deals ───────────────────────────────────── */
			[
				'key'      => 'field_th_tab_deals',
				'label'    => 'Deals',
				'name'     => '',
				'type'     => 'tab',
				'placement'=> 'top',
			],
			[
				'key'           => 'field_th_hero_deal_selection',
				'label'         => 'Hero Deal',
				'name'          => 'hero_deal_selection',
				'type'          => 'post_object',
				'instructions'  => 'Product shown in the large hero slot of "This Week\'s Deals". Leave empty to fall back to the on-sale featured product.',
				'required'      => 0,
				'post_type'     => [ 'product' ],
				'taxonomy'      => [],
				'allow_null'    => 1,
				'multiple'      => 0,
				'return_format' => 'id',
				'ui'            => 1,
			],
			[
				'key'           => 'field_th_grid_deals_selection',
				'label'         => 'Grid Deals (up to 4)',
				'name'          => 'grid_deals_selection',
				'type'          => 'relationship',
				'instructions'  => 'Up to 4 products shown in the supporting grid. Leave empty to fall back to sale + top-selling products.',
				'post_type'     => [ 'product' ],
				'taxonomy'      => [],
				'filters'       => [ 'search', 'post_type', 'taxonomy' ],
				'elements'      => [ 'featured_image' ],
				'min'           => 0,
				'max'           => 4,
				'return_format' => 'id',
			],

			/* ── Tab: Announcement Bar ────────────────────────── */
			[
				'key'      => 'field_th_tab_announcement',
				'label'    => 'Announcement Bar',
				'name'     => '',
				'type'     => 'tab',
				'placement'=> 'top',
			],
			[
				'key'           => 'field_th_announcement_toggle',
				'label'         => 'Show Announcement Bar',
				'name'          => 'announcement_toggle',
				'type'          => 'true_false',
				'instructions'  => 'Turn the announcement bar at the top of every page on/off instantly.',
				'default_value' => 1,
				'ui'            => 1,
				'ui_on_text'    => 'Visible',
				'ui_off_text'   => 'Hidden',
			],
			[
				'key'           => 'field_th_announcement_text',
				'label'         => 'Announcement Text',
				'name'          => 'announcement_text',
				'type'          => 'text',
				'instructions'  => 'e.g., "Free shipping on orders over $150!" Leave blank to show the default rotating messages.',
				'placeholder'   => 'Free shipping on orders over $150!',
				'maxlength'     => 200,
			],
			[
				'key'           => 'field_th_announcement_link',
				'label'         => 'Announcement Link',
				'name'          => 'announcement_link',
				'type'          => 'url',
				'instructions'  => 'Optional. If set, the bar becomes a clickable link.',
				'placeholder'   => 'https://tokehaus.com/shop',
			],

			/* ── Tab: Main Hero ───────────────────────────────── */
			[
				'key'      => 'field_th_tab_hero',
				'label'    => 'Main Hero',
				'name'     => '',
				'type'     => 'tab',
				'placement'=> 'top',
			],
			[
				'key'           => 'field_th_hero_headline',
				'label'         => 'Hero Headline',
				'name'          => 'hero_headline',
				'type'          => 'text',
				'instructions'  => 'Main H1 on the homepage. Basic HTML like &lt;em&gt; is allowed for accent words.',
				'placeholder'   => 'Premium BC bud, <em>delivered to your door.</em>',
			],
			[
				'key'           => 'field_th_hero_subheadline',
				'label'         => 'Hero Subheadline',
				'name'          => 'hero_subheadline',
				'type'          => 'textarea',
				'instructions'  => 'Descriptive paragraph under the headline.',
				'rows'          => 3,
				'new_lines'     => 'br',
				'placeholder'   => 'Hand-selected strains, discreet Canada Post shipping, and a rewards programme that actually pays out.',
			],
			[
				'key'           => 'field_th_hero_cta_text',
				'label'         => 'Hero CTA Text',
				'name'          => 'hero_cta_text',
				'type'          => 'text',
				'instructions'  => 'Button label, e.g. "Shop the Drop".',
				'placeholder'   => 'Shop Now',
			],
			[
				'key'           => 'field_th_hero_cta_link',
				'label'         => 'Hero CTA Link',
				'name'          => 'hero_cta_link',
				'type'          => 'url',
				'instructions'  => 'Destination URL for the primary hero button.',
				'placeholder'   => 'https://tokehaus.com/shop',
			],

			/* ── Tab: FAQ Manager ─────────────────────────────── */
			[
				'key'       => 'field_th_tab_faq',
				'label'     => 'FAQ Manager',
				'name'      => '',
				'type'      => 'tab',
				'placement' => 'top',
			],
			[
				'key'          => 'field_th_faq_items',
				'label'        => 'FAQ Items',
				'name'         => 'faq_items',
				'type'         => 'repeater',
				'instructions' => 'Add, remove and reorder FAQ items. These appear on the /faq/ page automatically.',
				'min'          => 0,
				'max'          => 0,
				'layout'       => 'block',
				'button_label' => 'Add FAQ Item',
				'sub_fields'   => [
					[
						'key'           => 'field_th_faq_question',
						'label'         => 'Question',
						'name'          => 'question',
						'type'          => 'text',
						'required'      => 1,
						'placeholder'   => 'e.g. How long does shipping take?',
						'column_width'  => '',
					],
					[
						'key'           => 'field_th_faq_answer',
						'label'         => 'Answer',
						'name'          => 'answer',
						'type'          => 'textarea',
						'required'      => 1,
						'rows'          => 4,
						'new_lines'     => 'br',
						'placeholder'   => 'e.g. Orders placed before 11 AM PST typically ship same day...',
						'column_width'  => '',
					],
				],
			],

			/* ── Tab: Category Hub ────────────────────────────── */
			[
				'key'       => 'field_th_tab_cathub',
				'label'     => 'Category Hub',
				'name'      => '',
				'type'      => 'tab',
				'placement' => 'top',
			],
			[
				'key'          => 'field_th_cathub_intro',
				'label'        => 'Hub Heading',
				'name'         => 'cathub_heading',
				'type'         => 'text',
				'instructions' => 'Section heading shown above the 3 category tiles.',
				'placeholder'  => 'Shop by Category',
			],
			[
				'key'          => 'field_th_cat1_image',
				'label'        => 'Category 1 — Image',
				'name'         => 'cat1_image',
				'type'         => 'image',
				'instructions' => 'Recommended 600×400px.',
				'return_format'=> 'url',
				'preview_size' => 'medium',
				'library'      => 'all',
			],
			[
				'key'         => 'field_th_cat1_title',
				'label'       => 'Category 1 — Title',
				'name'        => 'cat1_title',
				'type'        => 'text',
				'placeholder' => 'Flowers',
			],
			[
				'key'         => 'field_th_cat1_link',
				'label'       => 'Category 1 — Link',
				'name'        => 'cat1_link',
				'type'        => 'url',
				'placeholder' => 'https://tokehaus.com/product-category/flowers/',
			],
			[
				'key'          => 'field_th_cat2_image',
				'label'        => 'Category 2 — Image',
				'name'         => 'cat2_image',
				'type'         => 'image',
				'return_format'=> 'url',
				'preview_size' => 'medium',
				'library'      => 'all',
			],
			[
				'key'         => 'field_th_cat2_title',
				'label'       => 'Category 2 — Title',
				'name'        => 'cat2_title',
				'type'        => 'text',
				'placeholder' => 'Edibles',
			],
			[
				'key'         => 'field_th_cat2_link',
				'label'       => 'Category 2 — Link',
				'name'        => 'cat2_link',
				'type'        => 'url',
				'placeholder' => 'https://tokehaus.com/product-category/edibles/',
			],
			[
				'key'          => 'field_th_cat3_image',
				'label'        => 'Category 3 — Image',
				'name'         => 'cat3_image',
				'type'         => 'image',
				'return_format'=> 'url',
				'preview_size' => 'medium',
				'library'      => 'all',
			],
			[
				'key'         => 'field_th_cat3_title',
				'label'       => 'Category 3 — Title',
				'name'        => 'cat3_title',
				'type'        => 'text',
				'placeholder' => 'Extracts',
			],
			[
				'key'         => 'field_th_cat3_link',
				'label'       => 'Category 3 — Link',
				'name'        => 'cat3_link',
				'type'        => 'url',
				'placeholder' => 'https://tokehaus.com/product-category/extracts/',
			],

			/* ── Tab: About Page ──────────────────────────────── */
			[
				'key'       => 'field_th_tab_about',
				'label'     => 'About Page',
				'name'      => '',
				'type'      => 'tab',
				'placement' => 'top',
			],
			[
				'key'          => 'field_th_about_hero_image',
				'label'        => 'Hero Image',
				'name'         => 'about_hero_image',
				'type'         => 'image',
				'instructions' => 'Full-width hero image at the top of the About page. Recommended 1440×600px.',
				'return_format'=> 'url',
				'preview_size' => 'medium',
				'library'      => 'all',
			],
			[
				'key'          => 'field_th_about_mission',
				'label'        => 'Mission Statement',
				'name'         => 'about_mission_statement',
				'type'         => 'textarea',
				'instructions' => 'The main "why we exist" paragraph shown prominently on the About page.',
				'rows'         => 6,
				'new_lines'    => 'br',
				'placeholder'  => "Toke Haus was founded in 2010 with a simple mission: bring BC's finest cannabis directly to Canadians who deserve the best. Every batch we carry is hand-selected, third-party tested, and shipped with the discreet care you'd expect from a trusted dispensary.",
			],
			[
				'key'          => 'field_th_about_founded',
				'label'        => 'Founded Year',
				'name'         => 'about_founded_year',
				'type'         => 'text',
				'placeholder'  => '2010',
			],
			[
				'key'          => 'field_th_about_tagline',
				'label'        => 'About Page Tagline',
				'name'         => 'about_tagline',
				'type'         => 'text',
				'placeholder'  => "BC's Most Trusted Online Dispensary",
			],
		],
		// Location rule is a placeholder — acf_form( 'field_groups' ) renders the
		// group directly on our custom page regardless of the rule.
		'location' => [
			[
				[ 'param' => 'post_type', 'operator' => '==', 'value' => 'acf-storefront-dummy' ],
			],
		],
		'menu_order'            => 0,
		'position'              => 'normal',
		'style'                 => 'default',
		'label_placement'       => 'top',
		'instruction_placement' => 'label',
		'active'                => true,
	] );
} );
