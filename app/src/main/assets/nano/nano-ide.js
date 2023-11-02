/* By Morgan McGuire @CasualEffects http://casual-effects.com GPL 3.0 License*/

// 'IDE', 'Emulator', or 'Minimal'. Emulator will use the minimal style if the page is too
// small for it. See also setUIMode.
var displayMode = 'IDE';

// Must match nano-runtime.js
var SCREEN_WIDTH, SCREEN_HEIGHT, BAR_HEIGHT, BAR_SPACING, FRAMEBUFFER_HEIGHT;

function clamp(x, lo, hi) { return Math.min(Math.max(x, lo), hi); }

function afterImageLoad(url, callback) {
    var image = new Image();
    image.onload = function () { callback(image); };
    image.src = url;
}

var deployed = (location.href.substring(0, 8) !== 'file:///') && (location.href.indexOf('://localhost') === -1);

// The gif recording object, if in a recording
var gifRecording = null;

// Specified as HTML colors for convenience, but converted to ImageData format at the end of
// this script
var screenPalette = new Uint32Array(
    // PICO-8 ordering, with some colors replaced
    // by Dawnbringer-16 and a more pure white
    [0x000000, 0x201590, 0x7E2553, 0x008751,  // 00-03
     0x8d5432, 0x5E5B69, 0xD8D6D1, 0xFFFDFA,  // 04-07
     
     0xFF154A, 0xffaf15, 0xFFEC27, 0x7ce402,  // 08-11
     0x30AFFF, 0xA99FAD, 0xFF6889, 0xFFCCAC,  // 12-15
     // Supplemental colors
     0xbf0217, 0xd04648, 0xff6600, 0xd27d2c,  // 16-19
     0xd2aa94, 0xb5b333, 0x6daa2c, 0x346524,  // 20-23

     0x104510, 0x1becf4, 0x224edc, 0x4a2738,  // 24-27
     0x6c0daf, 0x9500fd, 0xdf0ac4, 0x303136]);// 28-31

/** The source code for the reset animation. This must compile to something where newlines can
    be replaced with semi-colons so that it can become a single JavaScript line after
    compilation. So, do not split expressions across newlines in this nano source. */
var resetAnimationNanoSource = `#nanojam Reset,1
// flash at start
if(¬τ)clr=∅;for(i<7)cls(gray(⅗-⅙i));show

// fade
v=(1-|¼²τ-1|)^¼

// rainbow
for(i<2⁷)x=64ξ;pset(x∩62,64ξ∩62,hsv(⅛²x,1,v*i∩1))

// logo
for(j<3)for(i<15)pset(38-i,30+j,gray(v*([8738,21845,21330]ⱼ▻i∩1)))
  
// hold black and then erase variables and end
if(τ>31)cls(clr=0);i=j=x=v=∅
τ%=40`;


var initialSource =
    //tests.forwith;
    //tests.customSprite;
    //tests.customRotate;
    //tests.debug;
    //tests.textstyle;
    //tests.starattack;
    //tests.indent;
    //tests.circles;
    //tests.nanoBoot;
    //tests.nanoReset;
    //tests.rgb;
    //tests.text;
    //tests.triangles;
    //tests.spacedash;
    //tests.nest;
    //tests.scope;
    //tests.square;
    //tests.WITH;
    //tests.triangle;
    //tests.textbots;
    //tests.stars;
    //tests.variables;
    //tests.runner;
    //tests.hash;
    //tests.plasma;
    //tests.plasma2;
    //tests.manySprites;
    //tests.FCN;
    //tests.sort;
    //tests.ping;
    //tests.IF;
    //tests.keyrepeat;
    //tests.FOR;
    tests.input;
    //tests.agent;
    //tests.rect;
    //tests.colorgrid;


if (! deployed) {
    document.getElementById('header').innerHTML += '<a style="text-decoration: underline; cursor:pointer" onclick="onRunTests()">Run Tests</a>'; 
}

/** If null, use HTML Audio tags. Otherwise, use web audio support, which has more features and
    lower latency. Implementation from codeheart.js */
var _ch_audioContext;

var _ch_isLocal  =  (window.location.toString().substr(0, 7) === "file://");
var _ch_isChrome =  (navigator.userAgent.toLowerCase().indexOf("chrome") !== -1);

if (! (_ch_isLocal && _ch_isChrome)) {
    window.AudioContext = window.AudioContext || window.webkitAudioContext;
    if (window.AudioContext) {
        try {
            _ch_audioContext = new AudioContext();
            _ch_audioContext.gainNode = _ch_audioContext.createGain();
            _ch_audioContext.gainNode.gain.value = 0.2;
            _ch_audioContext.gainNode.connect(_ch_audioContext.destination);
        } catch(e) {
            console.log(e);
        }
    }
}


function getQueryString(field) {
    var reg = new RegExp( '[?&]' + field + '=([^&#]*)', 'i' );
    var string = reg.exec(location.href);
    return string ? string[1] : null;
}


function setUIMode(d, noAutoPlay) {
    displayMode = d;
    let body = document.getElementsByTagName("body")[0];

    if (displayMode === 'IDE') {
        body.classList.remove('noIDE');
        body.classList.remove('minimalUI');
    } else {
        // Minimal and Emulator
        body.classList.add('noIDE');
        
        // Nothing to do except play in this mode, so hit play automatically
        if (deployed && ! noAutoPlay) { onPlayButton(); }
    }

    if ((displayMode !== 'IDE') && deployed) {
        // Full-screen the UI
        //(body.requestFullscreen || body.webkitRequestFullscreen || body.mozRequestFullScreen || body.msRequestFullscreen || Math.cos)();
        if (body.requestFullscreen) {
            body.requestFullscreen();
        } else if (body.webkitRequestFullscreen) {
            body.webkitRequestFullscreen();
        } else if (body.mozRequestFullScreen) {
            body.mozRequestFullScreen();
        } else if (body.msRequestFullscreen) {
            body.msRequestFullscreen();
        }
    }

    onResize();

    // Reset keyboard focus
    emulatorKeyboardInput.focus();
}


function onResize() {
    let body = document.getElementsByTagName('body')[0];
    let emulator = document.getElementById('emulator');

    switch (displayMode) {
    case 'IDE':
        // Remove explicit styles set by Javascript
        // for the minimal UI.
        emulator.removeAttribute('style');
        break;
        
    case 'Emulator':
        // If not too small, remove minimalUI from body
        // TODO
        body.classList.remove('minimalUI');
        // Remove explicit styles set by Javascript
        // for the minimal UI.
        emulator.removeAttribute('style');
        
        // If too small, fall through to minimal
        // TODO

        break;
        
    case 'Minimal':

        // What is the largest multiple FRAMEBUFFER_HEIGHT that is less than windowHeightDevicePixels?
        let scale = Math.max(0, Math.min((window.innerHeight - 40) / 300, (window.innerWidth - 270) / 280));

        if (scale * window.devicePixelRatio <= 2.5) {
            // Round to nearest even multiple of the actual pixel size for small screens to
            // keep per-pixel accuracy
            scale = Math.floor(scale * window.devicePixelRatio) / window.devicePixelRatio;
        }

        // Setting the scale transform triggers really slow rendering on Raspberry Pi unless we
        // add the "translate3d" hack to trigger hardware acceleration.
        emulator.style.transform = 'scale(' + scale + ') translate3d(0,0,0)';
        emulator.style.left = Math.round((window.innerWidth - emulator.offsetWidth) / 2) + 'px';
        emulator.style.top = '8px';
        
        // Hide emulator elements
        body.classList.add('minimalUI');
        break;
    }
}

window.addEventListener("resize", onResize, false);


function onUIModeMenuButton(event) {
    let menu = document.getElementById('uiModeMenu');
    if (menu.style.visibility === 'visible') {
        menu.style.visibility = 'hidden';
    } else {
        menu.style.visibility = 'visible';
    }
    event.stopPropagation();
}


function getImageData(image) {
    var tempCanvas = document.createElement('canvas');
    tempCanvas.width = image.width;
    tempCanvas.height = image.height;
    var tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(image, 0, 0, image.width, image.height);
    return tempCtx.getImageData(0, 0, image.width, image.height);
}


/** Returns a 5-level grayscale Uint8Array of this data */
function getPixelData5(image) {
    var imageData = getImageData(image);

    // Extract and copy
    var N = imageData.data.length / 4;
    var pixelData = new Uint8Array(N);
    pixelData.width = image.width;
    pixelData.height = image.height;
    for (var i = 0; i < N; ++i) {
        var r = imageData.data[i * 4];
        // Convert red value to 0,1,2,3,4.
        var c = Math.round(0.12 + r / 64);

        pixelData[i] = c;
    }
    // Throw away the data used for conversion to an array
    imageData = null;
    return pixelData;
}


var fontPixelData = null;
(function() {
    var fontSheetImage = new Image();
    fontSheetImage.onload = function () {
        fontPixelData = getPixelData5(fontSheetImage);
    };
    fontSheetImage.src = 'font.png';
})();


/** The sprite sheet. Always 128px wide. Currently 64px high. Shared with Runtime */
var spritePixelData = null;

afterImageLoad('sprites.png', function (spriteSheetImage) {
    // 8x8 sprites scaled up by 3x
    spritePixelData = getPixelData5(spriteSheetImage);
    // Draw on the display canvas
    var spritesDisplay = document.getElementById('spritesDisplay');
    spritesDisplay.width = spriteSheetImage.width * 3;
    spritesDisplay.height = spriteSheetImage.height * 3;
    spritesDisplay.style.width = spritesDisplay.width + 'px';
    spritesDisplay.style.height = spritesDisplay.height + 'px';
    spritesDisplay.onclick = onSpriteSelect;

    var sctx = spritesDisplay.getContext("2d");
    sctx.imageSmoothingEnabled = false;
    sctx.webkitImageSmoothingEnabled = false;
    sctx.drawImage(spriteSheetImage, 0, 0, spritesDisplay.width, spritesDisplay.height);
    sctx.strokeStyle = "#050";

    for (var x = 1; x < 16; ++x) {
        sctx.moveTo(x * 3 * 8, 0);
        sctx.lineTo(x * 3 * 8, spritesDisplay.height);
        sctx.stroke();
    }
    
    for (var y = 1; y < 8; ++y) {
        sctx.moveTo(0, y * 3 * 8);
        sctx.lineTo(spritesDisplay.width, y * 3 * 8);
        sctx.stroke();
    }
    
    setTimeout(redrawSelectedSprite, 500);
});

