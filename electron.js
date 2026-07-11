const {
    app,
    BrowserWindow,
    screen,
    powerSaveBlocker
} = require('electron');

const path = require('path');

app.commandLine.appendSwitch(
    'force-device-scale-factor',
    '1'
);


let powerBlockerId = null;


function createWindow() {

    const displays = screen.getAllDisplays();


    const hyte = displays.find(display =>
        display.bounds.height > display.bounds.width
    ) || screen.getPrimaryDisplay();



    const win = new BrowserWindow({

        x: hyte.bounds.x,
        y: hyte.bounds.y,

        width: hyte.bounds.width,
        height: hyte.bounds.height,

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
