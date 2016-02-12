/**
 * @file
 * Provides Ajax page updating via BigPipe.
 */

(function ($, Drupal, drupalSettings) {

  'use strict';

  /**
   * Execute Ajax commands included in the script tag.
   *
   * @param {number} index
   *   Current index.
   * @param {HTMLScriptElement} placeholder
   *   Script tag created by bigPipe.
   */
  function bigPipeProcessPlaceholder(index, placeholder) {
    var placeholderName = this.getAttribute('data-big-pipe-placeholder');
    var content = this.textContent.trim();
    // Ignore any placeholders that are not in the known placeholder list.
    // This is used to avoid someone trying to XSS the site via the
    // placeholdering mechanism.;
    if (typeof drupalSettings.bigPipePlaceholders[placeholderName] !== 'undefined') {
      // If we try to parse the content too early textContent will be empty,
      // making JSON.parse fail. Remove once so that it can be processed again
      // later.
      if (content === '') {
        $(this).removeOnce('big-pipe');
      }
      else {
        var response = JSON.parse(content);
        // Use a dummy url.
        var ajaxObject = Drupal.ajax({url: 'big-pipe/placeholder.json'});
        ajaxObject.success(response);
      }
    }
  }

  /**
   *
   * @param {HTMLDocument} context
   *   Main
   *
   * @return {bool}
   *   Returns true when processing has been finished and a stop tag has been
   *   found.
   */
  function bigPipeProcessContainer(context) {
    // Make sure we have bigPipe related scripts before processing further.
    if (!context.querySelector('script[data-big-pipe-event="start"]')) {
      return false;
    }

    $(context).find('script[data-drupal-ajax-processor="big_pipe"]').once('big-pipe')
      .each(bigPipeProcessPlaceholder);

    // If we see a stop element always clear the timeout.
    if (context.querySelector('script[data-big-pipe-event="stop"]')) {
      if (timeoutID) {
        clearTimeout(timeoutID);
      }
      return true;
    }

    return false;
  }

  function bigPipeProcess() {
    timeoutID = setTimeout(function () {
      if (!bigPipeProcessContainer(document)) {
        bigPipeProcess();
      }
    }, interval);
  }

  var interval = 200;
  // The internal ID to contain the watcher service.
  var timeoutID;

  bigPipeProcess();

  // If something goes wrong, make sure everything is cleaned up and has had a
  // chance to be processed with everything loaded.
  $(window).on('load', function () {
    if (timeoutID) {
      clearTimeout(timeoutID);
    }
    bigPipeProcessContainer(document);
  });

})(jQuery, Drupal, drupalSettings);