// For the sprite window
var selectedSpriteIndex = 0;

function onSpriteSelect(event) {
    // 8x8 sprites scaled up by 3x
    var x = clamp(Math.floor(event.offsetX / (3 * 8)), 0, 15);
    var y = clamp(Math.floor(event.offsetY / (3 * 8)), 0, 7);
    selectedSpriteIndex = x + y * 16;
    redrawSelectedSprite();
}


function rgb(r,g,b,x,y) {
    var dither = (y !== undefined);
    x |= 0; y |= 0;

    // Convert to 8-bit
    r = clamp((r * 256) | 0, 0, 255) | 0; g = clamp((g * 256) | 0, 0, 255) | 0; b = clamp((b * 256) | 0, 0, 255) | 0;
    var closestIndex = -1, secondClosestIndex = -1, colorDistance = 1000000, secondDistance = 100000;
    for (var i = screenPalette.length - 1; i >= 0; --i) {
        var c = screenPalette[i] | 0;
        var dist = squaredColorDistance(c & 0xff, (c >> 8) & 0xff, (c >> 16) & 0xff, r, g, b) | 0;
        
        if (dist < colorDistance) {
            secondDistance = colorDistance; secondClosestIndex = closestIndex;
            colorDistance = dist; closestIndex = i;
        } else if (dist < secondDistance) {
            secondDistance = dist; secondClosestIndex = i;
        }
    }

    // Dither closest and second closest when close.  Multiply by 3 and 2 to avoid
    // multiplying by 1.5 and becoming doubles. Use the closestIndex as a hash
    // for the dithering pattern to reduce the number of cases where two patterns
    // that have the same color in them misalign and end up with doubled pixels.
    if (dither && ((x ^ y ^ closestIndex) & 1) &&
        (((colorDistance * 3) | 0) > (secondDistance << 1))) {
        closestIndex = secondClosestIndex;
    }

    return closestIndex;
}

function redrawSelectedSprite() {
    var localPalette = [Runtime.TRANSPARENT, 0, 0, 0, 0, 0, 0, 0, 0, 0];

    var swizzle = document.getElementById('spriteColormap').value;

    // Remove leading 0s so it doesn't parse as octal, and
    // convert NaNs back to zero
    colormap = parseInt(swizzle.replace(/^0+/, '')) || 0;
                        
    for (var slot = 0; slot < 4; ++slot) {
        var c = paletteToolCurrentPalette[0] = paletteToolCurrentPalette[colormap % 10];
        localPalette[4 - slot] = c;
        colormap = (colormap / 10) | 0;
    }

    // Choose a background color that isn't in the current palette so that
    // all colors will be mostly visible.
    var fill = 0;
    for (var i = 0; i < 6; ++i) {
        var ok = true;
        for (var j = 0; j < 7; ++j) {
            ok = ok &&  (paletteToolCurrentPalette[j] !== i);
        }
        if (ok) { fill = i; break; }
    }

    var pi = Math.PI;
    var special = [0, '0',
                   pi/2, '½π',
                   pi/3, '⅓π',
                   2*pi/3, '⅔π',
                   pi/4, '¼π',
                   3*pi/4, '¾π',
                   pi/5,'⅕π',
                   2*pi/5,'⅖π',
                   3*pi/5,'⅗π',
                   4*pi/5, '⅘π',
                   pi/6, '⅙π',
                   pi/7, '⅐π',
                   pi/8, '⅛π',
                   pi/9, '⅑π',
                   pi/10, '⅒π',
                   pi, 'π'];

    var xform = (document.getElementById('selectedSpriteDiagonalButton').checked ? 1 : 0) |
        (document.getElementById('selectedSpriteHorizontalButton').checked ? 2 : 0) |
        (document.getElementById('selectedSpriteVerticalButton').checked ? 4 : 0);
    var rot = document.getElementById('selectedSpriteAngle').value * pi / 180;

    // Snap to any nearby representable values for printing purposes,
    // and also snap the slider (only needed on Firefox)
    
    // Reduce the precision of rot to three decimal places for printing
    var rotStr = '' + (Math.round(rot * 1000) / 1000);
    // Remove optional leading zero
    if (rotStr.substring(0,2) === '0.') { rotStr = rotStr.substring(1); }
    
    for (var i = 0; i < special.length; i += 2) {
        if (Math.abs(special[i] - Math.abs(rot)) < 0.15) {
            rot = Math.sign(rot) * special[i];
            document.getElementById('selectedSpriteAngle').value = rot * 180 / pi;
            rotStr = ((rot < 0) ? '-' : '') + special[i + 1];
            break;
        }
    }
    
    if (Runtime && Runtime._draw && Runtime._spriteSheet) {
        let N = SCREEN_WIDTH * FRAMEBUFFER_HEIGHT;
        let screenData = new Uint8Array(N);
        screenData.fill(fill);
        
        Runtime._draw(selectedSpriteIndex, 6, 6, localPalette, xform, rot, screenData, 0, 0, 63, 63);
        // Expand the paletted image to RGB values
        // Overwrite the entire image for simplicity, even though we only need the upper 12x12
        let data = Runtime._updateImageDataUint32;
        for (var i = 0; i < N; ++i) {
            data[i] = screenPalette[screenData[i]];
        }

        // Copy screen to context (reusing the updateImage context from the main engine)
        updateImage.getContext('2d').putImageData(updateImageData, 0, 0);

        // Blit to the selectedSprite canvas, enlarging it as we go
        var selectedSprite = document.getElementById('selectedSprite');
        var sctx = selectedSprite.getContext('2d');
        sctx.imageSmoothingEnabled = false;
        sctx.webkitImageSmoothingEnabled = false;
        sctx.drawImage(updateImage, 0, 0, 14, 14, 4, 4, 14*4, 14*4);
    }

    let cmd = 'draw(' + selectedSpriteIndex + ',32,32';

    cmd += ',' + swizzle.replace(/^0+([^0])/, '$1');

    if (rotStr !== '0' || xform !== 0) {
        cmd += ',' + xform;
    }

    if (rotStr !== '0') {
        cmd += ',' + rotStr;
    }
    
    cmd += ')';
    
    document.getElementById('spriteCmd').value = cmd;
}


document.getElementById('selectedSpriteDiagonalButton').onclick = document.getElementById('selectedSpriteHorizontalButton').onclick = document.getElementById('selectedSpriteVerticalButton').onclick = redrawSelectedSprite;


function makeSymbolsWindow() {
    var chars =
`½⅓⅔¼¾⅕⅖⅗⅘⅙⅐⅛⅑⅒ %^*/-+ {};
επτ∞∅ξΔαβγδζηθλιμρσϕχψωΩ
∩∪⊕~◅▻¬ &X ≟≠≤≥<> =∊ ⌊⌋|⌈⌉
⁰¹²³⁴⁵⁶⁷⁸⁹ ⁽⁾⁻⁺ ᵃᵝⁱʲˣᵏᵘⁿ
₀₁₂₃₄₅₆₇₈₉ ₍₎₋₊ ₐᵦᵢⱼₓₖᵤₙ`;

    var tooltipTable = {
        '%': 'modulo',
        '^': 'exponent',
        '*': 'multiplication',
        '/': 'division',
        '-': 'subtraction',
        '+': 'addition/string concatenation',
        ';': 'statement separator',
        'ε': 'small value (\\epsilon)',
        'π': 'constant 3.14... (\\pi)',
        'τ': 'integer time in frames (\\tau)',
        '∞': 'infinity (\\infty)',
        '∅': 'nil (\\nil)',
        'ξ': 'random (\\xi)',
        'Δ': 'variable prefix (\\Delta)',
        'α': 'variable (\\alpha)',
        'β': 'variable (\\beta)',
        'γ': 'variable (\\gamma)',
        'δ': 'variable (\\delta)',
        'ζ': 'variable (\\zeta)',
        'η': 'variable (\\eta)',
        'ι': 'variable (\\iota)',
        'λ': 'variable (\\lambda)',
        'μ': 'variable (\\mu)',
        'ρ': 'variable (\\rho)',
        'σ': 'variable (\\sigma)',
        'ϕ': 'variable (\\phi)',
        'χ': 'variable (\\chi)',
        'ψ': 'variable (\\psi)',
        'ω': 'variable (\\omega)',
        'Ω': 'variable (\\Omega)',        
        '{': 'begin table',
        '}': 'end table',
        '∩': 'bitwise and',
        '∪': 'bitwise or',
        '⊕': 'bitwise xor',
        '~': 'bitwise not',
        '◅': 'bit shift left (<<)',
        '▻': 'bit shift right (>>)',
        '¬': 'logical not (\\not)',
        '&': 'logical and',
        'X': 'logical or',
        '⌊': 'floor (\\lfloor)',
        '⌋': 'floor (\\rfloor)',
        '|': 'absolute value',
        '⌈': 'ceiling (\\lceil)',
        '⌉': 'ceiling (\\rceil)',
        '≟': 'equals (?=)',
        '≠': 'not equal/logical xor (!=)',
        '∊': 'FOR-loop in (\\in)',
        '=': 'assignment',
        '≤': 'compare (\\leq)',
        '≥': 'compare (\\geq)',
        '⁰': 'exponent',
        '₀': 'array index'
    };
    var tooltip = 'fraction'
    var s = '';
    var line = 0;
    for (var i = 0; i < chars.length; ++i) {
        var c = chars[i];

        tooltip = tooltipTable[c] || tooltip;
        
        switch (c) {
        case '\n': s += '<br>'; ++line; break;
        case ' ': s += '<span style="display:inline-block;width:' + (12) + 'px"> </span>'; break;
        default:
            if (c === 'X') c = 'or';
            s += '<div onmousedown="event.stopPropagation()" class="button" title="' + tooltip + '" onclick="insertSymbol(\'' + c + '\')"><label><span class="label"><span>' + c + '</span></span></label></div>';
        }
    }
    document.getElementById('keys').innerHTML = s;
}

