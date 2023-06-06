document.addEventListener("DOMContentLoaded", async () => {

    const oscilloscopes = {};

    document.getElementById("add-oscilloscope").onclick = async e => {
        const oscilloscope = new Oscilloscope();
        oscilloscopes[oscilloscope.id] = oscilloscope;
    }

});

function getRandomArray (size, minValue, maxValue) {
    let array = new Array(size);
    for (let i = 0; i < array.length; i++) {
        array[i] = getRandomNumber(minValue, maxValue);
    }
    return array;
}

function getRandomNumber(min, max) {
    return Math.random() * (max - min) + min;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Oscilloscope {

    constructor () {
        this.id = crypto.randomUUID();        
        this.createNodes();
        this.render();
        this.startPlotToCanvas();
    }

    createNodes () {

        this.kill = false;

        this.audioContext = new AudioContext();

        this.oscillator = new OscillatorNode(this.audioContext, {
            //type: "sine",
            frequency: 0
        });

        this.gain = new GainNode(this.audioContext, {
            gain: 0
        });

        this.analyser = new AnalyserNode(this.audioContext, {
            fftSize: 2048
        });

        this.waveSize = parseInt(getRandomNumber(2, 20));

        this.wave = { // try to replicate sawtooth/triangle/square
            // add more features to the randomness like:
            // repetition, zero repetition, min/max repetition, smoothstep, roughstep
            // maybe using a combination of noise modules would do the trick (billow, multiridged fractal, etc)
            real: getRandomArray(this.waveSize, -1, 1),
            imag: getRandomArray(this.waveSize, -1, 1)
        };

        this.oscillator.setPeriodicWave(new PeriodicWave(this.audioContext, {
            real: this.wave.real,
            imag: this.wave.imag,
            disableNormalization: false
        }));

        this.oscillator.connect(this.gain).connect(this.analyser).connect(this.audioContext.destination);
        this.oscillator.start(0);

        this.oscillator.frequency.value = Math.random() * 300;        

        this.gain.gain.linearRampToValueAtTime(0.5, this.audioContext.currentTime + 0.1);
        this.gain.gain.setValueAtTime(0.5, this.audioContext.currentTime + 0.1);

    }

    async render () {        

        document.getElementById("oscilloscopes").insertAdjacentHTML("beforeend", `

            <div class="oscilloscope flex-rows gap padding" id="oscilloscope-${this.id}">

                <canvas width="100%" height="128px"></canvas>

                <div class="flex-columns gap">
                    <label class="grow width50">GAIN (VOLUME)</label>
                    <label class="grow width50 align-right gain-label">0.50</label>
                </div>
                <input type="range" class="gain" step="0.01" min="0.00" max="1.00" value="0.50">

                <div class="flex-columns gap">
                    <label class="grow width50">FREQUENCY (NOTE)</label>
                    <label class="grow width50 align-right frequency-label" contenteditable="true">${parseFloat(this.oscillator.frequency.value).toFixed(2)}</label>
                </div>
                <input type="range" class="frequency" step="0.01" min="0.00" max="1000.00" value="${this.oscillator.frequency.value}">
                
                <select class="notes">
                    <option value="">Pick a note frequency</option>
                    ${this.getNoteFrequencies().map(note => `<option value="${note.frequency}">${note.name} - ${note.frequency} Hz</option>`).join("")}
                </select>

                <button class="pluck">PLUCK</button>
                <button class="add-wave">ADD WAVE POINT</button>
                <button class="randomize">RANDOMIZE PERIODIC WAVE VALUES</button>
                <button class="remove red">REMOVE OSCILLOSCOPE</button>
                
                <label>PERIODIC WAVE SHAPE (TIMBRE / TONE)</label>

                <table class="wave">
                    <thead>
                        <tr>
                            <th>REAL</th>
                            <th></th>
                            <th>IMAG</th>
                            <th></th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${[...Array(this.waveSize).keys()].map(i => `
                            <tr>
                                <td>
                                    <input type="range" class="wave" data-type="real" step="0.01" min="-1.00" max="1.00" value="${parseFloat(this.wave.real[i]).toFixed(2)}">
                                </td>
                                <td>
                                    <label class="wave-label" data-type="real">${parseFloat(this.wave.real[i]).toFixed(2)}</label>
                                </td>
                                <td>
                                    <input type="range" class="wave" data-type="imag" step="0.01" min="-1.00" max="1.00" value="${parseFloat(this.wave.imag[i]).toFixed(2)}">
                                </td>
                                <td>
                                    <label class="wave-label" data-type="imag">${parseFloat(this.wave.imag[i]).toFixed(2)}</label>
                                </td>
                                <td>
                                    <button class="remove">REMOVE</button>
                                </td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>

            </div>

        `);

        // move add button to the end of the grid
        document.getElementById("oscilloscopes").appendChild(document.getElementById("add-oscilloscope"));

        // canvas
        this.canvas = document.querySelector(`div#oscilloscope-${this.id} canvas`);
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;

        // gain
        document.querySelector(`div#oscilloscope-${this.id} input.gain`).oninput = e => {
            this.gain.gain.setValueAtTime(e.target.value, this.audioContext.currentTime);
            document.querySelector(`div#oscilloscope-${this.id} label.gain-label`).innerText = parseFloat(e.target.value).toFixed(2);
        };

        // frequency
        document.querySelector(`div#oscilloscope-${this.id} input.frequency`).oninput = e => {
            this.oscillator.frequency.value = e.target.value;
            document.querySelector(`div#oscilloscope-${this.id} label.frequency-label`).innerText = parseFloat(e.target.value).toFixed(2);
        };
        document.querySelector(`div#oscilloscope-${this.id}  label.frequency-label`).oninput = e => {
            this.oscillator.frequency.value = parseFloat(e.target.innerText);
        };

        // note
        document.querySelector(`div#oscilloscope-${this.id} select.notes`).onchange = e => {
            this.oscillator.frequency.value = e.target.value;
            document.querySelector(`div#oscilloscope-${this.id} label.frequency-label`).innerText = parseFloat(e.target.value).toFixed(2);
        };

        // wave events
        this.assignPeriodicWaveEvents();

        // pluck
        document.querySelector(`div#oscilloscope-${this.id} button.pluck`).onclick = e => {
            this.gain.gain.setValueAtTime(1, this.audioContext.currentTime);
            this.gain.gain.linearRampToValueAtTime(0, this.audioContext.currentTime + 0.50);
            this.gain.gain.setValueAtTime(0, this.audioContext.currentTime + 0.50);            
            document.querySelector(`div#oscilloscope-${this.id} input.gain`).value = 0.00;
            document.querySelector(`div#oscilloscope-${this.id} label.gain-label`).innerText = 0.00;
        };

        // add wave point
        document.querySelector(`div#oscilloscope-${this.id} button.add-wave`).onclick = e => {
            const real = getRandomNumber(-1, 1).toFixed(2);
            const imag = getRandomNumber(-1, 1).toFixed(2);
            document.querySelector(`div#oscilloscope-${this.id} table.wave > tbody`).insertAdjacentHTML("beforeend", `
                <tr>
                    <td>
                        <input type="range" class="wave" data-type="real" step="0.01" min="-1.00" max="1.00" value="${real}">
                    </td>
                    <td>
                        <label class="wave-label" data-type="real">${real}</label>
                    </td>
                    <td>
                        <input type="range" class="wave" data-type="imag" step="0.01" min="-1.00" max="1.00" value="${imag}">
                    </td>
                    <td>
                        <label class="wave-label" data-type="imag">${imag}</label>
                    </td>
                    <td>
                        <button class="remove">REMOVE</button>
                    </td>
                </tr>
            `);
            this.assignPeriodicWaveEvents();
            this.rebuildPeriodicWave();
        };

        // ramdomize
        document.querySelector(`div#oscilloscope-${this.id} button.randomize`).onclick = e => {
            document.querySelectorAll(`div#oscilloscope-${this.id} input.wave`).forEach(element => {            
                element.value = getRandomNumber(-1, 1);
                this.rebuildPeriodicWave();
            });
        };

        // remove
        document.querySelector(`div#oscilloscope-${this.id} button.remove`).onclick = e => {
            this.kill = true;
            this.oscillator.stop(0);
            document.querySelector(`div#oscilloscope-${this.id}`).remove();
        };

    }

    assignPeriodicWaveEvents () {

        // sliders
        document.querySelectorAll(`div#oscilloscope-${this.id} input.wave`).forEach(element => element.oninput = e => {
            
            const tr = e.target.closest("tr");
            
            const value = parseFloat(e.target.value);
            const index = Array.prototype.indexOf.call(tr.parentNode.children, tr);
            const type = e.target.dataset.type;

            switch (type) {
                case "real": {
                    this.wave.real[index] = value;
                    break;
                }
                case "imag": {
                    this.wave.imag[index] = value;
                    break;
                }
            }

            this.oscillator.setPeriodicWave(new PeriodicWave(this.audioContext, {
                real: this.wave.real,
                imag: this.wave.imag,
                disableNormalization: false
            }));

            tr.querySelector(`label.wave-label[data-type="${type}"]`).innerText = value.toFixed(2);

        });

        // remove button
        document.querySelectorAll(`div#oscilloscope-${this.id} table.wave button.remove`).forEach(element => element.onclick = e => {
            if (document.querySelectorAll(`div#oscilloscope-${this.id} table.wave > tbody > tr`).length > 2) {
                e.target.closest("tr").remove();
                this.rebuildPeriodicWave();
            }
        });

    }

    rebuildPeriodicWave () {

        this.wave = [...document.querySelectorAll(`div#oscilloscope-${this.id} table.wave > tbody > tr`)].reduce((wave, element) => {
            const real = parseFloat(element.querySelector(`input.wave[data-type="real"]`).value);
            const imag = parseFloat(element.querySelector(`input.wave[data-type="imag"]`).value);
            wave.real.push(real);
            wave.imag.push(imag);
            // set the labels here because i'm lazy
            element.querySelector(`label.wave-label[data-type="real"]`).innerText = real.toFixed(2);
            element.querySelector(`label.wave-label[data-type="imag"]`).innerText = imag.toFixed(2);
            return wave;
        }, {real:[], imag:[]});

        this.oscillator.setPeriodicWave(new PeriodicWave(this.audioContext, {
            real: this.wave.real,
            imag: this.wave.imag,
            disableNormalization: false
        }));

    }

    startPlotToCanvas () {

        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        this.analyser.getByteTimeDomainData(dataArray);
    
        const context = this.canvas.getContext("2d", { willReadFrequently: true });
    
        const draw = () => {
    
            if (!this.kill) {
                requestAnimationFrame(draw);
            }
    
            this.analyser.getByteTimeDomainData(dataArray);
    
            context.fillStyle = "rgb(0, 0, 0)";
            context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
            context.lineWidth = 2;
            context.strokeStyle = "rgb(255, 255, 255)";
    
            context.beginPath();
    
            const sliceWidth = (this.canvas.width * 1.0) / bufferLength;
    
            let x = 0;
    
            for (let i = 0; i < bufferLength; i++) {
    
                const v = dataArray[i] / 128.0;
                const y = (v * this.canvas.height) / 2;
    
                if (i === 0) {
                    context.moveTo(x, y);
                } else {
                    context.lineTo(x, y);
                }
    
                x += sliceWidth;
    
            }
    
            context.lineTo(this.canvas.width, this.canvas.height / 2);
            context.stroke();
    
        }
    
        draw();

    }

    getNoteFrequencies () {

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

        return Object.keys(notes).reduce((acc, note) => {
            for (let octave = 0; octave < notes[note].length; octave++) {
                acc.push({
                    name:`${note}${octave}`,
                    frequency: notes[note][octave]
                });
            }
            return acc;
        }, []).sort((a,b) => a.frequency - b.frequency);

    }

}