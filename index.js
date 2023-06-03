let kill = false;

document.addEventListener("DOMContentLoaded", async () => {

    const notes = {
        C: [16.35, 32.7, 65.41, 130.81, 261.63, 523.25, 1046.5, 2093.0],
        Db: [17.32, 34.65, 69.3, 138.59, 277.18, 554.37, 1108.73, 2217.46],
        D: [18.35, 36.71, 73.42, 146.83, 293.66, 587.33, 1174.66, 2349.32],
        Eb: [19.45, 38.89, 77.78, 155.56, 311.13, 622.25, 1244.51, 2489.02],
        E: [20.6, 41.2, 82.41, 164.81, 329.63, 659.26, 1318.51, 2637.02],
        F: [21.83, 43.65, 87.31, 174.61, 349.23, 698.46, 1396.91, 2793.83],
        Gb: [23.12, 46.25, 92.5, 185.0, 369.99, 739.99, 1479.98, 2959.96],
        G: [24.5, 49.0, 98.0, 196.0, 392.0, 783.99, 1567.98, 3135.96],
        Ab: [25.96, 51.91, 103.83, 207.65, 415.3, 830.61, 1661.22, 3322.44],
        A: [27.5, 55.0, 110.0, 220.0, 440.0, 880.0, 1760.0, 3520.0],
        Bb: [29.14, 58.27, 116.54, 233.08, 466.16, 932.33, 1864.66, 3729.31],
        B: [30.87, 61.74, 123.47, 246.94, 493.88, 987.77, 1975.53, 3951.07]
    };

    document.querySelector("button").onclick = async e => {

        kill = false;

        //const note = Object.keys(notes)[parseInt((Object.keys(notes).length * Math.random()))];
        
        const E5 = notes.E[5];
        const C5 = notes.C[5];
        const G5 = notes.G[5];
        const G4 = notes.G[4];

        const bar = [
            [E5,200],[E5,400],[E5,400],
            [C5,250],[E5,350],[G5,800],
            [G4,200],
        ];

        for (const note of bar) {
            play(note[0], note[1]/1000);
            await sleep(note[1]);
        }

        kill = true;


    }

});

function play (frequency, duration) {

    const audioContext = new AudioContext();

    const oscillator = new OscillatorNode(audioContext, {
        type: "square",
        frequency: 0
    });

    const gain = new GainNode(audioContext, {
        gain: 0
    });

    const analyser = new AnalyserNode(audioContext, {
        fftSize: 2048
    });

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    oscillator.connect(gain).connect(analyser).connect(audioContext.destination);
    // oscillator.setPeriodicWave()

    const canvas = document.querySelector("canvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const canvasContext = canvas.getContext("2d", { willReadFrequently: true });

    function draw() {

        if (!kill) {
            requestAnimationFrame(draw);
        }

        analyser.getByteTimeDomainData(dataArray);

        canvasContext.fillStyle = "rgb(200, 200, 200)";
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);

        canvasContext.lineWidth = 2;
        canvasContext.strokeStyle = "rgb(0, 0, 0)";

        canvasContext.beginPath();

        const sliceWidth = (canvas.width * 1.0) / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            const v = dataArray[i] / 128.0;
            const y = (v * canvas.height) / 2;

            if (i === 0) {
                canvasContext.moveTo(x, y);
            } else {
                canvasContext.lineTo(x, y);
            }

            x += sliceWidth;
        }

        canvasContext.lineTo(canvas.width, canvas.height / 2);
        canvasContext.stroke();
    }

    draw();

    oscillator.start(0);

    oscillator.frequency.value = frequency;

    //const duration = 0.10; // seconds
    const fadeIn = 0.05; // seconds
    const fadeOut = 0.05; // seconds

    gain.gain.linearRampToValueAtTime(1, audioContext.currentTime + fadeIn);

    //gain.gain.setValueAtTime(1, audioContext.currentTime);
    const stopTime = audioContext.currentTime + duration;
    //gain.gain.setValueAtTime(1, stopTime - fadeOffset);
    gain.gain.linearRampToValueAtTime(0, audioContext.currentTime + fadeIn + duration + fadeOut);
    gain.gain.setValueAtTime(0, + fadeIn + duration + fadeOut);

}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}