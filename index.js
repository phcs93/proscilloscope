document.addEventListener("DOMContentLoaded", async () => {

    function fbm (x, y, z, octaves) {

        let factor = 0.0;
        let signal = 0.0;
        let scale = 0.5;
    
        for (let i = 0; i < octaves; i++){
            let value = noise.perlin3(x, y, z);
            signal += value * scale;
            factor += scale;
            x *= 2.0;
            y *= 2.0;
            z *= 2.0;
            scale *= 0.5;
        }
    
        return signal / factor;
    
    }
    
    const resolution = 512;

    const arr = [];

    const canvas = document.querySelector("canvas");
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let pixels = id.data;

    function put (x, y, r, g, b) {
        const off = (y * canvas.width + x) * 4;
        pixels[off + 0] = r;
        pixels[off + 1] = g;
        pixels[off + 2] = b;
        pixels[off + 3] = 255;
    }

    function plot(frequency) {

        pixels.fill(0);
                
        arr.push(frequency);

        const lastValues = arr.slice(-resolution);

        for (let i = 0; i < lastValues.length ; i++) {

            const targetX = Math.floor((canvas.width / resolution) * i);
            const targetY = Math.floor(canvas.height - (canvas.height * lastValues[i]));

            // for (let y = canvas.height; y >= targetY; y--) {
            //     put(targetX, y, 255, 255, 255)
            // }

            put(targetX, targetY, 255, 255, 255)



        }

        //ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(id, 0, 0);

    }

    document.querySelector("button").onclick = e => {
        
        const context = new AudioContext();

        const oscillator = new OscillatorNode(context, {
            type: "sine",
            frequency: 0
        });

        // o.setPeriodicWave()

        const gain = new GainNode(context);

        const waveSharper = new WaveShaperNode(context, {
            curve: new Float32Array(
                new Array(10).fill(0).map(v => Math.random() * 50)
            ),
            oversample: 'none'
        });

        const delay = new DelayNode(context, {
            delayTime: 1
        });

        const analyser = new AnalyserNode(context, {
            fftSize: 2048
        });
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteTimeDomainData(dataArray);

        oscillator
        .connect(waveSharper)
        //.connect(delay)
        .connect(gain)
        .connect(analyser)
        .connect(context.destination);

        oscillator.start(0);

        const canvas = document.getElementById("oscilloscope");
        const canvasCtx = ctx;

        // draw an oscilloscope of the current audio source

        function draw() {
            requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            canvasCtx.fillStyle = "rgb(200, 200, 200)";
            canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

            canvasCtx.lineWidth = 2;
            canvasCtx.strokeStyle = "rgb(0, 0, 0)";

            canvasCtx.beginPath();

            const sliceWidth = (canvas.width * 1.0) / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = (v * canvas.height) / 2;

                if (i === 0) {
                    canvasCtx.moveTo(x, y);
                } else {
                    canvasCtx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            canvasCtx.lineTo(canvas.width, canvas.height / 2);
            canvasCtx.stroke();
        }

        draw();

        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 3)

        // console.log(oscillator.numberOfInputs);
        // console.log(oscillator.numberOfOutputs);
        // console.log(oscillator.channelCount);

        const loop = () => {

            var tick = new Date().getTime() / 2000;
            //var v = (noise.perlin3(tick*5, tick*5, tick*5) + 1) / 2;
            var v = (fbm(tick, tick, tick, 8) * 2 + 1) / 2;

            oscillator.frequency.value = v * 200;
            //plot(v)

            window.requestAnimationFrame(loop);

        };

        loop();

        return;

        

        // const loop = () => {

        //     if (inc) {
        //         o.frequency.value += period;
        //     } else {
        //         o.frequency.value -= period;
        //     }

        //     if (o.frequency.value >= amplitude) {
        //         inc = false;
        //     } else if (o.frequency.value <= 0) {
        //         inc = true;
        //     }

        //     window.requestAnimationFrame(loop);

        // };

        // loop();

    }

});