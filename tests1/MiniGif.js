class MiniGif {
  /* 
  MiniGif 
  v.1.1.0
  By Sergio Rodríguez Gómez
  MIT LICENSE
  https://github.com/srsergiorodriguez/
  */
  constructor(options = {}) {
    this.colorResolution = Math.max(1, Math.min(7, options.colorResolution || 7));
    this.colorTableSize = Math.pow(2, this.colorResolution + 1);
    this.colorTableBytes = this.colorTableSize * 3;
    this.customPalette = options.customPalette || undefined;
    this.fileName = options.fileName || 'minigif';

    this.delay = options.delay || 50;
    this.transparent = options.transparent || false;
    this.transparentIndex = options.transparentIndex || 0;
    this.dither = options.dither || false;

    this.width;
    this.height;

    this.globalColorTable;
    this.framesPixels = [];
    this.framesImageData = [];
    this.allPixels = []; // para poner todos los pixels de todas las imágenes y hacer la quantización

    this.distanceMemo = {};
  }

  async addFrameFromPath(path) {
    const img = new Image();
    img.src = path;
    await new Promise(r => {img.onload = function() {r(true)}});
    this.addFrame(img);
  }

  addFrame(frame) {
    let canvas;
    let context;
    if (frame instanceof HTMLCanvasElement) {
      canvas = frame;
      context = canvas.getContext("2d");
    } else if (frame instanceof HTMLImageElement) {
      const img = frame;
      canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      context = canvas.getContext("2d");
      context.drawImage(img, 0, 0);
      img.remove();
    } else {
      console.error(`Frame must be a canvas or img element.
      If you want to add a frame from an image path use addFrameFromPath async function`);
    }

    if (this.width === undefined || this.height === undefined) {
      this.width = canvas.width;
      this.height = canvas.height;
    }
  
    const imageDataObject = context.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageDataObject.data;
    this.framesPixels.push(pixels);

    if (!(frame instanceof HTMLCanvasElement)) {
      canvas.remove();
    }
    return pixels
  }

  makeGif() {
    if (this.framesPixels.length === 0) {console.error('Minigif: there are no images to produce the gif'); return}
    
    const nrPixels = this.framesPixels[0].length;
    this.allPixels = new Uint8Array(this.framesPixels.length * nrPixels);
    for (let i = 0; i < this.framesPixels.length; i++) {
      this.allPixels.set(this.framesPixels[i], i * nrPixels);
    }

    // Prepare Palette
    let colors;
    
    if (this.customPalette) {
      // Strip Alpha channel (RGBA -> RGB) if present
      colors = this.customPalette.map(c => c.slice(0, 3));

      // Auto-calculate Color Resolution based on palette size
      const validCount = Math.max(colors.length, 2); // Min 2 colors
      const bits = Math.ceil(Math.log2(validCount));
      this.colorResolution = Math.max(0, bits - 1);
      this.colorTableSize = 1 << (this.colorResolution + 1);
    } else {
      // Auto-generate palette
      const pixelCount = this.framesPixels[0].length;
      const allPixels = new Uint8Array(this.framesPixels.length * pixelCount);
      for (let i = 0; i < this.framesPixels.length; i++) {
        allPixels.set(this.framesPixels[i], i * pixelCount);
      }
      colors = this.medianCutColors(allPixels);
    }

    // Pad the Global Color Table to power of 2
    this.globalColorTable = new Uint8Array(this.colorTableSize * 3);
    colors.forEach((c, i) => {
      if (i < this.colorTableSize) {
        this.globalColorTable.set(c, i * 3);
      }
    });
    
    // const codeTableData = this.getCodeTable(colors);
    this.quantizeFunction = this.dither ? this.errorDiffusionDither : this.simpleQuantize;

    for (let i = 0; i < this.framesPixels.length; i++) {
      const indexStream = this.quantizeFunction(this.framesPixels[i], this.globalColorTable);
      const codeStream = this.getCodeStream(indexStream, colors);
      this.framesImageData[i] = this.getImageData(codeStream);
    }

    const binaryBuffer = this.structureGif();
    return binaryBuffer
  }

  getColorTable(colors) {
    return new Uint8Array(colors.flat());
  }

getCodeStream(indexStream, colors) {
    const CCindex = colors.length;
    const EOIindex = colors.length + 1;

    const minimumCodeSize = Math.max(2, this.colorResolution + 1);
    let lastCodeSize;
    let streamStart = 0;

    const byteSize = 8;
    let bytesStream = [0];
    const bytemask = 0b11111111;
    let numCount = 0; 
    let displace = 0;

    function addCode(code, codeSize) {
      const newCode = code << displace;
      const bitsAvailable = byteSize - displace; 
      if (bitsAvailable <= codeSize) { 
        bytesStream[numCount] = (bytesStream[numCount] | newCode) & bytemask; 

        let fraction = code >>> bitsAvailable; // Use >>> for safer unsigned shift
        let tempDisplace = codeSize - bitsAvailable;
        numCount++; 
        bytesStream[numCount] = fraction & bytemask;

        while (tempDisplace >= byteSize) {
          fraction = fraction >>> byteSize;
          numCount++; 
          bytesStream[numCount] = fraction & bytemask;
          tempDisplace -= byteSize;
        }
        displace = tempDisplace;
      } else { 
        bytesStream[numCount] = bytesStream[numCount] | newCode;
        displace += codeSize;
      }
    }

    addCode(CCindex, minimumCodeSize + 1);

    const codeTableDict = new Map();

    while (streamStart < indexStream.length) {
      codeTableDict.clear();
      
      let currentCodeSize = minimumCodeSize + 1;
      // (1 << currentCodeSize) is faster than Math.pow
      let codeLengthLimit = (1 << currentCodeSize) + 1; 
      let codeLengthCounter = EOIindex + 1; // Start at EOI + 1
  
      let indexBuffer = indexStream[streamStart];
      let i = streamStart + 1;

      // Stop before 4096 (12-bit limit)
      while (codeLengthCounter < 4096 && i < indexStream.length) {
        const k = indexStream[i];
        
        // Bitwise key generation
        // Shifts the prefix (indexBuffer) by 8 bits and adds the char (k)
        // Creates a unique integer key instead of a string "1,2"
        const combination = (indexBuffer << 8) | k;
        
        if (codeTableDict.has(combination)) {
          indexBuffer = codeTableDict.get(combination);
        } else {
          // Add the CURRENT prefix to the stream
          addCode(indexBuffer, currentCodeSize);
          
          // Add the NEW combination to the dictionary
          codeTableDict.set(combination, codeLengthCounter);
          codeLengthCounter++;

          if (codeLengthCounter >= codeLengthLimit) {
            currentCodeSize++; 
            codeLengthLimit = (1 << currentCodeSize) + 1;
          }
          
          indexBuffer = k;
        }
        i++;
      }

      addCode(indexBuffer, currentCodeSize);
      streamStart = i;
      
      if (i >= indexStream.length) {
        lastCodeSize = currentCodeSize;
        break
      }
      
      addCode(CCindex, currentCodeSize);
    }
    
    addCode(EOIindex, lastCodeSize);
    return new Uint8Array(bytesStream);
  }

  getImageData(bytesStream) {
    // une los bits que tienen largos variables en bytes
    let bytes = bytesStream

    const minimumCodeSize = Math.max(2, this.colorResolution + 1); // LZW minimum code size, esto va primero en el imageData
    // bloques de máximo 255 bytes, antecedidos por el tamaño. Entonces total 256 bytes máx
    const maxBlockSize = 255;
    const divs = bytes.length / maxBlockSize;
    const ceilDivs = Math.ceil(divs); // Número de bloques necesarios
    // Tamaño del buffer que es necesario reservar, incluyendo minimumCodeSize, bloques y sus tamaños, y block terminator
    const bufferSize = Math.ceil((divs*(maxBlockSize+1))+2);
    const imageData = new Uint8Array(bufferSize);

    imageData[0] = minimumCodeSize;
    let cursor = 1;
    for (let i = 0; i < ceilDivs; i++) {
      let block = bytes.slice(i * maxBlockSize, (i + 1) * maxBlockSize);
      const blockSize = i < ceilDivs - 1 ? maxBlockSize : block.length;
      imageData.set([blockSize], cursor);
      imageData.set(block, cursor + 1);
      cursor += blockSize + 1;
    }
    imageData[bufferSize - 1] = 0; // block terminator, esto muestra que terminó el imageData
    return new Uint8Array(imageData)
  }

  download(buffer) {
    const blob = new Blob([buffer], { type: 'image/gif' });
    const fileName = `${this.fileName}.gif`;
    if (navigator.msSaveBlob) {
      navigator.msSaveBlob(blob, fileName);
    } else {
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', fileName);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    }
  }

  structureGif() {
    const packedField = parseInt(`1${this.toBin(this.colorResolution, 3)}0${this.toBin(this.colorResolution,3)}`, 2);
    const header = concatArrayBuffers(
      //header
      rawString('GIF89a'),
      // logical screen descriptor
      U16LE(this.width),
      U16LE(this.height),
      U8(packedField),
      U8(0),
      U8(0)
    );
  
    // global color table here

    const loopRepetitions = 0; // 0 es infinito
    const applicationExtension = concatArrayBuffers(
      U8(33), // 33 (hex 0x21) GIF Extension code
      U8(255), // 255 (hex 0xFF) Application Extension Label
      U8(11), // 11 (hex 0x0B) Length of Application Block
      rawString('NETSCAPE2.0'),
      U8(3), // 3 (hex 0x03) Length of Data Sub-Block
      U8(1), // 1 (hex 0x01)
      U16LE(loopRepetitions),
      U8(0) // terminator
    );

    // PARA CADA IMAGEN DE LA ANIMACIÓN HAY QUE HACER ESTAS TRES: graphicsColorExtension, imageDescriptor, imageData
    const transparentFlag = this.transparent === true ? 1 : 0;
    const disposal = 2; // forma en la que se dibujan las siguientes imágenes 1 es dibujar encima, 2 es borrar el canvas, 3 restore
    const graphicsControlPackedField = parseInt(`00000${disposal}0${transparentFlag}`, 2);
    const imageDescriptorPackedField = parseInt(`000000000`, 2);

    const globalImageData = [];
    for (let i = 0; i < this.framesImageData.length; i++) {

      const graphicsControlExtension = concatArrayBuffers(
        U8(33), // Extension introducer - always 21 hex
        U8(249), // Graphic Control label - always f9 hex
        U8(4), // Byte size
        U8(graphicsControlPackedField),
        U16LE(this.delay), // Delay time
        U8(this.transparentIndex), // Transparent color index
        U8(0) // Block terminator - always 0
      );
      globalImageData.push(graphicsControlExtension);
      
      const imageDescriptor = concatArrayBuffers(
        U8(44), // Image Separator - always 2C hex
        U16LE(0), // Image left,
        U16LE(0), // ImageTop,
        U16LE(this.width), // Width,
        U16LE(this.height), // Height
        U8(imageDescriptorPackedField),
      );

      globalImageData.push(imageDescriptor);

      // image data here
      globalImageData.push(this.framesImageData[i]);
    }
    
    const trailer = new Uint8Array([59]) // 3b hex semicolon indicating end of file
  
    const gifFile = concatArrayBuffers(
      header,
      this.globalColorTable,
      applicationExtension,
      ...globalImageData,
      trailer
    );
    
    return gifFile

    // ARRAYBUFFER HELPERS
    function concatArrayBuffers(...bufs){
      let totalSize = 0;
      for (let b of bufs) totalSize += b.length;
      const result = new Uint8Array(totalSize);
      let offset = 0;
      for (let b of bufs) {
        result.set(b, offset);
        offset += b.length;
      }
      return result;
    }

    function U16LE(v) {
      return new Uint8Array([v & 0xFF, (v >> 8) & 0xFF]);
    }

    function U8(v) { 
      return new Uint8Array([v & 0xFF]); 
    }

    function rawString(str) {
      const buffer = new Uint8Array(str.length);
      for (let i = 0; i < str.length; i++) {
        buffer[i] = str.charCodeAt(i);
      }
      return buffer;
    }
  }

  /// IMAGE MANIPULATION
  errorDiffusionDither(pixels, colors) {
    // 1. CRITICAL: Create a copy of the pixels. 
    // We work on 'p', leaving the original 'pixels' (source) untouched.
    const p = new Uint8Array(pixels); 
    
    const indexStream = new Uint8Array(pixels.length / 4);
    const w = this.width;
    const errorDiff = [7, 3, 5, 1];
    // Offsets: Right, Down-Left, Down, Down-Right
    // We pre-calculate byte offsets: (dx * 4) + (dy * width * 4)
    // Note: We still need logic to check X boundaries so we don't wrap around lines.
    const neighbors = [
        { dx: 1,  dy: 0,  offset: 4 },           // Right
        { dx: -1, dy: 1,  offset: (w * 4) - 4 }, // Down-Left
        { dx: 0,  dy: 1,  offset: (w * 4) },     // Down
        { dx: 1,  dy: 1,  offset: (w * 4) + 4 }  // Down-Right
    ];

    let cursor = 0;

    // Loop through every pixel (step 4 bytes)
    for (let i = 0; i < p.length; i += 4) {
      const r = p[i];
      const g = p[i + 1];
      const b = p[i + 2];

      // 2. Find closest color
      // (Using the optimization from the previous step)
      // Note: Passing array [r,g,b] to findClosest to match your existing signature, 
      // or pass r,g,b separate if you updated that method.
      const colorIndex = this.findClosest(r, g, b, colors);
      indexStream[cursor++] = colorIndex;

      // 3. Calculate Error PER CHANNEL
      // Don't sum them up. Red error affects Red neighbors only.
      const idx3 = colorIndex * 3;
      const er = r - colors[idx3];
      const eg = g - colors[idx3 + 1];
      const eb = b - colors[idx3 + 2];

      // 4. Distribute Error to Neighbors
      const x = (i / 4) % w; // Current pixel X coordinate

      for (let j = 0; j < 4; j++) {
        const n = neighbors[j];

        // Boundary checks to prevent wrapping pixels to the other side of the image
        if (x === 0 && n.dx === -1) continue;      // Left edge
        if (x === w - 1 && n.dx === 1) continue;   // Right edge

        const ni = i + n.offset; // Neighbor Index

        // Check if neighbor is within array bounds (bottom of image)
        if (ni < p.length) {
           const factor = errorDiff[j];
           // Apply error with bitwise division (>> 4 is / 16)
           // Clamp values between 0 and 255
           let nr = p[ni]     + ((er * factor) >> 4);
           let ng = p[ni + 1] + ((eg * factor) >> 4);
           let nb = p[ni + 2] + ((eb * factor) >> 4);

           p[ni]     = nr < 0 ? 0 : nr > 255 ? 255 : nr;
           p[ni + 1] = ng < 0 ? 0 : ng > 255 ? 255 : ng;
           p[ni + 2] = nb < 0 ? 0 : nb > 255 ? 255 : nb;
        }
      }
    }

    return indexStream;
  }

  simpleQuantize(pixels, colors) {
    // returns image data object and index stream of colors in color table
    const indexStream = new Uint8Array(pixels.length / 4);
    const mask = 0b11110000;
    let cursor = 0;
    for (let index = 0; index < pixels.length; index += 4) {
      const colorIndex = this.findClosest(pixels[index + 0] & mask, pixels[index + 1] & mask, pixels[index + 2] & mask, colors);
      indexStream[cursor] = colorIndex;
      cursor++;
    }
    return indexStream
  }

  findClosest(r, g, b, colors) {
    // Combine directly from arguments
    const cs = (r << 16) | (g << 8) | b; 
    if (this.distanceMemo[cs] !== undefined) return this.distanceMemo[cs];

    let index = 0;
    let minDistance = Infinity; 
    
    for (let i = 0, len = colors.length; i < len; i += 3) {
      // Math abs is slow, direct subtraction is faster
      const dr = r - colors[i];
      const dg = g - colors[i + 1];
      const db = b - colors[i + 2];
      
      const distance = (dr * dr) + (dg * dg) + (db * db);

      if (distance < minDistance) {
        minDistance = distance;
        index = i / 3;
        if (distance === 0) break; 
      }
    }
    
    this.distanceMemo[cs] = index;
    return index;
  }

  colorCode(rgb) {
    return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
  }

  calculateError(c1, c2) {
    return c1[0] - c2[0] +  c1[1] - c2[1] +  c1[2] - c2[2];
  }

  medianCutColors(pixels) {
    const precision = 2000; // Target roughly 2000 pixels sample
    const step = Math.max(1, Math.floor((pixels.length / 4) / precision)) * 4;
    
    const cols = [];
    for (let i = 0; i < pixels.length; i += step) {
      cols.push([pixels[i], pixels[i+1], pixels[i+2]]);
    }

    const bins = this.medianCutRecursion([cols], this.colorTableSize);
    
    const averages = [];
    for (let bin of bins) {
      if (bin.length === 0) { averages.push([0,0,0]); continue; }
      let r = 0, g = 0, b = 0;
      for (let c of bin) {
        r += c[0]; g += c[1]; b += c[2];
      }
      // Bitwise truncate is slightly faster than Math.floor for positive numbers
      averages.push([ (r / bin.length) | 0, (g / bin.length) | 0, (b / bin.length) | 0 ]);
    }
    return averages;
  }

  medianCutRecursion(bins, targetBins) {
    if (bins.length >= targetBins) return bins;

    let newBins = [];
    
    for (let bin of bins) {
      if (bin.length === 0) { newBins.push(bin); continue; }

      let minR = 255, maxR = 0;
      let minG = 255, maxG = 0;
      let minB = 255, maxB = 0;

      for (let c of bin) {
        if (c[0] < minR) minR = c[0];
        if (c[0] > maxR) maxR = c[0];
        if (c[1] < minG) minG = c[1];
        if (c[1] > maxG) maxG = c[1];
        if (c[2] < minB) minB = c[2];
        if (c[2] > maxB) maxB = c[2];
      }

      const rangeR = maxR - minR;
      const rangeG = maxG - minG;
      const rangeB = maxB - minB;

      // Determine split channel
      let sortIdx = 0; // Red
      let maxRange = rangeR;

      if (rangeG > maxRange) {
        maxRange = rangeG;
        sortIdx = 1; // Green
      }
      if (rangeB > maxRange) {
        sortIdx = 2; // Blue
      }

      // Sort only on the widest channel
      bin.sort((a, b) => a[sortIdx] - b[sortIdx]);

      const half = bin.length >> 1; // Bitwise divide by 2
      newBins.push(bin.slice(0, half), bin.slice(half));
    }
    
    // Safety check: if we can't split further (e.g. identical colors), stop
    if (newBins.length === bins.length) return bins;

    return this.medianCutRecursion(newBins, targetBins);
  }

  toBin(v, pad = 0) {return (v).toString(2).padStart(pad,'0')}
}