/** Filled out by makeSoundsWindow */
var soundArray = [];

function makeSoundsWindow() {
    var s = '';
    var type = ['Coin', 'Shoot', 'Explode', 'Powerup', 'Hit', 'Jump', 'Blip', 'Wild'];

    for (let i = 0; i < type.length; ++i) {
        s += '<div style="margin-bottom:5px; width:60px; text-align:left; display: inline-block; position: relative; top: -7px">' + type[i] + '</div>';
        for (let j = 0; j < 10; ++j) {
            let num = i * 10 + j;
            let numStr = (i == 0 ? '0' : '') + num;
            soundArray.push(loadSound('sounds/' + numStr + '-' + type[i] + '.mp3'));
            s += '<div onmousedown="event.stopPropagation()" class="button" onclick="playSoundNum(\'' + num + '\')"><label><span class="label"><span>' + numStr + '</span></span></label></div>';
        } // j
        s += '<br>';
    } // i        
    
    document.getElementById('sounds').innerHTML = s;
}

// Allow the rest of the loading to complete before trying to load all of the sounds
setTimeout(makeSoundsWindow, 0);
makeSymbolsWindow();

/** SymbolsWindow callback */
function insertSymbol(s) {
    editor.session.replace(editor.selection.getRange(), s);
    // Restore focus to the editor
    editor.focus();
}



// Use only MP3s
function loadSound(url) {
    if (_ch_audioContext) {
        // Use asynchronous loading
        let sound = Object.seal({ src: url, 
                                  loaded: false, 
                                  source: null,
                                  buffer: null,
                                  playing: false });
        
        let request = new XMLHttpRequest();
        request.open('GET', url, true);
        request.responseType = 'arraybuffer';
        
        // Decode asynchronously
        request.onload = function() {
            _ch_audioContext.decodeAudioData(
                request.response, 
                function onSuccess(buffer) {
                    sound.buffer = buffer;
                    sound.loaded = true;
                    
                    // Create a buffer, which primes this sound for playing
                    // without delay later.
                    sound.source = _ch_audioContext.createBufferSource();
                    sound.source.buffer = sound.buffer;
                    sound.source.connect(_ch_audioContext.gainNode);
                }, 
                function onFailure() {
                    console.warn("Could not load sound " + url);
                });
        };
        
        sound.playing = false;
        request.send();
        return sound;

    } else {
        // Legacy and local Chrome path
        let s = new Audio();
        s.src = url;
        s.volume = 0.2;
        s.preload = "auto";
        
        s.playing = false;
        s.onended = function() { s.playing = false; };
        s.onpause = s.onended;

        s.load();
        return s;
    }
}


function playSoundNum(n) {
    if (soundArray.length > 0) {
        playSound(soundArray[Math.max(0, Math.min(n | 0, soundArray.length - 1))], false);
    }
}


function playSound(sound, loop) {
    // Ensure that the value is a boolean
    loop = loop ? true : false;

    if (_ch_audioContext) {
        // Chrome creates the audio context paused if it was
        // originally made on page load--resume it.
        _ch_audioContext.resume();
        
        if (sound.loaded) {
            // A new source must be created every time that the sound is played
            sound.source = _ch_audioContext.createBufferSource();
            sound.source.buffer = sound.buffer;
            sound.source.connect(_ch_audioContext.gainNode);
            sound.source.loop = loop;
            sound.source.onended = function () {
                sound.source = null;
                sound.playing = false; 
            };

            if (! sound.source.start) {
                // Backwards compatibility
                sound.source.start = sound.source.noteOn;
                sound.source.stop  = sound.source.noteOff;
            }
            
            sound.playing = true;
            sound.source.start(0);
        }
    } else {
        // Legacy support
        
        try {
            // Reset the sound
            if (! loop) {
                sound.currentTime = 0;
            }
            
            // Avoid changing properties unless required because the 
            // browser's implementation may be inefficient.
            if (sound.loop != loop) {
                sound.loop = loop;
            }
            
            // Only play if needed
            if (! loop || sound.paused || sound.ended) {
                sound.play();
                sound.playing = true;
            }
        } catch (e) {
            // Ignore invalid state error if loading has not succeeded yet
        }
    } // web audio
}


var paletteToolCurrentPalette = [7, 7, 13, 0, 8, 10, 12, 11, 29, 32];

afterImageLoad('rainbow-selector.png', function (rainbowImage) {
    var rainbowImageData = getImageData(rainbowImage);
    
    // VERY approximate brightness on [0, 255]. c is in imageData format.
    function brightness(c) {
        return 0.3 * (c & 0xff) + 0.6 * ((c >> 8) & 0xff) + 0.1 * ((c >> 16) & 0xff);
    }
    
    var s = '';
    for (var i = 0; i < 32; ++i) {
        var c = imageDataToHTMLColorString(screenPalette[i]);
        s += '<div class="colorswatch draggable" draggable="true" onmousedown="event.stopPropagation()" ' +
            ' ondragstart="colorDragStart(event)" style="' +
            (i === 0 ? 'border-radius: 6px 0 0 0;' : '') +
            (i === 15 ? 'border-radius: 0 6px 0 0;' : '') +
            (brightness(screenPalette[i]) < 128 ? 'color:#fff;' : '') +
            'background:' + c + '">' + i + '</div>';
        if (i === 15) { s += '<br>'; }
    }

    s += '<div style="line-height:5px; margin-top:8px; overflow:hidden; height:90px">';
    for (var y = 0; y < rainbowImageData.height; ++y) {
        for (var x = 0; x < rainbowImageData.width; ++x) {
            var idx = (x + y * rainbowImageData.width) * 4;
            var r = rainbowImageData.data[idx], g = rainbowImageData.data[idx + 1], b = rainbowImageData.data[idx + 2];
            // Snap to nano colors
            var colorIndex = rgb(r / 255, g / 255, b / 255);
            var htmlColor = imageDataToHTMLColorString(screenPalette[colorIndex]);
            s += '<div class="tinycolorswatch draggable" draggable="true" onmousedown="event.stopPropagation()" ' +
            ' ondragstart="colorDragStart(event)" style="background:' + htmlColor + '"></div>';
        }
        if (y < rainbowImageData.height - 1) { s += '<br>'; }
    }
    s+= '</div>';

    s += '<div style="position: absolute; top: 166px; left: 40px"><span style="position:relative; top:4px">Palette</span> ';
    for (var i = 9; i >= 0; --i) {
        var style = '';
        if ((i >= 1) && (i < 9)) {
            var c = imageDataToHTMLColorString(screenPalette[paletteToolCurrentPalette[i]]);
            style = ' style="background:' + c + '" '; 
        } else if (i === 9) {
            style = ' title="Transparent" ';
        } else if (i === 0) {
            style = ' title="Previous" ';
        }
        s += '<div class="paletteSlot" ondragover="event.preventDefault()" ' + ((i > 0 && i < 9) ? 'ondrop="colorDragDrop(event)"' : '') + ' id="paletteSlot' + i + '"' + style + '>' + i + '</div>';
    }
    s += '</div>';

    s += '<input type="text" class="cmd" id="palCmd" onmousedown="event.stopPropagation()" onchange="onPalCmdChange(event)">';
    document.getElementById('paletteTray').innerHTML = s;
    updatePaletteToolCmd();
});


function onPalCmdChange(event) {
    var m = event.target.value.trim().match(/(?:pal\()?(\d+)\)?/);
    if (m) {
        c = parseInt(m[1]);
        if (! isNaN(c)) {
            for (var i = 1; i < 7; ++i) {
                paletteToolCurrentPalette[i] = c % 100;
                c = Math.floor(c / 100);
                document.getElementById('paletteSlot' + i).style.background = imageDataToHTMLColorString(screenPalette[paletteToolCurrentPalette[i]]);
            }
        }
    }

    updatePaletteToolCmd();
    redrawSelectedSprite();
}


function colorDragStart(event) {
    var swatch = event.target;

    // Pull the color off the RGB of the background.
    var color = parseColor(window.getComputedStyle(swatch, null).getPropertyValue("background-color"));

    // Needed for Firefox to render the component
    event.dataTransfer.setData('color', JSON.stringify(color));
}


function colorDragDrop(event) {
    var color = event.dataTransfer.getData('color');
    if (! color) { return; }
    color = JSON.parse(color);

    // Find closest nano color
    var colorIndex = rgb(color.r, color.g, color.b);
    event.target.style.background = 'rgb(' + (color.r * 255) + ', ' + (color.g * 255) + ', ' + (color.b * 255) + ')';

    var paletteSlotIndex = parseInt(event.target.innerText);
    paletteToolCurrentPalette[paletteSlotIndex] = colorIndex;
    updatePaletteToolCmd();
    redrawSelectedSprite();
}


function updatePaletteToolCmd() {
    var s = ')';
    for (var i = 1; i < 9; ++i) {
        var c = paletteToolCurrentPalette[i];
        s = c + s;
        if (c < 10) {
            s = '0' + s;
        }
    }
    s = s.replace(/^0+([^0])/, '$1');
    s = 'pal(' + s;
    document.getElementById('palCmd').value = s;
}


(function() {
    // Switch base palette HTML RGB format to ImageData little-endian ABGR format after the
    // palette GUI is constructed.
    for (var i = 0; i < screenPalette.length; ++i) {
        screenPalette[i] = htmlColorIntegerToImageData(screenPalette[i]);
    }
})();

//////////////////////////////////////////////////////////////////////////////////

function cartridgeDragStart(event) {
    // Needed for Firefox to render the component
    event.dataTransfer.setData('text/plain', null);
}


function cartridgeDragEnd(event) {
}

//////////////////////////////////////////////////////////////////////////////////

