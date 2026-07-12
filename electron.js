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


function getXrandrBounds(outputName) {

    try {

        const out = execSync(
            'xrandr --listactivemonitors',
            {
                encoding: 'utf8',
                timeout: 3000,
                env: { ...process.env, DISPLAY: process.env.DISPLAY || ':0' }
            }
        );

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

    } catch (err) {
        console.error('xrandr failed:', err);
    }

    return null;

}


function getHyteDisplay() {

    const xrandrBounds = getXrandrBounds(HYTE_OUTPUT);

    if (xrandrBounds) {

        if (screen.screenToDipRect) {
            return screen.screenToDipRect(null, xrandrBounds);
        }

        return xrandrBounds;

    }


    const displays = screen.getAllDisplays();

    const byLabel = displays.find(display =>
        display.label && /RTK|HYTE|Y70ti/i.test(display.label)
    );

    if (byLabel) return byLabel.bounds;


    return null;

}


function createWindow() {

    const hyte = getHyteDisplay();

    if (!hyte) {
        console.error(`RTK HYTE Y70ti output ${HYTE_OUTPUT} not found; not starting app`);
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
