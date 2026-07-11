function setGauge(id, value) {

    const gauge = document.getElementById(id);

    if (!gauge) return;


    const circle =
        gauge.querySelector(".gauge-progress");


    const number =
        gauge.querySelector(".gauge-value");


    const radius = 45;

    const circumference =
        2 * Math.PI * radius;


    circle.style.strokeDasharray =
        circumference;


    const offset =
        circumference -
        (value / 100) * circumference;


    circle.style.strokeDashoffset =
        offset;


    number.textContent =
        value.toFixed(0) + "%";
}
