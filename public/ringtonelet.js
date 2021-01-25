class RingtoneProcessor extends AudioWorkletProcessor {
  constructor(options) {
	super();

	let outer = this;

	const loading = (ringtone) => {
		outer.patch = ringtone.instance.exports;

		outer.SAMPLE_RATE = 44100;
		outer.NUMBER_OF_CHANNELS = 1; //MONO
		outer.patch
			.prepareToPlay(this.SAMPLE_RATE, this.NUMBER_OF_CHANNELS);
		outer.BLOCK_SIZE = outer.patch.getBufferSize();


		outer.PLAYING_SECONDS = 3.1;
		outer.BLOCK_COUNT = 
			Math.round(this.PLAYING_SECONDS * this.SAMPLE_RATE / this.BLOCK_SIZE);

		outer.OUT_DATA_OFFSET = this.patch.getOutData(0);
		outer.index = 0;
		outer.mainBuffer = null;

		outer.port.onmessage = 
			(e) => {
				if (e.data === "ready") {
					outer.ready = true;
				}
				else if (e.data === "finished") {
					outer.finished = true;
				}
			}

		outer.port.postMessage('initialized')
	};

	WebAssembly.instantiate(options.processorOptions.ringtoneBytes, {})
		.then(loading);
  }

  process(inputList, outputList, parameters) {
  	if (this.finished === true) return false;

	if (this.ready !== true) return true;

	//this is a fix for popping sound in the beginning
	if (this.delay !== 30) {
		if (this.delay === undefined) {
			this.delay = 0;
		}
		this.delay += 1;
		return true;
	}

	let requiredLength = outputList[0][0].length; //usually 128;

	if (this.mainBuffer == null 
		|| this.index === this.BLOCK_SIZE) {

		this.patch.processBlock(this.BLOCK_SIZE);
		let outDataBlock = 
			this.patch.memory.buffer.slice(this.OUT_DATA_OFFSET, this.OUT_DATA_OFFSET+this.BLOCK_SIZE*4);

		this.mainBuffer = new Float32Array(outDataBlock);

		this.index = 0;
	}

	let maxIndex = this.index+requiredLength;
	outputList[0][0].set(this.mainBuffer.slice(this.index, this.index+requiredLength))


	this.index += requiredLength;

	return true;
  }
};

registerProcessor("ringtone", RingtoneProcessor);