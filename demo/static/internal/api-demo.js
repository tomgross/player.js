/* eslint-env jquery */
/* global Vimeo */
$(function() {
    'use strict';

    var output = $('.output');

    function getFormattedMessage(message) {
        var className = typeof message;

        if (message === null || className === 'undefined') {
            return '';
        }

        if (className === 'string') {
            message = '"' + message + '"';
        }

        if (className === 'object') {
            message = JSON.stringify(message, null, 4).replace(/\n/g, '<br>');
        }

        return '<span class="' + className + '">' + message + '</span>';
    }

    function replaceUrls(string) {
        var matches = string.match(/\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/ig);

        if (matches && matches.length) {
            for (var i = 0, length = matches.length; i < length; i++) {
                string = string.replace(matches[i], '<a href="' + matches[i] + '" target="_blank">' + matches[i] + '</a>');
            }
        }

        return string;
    }

    function replaceColors(string) {
        var matches = string.match(/#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})/g);

        if (matches && matches.length) {
            for (var i = 0, length = matches.length; i < length; i++) {
                string = string.replace(matches[i], '<span class="color-link" data-color="' + matches[i].substr(1) + '">' + matches[i] + '</span>');
            }
        }

        return string;
    }

    function apiLog(label, message, options) {
        options = options || {};

        if (!options.preFormatted) {
            message = getFormattedMessage(message);
        }

        if (message !== '') {
            message = ': ' + message;
        }

        // Give it a small cushion for Chrome because it will sometimes be off by a pixel or two.
        var wasScrolledToEnd = output.scrollTop() >= (output.prop('scrollHeight') - output.innerHeight()) - 4;

        output.get(0).insertAdjacentHTML('beforeend', '<p class="' + (options.className || '') + '">' + label + message + '</p>');

        if (wasScrolledToEnd) {
            output.prop('scrollTop', output.prop('scrollHeight'));
        }
        else if (options.scrollToEnd) {
            output.animate({ scrollTop: output.prop('scrollHeight') }, 'fast');
        }
    }

    function makeGetterCallback(label) {
        return function(value) {
            // Escape HTML in returned strings
            if (typeof value === 'string') {
                value = value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            apiLog(label, value, {
                className: 'getter',
                scrollToEnd: true
            });
        };
    }

    function makeEventCallback(eventName) {
        return function(data) {
            // Progress event
            if (data && 'seconds' in data) {
                return apiLog(eventName + ' event', getFormattedMessage(data.seconds) + ' seconds (' + (data.percent * 100).toFixed(1) + '%)', {
                    className: 'event',
                    preFormatted: true
                });
            }

            // Volumechange event
            if (data && 'volume' in data) {
                return apiLog(eventName + ' event', getFormattedMessage(data.volume), {
                    className: 'event',
                    preFormatted: true
                });
            }

            // Cuechange & texttrackchange events
            if (data && 'label' in data) {
                var message = '';

                if ('cues' in data) {
                    for (var cue in data.cues) {
                        message += data.cues[cue].text;
                    }
                }

                return apiLog(eventName + ' event (' + data.language + '-' + data.kind + ')', message, {
                    className: 'event',
                    preFormatted: true
                });
            }

            // Cuepoint
            if (data && 'time' in data && 'data' in data) {
                return apiLog(eventName + ' event (' + data.time + ')', getFormattedMessage(data.data), {
                    className: 'event',
                    preFormatted: true
                });
            }

            // Chapter
            if (data && 'startTime' in data && 'title' in data) {
                return apiLog(eventName + ' event (' + data.startTime + ')', getFormattedMessage(data), {
                    className: 'event',
                    preFormatted: true
                });
            }

            // Loaded event
            if (data && 'id' in data) {
                return apiLog(eventName + ' event', getFormattedMessage(data.id), {
                    className: 'event',
                    preFormatted: true
                });
            }

            // Error event
            if (data && data.message) {
                return logError(data);
            }

            apiLog(eventName + ' event', null, {
                className: 'event'
            });
        };
    }

    function logError(data) {
        data.message = replaceUrls(data.message);
        data.message = replaceColors(data.message);

        return apiLog(data.name, data.message, {
            className: 'error',
            preFormatted: true
        });
    }

    function getEventPrefs() {
        try {
            return JSON.parse(window.localStorage.getItem('vimeo-player-api-demo')) || {};
        }
        catch (e) {
            return {};
        }
    }

    function storeEventPref(event, on) {
        try {
            var prefs = getEventPrefs();
            prefs[event] = on;
            window.localStorage.setItem('vimeo-player-api-demo', JSON.stringify(prefs));
        }
        catch (e) {
            // empty
        }
    }


    // Store references to the setter inputs
    var loopInput = $('#loop-checkbox');
    var autopauseInput = $('#autopause-checkbox');
    var colorInput = $('#color-input');
    var randomColorButton = $('#random-color-button');
    var defaultColorButton = $('#default-color-button');
    var currentTimeRange = $('#current-time-range');
    var currentTimeInput = $('#current-time-input');
    var currentTimeButton = $('#current-time-button');
    var textTrackSelect = $('#text-track-select');
    var volumeInput = $('#volume-range');
    var videoIdInput = $('#video-id');
    var loadVideoButton = $('#load-button');
    var cuePointInput = $('#add-cuepoint');
    var addCuePointButton = $('#add-cuepoint-button');
    var playbackRateButton = $('#playback-rate-button');
    var playbackRateInput = $('#playback-rate-input');
    var muteButton = $('#mute-button');
    var unmuteButton = $('#unmute-button');


    // Check if we have actual color input support
    var colorInputSupport = false;
    if (colorInput.prop('type') === 'color') {
        colorInputSupport = true;
        $('body').addClass('color-input-support');
    }

    var eventCallbacks = {
        play: makeEventCallback('play'),
        playing: makeEventCallback('playing'),
        pause: makeEventCallback('pause'),
        ended: makeEventCallback('ended'),
        timeupdate: makeEventCallback('timeupdate'),
        progress: makeEventCallback('progress'),
        seeking: makeEventCallback('seeking'),
        seeked: makeEventCallback('seeked'),
        volumechange: makeEventCallback('volumechange'),
        texttrackchange: makeEventCallback('texttrackchange'),
        cuechange: makeEventCallback('cuechange'),
        chapterchange: makeEventCallback('chapterchange'),
        error: makeEventCallback('error'),
        loaded: makeEventCallback('loaded'),
        cuepoint: makeEventCallback('cuepoint'),
        playbackratechange: makeEventCallback('playbackratechange'),
        bufferstart: makeEventCallback('bufferstart'),
        bufferend: makeEventCallback('bufferend'),
        fullscreenchange: makeEventCallback('fullscreenchange'),
        loadedmetadata: makeEventCallback('loadedmetadata'),
        durationchange: makeEventCallback('durationchange'),
        waiting: makeEventCallback('waiting'),
        loadeddata: makeEventCallback('loadeddata'),
        loadstart: makeEventCallback('loadstart'),
    };

    // Create the player

    var options = {
        url: 'https://vimeo.com/76979871',
        width: 640,
        loop: true
    };

    var player = new Vimeo.Player('made-in-ny', options);
    window.demoPlayer = player;

    // Log when the player is ready
    player.ready().then(function() {
        apiLog('ready event', null, {
            className: 'event'
        });
    }).catch(logError);

    // Listen for the events that are checked off
    var eventPrefs = getEventPrefs();
    Object.keys(eventCallbacks).forEach(function(eventName) {
        if (eventPrefs[eventName] !== false) {
            player.on(eventName, eventCallbacks[eventName]);
        }
    });

    // Get the id and set the input
    player.getVideoId().then(function(videoId) {
        videoIdInput.val(videoId).prop('disabled', false);
        loadVideoButton.prop('disabled', false);
    }).catch(logError);

    player.getCuePoints().then(function(cuePoints) {
        cuePointInput.prop('disabled', false);
        addCuePointButton.prop('disabled', false);
    }).catch(logError);

    // Get the loop state and enable the checkbox
    player.getLoop().then(function(loop) {
        loopInput.prop('checked', loop).prop('disabled', false);
    }).catch(logError);

    // Get the autopause state and enable the checkbox
    player.getAutopause().then(function(autopause) {
        autopauseInput.prop('checked', autopause).prop('disabled', false);
    }).catch(logError);

    // Get the color, update the input, and enable
    player.getColor().then(function(color) {
        colorInput.val('#' + color).prop('disabled', false);
        randomColorButton.prop('disabled', false);
        defaultColorButton.prop('disabled', false);
    }).catch(logError);

    // Get the duration to set the range properly
    player.getDuration().then(function(duration) {
        currentTimeRange.prop('max', duration);
        currentTimeInput.prop('max', duration).prop('disabled', false);
        currentTimeButton.prop('disabled', false);
    }).catch(logError);

    // Get text track info
    player.getTextTracks().then(function(tracks) {
        if (tracks.length) {
            for (var track in tracks) {
                track = tracks[track];
                textTrackSelect.append('<option value="' + track.language + '.' + track.kind + '"' + (track.mode === 'showing' ? ' selected' : '') + '>' + track.label + '</option>');
            }

            textTrackSelect.prop('disabled', false);
        }
    }).catch(logError);

    // Get the volume and enable the slider
    player.getVolume().then(function(volume) {
        volumeInput.val(volume).prop('disabled', false);
    }).catch(logError);

    player.getPlaybackRate().then(function(playbackRate) {
        playbackRateInput.val(playbackRate).prop('disabled', false);
        playbackRateButton.prop('disabled', false);
    }).catch(logError);

    // Listen for timeupdate to update the time range input
    player.on('timeupdate', function(data) {
        currentTimeRange.val(data.seconds);
    });

    // Also update the time range input on seeked
    player.on('seeked', function(data) {
        currentTimeRange.val(data.seconds);
    });

    // Listen for volumechange to update the volume range input
    player.on('volumechange', function(data) {
        volumeInput.prop('value', data.volume);
    });

    // Listen for texttrackchange to update the text tracks dropdown
    player.on('texttrackchange', function(data) {
        var id = data.language + '.' + data.kind;

        if (data.language === null) {
            id = 'none';
        }

        textTrackSelect.val(id);
    });

    // Check off the appropriate events based on preference
    $('.js-event-listener').each(function() {
        var checkbox = $(this);
        var eventName = checkbox.attr('data-event');

        if (eventPrefs[eventName] !== false) {
            checkbox.attr('checked', '');
        }
    });

    // Enable all the buttons and checkboxes
    $('.js-method, .js-getter, .js-event-listener').prop('disabled', false);


    // Clear the log when the button is clicked
    $('.clear').on('click', function() {
        output.html('');
    });


    // Setter inputs
    loopInput.on('change', function(event) {
        player.setLoop(event.target.checked);
    });

    autopauseInput.on('change', function(event) {
        player.setAutopause(event.target.checked);
    });

    colorInput.on('input', function() {
        $(this).removeClass('invalid');
    });

    colorInput.on(colorInputSupport ? 'change' : 'blur', function() {
        var color = $(this).val();

        if (color === '') {
            color = '00adef';
            $(this).val('#' + color);
        }

        player.setColor(color).catch(function() {
            colorInput.addClass('invalid');
        });
    });

    randomColorButton.on('click', function() {
        var min = 1048576;
        var max = 16777215;
        var color = Math.floor(Math.random() * (max - min) + min).toString(16);
        // (Math.random() * 0xFFFFFF << 0).toString(16)

        player.setColor(color).then(function(actualColor) {
            colorInput.val('#' + actualColor).removeClass('invalid');
        }).catch(function() {
            colorInput.addClass('invalid');
        });
    });

    defaultColorButton.on('click', function() {
        colorInput.val('#00adef').removeClass('invalid');
        player.setColor('00adef').catch(function() {
            colorInput.addClass('invalid');
        });
    });

    output.on('click', '.color-link', function() {
        var color = $(this).attr('data-color');

        colorInput.val('#' + color).removeClass('invalid');
        player.setColor(color).catch(function() {
            colorInput.addClass('invalid');
        });
    });

    currentTimeRange.on('change', function() {
        player.setCurrentTime($(this).val());
    });

    currentTimeButton.on('click', function() {
        player.setCurrentTime(currentTimeInput.val()).catch(function() {
            currentTimeInput.addClass('invalid');
        });
    });

    textTrackSelect.on('change', function() {
        var id = $(this).val().split('.');

        if (id[0] === 'none') {
            player.disableTextTrack();
            return;
        }

        player.enableTextTrack(id[0], id[1]);
    });

    volumeInput.on('change', function() {
        player.setVolume($(this).val());
    });

    muteButton.on('click', function() {
        player.setMuted(true);
    });

    unmuteButton.on('click', function() {
        player.setMuted(false);
    });

    playbackRateButton.on('click', function() {
        player.setPlaybackRate(playbackRateInput.val()).catch(function() {
            playbackRateInput.addClass('invalid');
        });
    });


    // Method buttons
    $('.js-methods').on('click', '.js-method', function() {
        var button = $(this);
        var method = button.attr('data-method');

        if (player[method]) {
            player[method]();
        }
    });

    loadVideoButton.on('click', function() {
        player.loadVideo(videoIdInput.val()).catch(function() {
            videoIdInput.addClass('invalid');
        });
    });

    addCuePointButton.on('click', function() {
        player.addCuePoint(cuePointInput.val()).then(function() {
            cuePointInput.removeClass('invalid');
            cuePointInput.val('');
        }).catch(function() {
            cuePointInput.addClass('invalid');
        });
    });

    // Getter buttons
    $('.js-getters').on('click', '.js-getter', function() {
        var button = $(this);
        var getter = button.attr('data-getter');
        var name = button.text();

        if (player[getter]) {
            player[getter]().then(makeGetterCallback(name)).catch(logError);
        }
    });

    // Event listener checkboxes
    $('.js-event-listeners').on('change', '.js-event-listener', function() {
        var checkbox = $(this);
        var eventName = checkbox.attr('data-event');

        if (checkbox.prop('checked')) {
            player.on(eventName, eventCallbacks[eventName]);
            storeEventPref(eventName, true);
        }
        else {
            player.off(eventName, eventCallbacks[eventName]);
            storeEventPref(eventName, false);
        }
    });

});
