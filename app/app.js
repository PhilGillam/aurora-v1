const ws = new WebSocket(
    "ws://localhost:9090"
);



//
// Create CPU core widgets
//
function createCpuCores() {

    const container =
        document.getElementById(
            "cpu-cores"
        );


    for (let i = 0; i < 16; i++) {


        const core =
            document.createElement(
                "div"
            );


        core.className =
            "core";


        core.innerHTML = `

            <span>
                C${i + 1}
            </span>

            <div
                class="core-bar"
                id="core-${i}">
            </div>

        `;


        container.appendChild(core);

    }

}


createCpuCores();





//
// Gauge helper
//
function setGauge(
    id,
    value,
    max = 100
) {


    const ring =
        document.getElementById(id);


    if (!ring)
        return;



    value =
        Math.max(
            0,
            Math.min(
                value,
                max
            )
        );



    const circumference =
        314;



    const offset =
        circumference -
        (
            circumference *
            value /
            max
        );



    ring.style.strokeDashoffset =
        offset;

}







//
// Formatting
//

function bytes(value) {


    if (!value)
        return "0 MB";


    const gb =
        value /
        1024 /
        1024 /
        1024;


    if (gb >= 1)
        return gb.toFixed(1)
            + " GB";


    return (
        value /
        1024 /
        1024
    ).toFixed(0)
    + " MB";

}



function network(value) {


    return (

        value /
        1024 /
        1024

    ).toFixed(1)
    + " MB/s";

}



function uptime(seconds) {


    const days =
        Math.floor(
            seconds / 86400
        );


    const hours =
        Math.floor(
            seconds % 86400 / 3600
        );


    const mins =
        Math.floor(
            seconds % 3600 / 60
        );


    return (
        days +
        "d " +
        hours +
        "h " +
        mins +
        "m"
    );

}






//
// Clock
//

function updateClock() {


    const now =
        new Date();



    document.getElementById(
        "clock"
    ).textContent =

        now.toLocaleTimeString(
            [],
            {
                hour:"2-digit",
                minute:"2-digit",
                second:"2-digit"
            }
        );

}


setInterval(
    updateClock,
    1000
);


updateClock();







//
// Websocket
//

ws.onopen = () => {

    console.log(
        "Aurora telemetry connected"
    );

};





ws.onmessage = event => {


    const data =
        JSON.parse(
            event.data
        );




    //
    // CPU
    //

    setGauge(
        "cpu-load-ring",
        data.cpu.load
    );


    setGauge(
        "cpu-temp-ring",
        data.cpu.temperature,
        100
    );



    document.getElementById(
        "cpu-load"
    ).textContent =

        data.cpu.load
        .toFixed(0)
        + "%";



    document.getElementById(
        "cpu-temp"
    ).textContent =

        data.cpu.temperature
        .toFixed(0)
        + "C";



    document.getElementById(
        "cpu-speed"
    ).textContent =

        data.cpu.speed
        + " GHz";





    //
    // CPU cores
    //

    if (data.cpu.cores) {


        data.cpu.cores.forEach(
            (load,index)=> {


            const bar =
                document.getElementById(
                    "core-" + index
                );


            if(bar) {

                bar.style.height =
                    Math.min(
                        load,
                        100
                    )
                    + "%";

            }


        });


    }







    //
    // GPU
    //

    setGauge(
        "gpu-load-ring",
        data.gpu.utilization
    );


    setGauge(
        "gpu-temp-ring",
        data.gpu.temperature,
        100
    );



    document.getElementById(
        "gpu-load"
    ).textContent =

        data.gpu.utilization
        + "%";



    document.getElementById(
        "gpu-temp"
    ).textContent =

        data.gpu.temperature
        + "C";



    document.getElementById(
        "gpu-memory"
    ).textContent =

        data.gpu.memoryUsed
        +
        " / "
        +
        data.gpu.memoryTotal
        +
        " MB";



    document.getElementById(
        "gpu-model"
    ).textContent =

        data.gpu.model;







    //
    // RAM
    //

    setGauge(
        "memory-ring",
        data.memory.percent
    );



    document.getElementById(
        "memory-load"
    ).textContent =

        data.memory.percent
        + "%";



    document.getElementById(
        "memory-used"
    ).textContent =

        bytes(
            data.memory.used
        );



    document.getElementById(
        "memory-total"
    ).textContent =

        bytes(
            data.memory.total
        );








    //
    // OS
    //

    document.getElementById(
        "os"
    ).textContent =

        data.system.os;


    //
    // Disk
    //

    document.getElementById(
        "disk"
    ).textContent =

        data.disk.percent
        + "%";







    //
    // Network
    //

    document.getElementById(
        "rx"
    ).textContent =

        network(
            data.network.rxSec
        );



    document.getElementById(
        "tx"
    ).textContent =

        network(
            data.network.txSec
        );







    //
    // Uptime
    //

    document.getElementById(
        "uptime"
    ).textContent =

        uptime(
            data.system.uptime
        );



};







ws.onerror = err => {


    console.error(
        "Aurora websocket error",
        err
    );


};

//
// Tubes of light
//
const tubesCanvas = document.getElementById("tubes");

if (tubesCanvas) {
    tubesCanvas.addEventListener("webglcontextlost", () => {
        console.error("WebGL context lost; reloading page");
        setTimeout(() => location.reload(), 1000);
    });

    import("https://cdn.jsdelivr.net/npm/threejs-components@0.0.19/build/cursors/tubes1.min.js")
        .then(mod => {
            const TubesCursor = mod.default;
            const cursor = TubesCursor(tubesCanvas, {
                bloom: {
                    threshold: 0,
                    strength: 1.5,
                    radius: 0.5
                },
                tubes: {
                    count: 24,
                    colors: ["#f967fb", "#53bc28", "#6958d5"],
                    noise: 0.25,
                    lerp: 0.35,
                    material: {
                        metalness: 1,
                        roughness: 0.25
                    },
                    lights: {
                        intensity: 200,
                        colors: ["#83f36e", "#fe8a2e", "#ff008a", "#60aed5"]
                    }
                },
                sleepTimeScale1: 0.6,
                sleepTimeScale2: 1.9
            });

            function fitTubes() {
                cursor.options.sleepRadiusX = cursor.three.size.width / 2;
                cursor.options.sleepRadiusY = cursor.three.size.height / 2;
            }

            fitTubes();
            cursor.three.onAfterResize = fitTubes;

            document.body.addEventListener("click", () => {
                const colors = randomColors(3);
                const lightsColors = randomColors(4);
                cursor.tubes.setColors(colors);
                cursor.tubes.setLightsColors(lightsColors);
            });

            function randomColors(count) {
                return new Array(count)
                    .fill(0)
                    .map(() => "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0"));
            }
        })
        .catch(err => {
            console.error("Tubes cursor failed to load", err);
        });
}