var DragLib = function() {
    return {
        move : function(element, xpos, ypos){
            element.style.left = xpos + 'px';
            element.style.top  = ypos + 'px';
        },
        
        startMoving : function(element, evt) {
            evt = evt || window.event;

            var container = element.parentNode;
            
            var x0 = element.offsetLeft,
                y0 = element.offsetTop,
                
                maxX = container.getBoundingClientRect().width - element.getBoundingClientRect().width,
                maxY = container.getBoundingClientRect().height - element.getBoundingClientRect().height;

            // Workaround for the container height returning low numbers for the body
            maxY = 1080;
            
	    container.style.cursor = 'move';

            // Initial click offset
            var diffX = evt.clientX - x0, diffY = evt.clientY - y0;
            
            document.onmousemove = function(evt) {
                evt = evt || window.event;
                DragLib.move(element,
                             Math.min(Math.max(evt.clientX - diffX, 0), maxX),
                             Math.min(Math.max(evt.clientY - diffY, 0), maxY));
            }
        },
        
        stopMoving : function(element) {
            element.parentNode.style.cursor = 'default';
            document.onmousemove = null;
        },
    }
}();

var nanoScreen = document.getElementById("screen");
var ctx = nanoScreen.getContext("2d");
ctx.imageSmoothingEnabled = false;
ctx.webkitImageSmoothingEnabled = false;

var bar = document.getElementById("bar");
var barCtx = bar.getContext("2d");
barCtx.imageSmoothingEnabled = false;
barCtx.webkitImageSmoothingEnabled = false;


function onHelp(event) { window.open('doc/specification.md.html', '_blank'); }

function download(url, name) {
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function() {
        window.URL.revokeObjectURL(url);  
        document.body.removeChild(a);
    }, 0);
}


