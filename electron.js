const {
    app,
    BrowserWindow,
    screen,
    powerSaveBlocker
} = require('electron');

const path = require('path');
const { execSync } = require('child_process');

app.commandLine.appendSwitch(
    'force-device-scale-factor',
    '1'
);


let powerBlockerId = null;


const HYTE_OUTPUT = process.env.HYTE_OUTPUT || 'DP-0';
const HYTE_ROTATION = process.env.HYTE_ROTATION || 'right';
const HYTE_LABEL_RE = /HYTE|Y70ti|RTK/i;


function runXrandr(args) {
    try {
        return execSync(
            'xrandr ' + args,
            {
                encoding: 'utf8',
                timeout: 3000,
                env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' }
            }
        );
    } catch (err) {
        console.error('xrandr failed:', err.message);
        return null;
    }
}


function getXrandrBounds(outputName) {

    const out = runXrandr('--listactivemonitors');
    if (!out) return null;

    const lines = out.split('\n');

    for (const line of lines) {

        const tokens = line.trim().split(/\s+/);

        if (tokens.length < 4) continue;

        const name = tokens[tokens.length - 1];

        if (name !== outputName) continue;

        const geometry = tokens[tokens.length - 2];
        const match = geometry.match(/(\d+)(?:\/\d+)?x(\d+)(?:\/\d+)?\+(\d+)\+(\d+)/);

        if (!match) continue;

        return {
            x: parseInt(match[3], 10),
            y: parseInt(match[4], 10),
            width: parseInt(match[1], 10),
            height: parseInt(match[2], 10)
        };

    }

    return null;

}


function getXrandrOutputNameForDisplay(display) {

    const out = runXrandr('--listactivemonitors');
    if (!out) return null;

    const lines = out.split('\n');

    for (const line of lines) {

        const tokens = line.trim().split(/\s+/);

        if (tokens.length < 4) continue;

        const name = tokens[tokens.length - 1];
        const geometry = tokens[tokens.length - 2];
        const match = geometry.match(/(\d+)(?:\/\d+)?x(\d+)(?:\/\d+)?\+(\d+)\+(\d+)/);

        if (!match) continue;

        const x = parseInt(match[3], 10);
        const y = parseInt(match[4], 10);

        if (
            x === display.nativeOrigin.x &&
            y === display.nativeOrigin.y
        ) {
            return name;
        }

    }

    return null;

}


function rotateOutput(outputName, direction) {
    if (!outputName || !direction || direction === 'none') return false;
    const out = runXrandr(`--output ${outputName} --rotate ${direction}`);
    return out !== null;
}


function rotationToDegrees(direction) {
    return (
        {
            normal: 0,
            left: 90,
            inverted: 180,
            right: 270
        }[direction] || 0
    );
}


function findHyteDisplay() {
    const displays = screen.getAllDisplays();
    return displays.find(display =>
        display.label && HYTE_LABEL_RE.test(display.label)
    );
}


function getHyteDisplay() {

    let hyte = findHyteDisplay();

    const targetRotation = rotationToDegrees(HYTE_ROTATION);

    // Rotate the HYTE output until it matches the desired orientation.
    if (hyte && hyte.rotation !== targetRotation) {
        const outputName = getXrandrOutputNameForDisplay(hyte) || HYTE_OUTPUT;
        console.log(`HYTE display is ${hyte.rotation} degrees, rotating ${outputName} ${HYTE_ROTATION}`);
        rotateOutput(outputName, HYTE_ROTATION);
        const displays = screen.getAllDisplays();
        hyte = displays.find(display =>
            display.label && HYTE_LABEL_RE.test(display.label)
        );
    }

    if (hyte) {
        return hyte.bounds;
    }


    // Fallback: use xrandr output name directly.
    let xrandrBounds = getXrandrBounds(HYTE_OUTPUT);

    if (xrandrBounds && xrandrBounds.width > xrandrBounds.height) {
        rotateOutput(HYTE_OUTPUT, HYTE_ROTATION);
        xrandrBounds = getXrandrBounds(HYTE_OUTPUT);
    }

    if (xrandrBounds) {
        return xrandrBounds;
    }


    return null;

}


function createWindow() {

    const hyte = getHyteDisplay();

    if (!hyte) {
        console.error(`RTK HYTE Y70ti display not found on ${process.env.DISPLAY || ':0'}; not starting app`);
        app.quit();
        return;
    }


    const win = new BrowserWindow({

        x: hyte.x,
        y: hyte.y,

        width: hyte.width,
        height: hyte.height,

        frame:false,
        kiosk:true,
        fullscreen:false,

        alwaysOnTop:true,
        autoHideMenuBar:true,

        webPreferences:{
            preload:path.join(
                __dirname,
                'preload.js'
            )
        }

    });



    win.loadFile(
        path.join(
            __dirname,
            'app',
            'index.html'
        )
    );



    // Prevent display sleep/screensaver
    powerBlockerId =
        powerSaveBlocker.start(
            'prevent-display-sleep'
        );



    win.on('closed',()=>{

        if (
            powerBlockerId &&
            powerSaveBlocker.isStarted(powerBlockerId)
        ) {

            powerSaveBlocker.stop(
                powerBlockerId
            );

        }

    });

}


app.whenReady()
.then(createWindow);
