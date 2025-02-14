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
    // Phaser library for game logic
    wp_enqueue_script(
        'phaser',
        'https://cdn.jsdelivr.net/npm/phaser@3.55.2/dist/phaser.js',
        array(),
        null,
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

    // Custom zizi Game script (adjust dependencies if needed)
    wp_enqueue_script(
        'zizi-game-plugin-js',
        plugin_dir_url( __FILE__ ) . 'js/zizi-game.js',
        array('phaser', 'confetti'),
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
add_action( 'wp_enqueue_scripts', 'mg_enqueue_scripts' );

// Shortcode to display the zizi game
function mg_display_game() {
    ob_start();
    ?>
    <div id="zizi-game-container">
        <canvas id="ziziGameCanvas"></canvas>
    </div>
    <!-- Win Modal Popup -->
    <div id="winModal" style="display:none;">
      <div class="modal-content">
        <p>Wow! You've reached your dream!</p>
        <button id="playAgainBtn">Main lagi</button>
        <button id="visitPageBtn">Pelajari Journey ini</button>
      </div>
    </div>
    <?php
    return ob_get_clean();
}
add_shortcode( 'zizi_game', 'mg_display_game' );
