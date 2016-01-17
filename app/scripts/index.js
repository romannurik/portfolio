/*
 * Copyright 2015 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


$(document).ready(function() {
  buildPagers();
  setupMediaSizing();
  setupVideoMedia();
  setupFullscreen();
  setupKeyboardNav();

  FastClick.attach(document.body);
  $('.project a').attr('target', '_blank');
});


function setupFullscreen() {
  var $fullscreen = $('<div>')
      .addClass('fullscreen-overlay loader-parent')
      .click(function() {
        closeFullscreen_();
      })
      .appendTo('body');

  var $currentFullscreenMedia = null;

  function closeFullscreen_() {
    $('body').removeClass('has-fullscreen');
    $currentFullscreenMedia = null;
  }

  function loadFullscreenMedia_($media) {
    $currentFullscreenMedia = $media;
    var $content = $media.find('img, video').first().clone();
    var $loadingSpinner = $media.find('.loading-spinner').clone();

    $fullscreen
        .empty()
        .append($content)
        .append($loadingSpinner);

    if ($content.is('video')) {
      setTimeout(function() {
        $fullscreen.addClass('loading');
      }, 10);
      $content
          .on('canplay', function() {
            $content.addClass('loaded');
            $fullscreen
                .addClass('loaded')
                .removeClass('loading');
            $content.get(0).play();
          });

      var videoNode = $content.get(0);
      videoNode.load();
    }

    setTimeout(function() {
      $('body').addClass('has-fullscreen');
    }, 10);
  }

  $('.page:not(.no-fullscreen) .media').click(function() {
    $fullscreen.removeClass('loaded loading');
    if ($(this).parents('.panning').length > 0) {
      return;
    }

    loadFullscreenMedia_($(this));
  });

  $(document).on('keydown', function(e) {
    if (e.keyCode == 27) {
      closeFullscreen_();
    }
  });

  window.loadFullscreenMedia = loadFullscreenMedia_;
  window.getCurrentFullscreenMedia = function() {
    return $currentFullscreenMedia;
  };
}


function setupKeyboardNav() {
  $(document).on('keydown', function(e) {
    if (e.keyCode == 37 || e.keyCode == 39) {
      // left and right keys
      var direction = (e.keyCode == 37) ? -1 : 1;
      if ($('body').hasClass('has-fullscreen')) {
        // send to fullscreen
        var $media = getCurrentFullscreenMedia();
        if ($media) {
          var $page = $media.parent('.page');
          var $siblingPage = $page[(direction == -1) ? 'prev' : 'next']('.page:not(.no-fullscreen)');
          if ($siblingPage.length) {
            loadFullscreenMedia($siblingPage.find('.media'));
          }
        }
      } else {
        // find most visible pager
        var wh = $(window).height();
        var mostVisiblePager = null;
        var mostAmountVisible = 0; // 0 to 1

        $('.pages').each(function() {
          var rect = $(this).get(0).getBoundingClientRect();
          var height = (rect.bottom - rect.top);
          var visibleHeight = (Math.min(rect.bottom, wh) - Math.max(rect.top, 0));
          var amountVisible = visibleHeight / height;
          if (amountVisible > mostAmountVisible) {
            mostVisiblePager = this;
            mostAmountVisible = amountVisible;
          }
        });

        if (mostVisiblePager && mostVisiblePager.snapToPage) {
          // switch page
          mostVisiblePager.snapToPage(mostVisiblePager.getCurrentPage() + direction);
        }
      }
    }
  });
}


function setupVideoMedia() {
  // play/pause/click interactions
  var playEl = null;
  var playElTimeout;
  function playEl_() {
    playVideoMedia($(playEl), true);
  }

  $(document)
      .on('mouseenter', '.page.video .media', function() {
        if (playElTimeout) {
          clearTimeout(playElTimeout);
          playElTimeout = 0;
        }
        playEl = this;
        playElTimeout = setTimeout(playEl_, 100);
      })
      .on('mouseleave', '.page.video .media', function() {
        if (playElTimeout) {
          clearTimeout(playElTimeout);
          playElTimeout = 0;
        }
        playVideoMedia($(this), false);
      })
      .on('click', '.page.video .media', function() {
        $(this).find('video').get(0).currentTime = 0;
      });

  // loading spinners
  var $neverVisibleProjects = $('section.project:not(.was-visible)');

  function visibleProjectsUpdated_() {
    var ww = $(window).width();
    var wh = $(window).height();

    $neverVisibleProjects.each(function() {
      var rect = $(this).get(0).getBoundingClientRect();
      if (rect.bottom < 0 || rect.right < 0 || rect.left > ww || rect.top > wh) {
        // not visible
        return;
      }

      // remove this from list of never-visible projects
      $(this).addClass('was-visible');
      $neverVisibleProjects = $('section.project:not(.was-visible)');

      // load first page
      loadPage($(this).find('.page').first());
    });
  }

  visibleProjectsUpdated_();
  $(window).on('scroll resize', visibleProjectsUpdated_);
}


function setupMediaSizing() {
  $('.media video').on('resize', function() {
    sizeMedia($(this).parents('.media'));
  });
  $('.media img').on('load', function() {
    sizeMedia($(this).parents('.media'));
  });
}


function sizeMedia($media) {
  var $child = $media.children().eq(0);
  if (!$child.length) {
    return;
  }

  if ($media.parent('.page').hasClass('no-scale')) {
    return;
  }

  var ww = $media.width();
  var wh = $media.height();
  var ow = $child.get(0).offsetWidth;
  var oh = $child.get(0).offsetHeight;
  var scale = 1;

  if (ow / oh > ww / wh) {
    scale = ww / ow;
  } else {
    scale = wh / oh;
  }

  scale = Math.min(scale, 1);
  $child.css('transform', 'scale(' + scale + ')');
}


function buildPagers() {
  var pagePeek;
  var pageSpacing;
  var pagerWidth;
  var pageWidth;

  function relayout_() {
    pagePeek = (window.screen.width < 480) ? 16 : 32;
    pageSpacing = 16;

    pagerWidth = $('.pages').width();
    pageWidth = pagerWidth - (pagePeek + pageSpacing) * 2;

    $('.page').css({
      width: pageWidth,
      minWidth: pageWidth,
      marginRight: pageSpacing,
    });

    $('.page:first-child').css({
      marginLeft: pageSpacing + pagePeek
    });

    $('.page:last-child').css({
      marginRight: pagePeek
    });

    // resize media to fit
    $('.media').each(function() {
      sizeMedia($(this));
    });
  }

  relayout_();
  $(window).resize(relayout_);

  // build the actual pager
  $('.pages').each(function() {
    var $pager = $(this);
    var pagerNode = this;
    var $pageScroll = $(this).find('.page-scroll');
    var $pages = $(this).find('.page');
    var $pageDots;

    var scrollX = 0;
    var currentPage = -1;
    var panning = false;
    var loadedPages = {};

    // cancel some default behaviors, regardless if there are pages or not
    $pager
        .on('dragstart', function(ev) {
          ev.preventDefault();
        })
        .on('click', function(ev) {
          if (panning) {
            ev.preventDefault();
            ev.stopPropagation();
          }
        })
        .on('wheel', function(e) {
          if (Math.abs(e.originalEvent.deltaX)) {
            e.preventDefault();
          }
        });

    var numPages = $pages.length;
    if (numPages <= 1) {
      return;
    }

    $pager.addClass('pannable');

    var loadPageByIndex_ = function(page) {
      if (page < 0 || page >= numPages || page in loadedPages) {
        return;
      }

      loadedPages[page] = true;

      // load the page
      loadPage($pages.eq(page));
    };

    var scrollTo_ = function(x, animated, loadPages) {
      if (loadPages === undefined) {
        loadPages = true;
      }

      if (animated === undefined) {
        animated = false;
      }

      scrollX = Math.max(0, Math.min((pageWidth + pageSpacing) * (numPages - 1), x));
      $pageScroll
          .toggleClass('animate-scroll', animated)
          .css('transform', 'translate3d(' + (-scrollX) + 'px,0,0)');

      var newCurrentPage = Math.round(scrollX / pageWidth);
      if (currentPage != newCurrentPage) {
        currentPage = newCurrentPage;

        if (loadPages) {
          loadPageByIndex_(currentPage - 1);
          loadPageByIndex_(currentPage);
          loadPageByIndex_(currentPage + 1);
        }

        $pageDots.find('.page-dot').each(function(index) {
          $(this).toggleClass('active', index == currentPage);
        });
      }
    };

    var snapToPage_ = function(position) {
      scrollTo_(position * (pageWidth + pageSpacing), true);
    };

    pagerNode.snapToPage = snapToPage_;
    pagerNode.getCurrentPage = function() {
      return currentPage;
    };

    // set up edge clickers
    $('<div>').addClass('edge-clicker prev').css('width', pagePeek).appendTo($pager)
      .click(function() { snapToPage_(currentPage - 1); });
    $('<div>').addClass('edge-clicker next').css('width', pagePeek).appendTo($pager)
      .click(function() { snapToPage_(currentPage + 1); });

    $pageDots = $('<div>').addClass('page-dots').appendTo($pager);
    var pageDotClick_ = function() {
      snapToPage_($(this).index());
    };

    for (var i = 0; i < numPages; i++) {
      $pageDots.append($('<div>').addClass('page-dot').click(pageDotClick_));
    }

    // set up hammer JS
    var lastDeltaX = 0;
    var pageAtPanStart = -1;
    var swiped = false;
    var hammer = new Hammer($pager.get(0), { dragLockToAxis: true });
    hammer.on('panend pan swipe', function(ev) {
      // disable browser scrolling
      ev.preventDefault();
      ev.srcEvent.preventDefault();

      var right = ev.deltaX < 0;

      switch (ev.type) {
        case 'pan':
          if (!swiped) {
            var deltaX = (ev.deltaX - lastDeltaX);
            panning = true;
            if (pageAtPanStart < 0) {
              pageAtPanStart = currentPage;
            }
            $pager.addClass('panning');
            scrollTo_(scrollX - deltaX);
            lastDeltaX = ev.deltaX;
          }
          break;

        case 'swipe':
          swiped = true;
          lastDeltaX = 0;
          right = (ev.direction & Hammer.DIRECTION_RIGHT) == 0;
          snapToPage_(pageAtPanStart + (right ? 1 : -1));
          setTimeout(function() {
            panning = false;
            pageAtPanStart = -1;
            $pager.removeClass('panning');
          }, 0);
          ev.srcEvent.stopPropagation();
          break;

        case 'panend':
          if (!swiped) {
            lastDeltaX = 0;
            snapToPage_(currentPage);
            setTimeout(function() {
              panning = false;
              pageAtPanStart = -1;
              $pager.removeClass('panning');
            }, 0);
          }
          swiped = false;
          break;
      }
    });

    var wheelLastHitDirection;
    var wheelLastFailedStrengthX;
    var wheelDebounce;

    $pager.on('wheel', function(ev) {
      var direction = (ev.originalEvent.deltaX < 0) ? -1 : 1;
      var strengthX = Math.abs(ev.originalEvent.deltaX);
      if (strengthX < Math.abs(ev.originalEvent.deltaY)) {
        return true;
      }

      if (wheelDebounce || strengthX < 30) {
        wheelLastFailedStrengthX = strengthX;
        return false;
      }

      if (strengthX > wheelLastFailedStrengthX || direction != wheelLastHitDirection) {
        // successful swipe
        wheelLastHitDirection = direction;
        wheelDebounce = true;
        setTimeout(function() {
          wheelDebounce = false;
        }, 300);
        snapToPage_(currentPage + direction);
      }
      return false;
    });

    scrollTo_(0, false, false);
  });
}


function loadPage($page) {
  //$page.find('.loading-spinner').remove();
}


function playVideoMedia($media, play) {
  $media.data('should-be-playing', play);
  var $video = $media.find('video');

  if (play) {
    if (!$media.hasClass('loaded')) {
      $media.addClass('loading');
      $video
          .off('canplay')
          .on('canplay', function() {
            $media
                .addClass('loaded')
                .removeClass('loading');
            if ($media.data('should-be-playing')) {
              $video.get(0).play();
            }
          });
      $video.get(0).load();
    } else {
      $video.get(0).play();
    }
  } else {
    $video.get(0).pause();
  }
}