function getTitle(src) {
    var match = src.match(/^#nanojam[ \t]+(..+?)((?:,)([ \t]*\d+[ \t]*))?\n/);
    if (match) {
        return match[1].trim();
    } else {
        return 'Untitled';
    }
}


function getFlags(src) {
    var match = src.match(/^#nanojam[ \t]+(..+?)((?:,)([ \t]*\d+[ \t]*))?\n/);
    if (match && (match[3] !== undefined)) {
        return parseInt(match[3].trim()) || 0;
    } else {
        return 0;
    }
}


function replaceTitle(code, newTitle) {
    var match = code.match(/^#nanojam[ \t]+(..+?)(,([ \t]*\d+[ \t]*))?/);
    if (match) {
        return '#nanojam ' + newTitle + (match[2] || '').trim() + '\n' + code.replace(/^.*\n/, '');
    } else {
        return code;
    }
}


function getFilename(title) {
    title = title || '';
    return title.trim().replace(/ /g, '_').replace(/[:?"'&<>*|]/g, '') + '.nano';
}


function cartridgeArrayContainsFilename(filename) {
    for (var i = 0; i < cartridgeArray.length; ++i) {
        if (cartridgeArray[i].filename === filename) {
            return true;
        }
    }
    
    return false;
}

/** Generate a new title that is like oldTitle but does not collide with any filename
    already in the Google Drive. */
function generateNewTitle(oldTitle) {
    if ((oldTitle === '(NEW CART)') || ! oldTitle) {
        if (! cartridgeArrayContainsFilename(getFilename('Untitled'))) {
            return 'Untitled';
        }
        oldTitle = 'Untitled';
    }

    var i = 2;
   
    var newTitle;
    do {
        newTitle = oldTitle + ' ' + i;
        ++i;
    } while (cartridgeArrayContainsFilename(getFilename(newTitle)));

    return newTitle;
}


function onExportFile(event) {
    var src = editor.getValue();
    var filename = getFilename(getTitle(src));
    if (filename) {
        // Convert unicode to a downloadable binary data URL
        download(window.URL.createObjectURL(new Blob(['\ufeff', src])), filename);
    } else {
        alert('The program must begin with #nanojam and a title before it can be exported');
    }
}

/** Callback for loading from local disk */
function onImportFile(event) {
    var file = event.target.files[0];

    var reader = new FileReader();
    reader.onload = function () {
	editor.setValue(reader.result);
        activeCartridge.title = getTitle(reader.result);
        activeCartridge.filename = getFilename();
        activeCartridge.flags = getFlags(reader.result);
        activeCartridge.readOnly = true;
        activeCartridge.googleDriveFileID = undefined;
        setChanged(true);
        editor.gotoLine(1);
    };
    reader.readAsText(file);	
}


function onRestartButton() {
    onStopButton();
    onPlayButton();
}


var lastAnimationRequest = 0;
function onStopButton() {
    document.getElementById('stopButton').checked = 1;
    setControlEnable('pause', false);
    coroutine = null;
    mode = 'stop';
    cancelAnimationFrame(lastAnimationRequest);
    ctx.clearRect(0, 0, nanoScreen.width, nanoScreen.height);
    barCtx.clearRect(0, 0, bar.width, bar.height);
}


function onPlayButton() {
    if (mode === 'play') { return; }
    
    document.getElementById('playButton').checked = 1;
    setControlEnable('pause', true);
    
    setErrorStatus('');
    mode = 'play';
    emwaFrameTime = 0;
        
    if (! coroutine) {
        // Compile as needed
        var jsoutput = compile(editor.getValue());
        if (! deployed) { console.log(jsoutput); }
        if (jsoutput === null) {
            programNumLines = 0;
            onStopButton();
        } else {
            
            // Ready to execute. Reload the runtime and compile and launch
            // this code within it.
            programNumLines = jsoutput.split('\n').length;
            
            reloadRuntime(function () {
                // Create the function in the Runtime environment
                // so that it sees those variables.
                try {
                    coroutine = Runtime._makeCoroutine(jsoutput);
                    lastAnimationRequest = requestAnimationFrame(mainLoopStep);
                    emulatorKeyboardInput.focus();
                } catch (e) {
                    onStopButton();
                    setErrorStatus('line ' + (e.lineNumber ? clamp(1, e.lineNumber, programNumLines) : '?') + ': ' + e.message);
                    console.log(e);
                }
            });
        }
        
    } else {
        lastAnimationRequest = requestAnimationFrame(mainLoopStep);
        emulatorKeyboardInput.focus();
    }
}

/** Generated when logging in*/
var cartridgeArray;
var cartridgeArrayScrollIndex = 0;
var cartridgeArrayScrollIncrement = 40;

function onCartridgeArrayScrollDown() {
    cartridgeArrayScrollIndex = Math.min(cartridgeArrayScrollIndex + 1, cartridgeArray.length - 1);
    updateCartridgeArrayPositions();
}


function onCartridgeArrayScrollUp() {
    cartridgeArrayScrollIndex = Math.max(cartridgeArrayScrollIndex - 1, 0);
    updateCartridgeArrayPositions();
}


function onCartridgeClick(i) {
    cartridgeArrayScrollIndex = i;
    updateCartridgeArrayPositions();
}


function updateCartridgeArrayPositions() {
    var scrollOffset = -cartridgeArrayScrollIndex * cartridgeArrayScrollIncrement;
    
    for (var i = 0; i < cartridgeArray.length; ++i) {
        var c = cartridgeArray[i];
        if (! c.element) {
            c.element = document.getElementById('cartridge' + i);
        }            
        
        c.element.style.left = Math.round((i === cartridgeArrayScrollIndex) ? 0 : c.x) + 'px';
        c.element.style.top = Math.round(c.y + scrollOffset) + 'px';
    }

    setControlEnable('delete', !cartridgeArray[cartridgeArrayScrollIndex].readOnly);
    setControlEnable('load', cartridgeArrayScrollIndex !== 0);
}


function addToCartridgeArray(title, filename, fileID, flags, code, readOnly) {
    // Code may be empty if it has not been loaded yet.
    
    if (typeof flags !== 'number') {
        console.error('Flags was not a number: ' + flags);
    }

    if (readOnly && ! code) {
        console.error('Read-only cartridge without code: ' + title);
    }

    if (! fileID && ! code) {
        console.error('Non-Google Drive cartridge without code: ' + title);
    }

    for (var i = 0; i < cartridgeArray.length; ++i) {
        if (fileID && (cartridgeArray[i].fileID === fileID)) {
            console.log("Warning: Duplicate cart! (" + title + ", ID = " + fileID + ")");
            return;
        }
    }

    cartridgeArray.push({
        filename: filename,
        
        // On Google Drive, undefined if built-in
        fileID: fileID,
        
        flags: flags,
        
        readOnly: readOnly,

        // Optional; if not present and fileID
        // is set, this will be loaded on demand
        code: code,
        
        title: title,
    });
}

/** If the current document is unsaved, prompt with message and allow the user to cancel the
    action. Otherwise, run the callback. */
function executeWithSaveCheck(message, callback) {
    if (! activeCartridge.changedSinceSaved || confirm(message)) {
        callback();
    }
}


/** Pulls cartridges from Google Drive and starter cart array */
function computeCartridgeArray() {
    cartridgeArray = [];
    
    addToCartridgeArray('(NEW CART)', '', 0, 0, '#nanojam Untitled\n', true);
    for (let i = 0; i < starterCartArray.length; ++i) {
        let code = starterCartArray[i];
        let title = getTitle(code);
        let filename = getFilename(title);
        let flags = getFlags(code);
        addToCartridgeArray(title, filename, 0, flags, code, true);
    }
    
    cartridgeArrayScrollIndex = Math.min(cartridgeArray.length, cartridgeArrayScrollIndex);

    if (! hasGoogleDrive) {
        makeCartridgeWindowContents();
        return;
    }
    
    googleDriveRetrieveAllFiles('nano', 'true', function(files) {
        let remaining = files.length;

        if (remaining === 0) {
            // Nothing to load
            makeCartridgeWindowContents();
        } else {
            files.forEach(function (file, index) {
                if (file.appProperties) {
                    // Do not load contents at index time, since doing so slows down loading
                    // because we must rate limit queries and each one also costs a new
                    // network connection.
                    addToCartridgeArray(file.appProperties.title, file.name, file.id, parseInt(file.flags) || 0, '', false);
                    --remaining;
                } else {
                    // Backwards-compatible path for pre 9/9/2018 carts: fetch the actual file
                    //
                    // Google Drive rate limits queries, so we have to slow down the fetch rate
                    // in this loop slightly to avoid hitting the quota.
                    // In order to do that (in a backwards-compatible way to IE11),
                    // we fire these asynchronously.
                    document.getElementById('allCarts').innerHTML = 'Upgrading your cartridges to the new Google Drive format...';

                    setTimeout(function () {
                        googleDriveGetTextFile(file.id, function(fileID, contents, filename) {
                            if (contents) {
                                let title, filename, flags;
                                // Legacy path
                                title = getTitle(contents);
                                filename = getFilename(title);
                                flags = getFlags(contents);
                                addToCartridgeArray(title, filename, fileID, flags, '', false);

                                // Save in new format
                                googleDriveSaveTextFile(filename,
                                                        'nano', true,
                                                        {
                                                            title : title,
                                                            flags : flags
                                                        },
                                                        contents, undefined, fileID);
                                
                            } else {
                                console.log('Could not load Google Drive file "' + filename + '" with fileID ' + fileID);
                            }
 
                            --remaining;
                            if (remaining <= 0) {
                                makeCartridgeWindowContents();
                            }
                        }, file.name);
                    }, 300 * index);
                } // if legacy
            }); // forEach

            // Only needed because the legacy path delays processing.  If all new files, only
            // this path will be used.
            if (remaining <= 0) {
                makeCartridgeWindowContents();
            }
        } // if
    });
}


function onRunTests() {
    for (let name in tests) {
        let code = tests[name];
        if (compile(code) === null) {
            editor.setValue(code);
            alert('test "' + name + '" failed');
            return false;
        }
    }
    alert('All tests passed');
    return true;
}


var authorizeDiv = document.getElementById('authorize-div');
var signoutButton = document.getElementById('signout-button');
var cartridgeViewer = document.getElementById('cartridgeViewer');
var hasGoogleDrive = false;

function onSignIn() {
    hasGoogleDrive = true;
    authorizeDiv.classList.add('hidden');
    signoutButton.classList.remove('hidden');
    eraseCartridgeWindowContents();
    computeCartridgeArray();

    googleDriveGetUserInfo(function (user) {
        if (user.photoLink) { document.getElementById('user-photo').src = user.photoLink; }
        document.getElementById('user-name').innerHTML = user.displayName;
    });
}


function onSignOut() {
    hasGoogleDrive = false;
    justSignedIn = false;
    authorizeDiv.classList.remove('hidden');
    signoutButton.classList.add('hidden');
    document.getElementById('user-name').innerHTML = '';
    // Blank GIF
    document.getElementById('user-photo').src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
    computeCartridgeArray();
}


function onLoadButton() {
    onStopButton();
    if (document.getElementById('loadButtonContainer').classList.contains('disabled')) { return; }

    executeWithSaveCheck('You will lose your unsaved changes if you load a new cartridge without saving first. Load it anyway?', function () {
        setActiveCartridge(cartridgeArray[cartridgeArrayScrollIndex]);
    });
}


function onDeleteButton() {
    if (document.getElementById('deleteButtonContainer').classList.contains('disabled')) { return; }

    var c = cartridgeArray[cartridgeArrayScrollIndex];
    if (! c.fileID) { console.log('tried to delete a file with no ID'); return; }

    if (confirm('Move "' + c.title + '" into the Trash in your Google Drive?')) {
        showWaitDialog();
        eraseCartridgeWindowContents();
        googleDriveSaveTextFile(c.filename,
                                'nano', true,
                                {
                                    title : c.title,
                                    flags : c.flags            
                                },
                                c.code,
                                function () {
                                    setTimeout(function () {
                                        hideWaitDialog();
                                        computeCartridgeArray();
                                    }, 2000);
                                },
                                c.fileID,
                                true);
    } // if
}


function onCloneButton() {
    onStopButton();
    if (document.getElementById('cloneButtonContainer').classList.contains('disabled')) { return; }

    executeWithSaveCheck('You will lose your unsaved changes if you load a new cartridge without saving first. Load it anyway?', function () {
        // Create a new cartridge with a new title
        var src = cartridgeArray[cartridgeArrayScrollIndex];

        // Generate a new title
        var newTitle = generateNewTitle(src.title);
        var newFilename = getFilename(newTitle);
        var newCode = replaceTitle(src.code, newTitle);

        // Replace the title in the code
        var dst = {
            title:    newTitle,
            filename: newFilename,
            flags:    src.flags,
            fileID:   undefined,
            readOnly: false,
            code:     newCode
        };
        
        // Load the new cartridge
        updateAndSaveCartridge(newTitle, newFilename, newCode, dst, undefined);
        setActiveCartridge(dst);
    });
    
}


/** Called when the last Google Drive cartridge is found */
function makeCartridgeWindowContents() {
    // Make slight changes in brightness so that cartridges don't look too repetitive
    function nameBrightness(name) {
        return (name === undefined) ? 0.0 : (Math.cos(name.length + name.charCodeAt(name.length - 1) + name.indexOf('a')) * 0.1 + 0.95);
    }
    
    function nameHue(name) {
        return (name === undefined) ? 0.0 : Math.floor((Math.cos(0.2 * name.length + name.charCodeAt(0)) + 1) * 360);
    }

    cartridgeArray.sort(function (a, b) {
        if (a.title === '(NEW CART)') {
            return -1;
        } else {
            a = a.filename.toLowerCase();
            b = b.filename.toLowerCase();
            if (a < b) {
                return -1;
            } else if (a > b) {
                return +1;
            } else {
                return 0;
            }
        }
    });

    for (let i = 0; i < cartridgeArray.length; ++i) {
        let c = cartridgeArray[i];
        c.hue = nameHue(c.title);
        c.brightness = nameBrightness(c.title);
        c.x = 225 + Math.floor((Math.sin(i * 10) + 1) * 8);
        c.y = (i + 1) * cartridgeArrayScrollIncrement + Math.floor(Math.random() * 12);
    }
    
    let c = cartridgeArray[0];
    let s = '<div id="cartridge0" style="filter: sepia(100%) saturate(300%) hue-rotate(-45deg); position: absolute; top: ' + c.y + 'px; left:' + c.x + 'px" class="cartridge readonly" onmousedown="onCartridgeClick(0) || event.stopPropagation()"><div class="label">(NEW CART)</div></div>';

    let foundActive = false;
    for (let i = 1; i < cartridgeArray.length; ++i) {
        let c = cartridgeArray[i];
        s += '<div id="cartridge' + i + '" style="filter: sepia(' + Math.floor(c.hue / 36) + '%) brightness(' + c.brightness + '); position: absolute; top: ' + c.y + 'px; left:' + c.x + 'px" class="cartridge' + (c.readOnly ? ' readonly' : '') + '" onmousedown="onCartridgeClick(' + i + ') || event.stopPropagation()"><div class="label n00" style="filter: hue-rotate(' + c.hue + 'deg)"></div><div class="title">' + c.title + '</div></div>';
        foundActive = foundActive || (c.fileID === activeCartridge.fileID);
    }
    document.getElementById('allCarts').innerHTML = s;

    if (! foundActive) {
        // The active cartridge's file ID does not seem to exist any more on Google Drive, so
        // remove its reference.
        activeCartridge.fileID = undefined;
    }

    if (hasGoogleDrive && justLoggedIn) {
        justLoggedIn = false;
        if (displayMode === 'IDE') {
            let lastFileID = window.localStorage.getItem('lastFileID');
            if (lastFileID) {
                for (let i = 0; i < cartridgeArray.length; ++i) {
                    if (cartridgeArray[i].fileID === lastFileID) {
                        setActiveCartridge(cartridgeArray[i]);
                        break;
                    }
                }
            }
        }
    }
    
    setTimeout(updateCartridgeArrayPositions, 10);
}


function onSaveButton() {
    if (document.getElementById('saveButtonContainer').classList.contains('disabled')) { return; }

    activeCartridge.code = editor.getValue();
    var newTitle = getTitle(activeCartridge.code);
    var newFlags = getFlags(activeCartridge.code);
    var newFilename = getFilename(newTitle);

    if (! newFilename) {
        alert('The program must begin with #nanojam and a title before it can be saved to Google Drive');
        return;
    }

    // See if there's a collision with any other cartridge
    for (var i = 0; i < cartridgeArray.length; ++i) {
        var c = cartridgeArray[i];
        if ((c.filename === newFilename) && (c.fileID !== activeCartridge.fileID)) {
            if (c.readOnly) {
                alert('This cartridge\'s title "' + newtitle + '" is too similar to read-only cartridge "' + c.title + '". Change the title on the first line before saving.');
                return;
            } else {
                if (confirm('Saving with the current title will overwrite a different cartridge "' + c.title + '" because their titles are similar.')) {
                    // Delete the other cartridge
                    // TODO
                } else {
                    return;
                }
            }
        }
    } // for each cartridge

    // If we're renaming a cartridge that has already been saved and it is not 'untitled', prompt
    // the user for what to do.
    if (activeCartridge.fileID && (newFilename !== activeCartridge.filename) && (activeCartridge.title.toLowerCase().indexOf('untitled') === -1)) {
        showRenameDialog(newTitle, newFilename);
    } else {
        updateAndSaveCartridge(newTitle, newFilename, activeCartridge.code, activeCartridge, saveIDEState);
    }
}


/** See also makeCartridgeWindowContents */
function eraseCartridgeWindowContents() {
   document.getElementById('allCarts').innerHTML = 'Scanning Google Drive...';
}


function updateAndSaveCartridge(newTitle, newFilename, code, cartridge, callback) {
    cartridge.title = newTitle;
    cartridge.filename = newFilename;
    cartridge.code = code;

    eraseCartridgeWindowContents();
    googleDriveSaveTextFile(cartridge.filename,
                            'nano', true,
                            {
                                title : cartridge.title,
                                flags : getFlags(cartridge.code)
                            },
                            cartridge.code,
                            function (file) {
                                if (file.error) {
                                    console.log(file);
                                    alert('Saving failed with Google Drive message "' + file.error.message + '" and HTTP code ' + file.error.code + '. \n\nPlease try again or download your program.');
                                } else {
                                    cartridge.fileID = file.id;
                                    cartridge.readOnly = false;
                                    setChanged(false);
                                    computeCartridgeArray();
                                    // Scroll the cartrige window to the currently loaded one
                                    // TODO
                                }
                                if (callback) { callback(); }
                            },
                            cartridge.fileID);
}


function showRenameDialog(newTitle, newFilename) {
    onPauseButton();
    document.getElementById('saveRenameLabel').innerHTML = 'Rename "' + activeCartridge.title + '" as "' + newTitle + '"';
    document.getElementById('saveCloneLabel').innerHTML = 'Create a new "' + newTitle + '" cartridge';
    document.getElementById('renameDialog').classList.remove('hidden');

    document.getElementById('saveRenameContainer').onclick = function () {
        showWaitDialog();
        updateAndSaveCartridge(newTitle, newFilename, activeCartridge.code, activeCartridge,
                               function () {
                                   hideRenameDialog();
                                   hideWaitDialog();
                                   saveIDEState();
                               });    
    };

    document.getElementById('saveCloneContainer').onclick = function () {
        // Remove the fileID, which will force it to be regenerated as a new file
        activeCartridge.fileID = undefined;
        showWaitDialog();
        updateAndSaveCartridge(newTitle, newFilename, activeCartridge, function () {
            hideRenameDialog();
            hideWaitDialog();
            saveIDEState();
        });    
    };
}

function showWaitDialog() {
    document.getElementById('waitDialog').classList.remove('hidden');
}

function hideWaitDialog() {
    document.getElementById('waitDialog').classList.add('hidden');
}

function hideRenameDialog() {
    document.getElementById('renameDialog').classList.add('hidden');
}


window.onclick = function(event) {
    // Hide modal dialogs
    if (event.target.classList.contains('modal') && (event.target !== document.getElementById('waitDialog'))) {
        event.target.classList.add('hidden');
    }
} 

function onPauseButton() {
    if (mode === 'play') {
        document.getElementById('pauseButton').checked = 1;
        mode = 'pause';
    }
}

function inModal() {
    return ! document.getElementById('renameDialog').classList.contains('hidden');
}


function onDocumentKeyDown(event) {
    switch (event.which || event.keyCode) {
    case 116: F5
        // F5
        event.preventDefault();
        if (! inModal()) {
            if (event.ctrlKey || event.metaKey) {
                onPlayButton();
            } else if (! event.shiftKey) {
                onRestartButton();
            } else {
                onStopButton();
            }
        }
        break;
        
    case 82: // R
        if (event.ctrlKey || event.metaKey) {
            // Intercept from browser
            event.preventDefault();
            if (! inModal()) { onRestartButton(); }
        }
        break;

    case 83: // S
        if (event.ctrlKey || event.metaKey) {
            // Intercept from browser
            event.preventDefault();
            if (! inModal()) { onSaveButton(); }
        }
        break;
        
    case 19: // [Ctrl+] Break
        onPauseButton();
        break;
    }
}

document.addEventListener('keydown', onDocumentKeyDown);

var jsCode = document.getElementById('jsCode') && ace.edit(document.getElementById('jsCode'));
var editorStatusBar = document.getElementById('editorStatusBar');
var editor = ace.edit('editor');
editor.setTheme('ace/theme/tomorrow_night_bright');

// Stop auto-completion of parentheses
editor.setBehavioursEnabled(false);

var aceSession = editor.getSession();
aceSession.setTabSize(2);
aceSession.setUseSoftTabs(true);

// Hide the syntax parsing "errors" from misinterpreting the source as JavaScript
editor.session.setUseWorker(false);
aceSession.setMode('ace/mode/nano');
aceSession.setUseWrapMode(true);

/** Used for tracking */
var activeCartridge = {
    filename:          undefined,
    fileID:            undefined,
    readOnly:          undefined,
    changedSinceSaved: undefined,
    // Used as a cache
    code:              undefined,
    flags:             undefined
};


function saveIDEState() {
    window.localStorage.setItem('lastFileID', activeCartridge.fileID);
}


/** noSaveIDE disables saving the IDE state during this call. Otherwise, the IDE is saved. */
function setActiveCartridge(cartridge, noSaveIDE) {
    function completeLoad(fileID, contents, filename) {
        activeCartridge.code = contents;
        editor.setValue(contents);
        editor.gotoLine(0, 0, false);
        editor.scrollToLine(0, false, false, undefined);
        setChanged(false);
        hideWaitDialog();
        if (! noSaveIDE) { saveIDEState(); }
    }

    if (! activeCartridge.code && ! activeCartridge.fileID) {
        alert('Error: cartridge.code not available but cartridge was not on Google Drive');
        return;
    }

    activeCartridge = cartridge;

    if (! activeCartridge.code) {
        // Fetch the file from Google Drive
        showWaitDialog();
        googleDriveGetTextFile(activeCartridge.fileID, completeLoad);
    } else {
        completeLoad(activeCartridge.fileID, activeCartridge.code, activeCartridge.filename);
    }
}


function setChanged(s) {
    if (s !== activeCartridge.changedSinceSaved) {
        setControlEnable('save', s);
        activeCartridge.changedSinceSaved = s;
    }
}

var minifyCheckbox = document.getElementById('minify');
var aggressiveCheckbox = document.getElementById('aggressive');

function countCharacters() {
    var str = editor.getValue();

    // Count characters
    var minStr = minifyCheckbox.checked ? minify(str, aggressiveCheckbox.checked) : str;
    var twitter = minStr;
        
    // https://developer.twitter.com/en/docs/developer-utilities/twitter-text.html
    // Twitter double-counts certain unicode characters
    var twitterProxy = twitter.replace(/([^\u0000-\u10FF\u2000-\u200D\u2010-\u201F\u2032-\u2037])/g, '$1X');

    var url = 'https://morgan3d.github.io/nano/index.html?code=' + LZString.compressToEncodedURIComponent(minStr);

    editorStatusBar.innerHTML = '<a target="_blank" href="' + window.URL.createObjectURL(new Blob(['\ufeff', minStr])) + '">' +
        minStr.length + ' chars</a> | ' +
        (twitter !== minStr ? '<a target="_blank" href="' + window.URL.createObjectURL(new Blob(['\ufeff', twitter])) + '">' : '') +
        (twitterProxy.length > 280 ? '<span style="color:#c00">' : '<span>') +
        twitterProxy.length +
        '</span> / 280 Twitter' + (twitter != minStr ? '</a>' : '') + ' | ' +
        '<a target="_blank" href="' + url + '">' + (url.length > 2048 ? '<span style="color:#c00">' : '<span>') + url.length + '</span> / 2048 url</a>';
}

const autocorrectTable = [
    '\\Delta',    'Δ',
    '\\alpha',    'α',
    '\\beta',     'β',
    '\\gamma',    'γ',
    '\\delta',    'δ',
    '\\epsilon',  'ε',
    '\\zeta',     'ζ',
    '\\eta',      'η',
    '\\theta',    'θ',
    '\\iota',     'ι',
    '\\lambda',   'λ',
    '\\mu',       'μ',
    '\\rho',      'ρ',
    '\\sigma',    'σ',
    '\\phi',      'ϕ',
    '\\chi',      'χ',
    '\\psi',      'ψ',
    '\\omega',    'ω',
    '\\Omega',    'Ω',
    '\\tau',      'τ',
    '\\time',     'τ',
    '\\xi',       'ξ',
    '\\rnd',      'ξ',
    '\\in',       '∊',
    '==',         '≟',
    '?=',         '≟',
    '!=',         '≠',
    '\\neq',      '≠',
    '\\eq',       '≟',
    '\\not',      '¬',
    '\\leq',      '≤',
    '<=',         '≤',
    '\\geq',      '≥',
    '>=',         '≥',
    '>>',         '▻',
    '<<',         '◅',
    '\\bitand',   '∩',
    '\\bitor',    '∪',
    '\\bitxor',   '⊕',
    '\\pi',       'π',
    '\\infty',    '∞',
    '\\nil',      '∅',
    '\\half',     '½',
    '\\third',    '⅓',
    '\\quarter',  '¼',
    '\\fifth',    '⅕',
    '\\sixth',    '⅙',
    '\\seventh',  '⅐',
    '\\eighth',   '⅛',
    '\\ninth',    '⅑',
    '\\tenth',    '⅒',     
    '\\lfloor',   '⌊',
    '\\rfloor',   '⌋',
    '\\lceil',    '⌈',
    '\\rceil',    '⌉'
];


editor.session.on('change', function () {
    let src = editor.getValue();
    if (src.match(/\r|\t|[\u2000-\u200B]/)) {
        // Strip any \r inserted by pasting on windows, replace any \t that
        // likewise snuck in. This is rare, so don't invoke setValue unless
        // one is actually inserted.
        src = src.replace(/\r\n|\n\r/g, '\n').replace(/\r/g, '\n');
        src = src.replace(/\t/g, '  ').replace(/\u2003|\u2001/g, '  ').replace(/\u2007/g, ' ');
        editor.setValue(src);
    } else {
        // Autocorrect
        let position = editor.getCursorPosition();
        let index = editor.session.doc.positionToIndex(position);

        let LONGEST_AUTOCORRECT = 10;
        let start = index - LONGEST_AUTOCORRECT;
        let substr = src.substring(start, index + 1);

        // Look for any possible match in substr, which is faster than
        // searching the entirety of the source on every keystroke
        for (let i = 0; i < autocorrectTable.length; i += 2) {
            let target = autocorrectTable[i];
            let x = substr.indexOf(target);
            if (x >= 0) {
                let replacement = autocorrectTable[i + 1];
                // Found an autocorrectable substring: replace it
                src = src.substring(0, start + x) + replacement + src.substring(start + x + target.length);
                editor.setValue(src);

                // Move the cursor to retain its position
                editor.gotoLine(position.row + 1, Math.max(0, position.column - target.length + replacement.length + 1), false);
                break;
            }
        }
    }
    
    countCharacters();
    setChanged(true);
});


if (jsCode) {
    jsCode.getSession().setUseWorker(false);
    jsCode.getSession().setMode('ace/mode/javascript');
    jsCode.setReadOnly(true);
    jsCode.getSession().setUseWrapMode(true);
}

var updateImage = document.createElement('canvas');
var updateImageData;
var error = document.getElementById('error');

function setFramebufferSize(w) {
    SCREEN_WIDTH = w;
    SCREEN_HEIGHT = SCREEN_WIDTH;
    BAR_HEIGHT = SCREEN_HEIGHT >> 3;
    BAR_SPACING = BAR_HEIGHT >> 1;
    FRAMEBUFFER_HEIGHT = SCREEN_HEIGHT + BAR_SPACING + BAR_HEIGHT;

    updateImage.width = SCREEN_WIDTH;
    updateImage.height = FRAMEBUFFER_HEIGHT;
    updateImageData = ctx.createImageData(SCREEN_WIDTH, FRAMEBUFFER_HEIGHT);
    if (Runtime) {
        Runtime._SCREEN_WIDTH_BITS = Math.log2(SCREEN_WIDTH) | 0;
        Runtime._SCREEN_WIDTH = SCREEN_WIDTH;
        Runtime._SCREEN_HEIGHT = SCREEN_HEIGHT;
        Runtime._BAR_HEIGHT = BAR_HEIGHT;
        Runtime._BAR_SPACING = BAR_SPACING;
        Runtime._FRAMEBUFFER_HEIGHT = FRAMEBUFFER_HEIGHT;
        Runtime._screen = new Uint8Array(SCREEN_WIDTH * FRAMEBUFFER_HEIGHT)
        Runtime._updateImageDataUint32 = new Uint32Array(updateImageData.data.buffer);
    }

    // The layout may need updating as well
    onResize();
}

/** Returns javascript source and returns it, or returns null */
function compile(src) {
    try {
        // Insert the nano reset sequence as a single line, so that line numbers are preserved.
        // Eliminate unnecessary semicolons for cleanliness when reading the merged code.
        let resetAnimation = nanoToJS(resetAnimationNanoSource, true).replace(/\n/g, ';').replace(/;(\s?;)*/g, ';').replace(/};/g, '}');
        let code = resetAnimation + nanoToJS(src);
        if (jsCode) {
            jsCode.setValue(code);
            jsCode.gotoLine(1);
        }
        setErrorStatus('');
        return code;
    } catch (e) {
        setErrorStatus(e);
        console.log(e);
        if (jsCode) {
            jsCode.setValue(e);
            jsCode.gotoLine(1);
        }
        return null;
    }
}

// Set by compilation
var programNumLines = 0;

var mode = 'stop';

/** Returns non-false if the button whose name starts with ctrl is currently down. */
function pressed(ctrl) {
    return document.getElementById(ctrl + 'Button').checked;
}

/** Sets the visible enabled state of the button whose name starts with ctrl to e */
function setControlEnable(ctrl, e) {
    var b = document.getElementById(ctrl + 'Button');
    if (b) { b.disabled = ! e; }

    var container = document.getElementById(ctrl + 'ButtonContainer');
    if (e) {
        container.classList.remove('disabled');
    } else {
        container.classList.add('disabled');
    }
}

/** Called by the IDE toggle buttons */
function onToggle(button) {
    var win = document.getElementById(button.id.replace('Button', 'Window'));
    if (win) {
        if (button.checked) { win.classList.remove('hidden'); }
        else                { win.classList.add('hidden'); }
    }
}


/** Called by the IDE radio buttons */
function onRadio() {
    if (pressed('play') && (mode !== 'play')) {
        onPlayButton();
    } else if (pressed('pause') && (mode === 'play')) {
        onPauseButton();
    } else if (pressed('stop') && (mode !== 'stop')) {
        onStopButton();
    }
}


function setErrorStatus(e) {
    error.innerHTML = e;
}


setControlEnable('pause', false);
var coroutine = null;

var emwaFrameTime = 0;
var frameTimer = document.getElementById('frameTimer');
    
function mainLoopStep(time) {
    refreshPending = false;

    var frame1 = performance.now();
    
    // Worst-case timeout
    var endTime = time + 15;
    
    // Run the "infinite" loop for a while, maxing out at just under 1/60 of a second or when
    // the program explicitly requests a refresh via show().
    try {
        while (! refreshPending && (performance.now() < endTime) && (mode === 'play') && coroutine) {
            coroutine.next();
        }
    } catch (e) {
        // Runtime error
        onStopButton();
        if (e.lineNumber) {
            setErrorStatus('line ' + clamp(1, e.lineNumber, programNumLines) + ': ' + e.message);
        } else if (e.stack) {
            let match = e.stack.match(/<anonymous>:(\d+)/);
            if (match) {
                setErrorStatus('near line ' + clamp(1, parseInt(match[1]) - 2, programNumLines) + ': ' + e.message);
            } else {
                setErrorStatus(e.message);
            }
        } else {
            setErrorStatus(e.message);
        }
        console.log(e);
        console.dir(e);
    }
   

    // Keep the callback chain going
    if (mode === 'play') {
        lastAnimationRequest = requestAnimationFrame(mainLoopStep);
    }

    var frameTime = performance.now() - frame1;
    if (emwaFrameTime === 0) {
        // First frame
        emwaFrameTime = frameTime;
    } else {
        emwaFrameTime = emwaFrameTime * 0.95 + frameTime * 0.05;
    }
    frameTimer.innerHTML = "" + Math.round(emwaFrameTime) + " ms";

}

/** When true, the system is waiting for a refresh to occur and mainLoopStep should yield
    as soon as possible. */
var refreshPending = false;

function reloadRuntime(oncomplete) {
    Runtime.document.open();
    Runtime.document.write("<script src='nano-runtime.js' charset='utf-8'> </script>");
    Runtime.onload = function () {
        Runtime._screenPalette = screenPalette;
        Runtime._spriteSheet   = spritePixelData;
        Runtime._fontSheet     = fontPixelData;
        Runtime.rgb            = rgb;
        Runtime.sound          = playSoundNum;
        Runtime._setFramebufferSize = setFramebufferSize;
        Runtime._submitFrame    = submitFrame;
        if (SCREEN_WIDTH) { setFramebufferSize(SCREEN_WIDTH); }
        if (oncomplete) { oncomplete(); }
    };
    
    Runtime.document.close();
}


/************** Emulator event handling ******************************/
var mouseTarget = document.getElementById('screen');
var emulatorMouseBtnState = {}
var emulatorMouseBtnJustPressed = {}
mouseTarget.addEventListener('mousemove', e => {
    Runtime.mouse.x = Math.floor(e.offsetX*SCREEN_WIDTH/mouseTarget.width);
    Runtime.mouse.y = Math.floor(e.offsetY*SCREEN_HEIGHT/mouseTarget.height);
});
mouseTarget.addEventListener('mousedown', e => {
    event.stopPropagation();
    event.preventDefault();
    emulatorMouseBtnJustPressed[e.button] = true
    emulatorMouseBtnState[e.button] = true
});
mouseTarget.addEventListener('mouseup', e => {
    emulatorMouseBtnState[e.button] = false
});
// disable context menu, if browser allows
mouseTarget.addEventListener("contextmenu",e=>{return false;})

var emulatorKeyState = {};
var emulatorKeyJustPressed = {};

var screenshotKey = 117; // F6
var gifCaptureKey = 119; // F8

function onEmulatorKeyDown(event) {
    event.stopPropagation();
    event.preventDefault();

    // On browsers that support it, ignore
    // synthetic repeat events
    if (event.repeat) { return; }
         
    var key = event.which || event.keyCode;
    emulatorKeyState[key] = true;
    emulatorKeyJustPressed[key] = true;

    if ((key === 116) || (key === 19)) {
        // Pass F5 and Ctrl-break to the IDE
        onDocumentKeyDown(event);  
    } if (key === screenshotKey) {
        // Screenshot
        download(nanoScreen.toDataURL(), 'screenshot.png');
    } else if (key == gifCaptureKey) {
        if (gifRecording) {
            // Save
            document.getElementById('recording').classList.add('hidden');
            gifRecording.render();
            gifRecording = null;
        } else {
            document.getElementById('recording').classList.remove('hidden');
            gifRecording = new GIF({workers:3, quality:30, width:nanoScreen.width, height:nanoScreen.height});
            gifRecording.frameNum = 0;
            gifRecording.on('finished', function (blob) {
                window.open(URL.createObjectURL(blob));
            });
        }
    }
}


function onEmulatorKeyUp(event) {
    emulatorKeyState[event.keyCode] = false;
    event.stopPropagation();
    event.preventDefault();
}

var emulatorKeyboardInput = document.getElementById('emulatorKeyboardInput');
emulatorKeyboardInput.addEventListener('keydown', onEmulatorKeyDown, false);
emulatorKeyboardInput.addEventListener('keyup', onEmulatorKeyUp, false);

/** Returns the ascii code of this character */
function ascii(x) { return x.charCodeAt(0); }

/** Used by _submitFrame() to map axes and buttons to event key codes when sampling the keyboard controller */
var keyMap = [{'-x':[ascii('A'), 37],         '+x':[ascii('D'), 39],          '-y':[ascii('W'), 38], '+y':[ascii('S'), 40],          a:[ascii('Z'), 32],          b:[ascii('X'), 13],   c:[ascii('E'), ascii('E')], d:[ascii('R'), ascii('R')], s:[ascii('1'), ascii('1')]},
              {'-x':[ascii('J'), ascii('J')], '+x':[ascii('L'), ascii('L')],  '-y':[ascii('I')],     '+y':[ascii('K'), ascii('K')],  a:[ascii('G'), ascii('.')],  b:[ascii('H'), 186],  c:[ascii('O'), ascii('O')], d:[ascii('P'), ascii('P')], s:[ascii('7'), ascii('7')]}];

var prevRealGamepadState = [];

function getIdealGamepads() {
    var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads : []);
    var gamepadArray = [];
    // Center of gamepad
    var deadZone = 0.2;
    
    // Compact gamepads array and perform thresholding
    for (var i = 0; i < gamepads.length; ++i) {
        var pad = gamepads[i];
        if (pad) {
            var mypad = {axes:[0, 0], buttons:[false, false]};
            for (var a = 0; a < 2; ++a) {
                mypad.axes[a] = (Math.abs(pad.axes[a]) > deadZone) ? Math.sign(pad.axes[a]) : 0;
            }

            // A and B
            for (var b = 0; b < 2; ++b) {
                var but = pad.buttons[b];
                mypad.buttons[b] = (typeof(but) === "object") ? but.pressed : (but > 0.5);
            }

            // Start
            var but = pad.buttons[9];
            mypad.buttons[9] = (typeof(but) === "object") ? but.pressed : (but > 0.5);

            gamepadArray.push(mypad);
            
            if (gamepadArray.length > prevRealGamepadState.length) {
                prevRealGamepadState.push({axes:[0, 0], buttons:[false, false, false, false,//0-3
                                                                 undefined, undefined, undefined, undefined, // 5-8
                                                                 false // 9
                                                                ]});
            }
        }
    }
    
    return gamepadArray;
}


function submitFrame() {
    // Update the image
    updateImage.getContext('2d').putImageData(updateImageData, 0, 0);
    barCtx.drawImage(updateImage,
                     0, 0, SCREEN_WIDTH, BAR_HEIGHT,
                     0, 0, bar.width,    bar.height);
    ctx.drawImage(updateImage,
                  0, BAR_HEIGHT + BAR_SPACING, SCREEN_WIDTH, SCREEN_HEIGHT,
                  0, 0,                        nanoScreen.width, nanoScreen.height);

    if (gifRecording) {
        // Only record alternating frames to reduce file size
        if (gifRecording.frameNum & 1) {
            gifRecording.addFrame(ctx, {delay: 1000/30, copy: true});
        }
        ++gifRecording.frameNum;
        if (gifRecording.frameNum > 60*12) {
            // Stop after 12 seconds
            document.getElementById('recording').classList.add('hidden');
            gifRecording.render();
            gifRecording = null;
        }
    }
    
    refreshPending = true;

    let axes = 'xy', buttons = 'abcds';

    // HTML gamepad indices of corresponding elements of the buttons array
    let buttonIndex = [0, 1, 9];
    
    let gamepadArray = getIdealGamepads();
    
    // Sample the keys
    for (let player = 0; player < 2; ++player) {
        let map = keyMap[player], pad = Runtime.pad[player],
            realGamepad = gamepadArray[player], prevRealGamepad = prevRealGamepadState[player];

        for (let a = 0; a < axes.length; ++a) {
            var axis = axes[a];
            var pos = '+' + axis, neg = '-' + axis;
            var n0 = map[neg][0], n1 = map[neg][1], p0 = map[pos][0], p1 = map[pos][1];

            // Current state
            pad[axis] = (((emulatorKeyState[n0] || emulatorKeyState[n1]) ? -1 : 0) +
                         ((emulatorKeyState[p0] || emulatorKeyState[p1]) ? +1 : 0));

            // Just pressed
            pad[axis + axis] = (((emulatorKeyJustPressed[n0] || emulatorKeyJustPressed[n1]) ? -1 : 0) +
                                ((emulatorKeyJustPressed[p0] || emulatorKeyJustPressed[p1]) ? +1 : 0));
            
            if (realGamepad && (realGamepad.axes[a] !== 0)) { pad[axis] = realGamepad.axes[a]; }
            if (realGamepad && (prevRealGamepad.axes[a] !== realGamepad.axes[a])) { pad[axis + axis] = realGamepad.axes[a]; }
        }

        for (var b = 0; b < buttons.length; ++b) {
            var button = buttons[b];
            var b0 = map[button][0], b1 = map[button][1];
            pad[button] = (emulatorKeyState[b0] || emulatorKeyState[b1]) ? 1 : 0;
            pad[button + button] = (emulatorKeyJustPressed[b0] || emulatorKeyJustPressed[b1]) ? 1 : 0;

            var i = buttonIndex[b];
            if (realGamepad && realGamepad.buttons[i]) { pad[button] = true; }
            if (realGamepad && realGamepad.buttons[i] && ! prevRealGamepad.buttons[i]) { pad[button + button] = true; }
        }

        pad.θ = Math.atan2(pad.y, pad.x);
        
        // Update old state
        if (realGamepad) {
            prevRealGamepadState[player] = realGamepad;
        }
    }

    // Reset the just-pressed state
    emulatorKeyJustPressed = {};

    // mouse state
    // 0==left, 1==middle, 2==right
    let mouseBtns = 'lmr';
    for (let i=0; i<mouseBtns.length; i++) {
        var mbtn = mouseBtns[i];
        Runtime.mouse[mbtn] = emulatorMouseBtnState[i] ? 1 : 0;
        Runtime.mouse[mbtn+mbtn] = emulatorMouseBtnJustPressed[i] ? 1 : 0;
    }

    // Reset mouse btn just-pressed state
    emulatorMouseBtnJustPressed = {};

}


setTimeout(function () {
    reloadRuntime(function () {
        setFramebufferSize(64);
    });
}, 0);

var emulatorButtonState = {};

window.onbeforeunload = function (event) {
    if (activeCartridge.changedSinceSaved) {
        return 'You have unsaved changes in the nano editor';
    }
};

let justLoggedIn = true;

(function() {
    if (deployed) { initialSource = starterCartArray[0]; }

    // Hide the UI mode menu if anyone clicks off of it while it is open
    window.addEventListener('click',
                            function () {
                                let menu = document.getElementById('uiModeMenu');
                                if (menu.style.visibility !== 'hidden') {
                                    menu.style.visibility = 'hidden';
                                }
                            });

    // Code has been specified to the emulator; start with it and push the start button
    var code = getQueryString('code');
    if (code) {
        activeCartridge.code = LZString.decompressFromEncodedURIComponent(code);
        activeCartridge.title = getTitle(initialSource);
        activeCartridge.filename = getFilename(activeCartridge.title);
        activeCartridge.flags = getFlags(initialSource);
        activeCartridge.readOnly = true;
        activeCartridge.googleDriveFileID = undefined;
    } else {
        activeCartridge.code = initialSource;
    }

    // Set button callbacks
    let buttons = 'WASD1ZXER';
    for (let i = 0; i < buttons.length; ++i) {
        let b = buttons[i];
        let emulatorButtonArray = document.getElementsByClassName(b + 'button');
        for (let j = 0; j < emulatorButtonArray.length; ++j) {
            let buttonElement = emulatorButtonArray[j];
            
            buttonElement.onmousedown = (function(b) {
                return function (event) {
                    //console.log(this, 'onmousedown');
                    if (! emulatorButtonState[b]) {
                        // fake an event
                        onEmulatorKeyDown({keyCode:ascii(b), stopPropagation:Math.abs, preventDefault:Math.abs});
                    }
                    emulatorButtonState[b] = 1;
                    event.preventDefault();
                    event.stopPropagation();
                };
            })(b);
            
            buttonElement.onmouseenter = buttonElement.onmousemove = (function(b) {
                return function (event) {
                    if (event.buttons !== 0) {
                        if (! emulatorButtonState[b]) {
                            // fake an event
                            onEmulatorKeyDown({keyCode:ascii(b), stopPropagation:Math.abs, preventDefault:Math.abs});
                        }
                        emulatorButtonState[b] = 1;
                    }
                };
            })(b);
            
            buttonElement.onmouseup = buttonElement.onmouseleave = (function(b) {
                return function (event) {
                    //console.log(this, 'onmouseup');
                    if (emulatorButtonState[b]) {
                        // fake an event
                        onEmulatorKeyUp({keyCode:ascii(b), stopPropagation:Math.abs, preventDefault:Math.abs});
                    }
                    emulatorButtonState[b] = 0;
                    event.preventDefault();
                    event.stopPropagation();
                };
            })(b);
        } // for each button
    } // for each control

    setActiveCartridge(activeCartridge, true);
    
    if (code) {
        // Jump to emulator if loaded from a URL cartridge. Must appear after
        // setActiveCartridge so that the game is loaded and before makeCartridgeWindowContents
        // so that it isn't overriden by the last cartridge from localStorage.
        setUIMode('Emulator', true);

        // Delay automatic starting until the framebuffer and other callbacks have been
        // processed.
        setTimeout(onPlayButton, 250);
    }

    // Load starter carts
    computeCartridgeArray();

})();


//////////////////////////////////////////////////////////////////////////////////////////////////
//
// Mobile button support

let activeTouchTracker = {};

function onTouchStart(event) {
    // Add the new touches
    for (let i = 0; i < event.changedTouches.length; ++i) {
        let touch = event.changedTouches[i];
        activeTouchTracker[touch.identifier] = {identifier: touch.identifier, x: touch.clientX, y: touch.clientY, lastOver:null};
    }
    
    // Now trigger a move on the touches for the button processing
    onTouchMove(event);
}


function onTouchMove(event) {
    for (let i = 0; i < event.changedTouches.length; ++i) {
        let touch = event.changedTouches[i];
        let tracker = activeTouchTracker[touch.identifier];

        if (tracker) {
            let currentElement = document.elementFromPoint(touch.clientX, touch.clientY);
            if (currentElement !== tracker.lastElement) {
                // We abuse/reuse the event as if it were a mouse event,
                // which conveniently causes it to be cancelled/stop propagating
                
                event.repeat = false;
                
                // The element changed
                if (tracker.lastElement && tracker.lastElement.onmousedown) {
                    //console.log('left ', tracker.lastElement);
                    tracker.lastElement.onmouseup(event);
                    tracker.lastElement = null;
                }
                
                if (currentElement && currentElement.classList.contains('emulatorButton')) {
                    //console.log('entered ', currentElement);
                    tracker.lastElement = currentElement;
                    if (currentElement.onmousedown) {
                        currentElement.onmousedown(event);
                    }
                } else {
                    tracker.lastElement = null;
                }

            }
        }
    }
}


function onTouchEnd(event) {
    // Add the new touches
    for (let i = 0; i < event.changedTouches.length; ++i) {
        let touch = event.changedTouches[i];
        let tracker = activeTouchTracker[touch.identifier];
        if (tracker) {
            // Send the button up event
            let target = tracker.lastElement;
            if (target && target.onmouseup) {
                target.onmouseup(event);
            }

            // Delete is relatively slow (https://jsperf.com/delete-vs-undefined-vs-null/16),
            // but there are far more move events than end events and the table is more
            // convenient and faster for processing move events than an array.
            delete activeTouchTracker[touch.identifier];
        }
    }
}

document.addEventListener('touchstart', onTouchStart);
document.addEventListener('touchmove', onTouchMove);
document.addEventListener('touchend', onTouchEnd);
document.addEventListener('touchcancel', onTouchEnd);

    
