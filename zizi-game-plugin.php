<?php
/*
Plugin Name: Zizi Game Plugin
Description: A fun interactive zizi game that represents the user journey and displays it via a shortcode.
Version: 1.0
Author: omayib
*/

if ( ! defined( 'ABSPATH' ) ) {
    exit; // Exit if accessed directly
}

// Enqueue scripts and styles
function mg_enqueue_scripts() {
    if ( ! is_front_page() ) {
        return;
    }
    // Phaser library for game logic
    wp_enqueue_script(
        'phaser',
        'https://cdn.jsdelivr.net/npm/phaser@3.60.0/dist/phaser-arcade-physics.min.js',
        array(),
        '3.60.0',
        true
    );
    
    // Canvas-confetti library for celebration effects
    wp_enqueue_script(
        'confetti',
        'https://cdn.jsdelivr.net/npm/canvas-confetti@1.5.1/dist/confetti.browser.min.js',
        array(),
        null,
        true
    );

    // Enqueue p5.js from a CDN.
    wp_enqueue_script('p5-js', 'https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.6.0/p5.min.js', array(), '1.6.0', true);


    // Custom zizi Game script (adjust dependencies if needed)
    // wp_enqueue_script(
    //     'zizi-game-plugin-js',
    //     plugin_dir_url( __FILE__ ) . 'js/zizi-game.js',
    //     array('phaser', 'confetti'),
    //     '1.0',
    //     true
    // );

    wp_enqueue_script(
        'zizi-game-plugin-js',
        plugin_dir_url( __FILE__ ) . 'js/move-block.js',
        array('confetti','p5-js'),
        '1.0',
        true
    );
    
    // Custom CSS for the game
    wp_enqueue_style(
        'zizi-game-plugin-style',
        plugin_dir_url( __FILE__ ) . 'css/zizi-game.css'
    );

    // Localize a variable with your assets base URL
    wp_localize_script( 'zizi-game-plugin-js', 'ziziGameAssets', array(
        'baseUrl' => plugin_dir_url( __FILE__ ) . 'assets/'
    ) );
}
function mg_add_viewport_meta() {
    echo '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">';
}
function mg_add_preconnect() {
    echo '<link rel="preconnect" href="https://cdn.jsdelivr.net">';
}
add_action('wp_head', 'mg_add_preconnect', 0);
add_action('wp_head', 'mg_add_viewport_meta');
add_action( 'wp_enqueue_scripts', 'mg_enqueue_scripts' );

// Shortcode to display the zizi game
function zizi_game_shortcode() {
    return '
        <div class="zizi-game-wrapper">
             <div id="zizi-game-container">
                <div id="grid"></div>
            </div>
            <div id="winModal" style="display:none;">
                <div class="modal-content">
                    <p>Wow! Youve reached your dream!</p>
                    <button id="playAgainBtn">Main lagi</button>
                    <button id="visitPageBtn">Pelajari Journey ini</button>
                </div>
            </div>
        </div>';
}
add_shortcode('zizi_game', 'zizi_game_shortcode');
