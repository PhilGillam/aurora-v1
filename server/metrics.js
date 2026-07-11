const si = require('systeminformation');
const WebSocket = require('ws');
const { exec } = require('child_process');

const PORT = 9090;

const wss = new WebSocket.Server({
    port: PORT
});

console.log(`Aurora telemetry running on ws://localhost:${PORT}`);

async function getGpuInfo() {
    return new Promise((resolve) => {

        exec(
            'nvidia-smi --query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total,power.draw --format=csv,noheader,nounits',
            (err, stdout) => {

                if (err || !stdout) {
                    resolve({
                        utilization: 0,
                        temperature: 0,
                        memoryUsed: 0,
                        memoryTotal: 0,
                        power: 0
                    });
                    return;
                }

                const parts = stdout.trim().split(',');

                resolve({
                    utilization: Number(parts[0]),
                    temperature: Number(parts[1]),
                    memoryUsed: Number(parts[2]),
                    memoryTotal: Number(parts[3]),
                    power: Number(parts[4])
                });
            }
        );
    });
}

async function collectMetrics() {

    const [
        load,
        mem,
        cpuTemp,
        cpuSpeed,
        fs,
        network,
        time,
        graphics,
        gpu
    ] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.cpuTemperature(),
        si.cpuCurrentSpeed(),
        si.fsSize(),
        si.networkStats(),
        si.time(),
        si.graphics(),
        getGpuInfo()
    ]);

    const disk = fs.length ? fs[0] : {};

    const nic = network.length ? network[0] : {};

    return {

        timestamp: Date.now(),

        cpu: {
            load: Number(load.currentLoad.toFixed(1)),
            temperature: cpuTemp.main || 0,
            speed: Number(cpuSpeed.avg.toFixed(2)),
            cores: load.cpus.map(c => Number(c.load.toFixed(1)))
        },

        memory: {
            total: mem.total,
            available: mem.available,
            used: mem.total - mem.available,
            percent: Number(
                (
                    ((mem.total - mem.available) / mem.total) * 100
                ).toFixed(1)
            )
        },

        gpu: {
            vendor: graphics.controllers?.[0]?.vendor || "Unknown",
            model: graphics.controllers?.[0]?.model || "Unknown",

            utilization: gpu.utilization,
            temperature: gpu.temperature,

            memoryUsed: gpu.memoryUsed,
            memoryTotal: gpu.memoryTotal,

            memoryPercent:
                gpu.memoryTotal > 0
                    ? Number(
                        (
                            gpu.memoryUsed /
                            gpu.memoryTotal *
                            100
                        ).toFixed(1)
                    )
                    : 0,

            power: gpu.power
        },

        disk: {
            filesystem: disk.fs,
            used: disk.used,
            size: disk.size,
            percent: disk.use
        },

        network: {
            interface: nic.iface,

            rxBytes: nic.rx_bytes,
            txBytes: nic.tx_bytes,

            rxSec: nic.rx_sec,
            txSec: nic.tx_sec
        },

        system: {
            uptime: time.uptime
        }
    };
}

async function broadcast() {

    try {

        const data = JSON.stringify(await collectMetrics());

        wss.clients.forEach(client => {

            if (client.readyState === WebSocket.OPEN) {
                client.send(data);
            }

        });

    } catch (err) {

        console.error(err);

    }

}

setInterval(broadcast, 1000);
